"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { TrendingUp, ChevronDown, Maximize2, Minimize2, Camera, Check, Link2, Loader2 } from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { useToast } from './Toast';
import { createChart, ColorType, CandlestickSeries, HistogramSeries } from 'lightweight-charts';

/* ── Popular symbols grouped by category ─────────────────────────────── */
const SYMBOL_GROUPS = [
    {
        label: 'Forex',
        symbols: [
            { id: 'FX:EURUSD', name: 'EUR/USD' },
            { id: 'FX:GBPUSD', name: 'GBP/USD' },
            { id: 'FX:USDJPY', name: 'USD/JPY' },
            { id: 'FX:AUDUSD', name: 'AUD/USD' },
            { id: 'FX:USDCAD', name: 'USD/CAD' },
            { id: 'FX:USDCHF', name: 'USD/CHF' },
            { id: 'FX:NZDUSD', name: 'NZD/USD' },
            { id: 'FX:GBPJPY', name: 'GBP/JPY' },
            { id: 'FX:EURJPY', name: 'EUR/JPY' },
            { id: 'FX:EURGBP', name: 'EUR/GBP' },
        ],
    },
    {
        label: 'Crypto',
        symbols: [
            { id: 'BINANCE:BTCUSDT', name: 'BTC/USDT' },
            { id: 'BINANCE:ETHUSDT', name: 'ETH/USDT' },
            { id: 'BINANCE:SOLUSDT', name: 'SOL/USDT' },
            { id: 'BINANCE:XRPUSDT', name: 'XRP/USDT' },
            { id: 'BINANCE:DOGEUSDT', name: 'DOGE/USDT' },
        ],
    },
    {
        label: 'Indices',
        symbols: [
            { id: 'FOREXCOM:SPXUSD', name: 'S&P 500' },
            { id: 'FOREXCOM:NSXUSD', name: 'NASDAQ' },
            { id: 'FOREXCOM:DJI', name: 'Dow Jones' },
            { id: 'TVC:GOLD', name: 'Gold' },
            { id: 'TVC:SILVER', name: 'Silver' },
        ],
    },
];

const INTERVALS = [
    { id: '15', label: '15m' },
    { id: '60', label: '1H' },
    { id: '240', label: '4H' },
    { id: 'D', label: '1D' },
];

interface LiveMarketProps {
    onSnapshotTaken?: (fileOrUrl: File | string) => void;
}

export function LiveMarket({ onSnapshotTaken }: LiveMarketProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<HTMLDivElement>(null);
    const { theme } = useTheme();
    const toast = useToast();

    const [selectedSymbol, setSelectedSymbol] = useState(SYMBOL_GROUPS[0].symbols[0]);
    const [selectedInterval, setSelectedInterval] = useState(INTERVALS[2]); // Default 4H
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copiedType, setCopiedType] = useState<'chart' | 'link' | null>(null);
    const [chartData, setChartData] = useState<any[]>([]);
    const [isLoadingData, setIsLoadingData] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const chartRef = useRef<any>(null);
    const seriesRef = useRef<any>(null);
    const volumeSeriesRef = useRef<any>(null);
    const savedLogicalRangeRef = useRef<any>(null);

    /* ── Close dropdown on outside click & Reset search query ────────── */
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        if (!isDropdownOpen) {
            setSearchQuery('');
        }
    }, [isDropdownOpen]);

    /* ── Fetch chart data from proxy API ──────────────────────────────── */
    const fetchChartData = useCallback(async () => {
        setIsLoadingData(true);
        try {
            const res = await fetch(`/api/market-data?symbol=${encodeURIComponent(selectedSymbol.id)}&interval=${selectedInterval.id}`);
            if (res.ok) {
                const json = await res.json();
                setChartData(json.candles || []);
            } else {
                toast.error(`Failed to fetch data for ${selectedSymbol.name}`, 'Data Fetch Error');
            }
        } catch (err) {
            console.error('Fetch data error:', err);
            toast.error('Network error while loading market data', 'Connection Error');
        } finally {
            setIsLoadingData(false);
        }
    }, [selectedSymbol.id, selectedSymbol.name, selectedInterval.id, toast]);

    useEffect(() => {
        fetchChartData();
    }, [fetchChartData]);

    /* ── Create / update Lightweight Chart ────────────────────────────── */
    useEffect(() => {
        if (!widgetRef.current || chartData.length === 0) return;

        // Clear container
        widgetRef.current.innerHTML = '';

        // Initialize Chart
        const chart = createChart(widgetRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: theme === 'dark' ? '#1C1917' : '#FFFFFF' },
                textColor: theme === 'dark' ? '#D6D3D1' : '#44403C',
            },
            grid: {
                vertLines: { color: theme === 'dark' ? 'rgba(68, 64, 60, 0.08)' : 'rgba(231, 229, 228, 0.4)' },
                horzLines: { color: theme === 'dark' ? 'rgba(68, 64, 60, 0.08)' : 'rgba(231, 229, 228, 0.4)' },
            },
            width: widgetRef.current.clientWidth || 800,
            height: widgetRef.current.clientHeight || 450,
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: theme === 'dark' ? '#44403C' : '#E7E5E4',
            },
            rightPriceScale: {
                borderColor: theme === 'dark' ? '#44403C' : '#E7E5E4',
            }
        });

        // Add Candlestick Series
        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#22c55e',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#22c55e',
            wickDownColor: '#ef4444',
        });

        candlestickSeries.setData(chartData);

        // Add Volume Series (as histogram overlay)
        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#26a69a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // overlay
        });

        volumeSeries.priceScale().applyOptions({
            scaleMargins: {
                top: 0.85,
                bottom: 0,
            },
        });

        const volumeData = chartData.map(c => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)'
        }));
        volumeSeries.setData(volumeData);

        // Restore zoom level if we have a saved range, otherwise fit content
        if (savedLogicalRangeRef.current) {
            try {
                chart.timeScale().setVisibleLogicalRange(savedLogicalRangeRef.current);
            } catch {
                chart.timeScale().fitContent();
            }
        } else {
            chart.timeScale().fitContent();
        }

        // Subscribe to range changes to save user's zoom level
        chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
            savedLogicalRangeRef.current = range;
        });

        // Save references
        chartRef.current = chart;
        seriesRef.current = candlestickSeries;
        volumeSeriesRef.current = volumeSeries;

        // Handle Resize
        const handleResize = () => {
            if (widgetRef.current && chartRef.current) {
                chartRef.current.applyOptions({
                    width: widgetRef.current.clientWidth,
                    height: widgetRef.current.clientHeight
                });
            }
        };

        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(widgetRef.current);

        return () => {
            resizeObserver.disconnect();
            chart.remove();
            chartRef.current = null;
            seriesRef.current = null;
            volumeSeriesRef.current = null;
        };
    }, [chartData, theme]);

    /* ── Live Real-time WebSocket connection or Sim Tick loop ──────────── */
    useEffect(() => {
        if (!chartRef.current || !seriesRef.current || !volumeSeriesRef.current || chartData.length === 0) return;

        let ws: WebSocket | null = null;
        let simulationInterval: any = null;

        const isCrypto = selectedSymbol.id.startsWith('BINANCE:');

        if (isCrypto) {
            // Get raw Binance symbol (e.g. btcusdt)
            const rawTicker = selectedSymbol.id.replace('BINANCE:', '').toLowerCase();

            // Map interval
            let binanceInterval = '1h';
            if (selectedInterval.id === '15') binanceInterval = '15m';
            else if (selectedInterval.id === '60') binanceInterval = '1h';
            else if (selectedInterval.id === '240') binanceInterval = '4h';
            else if (selectedInterval.id === 'D') binanceInterval = '1d';

            const url = `wss://stream.binance.com:9443/ws/${rawTicker}@kline_${binanceInterval}`;
            
            ws = new WebSocket(url);
            
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.k) {
                        const k = data.k;
                        // k.t = candle open time in ms, always use it directly
                        const time   = Math.floor(k.t / 1000);
                        const open   = parseFloat(k.o);
                        const high   = parseFloat(k.h);
                        const low    = parseFloat(k.l);
                        const close  = parseFloat(k.c);
                        const volume = parseFloat(k.v);

                        if (seriesRef.current) {
                            seriesRef.current.update({ time, open, high, low, close });
                        }
                        if (volumeSeriesRef.current) {
                            volumeSeriesRef.current.update({
                                time,
                                value: volume,
                                color: close >= open ? 'rgba(34, 197, 94, 0.25)' : 'rgba(239, 68, 68, 0.25)',
                            });
                        }
                    }
                } catch (err) {
                    console.error('Error parsing live price event:', err);
                }
            };

            ws.onerror = (err) => {
                console.error('Binance WebSocket error:', err);
            };
        } else {
            // Forex / Index: poll the real current price every 15 seconds.
            // We fetch only the latest 1-candle snapshot from our own proxy
            // (Yahoo Finance has ~30s delay but that's inherent to free forex data).
            const pollForexPrice = async () => {
                try {
                    const res = await fetch(
                        `/api/market-data?symbol=${encodeURIComponent(selectedSymbol.id)}&interval=${selectedInterval.id}`,
                        { cache: 'no-store' }
                    );
                    if (!res.ok) return;
                    const json = await res.json();
                    const candles: any[] = json.candles || [];
                    if (!candles.length) return;

                    const latest = candles[candles.length - 1];
                    if (!seriesRef.current || !volumeSeriesRef.current) return;

                    seriesRef.current.update({
                        time:  latest.time,
                        open:  latest.open,
                        high:  latest.high,
                        low:   latest.low,
                        close: latest.close,
                    });
                    volumeSeriesRef.current.update({
                        time:  latest.time,
                        value: latest.volume || 0,
                        color: latest.close >= latest.open
                            ? 'rgba(34, 197, 94, 0.25)'
                            : 'rgba(239, 68, 68, 0.25)',
                    });
                } catch {
                    // silent — network error on poll is non-fatal
                }
            };

            // Immediate first poll, then every 15 s
            pollForexPrice();
            simulationInterval = setInterval(pollForexPrice, 15_000);
        }

        return () => {
            if (ws) ws.close();
            if (simulationInterval) clearInterval(simulationInterval);
        };
    }, [chartData, selectedSymbol.id, selectedInterval.id]);

    /* ── Fullscreen toggle ────────────────────────────────────────────── */
    const toggleFullscreen = () => {
        setIsFullscreen(prev => !prev);
    };

    /* ── Escape exits fullscreen ──────────────────────────────────────── */
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isFullscreen) setIsFullscreen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isFullscreen]);

    /* ── Copy chart link ──────────────────────────────────────────────── */
    const handleCopyLink = useCallback(async () => {
        const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(selectedSymbol.id)}&interval=${selectedInterval.id}`;
        
        const copyText = async (text: string) => {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus(); ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
        };

        try {
            await copyText(url);
            setCopiedType('link');
            toast.success(`Chart link copied for ${selectedSymbol.name}`, 'Link Copied');
            setTimeout(() => setCopiedType(null), 2000);
        } catch (err) {
            toast.error('Failed to copy link', 'Error');
        }
    }, [selectedSymbol.id, selectedSymbol.name, selectedInterval.id, toast]);

    /* ── Capture chart screenshot programmatically ────────────────────── */
    const handleCopySnapshot = useCallback(async () => {
        if (!chartRef.current) {
            toast.warning('Chart data is still loading', 'Please Wait');
            return;
        }

        const canvas = chartRef.current.takeScreenshot();
        if (!canvas) {
            toast.error('Could not capture chart snapshot', 'Snapshot Error');
            return;
        }

        const dataUrl = canvas.toDataURL('image/png');

        canvas.toBlob(async (blob: Blob | null) => {
            if (blob) {
                try {
                    // Try copying binary PNG directly to clipboard
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.write([
                            new ClipboardItem({ 'image/png': blob })
                        ]);
                        toast.success('Screenshot copied to clipboard! You can paste (Ctrl+V) it anywhere.', 'Copied');
                    } else {
                        throw new Error('ClipboardItem not available');
                    }
                } catch {
                    // Fallback to downloading
                    const link = document.createElement('a');
                    link.href = dataUrl;
                    link.download = `chart_${selectedSymbol.name.replace('/', '_')}_${selectedInterval.label}.png`;
                    link.click();
                    toast.success('Screenshot downloaded successfully.', 'Downloaded');
                }

                // Feed to input panel state
                if (onSnapshotTaken) {
                    const file = new File(
                        [blob], 
                        `chart_${selectedSymbol.name.replace('/', '_')}_${selectedInterval.label}.png`, 
                        { type: 'image/png' }
                    );
                    onSnapshotTaken(file);
                }
            }
        });

        setCopiedType('chart');
        setTimeout(() => setCopiedType(null), 2000);
    }, [selectedSymbol.name, selectedInterval.label, onSnapshotTaken, toast]);

    return (
        <div
            ref={containerRef}
            className={`flex flex-col transition-all duration-300 ${
                isFullscreen
                    ? 'fixed inset-0 z-[100] p-0'
                    : 'h-full w-full'
            }`}
            style={{
                backgroundColor: 'var(--surface)',
                border: isFullscreen ? 'none' : '1px solid var(--border)',
                borderRadius: isFullscreen ? '0' : '16px',
                boxShadow: isFullscreen ? 'none' : 'var(--shadow-lg)',
            }}
        >
            {/* Toolbar */}
            <div
                className="flex flex-wrap items-center justify-between gap-4 p-4"
                style={{
                    borderBottom: '1px solid var(--border-light)',
                    backgroundColor: 'var(--surface-header)',
                    borderRadius: isFullscreen ? '0' : '16px 16px 0 0',
                }}
            >
                {/* Left: Ticker & Interval Selectors */}
                <div className="flex items-center gap-3">
                    {/* Ticker Dropdown Toggle */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsDropdownOpen(prev => !prev)}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all duration-200"
                            style={{
                                backgroundColor: 'var(--nav-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                            <span>{selectedSymbol.name}</span>
                            <ChevronDown className="w-3 h-3 opacity-60" />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div
                                className="absolute left-0 top-full mt-2 w-56 rounded-xl shadow-2xl z-50 overflow-hidden"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                }}
                            >
                                {/* Search Input */}
                                <div className="p-2 border-b" style={{ borderColor: 'var(--border-light)' }}>
                                    <input
                                        type="text"
                                        placeholder="Search symbol..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full px-2.5 py-1.5 rounded-lg text-xs outline-none transition-all"
                                        style={{
                                            backgroundColor: 'var(--nav-bg)',
                                            color: 'var(--text-primary)',
                                            border: '1px solid var(--border-light)',
                                        }}
                                        autoFocus
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto py-1">
                                    {(() => {
                                        const filteredGroups = SYMBOL_GROUPS.map(group => {
                                            const symbols = group.symbols.filter(sym => 
                                                sym.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                sym.id.toLowerCase().includes(searchQuery.toLowerCase())
                                            );
                                            return { ...group, symbols };
                                        }).filter(group => group.symbols.length > 0);

                                        if (filteredGroups.length === 0) {
                                            return (
                                                <div className="px-4 py-3 text-xs text-center" style={{ color: 'var(--text-tertiary)' }}>
                                                    No symbols found
                                                </div>
                                            );
                                        }

                                        return filteredGroups.map(group => (
                                            <div key={group.label}>
                                                <div
                                                    className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest"
                                                    style={{ color: 'var(--text-tertiary)' }}
                                                >
                                                    {group.label}
                                                </div>
                                                {group.symbols.map(sym => (
                                                    <button
                                                        key={sym.id}
                                                        onClick={() => {
                                                            setSelectedSymbol(sym);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-between"
                                                        style={{
                                                            color:
                                                                selectedSymbol.id === sym.id
                                                                    ? 'var(--accent)'
                                                                    : 'var(--text-primary)',
                                                            backgroundColor:
                                                                selectedSymbol.id === sym.id
                                                                    ? 'var(--accent-soft)'
                                                                    : 'transparent',
                                                        }}
                                                    >
                                                        {sym.name}
                                                        {selectedSymbol.id === sym.id && (
                                                            <span className="text-[10px]">✓</span>
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        ));
                                    })()}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Interval Selector */}
                    <div
                        className="flex items-center rounded-lg overflow-hidden"
                        style={{
                            backgroundColor: 'var(--nav-bg)',
                            border: '1px solid var(--border-light)',
                        }}
                    >
                        {INTERVALS.map(interval => (
                            <button
                                key={interval.id}
                                onClick={() => setSelectedInterval(interval)}
                                className="px-2.5 py-1.5 text-[10px] font-semibold transition-all duration-200 cursor-pointer"
                                style={{
                                    backgroundColor:
                                        selectedInterval.id === interval.id
                                            ? 'var(--nav-active-bg)'
                                            : 'transparent',
                                    color:
                                        selectedInterval.id === interval.id
                                            ? 'var(--nav-active-text)'
                                            : 'var(--text-tertiary)',
                                    boxShadow:
                                        selectedInterval.id === interval.id
                                            ? '0 0 0 1px var(--nav-active-ring)'
                                            : 'none',
                                }}
                            >
                                {interval.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Action Buttons */}
                <div className="flex items-center gap-2">
                    {/* Copy Chart Link */}
                    <button
                        onClick={handleCopyLink}
                        className="p-2 rounded-lg transition-all duration-200 cursor-pointer hover:opacity-70 flex items-center gap-1.5"
                        style={{
                            backgroundColor: copiedType === 'link' ? 'var(--win-bg)' : 'var(--nav-bg)',
                            color: copiedType === 'link' ? 'var(--win)' : 'var(--text-secondary)',
                            border: `1px solid ${copiedType === 'link' ? 'var(--win-border)' : 'var(--border-light)'}`,
                        }}
                        title="Copy TradingView search link"
                    >
                        {copiedType === 'link' ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Link2 className="w-4 h-4" />
                        )}
                    </button>

                    {/* Copy & Load Local Canvas Screenshot */}
                    <button
                        onClick={handleCopySnapshot}
                        className="p-2 rounded-lg transition-all duration-200 cursor-pointer hover:opacity-70 flex items-center gap-1.5"
                        style={{
                            backgroundColor: copiedType === 'chart' ? 'var(--win-bg)' : 'var(--nav-bg)',
                            color: copiedType === 'chart' ? 'var(--win)' : 'var(--text-secondary)',
                            border: `1px solid ${copiedType === 'chart' ? 'var(--win-border)' : 'var(--border-light)'}`,
                        }}
                        title="Copy chart screenshot directly to clipboard and input slots"
                    >
                        {copiedType === 'chart' ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Camera className="w-4 h-4" />
                        )}
                    </button>

                    {/* Fullscreen Toggle */}
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-lg transition-all duration-200 cursor-pointer hover:opacity-70"
                        style={{
                            backgroundColor: 'var(--nav-bg)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)',
                        }}
                        title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    >
                        {isFullscreen ? (
                            <Minimize2 className="w-4 h-4" />
                        ) : (
                            <Maximize2 className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>

            {/* ── TradingView Chart Container ─────────────────────────── */}
            <div className="flex-1 min-h-0 relative w-full h-full" style={{ minHeight: '350px' }}>
                {isLoadingData && (
                    <div 
                        className="absolute inset-0 flex items-center justify-center z-10 backdrop-blur-[1px]"
                        style={{ backgroundColor: 'rgba(28, 25, 23, 0.4)' }}
                    >
                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--accent)' }} />
                    </div>
                )}
                <div
                    ref={widgetRef}
                    className="w-full h-full"
                    style={{
                        backgroundColor: theme === 'dark' ? '#1C1917' : '#FFFFFF',
                        borderRadius: isFullscreen ? '0' : '0 0 16px 16px',
                        overflow: 'hidden',
                    }}
                />
            </div>
        </div>
    );
}
