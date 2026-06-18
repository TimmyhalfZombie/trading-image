"use client";

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Image as ImageIcon, Zap, Trash2, Copy, Check, Link } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useToast } from './Toast';

export interface InputPanelFiles {
    htf: File | string | null;
    mid: File | string | null;
    ltf: File | string | null;
}

export interface ChartUrls {
    htf?: string | null;
    mid?: string | null;
    ltf?: string | null;
}

interface InputPanelProps {
    files: InputPanelFiles;
    onFilesChange: (files: InputPanelFiles) => void;
    onAnalyze: (files: { htf: File | string | null, mid: File | string | null, ltf: File | string | null }) => void;
    onClearAll?: () => void;
    isLoading?: boolean;
    hasAnalyzed?: boolean;
    chartUrls?: ChartUrls;
}

interface SingleDropzoneProps {
    label: string;
    subLabel: string;
    file: File | string | null;
    onDrop: (file: File | string) => void;
    onRemove: () => void;
    disabled?: boolean;
    className?: string;
    previewUrl?: string | null;
}

/* ── Helper to resolve direct image link for TradingView snapshot ── */
function getDirectImageUrl(url: string): string | null {
    const trimmed = url.trim();
    
    // Check if it's a TradingView chart layout URL (warn user)
    if (trimmed.includes('tradingview.com/chart')) {
        return 'warning_chart_url';
    }

    // Check if it's a TradingView snapshot URL (e.g. tradingview.com/x/abcd123/)
    const tvMatch = trimmed.match(/tradingview\.com\/x\/([a-zA-Z0-9]+)/i);
    if (tvMatch) {
        const code = tvMatch[1];
        const firstChar = code.charAt(0).toLowerCase();
        return `https://s3.tradingview.com/snapshots/${firstChar}/${code}.png`;
    }

    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    
    return null;
}

function SingleDropzone({ label, subLabel, file, onDrop, onRemove, disabled, className, previewUrl }: SingleDropzoneProps) {
    const [preview, setPreview] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [linkError, setLinkError] = useState(false);
    const linkInputRef = useRef<HTMLInputElement>(null);
    const toast = useToast();

    React.useEffect(() => {
        if (file) {
            if (file instanceof File) {
                const url = URL.createObjectURL(file);
                setPreview(url);
                return () => URL.revokeObjectURL(url);
            } else if (typeof file === 'string') {
                setPreview(file);
            }
        } else {
            setPreview(null);
        }
    }, [file]);

    // Use previewUrl from history, or link preview, when no file is uploaded
    const displayUrl = preview || previewUrl || null;
    const isHistoryPreview = !file && !!previewUrl;
    const isLinkPreview = typeof file === 'string';

    /* ── Click image → copy URL to clipboard ───────────────────────── */
    const handleCopyUrl = useCallback(async () => {
        const urlToCopy = displayUrl;
        if (!urlToCopy) return;
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(urlToCopy);
            } else {
                const ta = document.createElement('textarea');
                ta.value = urlToCopy;
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus(); ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            toast.success('Image link copied to clipboard!', 'Copied');
            setTimeout(() => setCopied(false), 1500);
        } catch { /* silent */ }
    }, [displayUrl, toast]);

    /* ── Handle link URL input ─────────────────────────────────────── */
    const handleLinkSubmit = useCallback((inputUrl: string) => {
        const trimmed = inputUrl.trim();
        if (!trimmed) return;

        const resolved = getDirectImageUrl(trimmed);
        
        if (resolved === 'warning_chart_url') {
            toast.info(
                "That is an interactive chart link. To analyze, click the Camera icon in TradingView -> 'Copy link to chart image' and paste that link here instead, or screenshot it (Win+Shift+S).",
                "Use Chart Image Link",
                8000
            );
            setLinkUrl('');
            return;
        }

        if (resolved) {
            onDrop(resolved);
            setLinkUrl('');
            setLinkError(false);
        } else {
            setLinkError(true);
            setLinkUrl('');
            setTimeout(() => setLinkError(false), 2000);
        }
    }, [onDrop, toast]);

    /* ── Handle link input paste event ─────────────────────────────── */
    const handleLinkPaste = useCallback((e: React.ClipboardEvent<HTMLInputElement>) => {
        const text = e.clipboardData.getData('text/plain')?.trim();
        if (text) {
            setTimeout(() => handleLinkSubmit(text), 50);
        }
    }, [handleLinkSubmit]);

    const onDropCallback = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            onDrop(acceptedFiles[0]);
        }
    }, [onDrop]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: onDropCallback,
        maxFiles: 1,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
        disabled: disabled || !!file
    });

    return (
        <div className={twMerge("w-full relative transition-all flex flex-col", className)}>
            {displayUrl ? (
                <div
                    className="relative w-full flex-1 rounded-xl overflow-hidden group cursor-pointer"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                    }}
                    onClick={handleCopyUrl}
                    title="Click to copy image URL"
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={displayUrl}
                        alt={label}
                        className={twMerge(
                            "w-full h-full object-cover",
                            (isHistoryPreview || isLinkPreview)
                                ? "opacity-100"
                                : "opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                        )}
                        referrerPolicy="no-referrer"
                        onError={() => {
                            // If this was a link preview that failed, remove it
                            if (isLinkPreview) {
                                onRemove();
                                setLinkError(true);
                                setTimeout(() => setLinkError(false), 2000);
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                    {/* Copied feedback overlay */}
                    <div
                        className="absolute inset-0 flex items-center justify-center transition-all duration-300 pointer-events-none"
                        style={{
                            backgroundColor: copied ? 'rgba(0,0,0,0.55)' : 'transparent',
                            opacity: copied ? 1 : 0,
                        }}
                    >
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/90 text-white text-xs font-bold shadow-lg">
                            <Check className="w-3.5 h-3.5" />
                            Link Copied!
                        </div>
                    </div>

                    {/* Copy icon hint on hover */}
                    <div className="absolute top-2 left-2 p-1.5 bg-black/40 backdrop-blur-sm rounded-lg text-white/70 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <Copy className="w-3 h-3" />
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">{label}</p>
                            <p className="text-xs text-white/80 truncate font-medium">
                                {isHistoryPreview ? 'From history' : isLinkPreview ? 'From URL' : (file as File)?.name}
                            </p>
                        </div>
                        {!disabled && (isLinkPreview || (!isHistoryPreview && file)) && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemove();
                                }}
                                className="p-1.5 bg-white/10 hover:bg-red-500/80 backdrop-blur-md rounded-lg text-white transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="absolute top-2 right-2 p-1 bg-amber-500/90 rounded-full">
                        {isLinkPreview ? <Link className="w-3 h-3 text-white" /> : <ImageIcon className="w-3 h-3 text-white" />}
                    </div>
                </div>
            ) : (
                <div className="flex flex-col flex-1 gap-0 min-h-0">
                    {/* Drop zone area */}
                    <div
                        {...getRootProps()}
                        className={twMerge(
                            "flex-1 border-2 border-dashed rounded-t-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center p-3 relative group",
                            disabled && "opacity-50 cursor-not-allowed pointer-events-none",
                        )}
                        style={{
                            borderLeftColor: isDragActive ? 'var(--accent)' : 'var(--border)',
                            borderRightColor: isDragActive ? 'var(--accent)' : 'var(--border)',
                            borderTopColor: isDragActive ? 'var(--accent)' : 'var(--border)',
                            borderBottomColor: 'transparent',
                            backgroundColor: isDragActive ? 'var(--accent-glow)' : 'transparent',
                        }}
                    >
                        <input {...getInputProps()} />
                        <div className="flex flex-col items-center gap-1.5">
                            <div
                                className={twMerge(
                                    "w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110 duration-300"
                                )}
                                style={{
                                    backgroundColor: isDragActive ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                                    border: `1px solid ${isDragActive ? 'var(--accent)' : 'var(--border-light)'}`,
                                }}
                            >
                                <Upload
                                    className="w-3.5 h-3.5"
                                    style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
                                />
                            </div>
                            <div>
                                <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                                <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{subLabel}</p>
                            </div>
                        </div>
                    </div>

                    {/* Link paste area at the bottom */}
                    <div
                        className="flex items-center gap-2 px-2.5 py-2 rounded-b-xl border-2 border-dashed transition-all"
                        style={{
                            borderLeftColor: linkError ? 'var(--loss)' : 'var(--border)',
                            borderRightColor: linkError ? 'var(--loss)' : 'var(--border)',
                            borderBottomColor: linkError ? 'var(--loss)' : 'var(--border)',
                            borderTopColor: 'transparent',
                            backgroundColor: linkError ? 'var(--loss-bg)' : 'var(--surface-alt)',
                        }}
                    >
                        <Link
                            className="w-3 h-3 flex-shrink-0"
                            style={{ color: linkError ? 'var(--loss)' : 'var(--text-tertiary)' }}
                        />
                        <input
                            ref={linkInputRef}
                            type="text"
                            value={linkUrl}
                            onChange={(e) => setLinkUrl(e.target.value)}
                            onPaste={handleLinkPaste}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleLinkSubmit(linkUrl);
                                }
                            }}
                            placeholder="Paste image URL"
                            disabled={disabled}
                            className="flex-1 bg-transparent outline-none text-[10px] font-medium placeholder:opacity-50 min-w-0"
                            style={{
                                color: linkError ? 'var(--loss)' : 'var(--text-secondary)',
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export function InputPanel({ files, onFilesChange, onAnalyze, onClearAll, isLoading = false, hasAnalyzed = false, chartUrls }: InputPanelProps) {
    const isReady = !!(files.htf || files.mid || files.ltf);
    const hasAnyFile = files.htf || files.mid || files.ltf;
    const hasAnyChartUrl = chartUrls?.htf || chartUrls?.mid || chartUrls?.ltf;
    const canAnalyze = isReady && !isLoading;
    const toast = useToast();

    // ── Global clipboard paste listener (Ctrl+V) ──────────────────────────
    useEffect(() => {
        if (isLoading) return;

        const handleGlobalPaste = (e: ClipboardEvent) => {
            // Don't intercept if user is typing inside an input element
            const target = e.target as HTMLElement;
            if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
                return;
            }

            // A. Check for clipboard image files (e.g. screenshot pastes)
            const items = e.clipboardData?.items;
            if (items) {
                for (const item of Array.from(items)) {
                    if (item.type.startsWith('image/')) {
                        const pastedFile = item.getAsFile();
                        if (pastedFile) {
                            e.preventDefault();

                            // Find the first empty timeframe slot
                            let slotKey: keyof InputPanelFiles | null = null;
                            if (!files.htf) slotKey = 'htf';
                            else if (!files.mid) slotKey = 'mid';
                            else if (!files.ltf) slotKey = 'ltf';

                            if (slotKey) {
                                onFilesChange({
                                    ...files,
                                    [slotKey]: pastedFile
                                });
                                toast.success(
                                    `Pasted image into ${slotKey === 'htf' ? 'Higher Timeframe' : slotKey === 'mid' ? 'Intermediate' : 'Lower Timeframe'}`,
                                    'Chart Pasted'
                                );
                            } else {
                                toast.warning('All timeframe slots are full. Clear a slot to paste.', 'Slots Full');
                            }
                            return;
                        }
                    }
                }
            }

            // B. Check for text/URL pasted globally
            const text = e.clipboardData?.getData('text/plain')?.trim();
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                const resolved = getDirectImageUrl(text);

                if (resolved === 'warning_chart_url') {
                    e.preventDefault();
                    toast.info(
                        "That is an interactive chart link. To analyze, click the Camera icon in TradingView -> 'Copy link to chart image' and paste that link here instead, or screenshot it (Win+Shift+S).",
                        "Use Chart Image Link",
                        8000
                    );
                    return;
                }

                if (resolved) {
                    e.preventDefault();
                    // Find first empty timeframe slot
                    let slotKey: keyof InputPanelFiles | null = null;
                    if (!files.htf) slotKey = 'htf';
                    else if (!files.mid) slotKey = 'mid';
                    else if (!files.ltf) slotKey = 'ltf';

                    if (slotKey) {
                        onFilesChange({
                            ...files,
                            [slotKey]: resolved
                        });
                        toast.success(
                            `Loaded image URL into ${slotKey === 'htf' ? 'Higher Timeframe' : slotKey === 'mid' ? 'Intermediate' : 'Lower Timeframe'}`,
                            'Image URL Added'
                        );
                    } else {
                        toast.warning('All timeframe slots are full. Clear a slot to paste.', 'Slots Full');
                    }
                }
            }
        };

        window.addEventListener('paste', handleGlobalPaste);
        return () => window.removeEventListener('paste', handleGlobalPaste);
    }, [files, onFilesChange, toast, isLoading]);

    const handleAnalyze = () => {
        if (canAnalyze) {
            onAnalyze({
                htf: files.htf,
                mid: files.mid,
                ltf: files.ltf
            });
        }
    };

    return (
        <div
            className="panel-container flex flex-col h-full rounded-2xl shadow-sm overflow-hidden flex-shrink-0 transition-colors duration-300"
            style={{
                backgroundColor: 'var(--surface)',
                border: '1px solid var(--border-light)',
            }}
        >
            <div
                className="px-6 py-4 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-light)' }}
            >
                <div>
                    <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>Chart Input</h2>
                    <p className="text-[11px] mt-0.5 hidden md:block" style={{ color: 'var(--text-tertiary)' }}>Upload multi-timeframe screenshots</p>
                </div>
                <div className="flex items-center gap-2">

                    {(hasAnyFile || !!hasAnyChartUrl) && !isLoading && (
                        <button
                            onClick={() => {
                                onFilesChange({ htf: null, mid: null, ltf: null });
                                if (onClearAll) onClearAll();
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider transition-all duration-200 hover:scale-105 active:scale-95"
                            style={{
                                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.2)',
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                            }}
                        >
                            <Trash2 className="w-3 h-3" />
                            Remove All
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 p-3 md:p-5 flex flex-col md:flex-row lg:flex-col gap-2 md:gap-3 overflow-hidden">
                <SingleDropzone
                    label="Higher Timeframe"
                    subLabel="4H Chart"
                    file={files.htf}
                    onDrop={(f) => onFilesChange({ ...files, htf: f })}
                    onRemove={() => onFilesChange({ ...files, htf: null })}
                    disabled={isLoading}
                    className="flex-1 min-h-[110px] md:min-h-0"
                    previewUrl={chartUrls?.htf}
                />

                <SingleDropzone
                    label="Intermediate"
                    subLabel="1H Chart"
                    file={files.mid}
                    onDrop={(f) => onFilesChange({ ...files, mid: f })}
                    onRemove={() => onFilesChange({ ...files, mid: null })}
                    disabled={isLoading}
                    className="flex-1 min-h-[110px] md:min-h-0"
                    previewUrl={chartUrls?.mid}
                />

                <SingleDropzone
                    label="Lower Timeframe"
                    subLabel="15M Chart"
                    file={files.ltf}
                    onDrop={(f) => onFilesChange({ ...files, ltf: f })}
                    onRemove={() => onFilesChange({ ...files, ltf: null })}
                    disabled={isLoading}
                    className="flex-1 min-h-[110px] md:min-h-0"
                    previewUrl={chartUrls?.ltf}
                />
            </div>

            <div className="p-4 md:p-5 pt-0 mt-auto flex-shrink-0">
                <button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                    className={twMerge(
                        "w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2",
                        canAnalyze
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-500/20 active:scale-[0.98]"
                            : "cursor-not-allowed"
                    )}
                    style={!canAnalyze ? {
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-tertiary)',
                    } : undefined}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Analyzing...
                        </>
                    ) : (
                        <>
                            <Zap className="w-4 h-4" />
                            Analyze
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
