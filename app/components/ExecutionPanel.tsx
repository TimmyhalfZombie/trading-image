"use client";

import React from 'react';
import { BadgeCheck, TrendingUp, TrendingDown, Minus, Crosshair } from 'lucide-react';
import { twMerge } from "tailwind-merge";
import { toast } from 'sonner';

interface ExecutionPanelProps {
    status?: 'awaiting' | 'analyzing' | 'completed';
    result?: {
        signal: 'BUY' | 'SELL' | 'WAIT' | 'NEUTRAL';
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
        <div
            className="flex flex-col h-full rounded-2xl shadow-sm overflow-hidden transition-colors duration-300"
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
                    <h2 className="text-sm font-bold tracking-wide uppercase" style={{ color: 'var(--text-primary)' }}>AI Output</h2>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Signal, levels & reasoning</p>
                </div>
                {result?.asset && (
                    <span
                        className="text-[11px] px-2.5 py-1 rounded-lg font-mono font-semibold"
                        style={{
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-light)',
                        }}
                    >
                        {result.asset}
                    </span>
                )}
            </div>

            <div className="flex-1 p-6 relative min-h-0">
                {!isAnalyzed ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-30 select-none pointer-events-none p-12">
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
                            style={{
                                backgroundColor: 'var(--bg-secondary)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            <Crosshair className="w-6 h-6 stroke-1" style={{ color: 'var(--text-tertiary)' }} />
                        </div>
                        <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Upload charts to begin analysis</p>
                    </div>
                ) : (
                    <div className="flex flex-col h-full gap-5 animate-in fade-in slide-in-from-right-4 duration-500">
                        {/* Signal Section */}
                        <div className="flex flex-col gap-3 flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: 'var(--text-tertiary)' }}>Signal</span>
                                <div
                                    className="px-4 py-1.5 rounded-full text-sm font-bold"
                                    style={{
                                        backgroundColor: result.signal === 'BUY' ? 'var(--win-bg)' :
                                            result.signal === 'SELL' ? 'var(--loss-bg)' : 'var(--accent-soft)',
                                        color: result.signal === 'BUY' ? 'var(--win)' :
                                            result.signal === 'SELL' ? 'var(--loss)' : 'var(--accent)',
                                        border: `1px solid ${result.signal === 'BUY' ? 'var(--win-border)' :
                                            result.signal === 'SELL' ? 'var(--loss-border)' : 'var(--accent-glow)'}`,
                                    }}
                                >
                                    {result.confidence}% Confidence
                                </div>
                            </div>

                            <div
                                className="flex items-center justify-center gap-3 py-7 rounded-xl transition-all"
                                style={{
                                    backgroundColor: result.signal === 'BUY' ? 'var(--win-bg)' :
                                        result.signal === 'SELL' ? 'var(--loss-bg)' : 'var(--neutral-bg)',
                                    border: `1px solid ${result.signal === 'BUY' ? 'var(--win-border)' :
                                        result.signal === 'SELL' ? 'var(--loss-border)' : 'var(--neutral-border)'}`,
                                }}
                            >
                                {result.signal === 'BUY' ? <TrendingUp className="w-7 h-7" style={{ color: 'var(--win)' }} /> :
                                    result.signal === 'SELL' ? <TrendingDown className="w-7 h-7" style={{ color: 'var(--loss)' }} /> :
                                        <Minus className="w-7 h-7" style={{ color: 'var(--text-tertiary)' }} />}
                                <h1
                                    className="text-4xl font-black tracking-tighter"
                                    style={{
                                        color: result.signal === 'BUY' ? 'var(--win)' :
                                            result.signal === 'SELL' ? 'var(--loss)' : 'var(--text-tertiary)',
                                    }}
                                >
                                    {result.signal}
                                </h1>
                            </div>
                        </div>

                        {/* SL / TP Grid */}
                        <div className="grid grid-cols-2 gap-3 flex-shrink-0">
                            <button
                                onClick={() => copyToClipboard(result.sl.toString(), 'Stop Loss')}
                                className="rounded-xl p-4 group transition-all text-left cursor-pointer active:scale-[0.98]"
                                style={{
                                    backgroundColor: 'var(--surface-alt)',
                                    border: '1px solid var(--border-light)',
                                }}
                            >
                                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold block mb-1" style={{ color: 'var(--text-tertiary)' }}>Stop Loss</span>
                                <p className="text-xl font-mono font-bold tracking-tight" style={{ color: 'var(--loss)' }}>
                                    {result.sl === 0 ? '---' : result.sl}
                                </p>
                            </button>

                            <button
                                onClick={() => copyToClipboard(result.tp.toString(), 'Take Profit')}
                                className="rounded-xl p-4 group transition-all text-left cursor-pointer active:scale-[0.98]"
                                style={{
                                    backgroundColor: 'var(--surface-alt)',
                                    border: '1px solid var(--border-light)',
                                }}
                            >
                                <span className="text-[10px] uppercase tracking-[0.15em] font-semibold block mb-1" style={{ color: 'var(--text-tertiary)' }}>Take Profit</span>
                                <p className="text-xl font-mono font-bold tracking-tight" style={{ color: 'var(--win)' }}>
                                    {result.tp === 0 ? '---' : result.tp}
                                </p>
                            </button>
                        </div>

                        {/* Reasoning */}
                        <div
                            className="flex-1 rounded-xl p-5 overflow-y-auto min-h-0"
                            style={{
                                backgroundColor: 'var(--surface-alt)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            <h3 className="text-[10px] uppercase tracking-[0.15em] font-semibold mb-3 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                                <BadgeCheck className="w-3 h-3" />
                                Reasoning
                            </h3>
                            <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                                {result.reasoning}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
