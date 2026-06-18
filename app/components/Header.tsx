"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, History, TrendingUp, Sun, Moon, Menu, Upload, Zap } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useTheme } from './ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { UserSidebar } from './UserSidebar';
import { TokenBadge } from './TokenBadge';

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

interface HeaderProps {
    activeTab: 'analysis' | 'history' | 'plans' | 'market';
    onTabChange: (tab: 'analysis' | 'history' | 'plans' | 'market') => void;
    mobilePanelView: 'upload' | 'result';
    onMobilePanelChange: (view: 'upload' | 'result') => void;
    tokenInfo: TokenInfo | null;
    onTokenRefresh: () => void;
}

export function Header({ activeTab, onTabChange, mobilePanelView, onMobilePanelChange, tokenInfo, onTokenRefresh }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const supabase = createClient();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [userData, setUserData] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserData({
                    name: user.user_metadata?.full_name || 'Trader',
                    email: user.email || 'No email',
                });
            }
        };
        fetchUser();
    }, [supabase.auth]);

    const handleLogout = async () => {
        // Clear user-specific session data from UI so they do not overlap
        localStorage.removeItem('hive_analysis_result');
        localStorage.removeItem('hive_active_tab');
        localStorage.removeItem('hive_input_files');

        await supabase.auth.signOut();
        router.push('/login');
    };

    const initials = userData?.name
        ? userData.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?';

    return (
        <>
            <header
                className="flex items-center justify-between px-4 md:px-8 py-3 py-md-3.5 z-10 w-full backdrop-blur-md transition-colors duration-300 transform-gpu"
                style={{
                    backgroundColor: 'var(--surface-alt)',
                    borderBottom: `1px solid var(--border-light)`,
                }}
            >
                <div className="flex items-center gap-3 group cursor-default select-none">
                    <div className="relative w-9 h-9 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <svg
                            width="36"
                            height="36"
                            viewBox="0 0 40 40"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="drop-shadow-sm"
                        >
                            <path
                                d="M13.5 6.5L19.5 10V17L13.5 20.5L7.5 17V10L13.5 6.5Z"
                                className="fill-amber-400 group-hover:fill-amber-500 transition-colors duration-300"
                            />
                            <path
                                d="M26.5 6.5L32.5 10V17L26.5 20.5L20.5 17V10L26.5 6.5Z"
                                className="fill-yellow-400 group-hover:fill-yellow-500 transition-colors duration-300"
                            />
                            <path
                                d="M20 17.5L26 21V28L20 31.5L14 28V21L20 17.5Z"
                                className="fill-orange-400 group-hover:fill-orange-500 transition-colors duration-300"
                            />
                        </svg>
                    </div>
                    <div className="flex flex-col">
                        <h1
                            className="text-lg md:text-xl font-black tracking-tight leading-none group-hover:text-amber-500 transition-colors"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            HIVE
                        </h1>
                        <span
                            className="text-[8px] md:text-[9px] font-semibold tracking-[0.2em] uppercase hidden sm:block"
                            style={{ color: 'var(--text-tertiary)' }}
                        >
                            Smart Trading
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Desktop Navigation */}
                    <nav
                        className="hidden md:flex items-center rounded-full p-1 transition-colors duration-300"
                        style={{
                            backgroundColor: 'var(--nav-bg)',
                            border: '1px solid var(--border-light)',
                        }}
                    >
                        <button
                            onClick={() => onTabChange('analysis')}
                            className={twMerge(
                                "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 tracking-wide cursor-pointer",
                                activeTab === 'analysis' ? "shadow-sm" : "hover:opacity-80"
                            )}
                            style={activeTab === 'analysis' ? {
                                backgroundColor: 'var(--nav-active-bg)',
                                color: 'var(--nav-active-text)',
                                boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                            } : { color: 'var(--text-tertiary)' }}
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            Analysis
                        </button>
                        <button
                            onClick={() => onTabChange('history')}
                            className={twMerge(
                                "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 tracking-wide cursor-pointer",
                                activeTab === 'history' ? "shadow-sm" : "hover:opacity-80"
                            )}
                            style={activeTab === 'history' ? {
                                backgroundColor: 'var(--nav-active-bg)',
                                color: 'var(--nav-active-text)',
                                boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                            } : { color: 'var(--text-tertiary)' }}
                        >
                            <History className="w-3.5 h-3.5" />
                            History
                        </button>
                        <button
                            onClick={() => onTabChange('market')}
                            className={twMerge(
                                "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 tracking-wide cursor-pointer",
                                activeTab === 'market' ? "shadow-sm" : "hover:opacity-80"
                            )}
                            style={activeTab === 'market' ? {
                                backgroundColor: 'var(--nav-active-bg)',
                                color: 'var(--nav-active-text)',
                                boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                            } : { color: 'var(--text-tertiary)' }}
                        >
                            <TrendingUp className="w-3.5 h-3.5" />
                            Live Market
                        </button>
                    </nav>

                    {/* Mobile Navigation (Upload / Result) */}
                    <nav
                        className="flex md:hidden items-center rounded-full p-1 transition-colors duration-300"
                        style={{
                            backgroundColor: 'var(--nav-bg)',
                            border: '1px solid var(--border-light)',
                        }}
                    >
                        <button
                            onClick={() => {
                                onTabChange('analysis');
                                onMobilePanelChange('upload');
                            }}
                            className={twMerge(
                                "px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 flex items-center justify-center tracking-wide cursor-pointer min-w-[55px]",
                                mobilePanelView === 'upload' && activeTab === 'analysis' ? "shadow-sm" : "hover:opacity-80"
                            )}
                            style={mobilePanelView === 'upload' && activeTab === 'analysis' ? {
                                backgroundColor: 'var(--nav-active-bg)',
                                color: 'var(--nav-active-text)',
                                boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                            } : { color: 'var(--text-tertiary)' }}
                        >
                            Analysis
                        </button>
                        <button
                            onClick={() => {
                                onTabChange('analysis');
                                onMobilePanelChange('result');
                            }}
                            className={twMerge(
                                "px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 flex items-center justify-center tracking-wide cursor-pointer min-w-[55px]",
                                mobilePanelView === 'result' && activeTab === 'analysis' ? "shadow-sm" : "hover:opacity-80"
                            )}
                            style={mobilePanelView === 'result' && activeTab === 'analysis' ? {
                                backgroundColor: 'var(--nav-active-bg)',
                                color: 'var(--nav-active-text)',
                                boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                            } : { color: 'var(--text-tertiary)' }}
                        >
                            Result
                        </button>
                        <button
                            onClick={() => onTabChange('market')}
                            className={twMerge(
                                "px-3 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 flex items-center justify-center tracking-wide cursor-pointer min-w-[55px]",
                                activeTab === 'market' ? "shadow-sm" : "hover:opacity-80"
                            )}
                            style={activeTab === 'market' ? {
                                backgroundColor: 'var(--nav-active-bg)',
                                color: 'var(--nav-active-text)',
                                boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                            } : { color: 'var(--text-tertiary)' }}
                        >
                            Market
                        </button>
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-2.5">
                        {/* Token Badge (commented out to hide from UI) */}
                        {/*
                        {tokenInfo && (
                            <TokenBadge used={tokenInfo.used} limit={tokenInfo.limit} />
                        )}
                        */}

                        {/* User Avatar Button */}
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer text-[11px] font-black"
                            style={{
                                background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                                color: '#fff',
                                boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                            }}
                            title="Profile & Settings"
                        >
                            {initials}
                        </button>
                    </div>

                    {/* Mobile User Avatar Button */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer text-[11px] font-black"
                        style={{
                            background: 'linear-gradient(135deg, #F59E0B, #EA580C)',
                            color: '#fff',
                            boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                        }}
                    >
                        {initials}
                    </button>
                </div>
            </header>

            {/* Unified Sidebar (Desktop + Mobile) */}
            <UserSidebar
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                userData={userData}
                tokenInfo={tokenInfo}
                onLogout={handleLogout}
                onThemeToggle={toggleTheme}
                onNavigatePlans={() => onTabChange('plans')}
                theme={theme}
            />
        </>
    );
}
