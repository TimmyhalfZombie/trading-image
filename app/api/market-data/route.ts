import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// ── Binance interval map ──────────────────────────────────────────────────────
const BINANCE_INTERVAL_MAP: Record<string, string> = {
    '15':  '15m',
    '60':  '1h',
    '240': '4h',
    'D':   '1d',
};

// ── Binance REST: fetch klines directly (no API key required) ─────────────────
async function fetchBinanceKlines(symbol: string, interval: string): Promise<any[]> {
    const binanceInterval = BINANCE_INTERVAL_MAP[interval] || '1h';
    // Use limit=500 — the max per request without auth
    const url = `https://data-api.binance.vision/api/v3/klines?symbol=${symbol}&interval=${binanceInterval}&limit=500`;

    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Binance API error: ${res.statusText}`);

    const raw: any[][] = await res.json();

    // Binance kline format:
    // [openTime, open, high, low, close, volume, closeTime, ...]
    return raw.map((k) => ({
        time: Math.floor(Number(k[0]) / 1000), // convert ms → seconds
        open:   parseFloat(k[1]),
        high:   parseFloat(k[2]),
        low:    parseFloat(k[3]),
        close:  parseFloat(k[4]),
        volume: parseFloat(k[5]),
    }));
}

// ── Yahoo Finance: fetch forex / indices / commodities ────────────────────────
async function fetchYahooKlines(ticker: string, interval: string): Promise<any[]> {
    let yahooInterval = '1h';
    let yahooRange    = '30d';

    if (interval === '15')  { yahooInterval = '15m'; yahooRange = '7d'; }
    if (interval === '60')  { yahooInterval = '1h';  yahooRange = '30d'; }
    if (interval === '240') { yahooInterval = '1h';  yahooRange = '60d'; }
    if (interval === 'D')   { yahooInterval = '1d';  yahooRange = '365d'; }

    // Cache-buster ensures we never get a stale response
    const ts = Date.now();
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${ticker}?interval=${yahooInterval}&range=${yahooRange}&_t=${ts}`;

    const res = await fetch(url, {
        cache: 'no-store',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
        },
    });
    if (!res.ok) throw new Error(`Yahoo API error: ${res.statusText}`);

    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo Finance');

    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens   = quote.open   || [];
    const highs   = quote.high   || [];
    const lows    = quote.low    || [];
    const closes  = quote.close  || [];
    const volumes = quote.volume || [];

    let candles: any[] = [];
    for (let i = 0; i < timestamps.length; i++) {
        if (opens[i] == null || highs[i] == null || lows[i] == null || closes[i] == null) continue;
        candles.push({
            time:   timestamps[i],
            open:   opens[i],
            high:   highs[i],
            low:    lows[i],
            close:  closes[i],
            volume: volumes[i] || 0,
        });
    }

    // Aggregate 1h → 4h candles server-side
    if (interval === '240') {
        const grouped: any[] = [];
        for (let i = 0; i < candles.length; i += 4) {
            const chunk = candles.slice(i, i + 4);
            if (!chunk.length) continue;
            grouped.push({
                time:   chunk[0].time,
                open:   chunk[0].open,
                high:   Math.max(...chunk.map(c => c.high)),
                low:    Math.min(...chunk.map(c => c.low)),
                close:  chunk[chunk.length - 1].close,
                volume: chunk.reduce((s, c) => s + (c.volume || 0), 0),
            });
        }
        candles = grouped;
    }

    return candles;
}

// ── Ticker resolution ─────────────────────────────────────────────────────────
function resolveSymbol(rawSymbol: string): { source: 'binance' | 'yahoo'; ticker: string } {
    const s = rawSymbol.toUpperCase();

    // Crypto — Binance
    const binanceMap: Record<string, string> = {
        'BINANCE:BTCUSDT':  'BTCUSDT',
        'BINANCE:ETHUSDT':  'ETHUSDT',
        'BINANCE:SOLUSDT':  'SOLUSDT',
        'BINANCE:XRPUSDT':  'XRPUSDT',
        'BINANCE:DOGEUSDT': 'DOGEUSDT',
    };
    if (binanceMap[s]) return { source: 'binance', ticker: binanceMap[s] };

    // Forex — Yahoo Finance
    const forexMap: Record<string, string> = {
        'FX:EURUSD': 'EURUSD=X',
        'FX:GBPUSD': 'GBPUSD=X',
        'FX:USDJPY': 'USDJPY=X',
        'FX:AUDUSD': 'AUDUSD=X',
        'FX:USDCAD': 'USDCAD=X',
        'FX:USDCHF': 'USDCHF=X',
        'FX:NZDUSD': 'NZDUSD=X',
        'FX:GBPJPY': 'GBPJPY=X',
        'FX:EURJPY': 'EURJPY=X',
        'FX:EURGBP': 'EURGBP=X',
    };
    if (forexMap[s]) return { source: 'yahoo', ticker: forexMap[s] };

    // Indices & Commodities — Yahoo Finance
    const indexMap: Record<string, string> = {
        'FOREXCOM:SPXUSD': '^GSPC',
        'FOREXCOM:NSXUSD': '^IXIC',
        'FOREXCOM:DJI':    '^DJI',
        'TVC:GOLD':        'GC=F',
        'TVC:SILVER':      'SI=F',
    };
    if (indexMap[s]) return { source: 'yahoo', ticker: indexMap[s] };

    // Generic fallback
    const clean = rawSymbol.replace(/^(FX:|BINANCE:|FOREXCOM:|TVC:)/, '');
    const ticker = clean.length === 6 && !/[^A-Z]/.test(clean) ? `${clean}=X` : clean;
    return { source: 'yahoo', ticker };
}

// ── Route Handler ─────────────────────────────────────────────────────────────
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const rawSymbol = searchParams.get('symbol') || 'FX:EURUSD';
        const interval  = searchParams.get('interval') || '60';

        const { source, ticker } = resolveSymbol(rawSymbol);

        const candles = source === 'binance'
            ? await fetchBinanceKlines(ticker, interval)
            : await fetchYahooKlines(ticker, interval);

        return NextResponse.json({ candles, source });
    } catch (err: any) {
        console.error('[market-data] error:', err.message);
        return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
    }
}
