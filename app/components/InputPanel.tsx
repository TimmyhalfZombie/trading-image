"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Image as ImageIcon, Zap, Trash2 } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface InputPanelFiles {
    htf: File | null;
    mid: File | null;
    ltf: File | null;
}

export interface ChartUrls {
    htf?: string | null;
    mid?: string | null;
    ltf?: string | null;
}

interface InputPanelProps {
    files: InputPanelFiles;
    onFilesChange: (files: InputPanelFiles) => void;
    onAnalyze: (files: { htf: File | null, mid: File | null, ltf: File | null }) => void;
    onClearAll?: () => void;
    isLoading?: boolean;
    hasAnalyzed?: boolean;
    chartUrls?: ChartUrls;
}

interface SingleDropzoneProps {
    label: string;
    subLabel: string;
    file: File | null;
    onDrop: (file: File) => void;
    onRemove: () => void;
    disabled?: boolean;
    className?: string;
    previewUrl?: string | null;
}

function SingleDropzone({ label, subLabel, file, onDrop, onRemove, disabled, className, previewUrl }: SingleDropzoneProps) {
    const [preview, setPreview] = useState<string | null>(null);

    React.useEffect(() => {
        if (file) {
            const url = URL.createObjectURL(file);
            setPreview(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreview(null);
        }
    }, [file]);

    // Use previewUrl from history when no file is uploaded
    const displayUrl = preview || previewUrl || null;
    const isHistoryPreview = !file && !!previewUrl;

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
        <div className={twMerge("w-full relative transition-all", className)}>
            {displayUrl ? (
                <div
                    className="relative w-full h-full rounded-xl overflow-hidden group"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                    }}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={displayUrl}
                        alt={label}
                        className={twMerge(
                            "w-full h-full object-cover",
                            isHistoryPreview
                                ? "opacity-100" // No CSS delay/opacity dims for history images
                                : "opacity-80 group-hover:opacity-100 transition-opacity duration-500" // Smooth hover for uploads
                        )}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">{label}</p>
                            <p className="text-xs text-white/80 truncate font-medium">
                                {isHistoryPreview ? 'From history' : file?.name}
                            </p>
                        </div>
                        {!disabled && !isHistoryPreview && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onRemove(); }}
                                className="p-1.5 bg-white/10 hover:bg-red-500/80 backdrop-blur-md rounded-lg text-white transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                    <div className="absolute top-2 right-2 p-1 bg-amber-500/90 rounded-full">
                        <ImageIcon className="w-3 h-3 text-white" />
                    </div>
                </div>
            ) : (
                <div
                    {...getRootProps()}
                    className={twMerge(
                        "w-full h-full border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer flex flex-col items-center justify-center text-center p-4 relative group",
                        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                    style={{
                        borderColor: isDragActive ? 'var(--accent)' : 'var(--border)',
                        backgroundColor: isDragActive ? 'var(--accent-glow)' : 'transparent',
                    }}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2">
                        <div
                            className={twMerge(
                                "w-9 h-9 rounded-full flex items-center justify-center transition-all group-hover:scale-110 duration-300"
                            )}
                            style={{
                                backgroundColor: isDragActive ? 'var(--accent-soft)' : 'var(--bg-secondary)',
                                border: `1px solid ${isDragActive ? 'var(--accent)' : 'var(--border-light)'}`,
                            }}
                        >
                            <Upload
                                className="w-4 h-4"
                                style={{ color: isDragActive ? 'var(--accent)' : 'var(--text-tertiary)' }}
                            />
                        </div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                            <p className="text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{subLabel}</p>
                        </div>
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
