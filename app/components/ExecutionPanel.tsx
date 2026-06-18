"use client";

import React, { useState } from 'react';
import { 
    BadgeCheck, 
    TrendingUp, 
    TrendingDown, 
    Minus, 
    Crosshair, 
    Loader2, 
    Target, 
    Activity, 
    Compass, 
    Code, 
    Copy, 
    Check, 
    Clock, 
    AlertTriangle, 
    AlertCircle, 
    Newspaper, 
    ArrowRight, 
    ShieldCheck, 
    ChevronRight, 
    ChevronDown, 
    ShieldAlert, 
    Sparkles 
} from 'lucide-react';

/* ── Skeleton shimmer animation ───────── */
const skeletonStyles = `
@keyframes hive-skeleton-shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}
.hive-skeleton-bone {
  position: relative;
  overflow: hidden;
  border-radius: 8px;
  background: var(--bg-secondary);
}
.hive-skeleton-bone::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--skeleton-shine, rgba(255,255,255,0.06)) 50%,
    transparent 100%
  );
  background-size: 400px 100%;
  animation: hive-skeleton-shimmer 1.8s ease-in-out infinite;
}
:root {
  --skeleton-shine: rgba(0,0,0,0.04);
}
[data-theme="dark"] {
  --skeleton-shine: rgba(255,255,255,0.06);
}
`;

interface ExecutionPanelProps {
    status?: 'awaiting' | 'analyzing' | 'completed';
    result?: {
        signal: 'BUY' | 'SELL' | 'WAIT' | 'NEUTRAL';
        sl: number;
        tp: number;
        reasoning: string;
        confidence: number;
        asset?: string;
        chartHtfUrl?: string | null;
        chartMidUrl?: string | null;
        chartLtfUrl?: string | null;

        // New rich analytical fields from backend workflow
        setup_type?: string;
        setup_model?: string;
        entry_price?: number;
        tp1?: number;
        tp2?: number;
        tp3_runner?: number;
        tp1_action?: string;
        tp2_action?: string;
        tp3_action?: string;
        rr_ratio?: string;
        rr_to_tp2?: string;
        rr_to_tp3?: string;
        volatility_level?: string;
        news_sentiment?: string;
        news_summary?: string;
        active_session?: string;
        active_killzone?: string;
        pht_time?: string;
        wait_reason?: string;
        failed_timeframe?: string;
        failed_candle?: string;
        failed_step?: string;
        next_step?: string;
        recheck_after?: string;
        overall_chart_summary?: string;
        y_axis_mismatch?: boolean;
        price_source?: string;
        price_source_reason?: string;
        confidence_breakdown?: string;
        math_check?: string;
        ict_pre_analysis?: {
            midnight_open_price?: number;
            daily_bias?: string;
            price_position?: string;
            asian_range_high?: number;
            asian_range_low?: number;
            pdh?: number;
            pdl?: number;
            judas_swing_detected?: boolean;
            judas_swing_direction?: string;
            judas_swing_sweep_price?: number;
            ote_zone_low?: number;
            ote_zone_high?: number;
            po3_phase?: string;
            smt_divergence_detected?: boolean;
            smt_divergence_type?: string;
            analysis?: string;
        };
        gate1_4h?: {
            trend?: string;
            bos_confirmed?: boolean;
            bos_direction?: string;
            nearest_ob_price?: number;
            fvg_range?: string;
            gate_passed?: boolean;
            gate_fail_reason?: string;
            analysis?: string;
        };
        gate2_1h?: {
            aligns_with_4h?: boolean;
            choch_observed?: boolean;
            choch_direction?: string;
            premium_or_discount?: string;
            gate_passed?: boolean;
            gate_fail_reason?: string;
            analysis?: string;
        };
        gate3_15m?: {
            liquidity_sweep_occurred?: boolean;
            sweep_direction?: string;
            sweep_price?: number;
            mss_confirmed?: boolean;
            mss_direction?: string;
            price_in_ote_zone?: boolean;
            entry_ob_price?: number;
            gate_passed?: boolean;
            gate_fail_reason?: string;
            analysis?: string;
        };
    }
}

function Bone({ className = '', style = {} }: { className?: string; style?: React.CSSProperties }) {
    return <div className={`hive-skeleton-bone ${className}`} style={style} />;
}

function SkeletonLoading() {
    return (
        <div className="flex flex-col gap-5 animate-in fade-in duration-500">
            <div className="flex flex-col gap-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <Bone style={{ width: 64, height: 12 }} />
                    <Bone style={{ width: 140, height: 28, borderRadius: 9999 }} />
                </div>
                <div className="flex items-center justify-center gap-3 py-8 rounded-xl" style={{ backgroundColor: 'var(--neutral-bg)', border: '1px solid var(--neutral-border)' }}>
                    <Bone style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    <Bone style={{ width: 140, height: 36 }} />
                </div>
            </div>
            <div className="grid grid-cols-3 gap-3 flex-shrink-0">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border-light)' }}>
                        <Bone style={{ width: 48, height: 10, marginBottom: 8 }} />
                        <Bone style={{ width: 70, height: 20 }} />
                    </div>
                ))}
            </div>
            <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--surface-alt)', border: '1px solid var(--border-light)' }}>
                <Bone style={{ width: 90, height: 12, marginBottom: 16 }} />
                <div className="flex flex-col gap-2.5">
                    <Bone style={{ width: '100%', height: 12 }} />
                    <Bone style={{ width: '95%', height: 12 }} />
                    <Bone style={{ width: '88%', height: 12 }} />
                </div>
            </div>
        </div>
    );
}

export function ExecutionPanel({ status = 'awaiting', result }: ExecutionPanelProps) {
    const isAnalyzed = status === 'completed' && result;
    const isAnalyzing = status === 'analyzing';

    const [activeTab, setActiveTab] = useState<'targets' | 'structure' | 'gates' | 'technical'>('targets');
    const [copiedText, setCopiedText] = useState<string | null>(null);

    const copyToClipboard = (text: string, label: string) => {
        if (!text) return;
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text).catch(() => {});
        } else {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.left = '-9999px';
            document.body.appendChild(ta);
            ta.focus(); ta.select();
            try { document.execCommand('copy'); } catch {}
            document.body.removeChild(ta);
        }
        setCopiedText(label);
        setTimeout(() => setCopiedText(null), 1500);
    };

    const isWaitOrNeutral = result?.signal === 'WAIT' || result?.signal === 'NEUTRAL';
    const hasRichData = result && (result.setup_type || result.ict_pre_analysis || result.gate1_4h);

    return (
        <>
            <style dangerouslySetInnerHTML={{ __html: skeletonStyles }} />

            <div
                className="panel-container flex flex-col h-full rounded-2xl shadow-md overflow-hidden transition-all duration-300"
                style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border-light)',
                }}
            >
                {/* Header */}
                <div
                    className="px-5 py-4 flex items-center justify-between flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--border-light)', backgroundColor: 'var(--surface-alt)' }}
                >
                    <div className="flex items-center gap-2.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                        <div>
                            <h2 className="text-sm font-black tracking-wide uppercase text-[12px] md:text-sm" style={{ color: 'var(--text-primary)' }}>
                                ICT Execution Core
                            </h2>
                            <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                                {isAnalyzing ? 'Processing market footprints...' : 'Institutional orderflow analysis'}
                            </p>
                        </div>
                    </div>
                    {isAnalyzing ? (
                        <Bone style={{ width: 80, height: 24, borderRadius: 8 }} />
                    ) : result?.asset ? (
                        <div className="flex items-center gap-1.5">
                            {result.setup_type && result.setup_type !== 'No ICT Setup' && (
                                <span
                                    className="hidden sm:inline-block text-[9px] px-2 py-0.5 rounded font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20"
                                >
                                    {result.setup_type}
                                </span>
                            )}
                            <span
                                className="text-[11px] px-2.5 py-1 rounded-lg font-mono font-bold tracking-tight bg-black/10 dark:bg-white/10"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                {result.asset}
                            </span>
                        </div>
                    ) : null}
                </div>

                {/* Sub-Navigation Tabs (Only when completed & rich data is loaded) */}
                {isAnalyzed && hasRichData && (
                    <div 
                        className="flex border-b overflow-x-auto no-scrollbar flex-shrink-0" 
                        style={{ 
                            borderBottomColor: 'var(--border-light)',
                            backgroundColor: 'var(--surface-alt)' 
                        }}
                    >
                        <button
                            onClick={() => setActiveTab('targets')}
                            className="flex-1 py-3 px-4 text-[11px] font-bold uppercase tracking-wider border-b-2 text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5"
                            style={{
                                color: activeTab === 'targets' ? 'var(--accent)' : 'var(--text-secondary)',
                                borderBottomColor: activeTab === 'targets' ? 'var(--accent)' : 'transparent',
                            }}
                        >
                            <Target className="w-3.5 h-3.5" />
                            Targets &amp; Flow
                        </button>
                        <button
                            onClick={() => setActiveTab('structure')}
                            className="flex-1 py-3 px-4 text-[11px] font-bold uppercase tracking-wider border-b-2 text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5"
                            style={{
                                color: activeTab === 'structure' ? 'var(--accent)' : 'var(--text-secondary)',
                                borderBottomColor: activeTab === 'structure' ? 'var(--accent)' : 'transparent',
                            }}
                        >
                            <Compass className="w-3.5 h-3.5" />
                            ICT Structure
                        </button>
                        <button
                            onClick={() => setActiveTab('gates')}
                            className="flex-1 py-3 px-4 text-[11px] font-bold uppercase tracking-wider border-b-2 text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5"
                            style={{
                                color: activeTab === 'gates' ? 'var(--accent)' : 'var(--text-secondary)',
                                borderBottomColor: activeTab === 'gates' ? 'var(--accent)' : 'transparent',
                            }}
                        >
                            <Activity className="w-3.5 h-3.5" />
                            Narrative Gates
                        </button>
                        <button
                            onClick={() => setActiveTab('technical')}
                            className="flex-1 py-3 px-4 text-[11px] font-bold uppercase tracking-wider border-b-2 text-center transition-all whitespace-nowrap flex items-center justify-center gap-1.5"
                            style={{
                                color: activeTab === 'technical' ? 'var(--accent)' : 'var(--text-secondary)',
                                borderBottomColor: activeTab === 'technical' ? 'var(--accent)' : 'transparent',
                            }}
                        >
                            <Code className="w-3.5 h-3.5" />
                            System Logs
                        </button>
                    </div>
                )}

                {/* Main Body */}
                <div className="flex-1 p-5 relative min-h-0 flex flex-col overflow-y-auto bg-gradient-to-b from-transparent to-black/2 dark:to-white/1">
                    {isAnalyzing ? (
                        <SkeletonLoading />
                    ) : !isAnalyzed ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 opacity-35 select-none pointer-events-none">
                            <div
                                className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-sm"
                                style={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-light)',
                                }}
                            >
                                <Crosshair className="w-7 h-7 stroke-[1.25]" style={{ color: 'var(--text-tertiary)' }} />
                            </div>
                            <h3 className="text-sm font-bold tracking-tight mb-1" style={{ color: 'var(--text-secondary)' }}>Awaiting Market Charts</h3>
                            <p className="text-xs max-w-[240px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                                Drag or snapshot HTF (4H), Bridge (1H), and LTF (15M) charts to trigger institutional algorithm audit.
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-400">
                            
                            {/* ══════════════════ TAB 1: TARGETS & FLOW ══════════════════ */}
                            {activeTab === 'targets' && (
                                <div className="flex flex-col gap-5">
                                    {/* Hero Signal Row */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-[9px]" style={{ color: 'var(--text-tertiary)' }}>
                                                Decision Engine Output
                                            </span>
                                            <div
                                                className="px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-sm"
                                                style={{
                                                    backgroundColor: result.signal === 'BUY' ? 'var(--win-bg)' :
                                                        result.signal === 'SELL' ? 'var(--loss-bg)' : 'var(--accent-soft)',
                                                    color: result.signal === 'BUY' ? 'var(--win)' :
                                                        result.signal === 'SELL' ? 'var(--loss)' : 'var(--accent)',
                                                    border: `1px solid ${result.signal === 'BUY' ? 'var(--win-border)' :
                                                        result.signal === 'SELL' ? 'var(--loss-border)' : 'var(--accent-glow)'}`,
                                                }}
                                            >
                                                <Sparkles className="w-3.5 h-3.5 fill-current" />
                                                {result.confidence}% Algorithm Confluence
                                            </div>
                                        </div>

                                        <div
                                            className="flex flex-col items-center justify-center py-6 px-4 rounded-xl text-center relative overflow-hidden transition-all shadow-inner"
                                            style={{
                                                backgroundColor: result.signal === 'BUY' ? 'var(--win-bg)' :
                                                    result.signal === 'SELL' ? 'var(--loss-bg)' : 'var(--neutral-bg)',
                                                border: `1px solid ${result.signal === 'BUY' ? 'var(--win-border)' :
                                                    result.signal === 'SELL' ? 'var(--loss-border)' : 'var(--neutral-border)'}`,
                                            }}
                                        >
                                            <div className="flex items-center gap-3">
                                                {result.signal === 'BUY' ? <TrendingUp className="w-8 h-8" style={{ color: 'var(--win)' }} /> :
                                                    result.signal === 'SELL' ? <TrendingDown className="w-8 h-8" style={{ color: 'var(--loss)' }} /> :
                                                        <Minus className="w-8 h-8" style={{ color: 'var(--text-tertiary)' }} />}
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
                                            {result.setup_type && result.setup_type !== 'No ICT Setup' && (
                                                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 mt-2">
                                                    {result.setup_type}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Mismatch Notification */}
                                    {result.y_axis_mismatch && (
                                        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs">
                                            <ShieldAlert className="w-5 h-5 flex-shrink-0 stroke-[2] mt-0.5" />
                                            <div>
                                                <p className="font-bold">Visual Y-Axis Mismatch Detected</p>
                                                <p className="opacity-90 leading-relaxed mt-0.5">
                                                    Chart price margins diverge from local exchange feeds. Calculated trade levels have been securely locked to live API pricing coordinates.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Target Execution Matrix */}
                                    {!isWaitOrNeutral ? (
                                        <div className="flex flex-col gap-3">
                                            <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                                                Execution Parameters Matrix (Tap to copy)
                                            </h4>

                                            {/* Entry, SL, Main TP */}
                                            <div className="grid grid-cols-3 gap-2.5">
                                                {/* Entry */}
                                                <button
                                                    onClick={() => copyToClipboard(result.entry_price?.toString() || '', 'entry')}
                                                    className="relative flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]"
                                                    style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}
                                                >
                                                    <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-secondary)' }}>Entry</span>
                                                    <span className="text-[15px] font-mono font-bold tracking-tight mt-1.5" style={{ color: 'var(--text-primary)' }}>
                                                        {result.entry_price || 'Market'}
                                                    </span>
                                                    {copiedText === 'entry' && (
                                                        <span className="absolute top-1 right-2 text-[8px] font-bold text-green-500 bg-green-500/15 px-1 py-0.5 rounded">Copied</span>
                                                    )}
                                                </button>

                                                {/* Stop Loss */}
                                                <button
                                                    onClick={() => copyToClipboard(result.sl.toString(), 'sl')}
                                                    className="relative flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]"
                                                    style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}
                                                >
                                                    <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-secondary)' }}>Stop Loss</span>
                                                    <span className="text-[15px] font-mono font-bold tracking-tight mt-1.5" style={{ color: 'var(--loss)' }}>
                                                        {result.sl || '---'}
                                                    </span>
                                                    {copiedText === 'sl' && (
                                                        <span className="absolute top-1 right-2 text-[8px] font-bold text-green-500 bg-green-500/15 px-1 py-0.5 rounded">Copied</span>
                                                    )}
                                                </button>

                                                {/* Final TP */}
                                                <button
                                                    onClick={() => copyToClipboard(result.tp.toString(), 'tp')}
                                                    className="relative flex flex-col p-3 rounded-xl border text-left cursor-pointer transition-all hover:bg-black/5 dark:hover:bg-white/5 active:scale-[0.98]"
                                                    style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}
                                                >
                                                    <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-secondary)' }}>Final TP</span>
                                                    <span className="text-[15px] font-mono font-bold tracking-tight mt-1.5" style={{ color: 'var(--win)' }}>
                                                        {result.tp || '---'}
                                                    </span>
                                                    {copiedText === 'tp' && (
                                                        <span className="absolute top-1 right-2 text-[8px] font-bold text-green-500 bg-green-500/15 px-1 py-0.5 rounded">Copied</span>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Scalp Targets (TP1, TP2, TP3) */}
                                            {(result.tp1 || result.tp2 || result.tp3_runner) ? (
                                                <div className="flex flex-col gap-2 p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                    <p className="text-[9px] uppercase tracking-wider font-bold text-[9px] mb-2" style={{ color: 'var(--text-tertiary)' }}>
                                                        Scale-Out Profit Targets &amp; Actions
                                                    </p>

                                                    <div className="flex flex-col gap-2.5 font-mono">
                                                        {result.tp1 ? (
                                                            <div className="flex items-center justify-between text-xs pb-2 border-b border-dashed" style={{ borderBottomColor: 'var(--border-light)' }}>
                                                                <span className="font-semibold text-stone-500" style={{ color: 'var(--text-secondary)' }}>Target 1:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={() => copyToClipboard(result.tp1?.toString() || '', 'tp1')} 
                                                                        className="font-bold flex items-center gap-1 hover:text-green-500 transition-colors"
                                                                        style={{ color: 'var(--text-primary)' }}
                                                                    >
                                                                        {result.tp1} <Copy className="w-3 h-3 opacity-60" />
                                                                    </button>
                                                                    <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase">
                                                                        {result.tp1_action || 'Close 50%, BE'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        {result.tp2 ? (
                                                            <div className="flex items-center justify-between text-xs pb-2 border-b border-dashed" style={{ borderBottomColor: 'var(--border-light)' }}>
                                                                <span className="font-semibold text-stone-500" style={{ color: 'var(--text-secondary)' }}>Target 2:</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={() => copyToClipboard(result.tp2?.toString() || '', 'tp2')}
                                                                        className="font-bold flex items-center gap-1 hover:text-green-500 transition-colors"
                                                                        style={{ color: 'var(--text-primary)' }}
                                                                    >
                                                                        {result.tp2} <Copy className="w-3 h-3 opacity-60" />
                                                                    </button>
                                                                    <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase">
                                                                        {result.tp2_action || 'Close 30%, Trail'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                        {result.tp3_runner ? (
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="font-semibold text-stone-500" style={{ color: 'var(--text-secondary)' }}>Runner (TP3):</span>
                                                                <div className="flex items-center gap-2">
                                                                    <button 
                                                                        onClick={() => copyToClipboard(result.tp3_runner?.toString() || '', 'tp3')}
                                                                        className="font-bold flex items-center gap-1 hover:text-green-500 transition-colors"
                                                                        style={{ color: 'var(--text-primary)' }}
                                                                    >
                                                                        {result.tp3_runner} <Copy className="w-3 h-3 opacity-60" />
                                                                    </button>
                                                                    <span className="text-[10px] font-sans px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-bold uppercase">
                                                                        {result.tp3_action || 'Trail Remaining'}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            ) : null}

                                            {/* Risk Reward Ratios */}
                                            {(result.rr_ratio && result.rr_ratio !== '0') ? (
                                                <div className="grid grid-cols-3 gap-2">
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl border text-center font-mono" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                        <span className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-tertiary)' }}>R:R TP1</span>
                                                        <span className="text-[13px] font-bold text-amber-500 mt-1">1:{result.rr_ratio}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl border text-center font-mono" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                        <span className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-tertiary)' }}>R:R TP2</span>
                                                        <span className="text-[13px] font-bold text-amber-500 mt-1">1:{result.rr_to_tp2 || '0'}</span>
                                                    </div>
                                                    <div className="flex flex-col items-center justify-center p-2 rounded-xl border text-center font-mono" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                        <span className="text-[9px] uppercase font-bold" style={{ color: 'var(--text-tertiary)' }}>R:R TP3</span>
                                                        <span className="text-[13px] font-bold text-amber-500 mt-1">1:{result.rr_to_tp3 || '0'}</span>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </div>
                                    ) : (
                                        /* WAIT / NEUTRAL detailed card */
                                        <div className="flex flex-col gap-3.5 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
                                            <div className="flex items-center gap-2 text-amber-500 font-bold text-xs uppercase tracking-wide">
                                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                                Why are we waiting?
                                            </div>

                                            <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                                <p className="font-semibold text-xs text-amber-600/90 dark:text-amber-400/90">
                                                    Reason: {result.wait_reason && result.wait_reason !== 'none' ? result.wait_reason : 'Audit parameters failed validation'}
                                                </p>
                                                {result.failed_step && result.failed_step !== 'none' && (
                                                    <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t text-[11px] font-semibold" style={{ borderColor: 'var(--border-light)' }}>
                                                        <div>
                                                            <span style={{ color: 'var(--text-tertiary)' }}>FAILED STEP:</span>
                                                            <p style={{ color: 'var(--text-secondary)' }} className="uppercase font-bold tracking-tight mt-0.5">{result.failed_step}</p>
                                                        </div>
                                                        <div>
                                                            <span style={{ color: 'var(--text-tertiary)' }}>TIMEFRAME:</span>
                                                            <p style={{ color: 'var(--text-secondary)' }} className="uppercase font-bold tracking-tight mt-0.5">{result.failed_timeframe}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {(result.next_step && result.next_step !== 'none') && (
                                                <div className="mt-2 text-[11px] p-2.5 rounded-lg bg-black/5 dark:bg-white/5 border" style={{ borderColor: 'var(--border-light)' }}>
                                                    <span className="font-bold text-[10px]" style={{ color: 'var(--text-tertiary)' }}>NEXT ACTIONS REQUIRED:</span>
                                                    <p className="mt-1 font-semibold leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                                                        {result.next_step}
                                                    </p>
                                                    {result.recheck_after && (
                                                        <div className="flex items-center gap-1 mt-2 text-[10px] text-amber-500 font-bold">
                                                            <Clock className="w-3 h-3" />
                                                            Recheck After: {result.recheck_after}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Market Context Grid */}
                                    <div className="flex flex-col gap-3">
                                        <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                                            Global Market Backdrop &amp; Sentiment
                                        </h4>
                                        <div className="grid grid-cols-2 gap-2.5">
                                            {/* Volatility */}
                                            <div className="flex flex-col p-3 rounded-xl border" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                <span className="text-[9px] uppercase tracking-wider font-bold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                                    <Activity className="w-3.5 h-3.5 opacity-70" /> Volatility
                                                </span>
                                                <span 
                                                    className="text-xs font-black uppercase mt-2 font-sans"
                                                    style={{ 
                                                        color: result.volatility_level === 'HIGH' || result.volatility_level === 'EXTREME' ? 'var(--loss)' : 
                                                               result.volatility_level === 'NORMAL' ? 'var(--win)' : 'var(--accent)'
                                                    }}
                                                >
                                                    {result.volatility_level || 'NORMAL'}
                                                </span>
                                            </div>

                                            {/* News Sentiment */}
                                            <div className="flex flex-col p-3 rounded-xl border" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                <span className="text-[9px] uppercase tracking-wider font-bold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                                    <Newspaper className="w-3.5 h-3.5 opacity-70" /> News Risk
                                                </span>
                                                <span 
                                                    className="text-xs font-black uppercase mt-2 font-sans"
                                                    style={{ 
                                                        color: result.news_sentiment === 'BEARISH' || result.news_sentiment === 'HAWKISH' ? 'var(--loss)' : 
                                                               result.news_sentiment === 'BULLISH' || result.news_sentiment === 'DOVISH' ? 'var(--win)' : 'var(--text-secondary)'
                                                    }}
                                                >
                                                    {result.news_sentiment || 'NEUTRAL'}
                                                </span>
                                            </div>

                                            {/* Trading Session */}
                                            <div className="flex flex-col p-3 rounded-xl border" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                <span className="text-[9px] uppercase tracking-wider font-bold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                                    <Clock className="w-3.5 h-3.5 opacity-70" /> Active Session
                                                </span>
                                                <span className="text-xs font-bold uppercase mt-2 tracking-tight" style={{ color: 'var(--text-primary)' }}>
                                                    {result.active_session || 'N/A'}
                                                </span>
                                            </div>

                                            {/* Killzone */}
                                            <div className="flex flex-col p-3 rounded-xl border" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                <span className="text-[9px] uppercase tracking-wider font-bold flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                                                    <Clock className="w-3.5 h-3.5 opacity-70" /> Killzone
                                                </span>
                                                <span 
                                                    className="text-xs font-black uppercase mt-2 tracking-tight"
                                                    style={{ color: result.active_killzone !== 'NONE' ? 'var(--accent)' : 'var(--text-tertiary)' }}
                                                >
                                                    {result.active_killzone || 'NONE'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Core Reasoning */}
                                    <div
                                        className="rounded-xl p-4.5 border"
                                        style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}
                                    >
                                        <h3 className="text-[10px] uppercase tracking-widest font-bold mb-2.5 flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
                                            <BadgeCheck className="w-4 h-4 text-green-500" />
                                            Executive Narrative Reasoning
                                        </h3>
                                        <p className="text-xs leading-relaxed font-semibold font-sans" style={{ color: 'var(--text-secondary)' }}>
                                            {result.reasoning}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════ TAB 2: ICT MARKET STRUCTURE ══════════════════ */}
                            {activeTab === 'structure' && (
                                <div className="flex flex-col gap-4">
                                    {/* If legacy analysis has no pre-analysis data */}
                                    {!result.ict_pre_analysis || Object.keys(result.ict_pre_analysis).length === 0 ? (
                                        <div className="flex flex-col items-center justify-center p-12 text-center opacity-40">
                                            <Compass className="w-10 h-10 mb-3 text-stone-500" />
                                            <p className="text-xs font-bold">No ICT Pre-Analysis Data</p>
                                            <p className="text-[10px] mt-1">This report was generated using a legacy schema without intraday metrics.</p>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Daily Profile / PO3 Card */}
                                            <div className="flex flex-col gap-3 p-4 rounded-xl border" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Daily Profile</span>
                                                    {result.ict_pre_analysis.daily_bias && (
                                                        <span 
                                                            className="text-[10px] px-2 py-0.5 rounded font-black tracking-wider uppercase font-sans"
                                                            style={{
                                                                backgroundColor: result.ict_pre_analysis.daily_bias.toUpperCase().includes('BULL') ? 'var(--win-bg)' : 'var(--loss-bg)',
                                                                color: result.ict_pre_analysis.daily_bias.toUpperCase().includes('BULL') ? 'var(--win)' : 'var(--loss)',
                                                                border: `1px solid ${result.ict_pre_analysis.daily_bias.toUpperCase().includes('BULL') ? 'var(--win-border)' : 'var(--loss-border)'}`
                                                            }}
                                                        >
                                                            {result.ict_pre_analysis.daily_bias} Bias
                                                        </span>
                                                    )}
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 mt-2">
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-stone-400" style={{ color: 'var(--text-tertiary)' }}>PO3 Algorithm Phase:</span>
                                                        <p className="text-xs font-black uppercase text-amber-500 mt-0.5">{result.ict_pre_analysis.po3_phase || 'Awaiting accumulation'}</p>
                                                    </div>
                                                    <div>
                                                        <span className="text-[9px] uppercase font-bold text-stone-400" style={{ color: 'var(--text-tertiary)' }}>Midnight Open Price:</span>
                                                        <p className="text-xs font-bold font-mono mt-0.5" style={{ color: 'var(--text-primary)' }}>{result.ict_pre_analysis.midnight_open_price || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Key Levels & Ranges */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Asian Range */}
                                                <div className="flex flex-col p-3 rounded-xl border font-mono" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                    <span className="text-[9px] uppercase tracking-wider font-sans font-bold" style={{ color: 'var(--text-tertiary)' }}>Asian Range</span>
                                                    <div className="mt-2 text-xs flex flex-col gap-0.5" style={{ color: 'var(--text-primary)' }}>
                                                        <div className="flex justify-between">
                                                            <span className="font-sans opacity-70">High:</span>
                                                            <span className="font-bold">{result.ict_pre_analysis.asian_range_high || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-sans opacity-70">Low:</span>
                                                            <span className="font-bold">{result.ict_pre_analysis.asian_range_low || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Daily Range Boundaries */}
                                                <div className="flex flex-col p-3 rounded-xl border font-mono" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                    <span className="text-[9px] uppercase tracking-wider font-sans font-bold" style={{ color: 'var(--text-tertiary)' }}>Previous Day (PDH/PDL)</span>
                                                    <div className="mt-2 text-xs flex flex-col gap-0.5" style={{ color: 'var(--text-primary)' }}>
                                                        <div className="flex justify-between">
                                                            <span className="font-sans opacity-70">PDH:</span>
                                                            <span className="font-bold">{result.ict_pre_analysis.pdh || 'N/A'}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span className="font-sans opacity-70">PDL:</span>
                                                            <span className="font-bold">{result.ict_pre_analysis.pdl || 'N/A'}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Judas Swing & OTE details */}
                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Judas Swing status */}
                                                <div 
                                                    className="flex flex-col p-3 rounded-xl border" 
                                                    style={{ 
                                                        backgroundColor: 'var(--surface-alt)', 
                                                        borderColor: result.ict_pre_analysis.judas_swing_detected ? 'var(--win-border)' : 'var(--border-light)' 
                                                    }}
                                                >
                                                    <span className="text-[9px] uppercase tracking-wider font-bold" style={{ color: 'var(--text-tertiary)' }}>Judas Swing</span>
                                                    <div className="mt-2 flex items-center justify-between text-xs font-bold">
                                                        <span style={{ color: result.ict_pre_analysis.judas_swing_detected ? 'var(--win)' : 'var(--text-secondary)' }}>
                                                            {result.ict_pre_analysis.judas_swing_detected ? 'SWEPT LIQUIDITY' : 'NO SWEEP'}
                                                        </span>
                                                        {result.ict_pre_analysis.judas_swing_direction && (
                                                            <span className="text-[9px] px-1 py-0.5 rounded bg-black/5 dark:bg-white/5 uppercase">
                                                                {result.ict_pre_analysis.judas_swing_direction}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* OTE Zones */}
                                                <div className="flex flex-col p-3 rounded-xl border font-mono" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                    <span className="text-[9px] uppercase tracking-wider font-sans font-bold" style={{ color: 'var(--text-tertiary)' }}>Optimal Entry (OTE)</span>
                                                    <div className="mt-2 text-xs flex justify-between font-bold" style={{ color: 'var(--text-primary)' }}>
                                                        <span>{result.ict_pre_analysis.ote_zone_low || 'N/A'}</span>
                                                        <span className="opacity-40">-</span>
                                                        <span>{result.ict_pre_analysis.ote_zone_high || 'N/A'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* SMT Divergence Info */}
                                            <div 
                                                className="p-3.5 rounded-xl border text-xs font-semibold" 
                                                style={{ 
                                                    backgroundColor: 'var(--surface-alt)', 
                                                    borderColor: result.ict_pre_analysis.smt_divergence_detected ? 'var(--win-border)' : 'var(--border-light)' 
                                                }}
                                            >
                                                <p style={{ color: 'var(--text-tertiary)' }} className="text-[9px] uppercase font-bold tracking-wider mb-1">SMT Divergence Indicator</p>
                                                {result.ict_pre_analysis.smt_divergence_detected ? (
                                                    <div className="flex items-center gap-2 text-green-500 font-bold">
                                                        <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                                                        SMT Correlation Divergence Detected: {result.ict_pre_analysis.smt_divergence_type}
                                                    </div>
                                                ) : (
                                                    <div className="text-stone-400">
                                                        No SMT Divergence detected against correlated assets.
                                                    </div>
                                                )}
                                            </div>

                                            {/* Summary text */}
                                            {result.ict_pre_analysis.analysis && (
                                                <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                                    <p className="text-[9px] uppercase tracking-wider font-bold mb-1.5" style={{ color: 'var(--text-tertiary)' }}>Intraday Structural Footprint</p>
                                                    <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                        {result.ict_pre_analysis.analysis}
                                                    </p>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ══════════════════ TAB 3: NARRATIVE GATES ══════════════════ */}
                            {activeTab === 'gates' && (
                                <div className="flex flex-col gap-4">
                                    {/* Gate 1: 4H Higher Timeframe */}
                                    <div 
                                        className="flex flex-col gap-3 p-4 rounded-xl border transition-all" 
                                        style={{ 
                                            backgroundColor: 'var(--surface-alt)', 
                                            borderColor: result.gate1_4h?.gate_passed ? 'var(--win-border)' : 'var(--loss-border)' 
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-black/10 dark:bg-white/10" style={{ color: 'var(--text-primary)' }}>1</span>
                                                HTF Narrative (4H)
                                            </div>
                                            <span 
                                                className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase font-sans"
                                                style={{
                                                    backgroundColor: result.gate1_4h?.gate_passed ? 'var(--win-bg)' : 'var(--loss-bg)',
                                                    color: result.gate1_4h?.gate_passed ? 'var(--win)' : 'var(--loss)',
                                                    border: `1px solid ${result.gate1_4h?.gate_passed ? 'var(--win-border)' : 'var(--loss-border)'}`
                                                }}
                                            >
                                                {result.gate1_4h?.gate_passed ? 'Passed' : 'Failed'}
                                            </span>
                                        </div>

                                        {result.gate1_4h ? (
                                            <div className="text-xs flex flex-col gap-2 mt-1">
                                                <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>TREND:</span>
                                                        <span className="ml-1 uppercase text-stone-600 dark:text-stone-300 font-bold">{result.gate1_4h.trend || 'N/A'}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>BOS:</span>
                                                        <span className="ml-1 font-bold">{result.gate1_4h.bos_confirmed ? `CONFIRMED (${result.gate1_4h.bos_direction})` : 'NO BOS'}</span>
                                                    </div>
                                                </div>
                                                {(result.gate1_4h.nearest_ob_price || result.gate1_4h.fvg_range) && (
                                                    <div className="grid grid-cols-2 gap-3 text-[11px] font-mono border-t pt-2" style={{ borderColor: 'var(--border-light)' }}>
                                                        <div>
                                                            <span className="font-sans" style={{ color: 'var(--text-tertiary)' }}>NEAREST OB:</span>
                                                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{result.gate1_4h.nearest_ob_price || 'None'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-sans" style={{ color: 'var(--text-tertiary)' }}>FVG RANGE:</span>
                                                            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{result.gate1_4h.fvg_range || 'None'}</p>
                                                        </div>
                                                    </div>
                                                )}
                                                {result.gate1_4h.gate_fail_reason && result.gate1_4h.gate_fail_reason !== 'none' && (
                                                    <p className="text-red-500 font-bold text-[10px] mt-1 bg-red-500/5 p-2 rounded">
                                                        CRITICAL FAILURE: {result.gate1_4h.gate_fail_reason}
                                                    </p>
                                                )}
                                                {result.gate1_4h.analysis && (
                                                    <p className="text-stone-400 font-medium leading-relaxed italic border-t pt-2" style={{ borderColor: 'var(--border-light)' }}>
                                                        "{result.gate1_4h.analysis}"
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Gate 2: 1H Intermediate Bridge */}
                                    <div 
                                        className="flex flex-col gap-3 p-4 rounded-xl border transition-all" 
                                        style={{ 
                                            backgroundColor: 'var(--surface-alt)', 
                                            borderColor: result.gate2_1h?.gate_passed ? 'var(--win-border)' : 'var(--loss-border)' 
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-black/10 dark:bg-white/10" style={{ color: 'var(--text-primary)' }}>2</span>
                                                Structure Bridge (1H)
                                            </div>
                                            <span 
                                                className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase font-sans"
                                                style={{
                                                    backgroundColor: result.gate2_1h?.gate_passed ? 'var(--win-bg)' : 'var(--loss-bg)',
                                                    color: result.gate2_1h?.gate_passed ? 'var(--win)' : 'var(--loss)',
                                                    border: `1px solid ${result.gate2_1h?.gate_passed ? 'var(--win-border)' : 'var(--loss-border)'}`
                                                }}
                                            >
                                                {result.gate2_1h?.gate_passed ? 'Passed' : 'Failed'}
                                            </span>
                                        </div>

                                        {result.gate2_1h ? (
                                            <div className="text-xs flex flex-col gap-2 mt-1">
                                                <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-stone-300" style={{ color: 'var(--text-secondary)' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>ALIGNS WITH 4H:</span>
                                                        <span className="ml-1 font-bold">{result.gate2_1h.aligns_with_4h ? 'YES' : 'NO'}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>CHOCH SEEN:</span>
                                                        <span className="ml-1 font-bold">{result.gate2_1h.choch_observed ? `YES (${result.gate2_1h.choch_direction})` : 'NO'}</span>
                                                    </div>
                                                </div>
                                                {result.gate2_1h.premium_or_discount && (
                                                    <div className="text-[11px] border-t pt-2" style={{ borderColor: 'var(--border-light)' }}>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>FIBONACCI MATRIX:</span>
                                                        <span className="ml-1 font-black uppercase text-amber-500">{result.gate2_1h.premium_or_discount} ZONE</span>
                                                    </div>
                                                )}
                                                {result.gate2_1h.gate_fail_reason && result.gate2_1h.gate_fail_reason !== 'none' && (
                                                    <p className="text-red-500 font-bold text-[10px] mt-1 bg-red-500/5 p-2 rounded">
                                                        CRITICAL FAILURE: {result.gate2_1h.gate_fail_reason}
                                                    </p>
                                                )}
                                                {result.gate2_1h.analysis && (
                                                    <p className="text-stone-400 font-medium leading-relaxed italic border-t pt-2" style={{ borderColor: 'var(--border-light)' }}>
                                                        "{result.gate2_1h.analysis}"
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>

                                    {/* Gate 3: 15M LTF Execution */}
                                    <div 
                                        className="flex flex-col gap-3 p-4 rounded-xl border transition-all" 
                                        style={{ 
                                            backgroundColor: 'var(--surface-alt)', 
                                            borderColor: result.gate3_15m?.gate_passed ? 'var(--win-border)' : 'var(--loss-border)' 
                                        }}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wide">
                                                <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] bg-black/10 dark:bg-white/10" style={{ color: 'var(--text-primary)' }}>3</span>
                                                Execution Trigger (15M)
                                            </div>
                                            <span 
                                                className="text-[9px] px-2 py-0.5 rounded font-black tracking-wider uppercase font-sans"
                                                style={{
                                                    backgroundColor: result.gate3_15m?.gate_passed ? 'var(--win-bg)' : 'var(--loss-bg)',
                                                    color: result.gate3_15m?.gate_passed ? 'var(--win)' : 'var(--loss)',
                                                    border: `1px solid ${result.gate3_15m?.gate_passed ? 'var(--win-border)' : 'var(--loss-border)'}`
                                                }}
                                            >
                                                {result.gate3_15m?.gate_passed ? 'Passed' : 'Failed'}
                                            </span>
                                        </div>

                                        {result.gate3_15m ? (
                                            <div className="text-xs flex flex-col gap-2 mt-1">
                                                <div className="grid grid-cols-2 gap-3 text-[11px] font-semibold text-stone-300" style={{ color: 'var(--text-secondary)' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>LIQ SWEEP:</span>
                                                        <span className="ml-1 font-bold">{result.gate3_15m.liquidity_sweep_occurred ? `YES (${result.gate3_15m.sweep_direction})` : 'NO'}</span>
                                                    </div>
                                                    <div>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>MSS SEEN:</span>
                                                        <span className="ml-1 font-bold">{result.gate3_15m.mss_confirmed ? `YES (${result.gate3_15m.mss_direction})` : 'NO'}</span>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 text-[11px] border-t pt-2" style={{ borderColor: 'var(--border-light)' }}>
                                                    <div>
                                                        <span style={{ color: 'var(--text-tertiary)' }}>IN OTE ZONE:</span>
                                                        <span className="ml-1 font-bold">{result.gate3_15m.price_in_ote_zone ? 'YES' : 'NO'}</span>
                                                    </div>
                                                    {result.gate3_15m.entry_ob_price ? (
                                                        <div>
                                                            <span style={{ color: 'var(--text-tertiary)' }}>ENTRY OB:</span>
                                                            <span className="ml-1 font-mono font-bold">{result.gate3_15m.entry_ob_price}</span>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                {result.gate3_15m.gate_fail_reason && result.gate3_15m.gate_fail_reason !== 'none' && (
                                                    <p className="text-red-500 font-bold text-[10px] mt-1 bg-red-500/5 p-2 rounded">
                                                        CRITICAL FAILURE: {result.gate3_15m.gate_fail_reason}
                                                    </p>
                                                )}
                                                {result.gate3_15m.analysis && (
                                                    <p className="text-stone-400 font-medium leading-relaxed italic border-t pt-2" style={{ borderColor: 'var(--border-light)' }}>
                                                        "{result.gate3_15m.analysis}"
                                                    </p>
                                                )}
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            )}

                            {/* ══════════════════ TAB 4: SYSTEM LOGS ══════════════════ */}
                            {activeTab === 'technical' && (
                                <div className="flex flex-col gap-4 font-mono text-xs">
                                    {/* Price Feeds Verification */}
                                    <div className="p-3.5 rounded-xl border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                        <p style={{ color: 'var(--text-tertiary)' }} className="text-[9px] uppercase tracking-wider font-bold font-sans">Price Origin Feed Verification</p>
                                        <div className="flex items-center justify-between font-bold">
                                            <span style={{ color: 'var(--text-secondary)' }}>PRICE SOURCE:</span>
                                            <span className="text-amber-500">{result.price_source || 'LIVE EXCHANGE'}</span>
                                        </div>
                                        {result.price_source_reason && (
                                            <p className="text-[11px] leading-relaxed italic opacity-85 mt-1 border-t pt-1.5" style={{ borderColor: 'var(--border-light)', color: 'var(--text-secondary)' }}>
                                                Reasoning: {result.price_source_reason}
                                            </p>
                                        )}
                                    </div>

                                    {/* Confidence scoring log */}
                                    {result.confidence_breakdown && (
                                        <div className="p-3.5 rounded-xl border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                            <p style={{ color: 'var(--text-tertiary)' }} className="text-[9px] uppercase tracking-wider font-bold font-sans">Confidence Matrix Scoring Breakdown</p>
                                            <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                {result.confidence_breakdown}
                                            </p>
                                        </div>
                                    )}

                                    {/* Math Validation checks */}
                                    {result.math_check && (
                                        <div className="p-3.5 rounded-xl border flex flex-col gap-1.5" style={{ backgroundColor: 'var(--surface-alt)', borderColor: 'var(--border-light)' }}>
                                            <p style={{ color: 'var(--text-tertiary)' }} className="text-[9px] uppercase tracking-wider font-bold font-sans">Mathematical Parameter Validation Log</p>
                                            <p className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                {result.math_check}
                                            </p>
                                        </div>
                                    )}

                                    {/* Metadata Timestamp */}
                                    {result.pht_time && (
                                        <div className="text-[10px] text-right font-sans" style={{ color: 'var(--text-tertiary)' }}>
                                            Audit Time: {result.pht_time} (PHT)
                                        </div>
                                    )}
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
