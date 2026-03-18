import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/rate-limit';

const isDev = process.env.NODE_ENV === 'development';
const log = {
    info:  (...args: unknown[]) => { if (isDev) console.log('[history]', ...args); },
    error: (...args: unknown[]) => console.error('[history]', ...args),
};

/**
 * Given a stored chart value (could be a storage path or a legacy full URL),
 * return a 1-hour signed URL. Returns null if the value is missing or signing fails.
 */
async function resolveChartUrl(
    supabase: Awaited<ReturnType<typeof createClient>>,
    storedValue: string | null | undefined
): Promise<string | null> {
    if (!storedValue) return null;

    // Legacy records stored full public URLs — extract the path after /chart-images/
    let storagePath = storedValue;
    const publicPrefix = '/storage/v1/object/public/chart-images/';
    const idx = storedValue.indexOf(publicPrefix);
    if (idx !== -1) {
        storagePath = storedValue.substring(idx + publicPrefix.length);
    }

    try {
        const { data, error } = await supabase.storage
            .from('chart-images')
            .createSignedUrl(storagePath, 3600); // 1-hour expiry
        if (error || !data?.signedUrl) return null;
        return data.signedUrl;
    } catch {
        return null;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/trading-history
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 30 requests per minute per user
        const rl = checkRateLimit(`history:${user.id}`, 30, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } }
            );
        }

        const { data: records, error } = await supabase
            .from('trading_signals')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            // FIX #5: NEVER forward raw Supabase error details to the client
            log.error('Supabase query failed:', error.message, error.code, error.details);
            return NextResponse.json(
                { error: 'Failed to load trading history.' },
                { status: 500 }
            );
        }

        // Map DB columns to frontend shape + generate signed URLs for chart images
        const trades = await Promise.all(
            (records || []).map(async (record: any) => {
                const [chartHtf, chartMid, chartLtf] = await Promise.all([
                    resolveChartUrl(supabase, record.chart_htf_url),
                    resolveChartUrl(supabase, record.chart_mid_url),
                    resolveChartUrl(supabase, record.chart_ltf_url),
                ]);

                return {
                    id:            record.id,
                    created_at:    record.created_at,
                    asset:         record.asset || record.asset_name || 'Unknown',
                    signal:        record.signal || record.signal_type || 'NEUTRAL',
                    outcome:       (record.outcome || 'PENDING').toUpperCase(),
                    confidence:    record.confidence || 0,
                    pnl:           record.pnl || 0,
                    sl:            record.sl || record.stop_loss || 0,
                    tp:            record.tp || record.take_profit || 0,
                    reasoning:     record.reasoning || '',
                    chart_htf_url: chartHtf,
                    chart_mid_url: chartMid,
                    chart_ltf_url: chartLtf,
                };
            })
        );

        return NextResponse.json(trades);
    } catch (err: unknown) {
        log.error('Unhandled error in GET /api/trading-history:', err);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/trading-history
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: Request) {
    const supabase = await createClient();

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit: 10 deletes per minute per user
        const rl = checkRateLimit(`history-delete:${user.id}`, 10, 60_000);
        if (!rl.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait a moment.' },
                { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.resetInMs / 1000)) } }
            );
        }

        const { searchParams } = new URL(request.url);
        const id        = searchParams.get('id');
        const deleteAll = searchParams.get('all') === 'true';

        let error;

        if (deleteAll) {
            const result = await supabase
                .from('trading_signals')
                .delete()
                .eq('user_id', user.id);
            error = result.error;
        } else if (id) {
            // Delete specific record — ownership enforced by both .eq('user_id') AND RLS
            const result = await supabase
                .from('trading_signals')
                .delete()
                .eq('id', id)
                .eq('user_id', user.id);
            error = result.error;
        } else {
            return NextResponse.json(
                { error: "Missing 'id' parameter or 'all=true'." },
                { status: 400 }
            );
        }

        if (error) {
            log.error('Supabase delete failed:', error.message);
            return NextResponse.json(
                { error: 'Failed to delete record.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ message: 'Record deleted successfully.' });
    } catch (err: unknown) {
        log.error('Unhandled error in DELETE /api/trading-history:', err);
        return NextResponse.json(
            { error: 'Internal server error.' },
            { status: 500 }
        );
    }
}
