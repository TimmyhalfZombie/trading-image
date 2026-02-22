"use client";

import React from 'react';
import { LayoutDashboard, History, Sun, Moon } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { useTheme } from './ThemeProvider';

interface HeaderProps {
    activeTab: 'analysis' | 'history';
    onTabChange: (tab: 'analysis' | 'history') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
    const { theme, toggleTheme } = useTheme();

    return (
        <header
            className="flex items-center justify-between px-8 py-3.5 z-10 w-full backdrop-blur-md transition-colors duration-300"
            style={{
                backgroundColor: theme === 'dark' ? 'rgba(12, 10, 9, 0.8)' : 'rgba(255, 255, 255, 0.8)',
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
                        className="text-xl font-black tracking-tight leading-none group-hover:text-amber-500 transition-colors"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        HIVE
                    </h1>
                    <span
                        className="text-[9px] font-semibold tracking-[0.2em] uppercase"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        Smart Trading
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-3">
                <nav
                    className="flex items-center rounded-full p-1 transition-colors duration-300"
                    style={{
                        backgroundColor: 'var(--nav-bg)',
                        border: '1px solid var(--border-light)',
                    }}
                >
                    <button
                        onClick={() => onTabChange('analysis')}
                        className={twMerge(
                            "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 tracking-wide cursor-pointer",
                            activeTab === 'analysis'
                                ? "shadow-sm"
                                : "hover:opacity-80"
                        )}
                        style={activeTab === 'analysis' ? {
                            backgroundColor: 'var(--nav-active-bg)',
                            color: 'var(--nav-active-text)',
                            boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                        } : {
                            color: 'var(--text-tertiary)',
                        }}
                    >
                        <LayoutDashboard className="w-3.5 h-3.5" />
                        Analysis
                    </button>
                    <button
                        onClick={() => onTabChange('history')}
                        className={twMerge(
                            "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 tracking-wide cursor-pointer",
                            activeTab === 'history'
                                ? "shadow-sm"
                                : "hover:opacity-80"
                        )}
                        style={activeTab === 'history' ? {
                            backgroundColor: 'var(--nav-active-bg)',
                            color: 'var(--nav-active-text)',
                            boxShadow: `0 0 0 1px var(--nav-active-ring)`,
                        } : {
                            color: 'var(--text-tertiary)',
                        }}
                    >
                        <History className="w-3.5 h-3.5" />
                        History
                    </button>
                </nav>

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
            </div>
        </header>
    );
}
