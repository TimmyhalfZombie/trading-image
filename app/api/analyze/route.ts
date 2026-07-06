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
    fileOrBuffer: File | Buffer,
    filename: string
): Promise<{ buffer: Buffer; filename: string; mimetype: string }> {
    const inputBuffer = Buffer.isBuffer(fileOrBuffer)
        ? fileOrBuffer
        : Buffer.from(await (fileOrBuffer as any).arrayBuffer());
    const image = sharp(inputBuffer);
    const metadata = await image.metadata();
    const w = metadata.width ?? 0;
    const h = metadata.height ?? 0;

    log.info(`${filename}: ${w}x${h} (${h > w ? 'portrait → landscape' : 'landscape'})`);

    const outputBuffer = await (h > w ? image.rotate(90) : image)
        .toFormat('jpeg', { quality: 92 })
        .toBuffer();

    return {
        buffer: outputBuffer,
        filename: filename.replace(/\.[^.]+$/, '') + '_normalized.jpg',
        mimetype: 'image/jpeg',
    };
}

function extractErrorMessage(obj: any): string | null {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;
    
    // Check direct fields
    if (typeof obj.message === 'string' && obj.message) return obj.message;
    if (typeof obj.error === 'string' && obj.error) return obj.error;
    if (typeof obj.errorMessage === 'string' && obj.errorMessage) return obj.errorMessage;
    if (typeof obj.description === 'string' && obj.description) return obj.description;
    
    // Check nested error object
    if (obj.error && typeof obj.error === 'object') {
        const msg = extractErrorMessage(obj.error);
        if (msg) return msg;
    }
    
    // Check nested reason object
    if (obj.reason && typeof obj.reason === 'object') {
        const msg = extractErrorMessage(obj.reason);
        if (msg) return msg;
    }

    // Check nested details or other fields recursively for keywords
    try {
        for (const key of Object.keys(obj)) {
            // Skip successful analysis keys to avoid matching trading terms as system errors
            if (['reasoning', 'setup_type', 'setup_model', 'overall_chart_summary', 'signal', 'signal_type', 'asset_name', 'asset'].includes(key)) {
                continue;
            }
            if (typeof obj[key] === 'string' && (
                obj[key].toLowerCase().includes('unavailable') || 
                obj[key].toLowerCase().includes('demand') || 
                obj[key].toLowerCase().includes('limit') || 
                obj[key].toLowerCase().includes('failed') || 
                obj[key].toLowerCase().includes('error')
            )) {
                return obj[key];
            }
        }
    } catch {}

    // Fallback: search any string value in the object, excluding safe keys
    try {
        for (const key of Object.keys(obj)) {
            if (['reasoning', 'setup_type', 'setup_model', 'overall_chart_summary', 'signal', 'signal_type', 'asset_name', 'asset'].includes(key)) {
                continue;
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
                const nested = extractErrorMessage(obj[key]);
                if (nested) return nested;
            }
        }
    } catch {}
    
    return null;
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
            htf: htf instanceof File ? `${htf.name} (${htf.size}b)` : typeof htf === 'string' ? `URL: ${htf}` : 'Missing',
            mid: mid instanceof File ? `${mid.name} (${mid.size}b)` : typeof mid === 'string' ? `URL: ${mid}` : 'Missing',
            ltf: ltf instanceof File ? `${ltf.name} (${ltf.size}b)` : typeof ltf === 'string' ? `URL: ${ltf}` : 'Missing',
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

        const normalizeAndAppend = async (key: string, fileOrUrl: FormDataEntryValue | null) => {
            if (!fileOrUrl) return;
            const n8nKey = key === 'image_htf' ? 'chart_4h' 
                         : key === 'image_mid' ? 'chart_1h' 
                         : 'chart_15m';
            try {
                let buffer: Buffer;
                let filename = 'chart.png';
                
                if (typeof fileOrUrl === 'string' && fileOrUrl.startsWith('http')) {
                    // Fetch image from URL server-side
                    const res = await fetch(fileOrUrl, {
                        referrerPolicy: 'no-referrer',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                        }
                    });
                    if (!res.ok) throw new Error(`Failed to fetch image from URL: ${res.status}`);
                    buffer = Buffer.from(await res.arrayBuffer());
                    filename = fileOrUrl.split('/').pop()?.split('?')[0] || 'chart_from_url.png';
                    if (!filename.includes('.')) filename += '.png';
                } else if (fileOrUrl instanceof File) {
                    buffer = Buffer.from(await fileOrUrl.arrayBuffer());
                    filename = fileOrUrl.name;
                } else {
                    return;
                }

                const result = await normalizeChartOrientation(buffer, filename);
                normalized[key] = result;
                const blob = new Blob([new Uint8Array(result.buffer)], { type: result.mimetype });
                n8nFormData.append(n8nKey, blob, result.filename);
            } catch (err) {
                log.warn(`Failed to process ${key}:`, err);
                if (fileOrUrl instanceof File) {
                    n8nFormData.append(n8nKey, fileOrUrl, fileOrUrl.name);
                } else if (typeof fileOrUrl === 'string') {
                    // If fetching fails, we pass the URL as text so n8n can try fetching it
                    n8nFormData.append(n8nKey + '_url', fileOrUrl);
                }
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
                    { error: 'The analysis timed out. The N8N workflow took too long to respond, which usually indicates the AI model node is experiencing high demand or service instability.' },
                    { status: 504 }
                );
            }
            log.error('Failed to reach n8n:', fetchErr.message);
            return NextResponse.json(
                { error: `Cannot reach the analysis service: ${fetchErr.message}` },
                { status: 502 }
            );
        } finally {
            clearTimeout(timeout);
        }

        // ── 7. Handle non-OK responses from n8n ──────────────────────────
        if (!response.ok) {
            const errorText = await response.text().catch(() => '');
            log.error('n8n error:', response.status, errorText);

            let errorMsg = 'The analysis service returned an error. Please try again.';
            try {
                const parsed = JSON.parse(errorText);
                const msg = extractErrorMessage(parsed);
                if (msg) errorMsg = msg;
            } catch {
                if (errorText && errorText.length < 200) {
                    errorMsg = errorText;
                }
            }

            return NextResponse.json(
                { error: errorMsg },
                { status: response.status }
            );
        }

        // ── 8. Parse n8n JSON response ───────────────────────────────────
        const responseText = await response.text();
        log.info('n8n response length:', responseText.length);

        if (!responseText) {
            return NextResponse.json(
                { error: 'The analysis service returned an empty response. This occurs when the N8N workflow fails midway—most commonly because the AI model node (e.g. Gemini/OpenAI) is experiencing high demand, rate limits, or temporary service unavailability.' },
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
                { error: 'The analysis service returned an invalid response. This typically happens if the N8N workflow crashes or encounters an error on the HTTP Request/AI node due to service limits or high demand.' },
                { status: 502 }
            );
        }

        // ── 9. Upload chart images to Supabase Storage ───────────────────
        const result = Array.isArray(data) ? data[0] : data;

        // Check if the parsed JSON itself contains an error message (e.g. rate limit, high demand, node failure)
        // BUT only if the response doesn't already contain a valid signal — otherwise
        // trading terms like "demand zone", "limit order", "gate failed" trigger false positives
        const hasValidSignal = result.signal || result.signal_type;
        if (!hasValidSignal) {
            const detectedError = extractErrorMessage(result);
            if (detectedError && (
                detectedError.toLowerCase().includes('unavailable') || 
                detectedError.toLowerCase().includes('demand') || 
                detectedError.toLowerCase().includes('limit') ||
                detectedError.toLowerCase().includes('error') ||
                (result.message || result.errorMessage || result.description)
            )) {
                return NextResponse.json(
                    { error: detectedError },
                    { status: 502 }
                );
            }
        }

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

    } catch (error: any) {
        log.error('Unhandled error in /api/analyze:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error. Please try again later.' },
            { status: 500 }
        );
    }
}
