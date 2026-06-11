import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { canAnalyze, incrementUsage } from '@/lib/tokens';
import sharp from 'sharp';

// Increase Vercel function timeout to the maximum allowed on Hobby tier (60 seconds)
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// ─── Env helpers (server-only — no NEXT_PUBLIC_ prefix) ──────────────────────
const getWebhookUrl = () => process.env['N8N_WEBHOOK_URL'] || 'http://localhost:5678/webhook/trading-signal-v6';
const getWebhookSecret = () => process.env['N8N_WEBHOOK_SECRET'] || '';

const isDev = process.env.NODE_ENV === 'development';

// Safe logger that only emits in development
const log = {
    info: (...args: unknown[]) => { if (isDev) console.log('[analyze]', ...args); },
    warn: (...args: unknown[]) => { if (isDev) console.warn('[analyze]', ...args); },
    error: (...args: unknown[]) => console.error('[analyze]', ...args), // always log errors
};

// ─────────────────────────────────────────────────────────────────────────────
// Image normalisation
// ─────────────────────────────────────────────────────────────────────────────

async function normalizeChartOrientation(
    file: File
): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const w = metadata.width ?? 0;
    const h = metadata.height ?? 0;

    log.info(`${file.name}: ${w}x${h} (${h > w ? 'portrait → landscape' : 'landscape'})`);

    const outputBuffer = await (h > w ? image.rotate(90) : image)
        .toFormat('jpeg', { quality: 92 })
        .toBuffer();

    return {
        buffer: outputBuffer,
        filename: file.name.replace(/\.[^.]+$/, '') + '_normalized.jpg',
        mimetype: 'image/jpeg',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/analyze
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
    try {
        // ── 1. Validate server config ──────────────────────────────────────
        const webhookUrl = getWebhookUrl();
        if (!webhookUrl) {
            return NextResponse.json(
                { error: 'Analysis service is not configured.' },
                { status: 500 }
            );
        }

        // ── 2. Authenticate user ──────────────────────────────────────────
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: 'Unauthorized: Please log in to analyze charts.' },
                { status: 401 }
            );
        }

        // ── 2b. Check daily token limit ─────────────────────────────────
        const tokenCheck = await canAnalyze(user.id);
        // Bypassed daily limit check to remove analysis limitation
        if (false && !tokenCheck.canAnalyze) {
            return NextResponse.json(
                {
                    error: `Daily limit reached (${tokenCheck.limit} analyses/day on ${tokenCheck.planName} plan). Upgrade for more.`,
                    tokenInfo: tokenCheck,
                },
                { status: 429 }
            );
        }

        // ── 3. Rate limit: 5 analyses per minute per user ─────────────────
        const rl = checkRateLimit(`analyze:${user.id}`, 5, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many analysis requests. Please wait a moment.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } }
            );
        }

        // ── 4. Extract & validate uploaded files ──────────────────────────
        const formData = await request.formData();
        const htf = formData.get('image_htf');
        const mid = formData.get('image_mid');
        const ltf = formData.get('image_ltf');

        log.info('Files received:', {
            htf: htf instanceof File ? `${htf.name} (${htf.size}b)` : 'Missing',
            mid: mid instanceof File ? `${mid.name} (${mid.size}b)` : 'Missing',
            ltf: ltf instanceof File ? `${ltf.name} (${ltf.size}b)` : 'Missing',
        });

        // ── 5. Normalize images & build n8n payload ───────────────────────
        const n8nFormData = new FormData();
        n8nFormData.append('user_id', user.id);

        const userAgent = request.headers.get('user-agent') || '';
        const isMobile = /mobile|android|iphone|ipad|phone/i.test(userAgent);
        const sourceVal = isMobile ? 'mobile' : 'desktop';
        n8nFormData.append('device_type', sourceVal);
        n8nFormData.append('source', sourceVal);

        type NormalizedImage = { buffer: Buffer; filename: string; mimetype: string };
        const normalized: Record<string, NormalizedImage | null> = {
            image_htf: null,
            image_mid: null,
            image_ltf: null,
        };

        const normalizeAndAppend = async (key: string, file: FormDataEntryValue | null) => {
            if (!file || !(file instanceof File)) return;
            const n8nKey = key === 'image_htf' ? 'chart_4h' 
                         : key === 'image_mid' ? 'chart_1h' 
                         : 'chart_15m';
            try {
                const result = await normalizeChartOrientation(file);
                normalized[key] = result;
                const blob = new Blob([new Uint8Array(result.buffer)], { type: result.mimetype });
                n8nFormData.append(n8nKey, blob, result.filename);
            } catch (err) {
                log.warn(`Failed to normalize ${key}, using original:`, err);
                n8nFormData.append(n8nKey, file, file.name);
            }
        };

        await Promise.all([
            normalizeAndAppend('image_htf', htf),
            normalizeAndAppend('image_mid', mid),
            normalizeAndAppend('image_ltf', ltf),
        ]);

        // ── 6. Forward to n8n (with auth + timeout) ───────────────────────
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 50_000); // 50s — must finish before Vercel's 60s limit

        const webhookSecret = getWebhookSecret();
        const headers: Record<string, string> = {};
        if (webhookSecret) {
            headers['X-Webhook-Secret'] = webhookSecret;
        }

        let response: Response;
        try {
            response = await fetch(webhookUrl, {
                method: 'POST',
                body: n8nFormData,
                headers,
                signal: controller.signal,
            });
        } catch (fetchErr: any) {
            clearTimeout(timeout);
            if (fetchErr.name === 'AbortError') {
                return NextResponse.json(
                    { error: 'The analysis timed out. Please try again.' },
                    { status: 504 }
                );
            }
            log.error('Failed to reach n8n:', fetchErr.message);
            return NextResponse.json(
                { error: 'Cannot reach the analysis service.' },
                { status: 502 }
            );
        } finally {
            clearTimeout(timeout);
        }

        // ── 7. Handle non-OK responses from n8n ──────────────────────────
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            log.error('n8n error:', response.status, errorText);

            // Generic error — never forward raw n8n internals
            return NextResponse.json(
                { error: 'The analysis service returned an error. Please try again.' },
                { status: 502 }
            );
        }

        // ── 8. Parse n8n JSON response ───────────────────────────────────
        const responseText = await response.text();
        log.info('n8n response length:', responseText.length);

        if (!responseText) {
            return NextResponse.json(
                { error: 'The analysis service returned an empty response.' },
                { status: 502 }
            );
        }

        if (responseText.includes('Workflow was started')) {
            return NextResponse.json(
                { error: 'N8N webhook is set to "Respond Immediately". Change to "Using Respond to Webhook Node".' },
                { status: 400 }
            );
        }

        if (responseText.trim().startsWith('<')) {
            return NextResponse.json(
                { error: 'The analysis service returned an unexpected response format.' },
                { status: 502 }
            );
        }

        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            log.error('Failed to parse n8n JSON');
            return NextResponse.json(
                { error: 'Invalid response from analysis service.' },
                { status: 502 }
            );
        }

        // ── 9. Upload chart images to Supabase Storage ───────────────────
        const result = Array.isArray(data) ? data[0] : data;

        let chartPaths: Record<string, string | null> = {
            htf: null, mid: null, ltf: null,
        };

        if (result && (result.signal || result.signal_type)) {
            // Upload each image and store the STORAGE PATH (not public URL)
            const uploadImage = async (key: string, label: string): Promise<string | null> => {
                const img = normalized[key];
                if (!img) return null;
                try {
                    const storagePath = `${user.id}/${Date.now()}_${label}.jpg`;
                    const { error: uploadError } = await supabase.storage
                        .from('chart-images')
                        .upload(storagePath, new Uint8Array(img.buffer), {
                            contentType: img.mimetype,
                            upsert: false,
                        });

                    if (uploadError) {
                        log.warn(`Storage upload failed (${label}):`, uploadError.message);
                        return null;
                    }
                    return storagePath; // Store path, NOT full URL
                } catch (err) {
                    log.warn(`Storage error (${label}):`, err);
                    return null;
                }
            };

            const [htfPath, midPath, ltfPath] = await Promise.all([
                uploadImage('image_htf', 'htf'),
                uploadImage('image_mid', 'mid'),
                uploadImage('image_ltf', 'ltf'),
            ]);

            chartPaths = { htf: htfPath, mid: midPath, ltf: ltfPath };
            log.info('Chart paths:', chartPaths);

            // ── 10. Save signal record to Supabase ───────────────────────
            try {
                const { error: dbError } = await supabase
                    .from('trading_signals')
                    .insert([{
                        user_id: user.id,
                        asset_name: result.asset_name || result.asset || 'Unknown',
                        signal_type: (result.signal_type || result.signal || 'WAIT').toUpperCase(),
                        outcome: 'pending',
                        stop_loss: result.stop_loss || result.sl || 0,
                        take_profit: result.take_profit || result.tp || 0,
                        reasoning: result.reasoning || 'No reasoning provided',
                        confidence: result.confidence || 0,
                        setup_type: result.setup_type || 'Standard',
                        chart_htf_url: htfPath,
                        chart_mid_url: midPath,
                        chart_ltf_url: ltfPath,
                    }]);

                if (dbError) {
                    log.error('DB insert failed:', dbError.message);
                }

                // ── 10b. Increment daily usage token ─────────────────────
                try {
                    await incrementUsage(user.id);
                } catch (usageErr) {
                    log.error('Failed to increment usage:', usageErr);
                }
            } catch (dbEx) {
                log.error('DB error:', dbEx);
            }

            // ── 11. Generate signed URLs for immediate frontend display ──
            const signUrl = async (path: string | null): Promise<string | null> => {
                if (!path) return null;
                try {
                    const { data: signed, error } = await supabase.storage
                        .from('chart-images')
                        .createSignedUrl(path, 3600); // 1-hour expiry
                    if (error || !signed?.signedUrl) return null;
                    return signed.signedUrl;
                } catch {
                    return null;
                }
            };

            const [htfSignedUrl, midSignedUrl, ltfSignedUrl] = await Promise.all([
                signUrl(htfPath),
                signUrl(midPath),
                signUrl(ltfPath),
            ]);

            // Attach signed URLs to the response payload
            if (Array.isArray(data)) {
                data[0].chart_htf_url = htfSignedUrl;
                data[0].chart_mid_url = midSignedUrl;
                data[0].chart_ltf_url = ltfSignedUrl;
            } else {
                data.chart_htf_url = htfSignedUrl;
                data.chart_mid_url = midSignedUrl;
                data.chart_ltf_url = ltfSignedUrl;
            }
        }

        return NextResponse.json(data);

    } catch (error: unknown) {
        // FIX #3: NEVER leak internal error details to the client
        log.error('Unhandled error in /api/analyze:', error);
        return NextResponse.json(
            { error: 'Internal server error. Please try again later.' },
            { status: 500 }
        );
    }
}
