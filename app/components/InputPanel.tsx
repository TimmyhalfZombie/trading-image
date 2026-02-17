"use client";

import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Loader2, Image as ImageIcon, CheckCircle2, Zap } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export interface InputPanelFiles {
    htf: File | null;
    mid: File | null;
    ltf: File | null;
}

interface InputPanelProps {
    files: InputPanelFiles;
    onFilesChange: (files: InputPanelFiles) => void;
    onAnalyze: (files: { htf: File, mid: File, ltf: File }) => void;
    isLoading?: boolean;
    hasAnalyzed?: boolean;
}

interface SingleDropzoneProps {
    label: string;
    subLabel: string;
    file: File | null;
    onDrop: (file: File) => void;
    onRemove: () => void;
    disabled?: boolean;
    className?: string;
}

function SingleDropzone({ label, subLabel, file, onDrop, onRemove, disabled, className }: SingleDropzoneProps) {
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
            {file && preview ? (
                <div className="relative w-full h-full bg-stone-900 rounded-xl border border-stone-700 overflow-hidden group">
                    <img
                        src={preview}
                        alt={label}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />
                    <div className="absolute inset-x-0 bottom-0 p-3 flex items-end justify-between">
                        <div className="min-w-0">
                            <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">{label}</p>
                            <p className="text-xs text-white/80 truncate font-medium">{file.name}</p>
                        </div>
                        {!disabled && (
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
                        isDragActive
                            ? "border-amber-400 bg-amber-50/30"
                            : "border-stone-200 hover:border-amber-300 hover:bg-stone-50/50",
                        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-2">
                        <div className={twMerge(
                            "w-9 h-9 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 transition-all group-hover:scale-110 duration-300",
                            isDragActive && "bg-amber-50 border-amber-200"
                        )}>
                            <Upload className={twMerge("w-4 h-4 text-stone-300", isDragActive && "text-amber-500")} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-stone-600">{label}</p>
                            <p className="text-[10px] text-stone-400 uppercase tracking-wide">{subLabel}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export function InputPanel({ files, onFilesChange, onAnalyze, isLoading = false, hasAnalyzed = false }: InputPanelProps) {
    const isReady = files.htf && files.mid && files.ltf;
    const canAnalyze = isReady && !isLoading;

    const handleAnalyze = () => {
        if (canAnalyze) {
            onAnalyze({
                htf: files.htf!,
                mid: files.mid!,
                ltf: files.ltf!
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden flex-shrink-0">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-stone-700 tracking-wide uppercase">Chart Input</h2>
                    <p className="text-[11px] text-stone-400 mt-0.5">Upload multi-timeframe screenshots</p>
                </div>
                {isLoading && <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>}
            </div>

            <div className="flex-1 p-5 flex flex-col gap-3 overflow-hidden">
                <SingleDropzone
                    label="Higher Timeframe"
                    subLabel="4H Chart"
                    file={files.htf}
                    onDrop={(f) => onFilesChange({ ...files, htf: f })}
                    onRemove={() => onFilesChange({ ...files, htf: null })}
                    disabled={isLoading}
                    className="flex-1 min-h-0"
                />

                <SingleDropzone
                    label="Intermediate"
                    subLabel="1H Chart"
                    file={files.mid}
                    onDrop={(f) => onFilesChange({ ...files, mid: f })}
                    onRemove={() => onFilesChange({ ...files, mid: null })}
                    disabled={isLoading}
                    className="flex-1 min-h-0"
                />

                <SingleDropzone
                    label="Lower Timeframe"
                    subLabel="15M Chart"
                    file={files.ltf}
                    onDrop={(f) => onFilesChange({ ...files, ltf: f })}
                    onRemove={() => onFilesChange({ ...files, ltf: null })}
                    disabled={isLoading}
                    className="flex-1 min-h-0"
                />
            </div>

            <div className="p-5 pt-0 mt-auto">
                <button
                    onClick={handleAnalyze}
                    disabled={!canAnalyze}
                    className={twMerge(
                        "w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2",
                        canAnalyze
                            ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md shadow-amber-200/50 active:scale-[0.98]"
                            : "bg-stone-100 text-stone-400 cursor-not-allowed"
                    )}
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
