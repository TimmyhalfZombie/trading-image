"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LogOut, Sun, Moon, Crown, Zap, ChevronRight, AlertCircle } from 'lucide-react';

interface TokenInfo {
    plan: string;
    planName: string;
    limit: number;
    used: number;
    remaining: number;
    canAnalyze: boolean;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
}

interface UserSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    userData: { name: string; email: string } | null;
    tokenInfo: TokenInfo | null;
    onLogout: () => void;
    onThemeToggle: () => void;
    onNavigatePlans: () => void;
    theme: string;
}

export function UserSidebar({
    isOpen,
    onClose,
    userData,
    tokenInfo,
    onLogout,
    onThemeToggle,
    onNavigatePlans,
    theme,
}: UserSidebarProps) {

    const usagePercent = tokenInfo
        ? Math.round((tokenInfo.used / tokenInfo.limit) * 100)
        : 0;

    const usageColor = tokenInfo
        ? tokenInfo.remaining === 0
            ? 'var(--loss)'
            : usagePercent > 75
                ? '#F59E0B'
                : 'var(--win)'
        : 'var(--win)';

    const planBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
        free: {
            bg: 'var(--neutral-bg)',
            text: 'var(--text-secondary)',
            border: 'var(--neutral-border)',
        },
        starter: {
            bg: 'rgba(59, 130, 246, 0.1)',
            text: '#3B82F6',
            border: 'rgba(59, 130, 246, 0.2)',
        },
        pro: {
            bg: 'rgba(168, 85, 247, 0.1)',
            text: '#A855F7',
            border: 'rgba(168, 85, 247, 0.2)',
        },
    };

    const currentPlanColors = planBadgeColors[tokenInfo?.plan || 'free'] || planBadgeColors.free;

    const initials = userData?.name
        ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex justify-end">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Sidebar */}
                    <motion.div
                        initial={{ x: '100%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '100%', opacity: 0 }}
                        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                        className="w-[300px] h-full shadow-2xl relative flex flex-col"
                        style={{ backgroundColor: 'var(--surface)' }}
                    >
                {/* Header with User Profile */}
                <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border-light)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <span
                            className="text-[10px] font-bold uppercase tracking-widest"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Profile
                        </span>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-full cursor-pointer transition-colors hover:opacity-70"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Avatar + Info */}
                    <div className="flex items-center gap-3">
                        <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0"
                            style={{
                                background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                                color: '#fff',
                            }}
                        >
                            {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                {userData?.name || 'Trader'}
                            </p>
                            <p className="text-[11px] truncate" style={{ color: 'var(--text-tertiary)' }}>
                                {userData?.email || 'No email'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Plan & Usage Section */}
                <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border-light)' }}>
                    {/* Current Plan hidden from UI, keeping code */}
                    {/*
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-tertiary)' }}>
                            Current Plan
                        </span>
                        <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide"
                            style={{
                                backgroundColor: currentPlanColors.bg,
                                color: currentPlanColors.text,
                                border: `1px solid ${currentPlanColors.border}`,
                            }}
                        >
                            {tokenInfo?.plan === 'pro' && <Crown className="w-3 h-3 inline mr-1 -mt-0.5" />}
                            {tokenInfo?.plan === 'starter' && <Zap className="w-3 h-3 inline mr-1 -mt-0.5" />}
                            {tokenInfo?.planName || 'Free'}
                        </span>
                    </div>
                    */}

                    {/* Usage Bar (commented out to hide from UI) */}
                    {/*
                    {tokenInfo && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                                    Today's Usage
                                </span>
                                <span className="text-xs font-bold" style={{ color: usageColor }}>
                                    {tokenInfo.used}/{tokenInfo.limit}
                                </span>
                            </div>
                            <div
                                className="w-full h-2 rounded-full overflow-hidden"
                                style={{ backgroundColor: 'var(--neutral-bg)' }}
                            >
                                <div
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{
                                        width: `${Math.min(usagePercent, 100)}%`,
                                        backgroundColor: usageColor,
                                    }}
                                />
                            </div>
                            <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                {tokenInfo.remaining > 0
                                    ? `${tokenInfo.remaining} analyses remaining today`
                                    : 'Daily limit reached. Resets at midnight UTC.'}
                            </p>

                            {tokenInfo.cancelAtPeriodEnd && tokenInfo.currentPeriodEnd && (
                                <div
                                    className="flex items-center gap-1.5 mt-1 text-[10px] px-2.5 py-1.5 rounded-lg"
                                    style={{
                                        backgroundColor: 'var(--loss-bg)',
                                        color: 'var(--loss)',
                                        border: '1px solid var(--loss-border)',
                                    }}
                                >
                                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                    <span>
                                        Cancels {new Date(tokenInfo.currentPeriodEnd).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                    */}
                </div>

                {/* Navigation (Spacer / Hidden from UI) */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {/*
                    <p className="text-[10px] uppercase font-bold tracking-wider mb-3 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                        Manage
                    </p>
                    <div className="flex flex-col gap-2">
                        <button
                            onClick={() => {
                                onNavigatePlans();
                                onClose();
                            }}
                            className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer hover:opacity-80"
                            style={{
                                backgroundColor: 'var(--nav-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            <span className="flex items-center gap-2">
                                <Crown className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                                Plans & Pricing
                            </span>
                            <ChevronRight className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                        </button>
                    </div>
                    */}
                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t flex flex-col gap-3" style={{ borderColor: 'var(--border-light)' }}>
                    <button
                        onClick={onThemeToggle}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        style={{
                            backgroundColor: 'var(--nav-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-light)',
                        }}
                    >
                        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    </button>

                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                        style={{
                            backgroundColor: 'var(--loss-bg)',
                            color: 'var(--loss)',
                            border: '1px solid var(--loss-border)',
                        }}
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
