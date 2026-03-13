"use client";

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, History, Sun, Moon, LogOut, Menu, X, User, Upload, Zap } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useTheme } from './ThemeProvider';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

interface HeaderProps {
    activeTab: 'analysis' | 'history';
    onTabChange: (tab: 'analysis' | 'history') => void;
    mobilePanelView: 'upload' | 'result';
    onMobilePanelChange: (view: 'upload' | 'result') => void;
}

export function Header({ activeTab, onTabChange, mobilePanelView, onMobilePanelChange }: HeaderProps) {
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
                                "px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 flex items-center justify-center tracking-wide cursor-pointer min-w-[70px]",
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
                                "px-4 py-1.5 rounded-full text-[10px] font-semibold transition-all duration-200 flex items-center justify-center tracking-wide cursor-pointer min-w-[70px]",
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
                    </nav>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-3">
                        {/* Theme Toggle */}
                        <button
                            onClick={toggleTheme}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                            style={{
                                backgroundColor: 'var(--nav-bg)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-secondary)',
                            }}
                            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-4 h-4" />
                            ) : (
                                <Moon className="w-4 h-4" />
                            )}
                        </button>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer hover:bg-red-500/10 hover:text-red-500"
                            style={{
                                backgroundColor: 'var(--nav-bg)',
                                border: '1px solid var(--border-light)',
                                color: 'var(--text-secondary)',
                            }}
                            title="Sign Out"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="md:hidden w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 cursor-pointer"
                        style={{
                            backgroundColor: 'var(--nav-bg)',
                            border: '1px solid var(--border-light)',
                            color: 'var(--text-secondary)',
                        }}
                    >
                        <Menu className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 z-50 md:hidden flex justify-end">
                    {/* Backdrop */}
                    <div 
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    
                    {/* Sidebar */}
                    <div 
                        className="w-[280px] h-full shadow-2xl relative flex flex-col transition-transform duration-300 animate-in slide-in-from-right"
                        style={{ backgroundColor: 'var(--surface)' }}
                    >
                        {/* Sidebar Header with User Data */}
                        <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--border-light)' }}>
                            <div className="flex flex-col min-w-0 pr-2">
                                <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                                    {userData?.name || 'Trader'}
                                </span>
                                <span className="text-[11px] font-semibold truncate opacity-70" style={{ color: 'var(--text-secondary)' }}>
                                    {userData?.email || 'No email'}
                                </span>
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="p-2 rounded-full cursor-pointer transition-colors flex-shrink-0"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {/* Body / App Navigation Controls */}
                        <div className="flex-1 overflow-y-auto p-5">
                            <p className="text-[10px] uppercase font-bold tracking-wider mb-3 opacity-60" style={{ color: 'var(--text-secondary)' }}>
                                Navigation
                            </p>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => {
                                        onTabChange('history');
                                        setIsSidebarOpen(false);
                                    }}
                                    className={twMerge(
                                        "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer",
                                    )}
                                    style={activeTab === 'history' ? {
                                        backgroundColor: 'var(--nav-active-bg)',
                                        color: 'var(--nav-active-text)',
                                        boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                                    } : {
                                        backgroundColor: 'var(--nav-bg)',
                                        color: 'var(--text-secondary)',
                                        border: '1px solid var(--border-light)'
                                    }}
                                >
                                    <History className="w-4 h-4" />
                                    History
                                </button>
                            </div>
                        </div>

                        {/* Sidebar Footer Actions */}
                        <div className="p-5 border-t flex flex-col gap-3" style={{ borderColor: 'var(--border-light)' }}>
                            <button
                                onClick={() => { toggleTheme(); }}
                                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                                style={{ 
                                    backgroundColor: 'var(--nav-bg)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-light)'
                                }}
                            >
                                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                {theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                                style={{ 
                                    backgroundColor: 'var(--loss-bg)',
                                    color: 'var(--loss)',
                                    border: '1px solid var(--loss-border)'
                                }}
                            >
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
