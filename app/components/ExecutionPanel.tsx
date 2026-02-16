"use client";

import React from 'react';
import { BadgeCheck, TrendingUp, TrendingDown, Minus, Crosshair } from 'lucide-react';
import { twMerge } from "tailwind-merge";
import { toast } from 'sonner';

interface ExecutionPanelProps {
    status?: 'awaiting' | 'analyzing' | 'completed';
    result?: {
        signal: 'BUY' | 'SELL' | 'NEUTRAL';
        sl: number;
        tp: number;
        reasoning: string;
        confidence: number;
        asset?: string;
    }
}

export function ExecutionPanel({ status = 'awaiting', result }: ExecutionPanelProps) {
    const isAnalyzed = status === 'completed' && result;

    const copyToClipboard = (text: string, label: string) => {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).then(() => {
                toast.success(`${label} Copied`, { description: text });
            }).catch(err => {
                console.error('Failed to copy: ', err);
                toast.error('Failed to copy to clipboard');
            });
        } else {
            let textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.left = "-9999px";
            textArea.style.top = "0";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                toast.success(`${label} Copied`, { description: text });
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
                toast.error('Failed to copy to clipboard');
            }
            document.body.removeChild(textArea);
        }
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-stone-700 tracking-wide uppercase">AI Output</h2>
                    <p className="text-[11px] text-stone-400 mt-0.5">Signal, levels & reasoning</p>
                </div>
                {result?.asset && (
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-50 text-stone-500 font-mono border border-stone-200/80 font-semibold">
                        {result.asset}
                    </span>
                )}
            </div>

            <div className="flex-1 p-6 relative">
                {!isAnalyzed ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-30 select-none pointer-events-none p-12">
                        <div className="w-14 h-14 rounded-full bg-stone-50 flex items-center justify-center border border-stone-100 mb-4">
                            <Crosshair className="w-6 h-6 text-stone-300 stroke-1" />
                        </div>
                        <p className="text-xs font-medium text-stone-400">Upload charts to begin analysis</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Signal Section */}
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] text-stone-400 font-semibold uppercase tracking-[0.15em]">Signal</span>
                                <div className={twMerge(
                                    "px-4 py-1.5 rounded-full text-sm font-bold border",
                                    result.signal === 'BUY' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                                        result.signal === 'SELL' ? "bg-red-50 text-red-600 border-red-200" :
                                            "bg-amber-50 text-amber-600 border-amber-200"
                                )}>
                                    {result.confidence}% Confidence
                                </div>
                            </div>

                            <div className={twMerge(
                                "flex items-center justify-center gap-3 py-7 rounded-xl border transition-all",
                                result.signal === 'BUY' ? "bg-emerald-50/40 border-emerald-100" :
                                    result.signal === 'SELL' ? "bg-red-50/40 border-red-100" :
                                        "bg-stone-50 border-stone-100"
                            )}>
                                {result.signal === 'BUY' ? <TrendingUp className="w-7 h-7 text-emerald-500" /> :
                                    result.signal === 'SELL' ? <TrendingDown className="w-7 h-7 text-red-500" /> :
                                        <Minus className="w-7 h-7 text-stone-400" />}
                                <h1 className={twMerge(
                                    "text-4xl font-black tracking-tighter",
                                    result.signal === 'BUY' ? "text-emerald-600" :
                                        result.signal === 'SELL' ? "text-red-500" :
                                            "text-stone-400"
                                )}>
                                    {result.signal}
                                </h1>
                            </div>
                        </div>

                        {/* SL / TP Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => copyToClipboard(result.sl.toString(), 'Stop Loss')}
                                className="bg-stone-50/60 rounded-xl p-4 border border-stone-100 group hover:border-red-300 hover:bg-red-50/20 transition-all text-left cursor-pointer active:scale-[0.98]"
                            >
                                <span className="text-[10px] text-stone-400 uppercase tracking-[0.15em] font-semibold group-hover:text-red-500 transition-colors block mb-1">Stop Loss</span>
                                <p className="text-xl font-mono text-red-500 font-bold tracking-tight">
                                    {result.sl === 0 ? '---' : result.sl}
                                </p>
                            </button>

                            <button
                                onClick={() => copyToClipboard(result.tp.toString(), 'Take Profit')}
                                className="bg-stone-50/60 rounded-xl p-4 border border-stone-100 group hover:border-emerald-300 hover:bg-emerald-50/20 transition-all text-left cursor-pointer active:scale-[0.98]"
                            >
                                <span className="text-[10px] text-stone-400 uppercase tracking-[0.15em] font-semibold group-hover:text-emerald-500 transition-colors block mb-1">Take Profit</span>
                                <p className="text-xl font-mono text-emerald-600 font-bold tracking-tight">
                                    {result.tp === 0 ? '---' : result.tp}
                                </p>
                            </button>
                        </div>

                        {/* Reasoning */}
                        <div className="flex-1 bg-stone-50/60 rounded-xl p-5 border border-stone-100 overflow-y-auto min-h-[100px]">
                            <h3 className="text-[10px] text-stone-400 uppercase tracking-[0.15em] font-semibold mb-3 flex items-center gap-1.5">
                                <BadgeCheck className="w-3 h-3" />
                                Reasoning
                            </h3>
                            <p className="text-sm text-stone-600 leading-relaxed font-medium">
                                {result.reasoning}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
