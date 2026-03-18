/**
 * Simple in-memory rate limiter.
 *
 * ⚠️ This works for single-process deployments (e.g., `next dev`, Docker).
 *    On Vercel/serverless, each invocation is a fresh process, so this map
 *    is NOT shared. For production serverless, use Upstash Redis + @upstash/ratelimit.
 *
 * Usage:
 *   const rl = checkRateLimit(`analyze:${userId}`, 5, 60_000);
 *   if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 */

const store = new Map<string, { count: number; resetAt: number }>();

// Garbage-collect expired entries every 60 s to prevent memory growth
let _gcTimer: ReturnType<typeof setInterval> | null = null;
function ensureGC() {
    if (_gcTimer) return;
    _gcTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, val] of store) {
            if (now > val.resetAt) store.delete(key);
        }
    }, 60_000);
    // Allow Node to exit even if this interval is still running
    if (_gcTimer && typeof _gcTimer === 'object' && 'unref' in _gcTimer) {
        _gcTimer.unref();
    }
}

export interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetInMs: number;
}

/**
 * @param key     Unique key per consumer, e.g. `analyze:${userId}`
 * @param limit   Max requests allowed within the window
 * @param windowMs  Window size in milliseconds
 */
export function checkRateLimit(
    key: string,
    limit: number,
    windowMs: number
): RateLimitResult {
    ensureGC();
    const now = Date.now();
    const record = store.get(key);

    // First request or window expired → reset
    if (!record || now > record.resetAt) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true, remaining: limit - 1, resetInMs: windowMs };
    }

    // Window active — check count
    if (record.count >= limit) {
        return { allowed: false, remaining: 0, resetInMs: record.resetAt - now };
    }

    record.count++;
    return {
        allowed: true,
        remaining: limit - record.count,
        resetInMs: record.resetAt - now,
    };
}
