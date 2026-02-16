"use client";

import React from 'react';
import { LayoutDashboard, History } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

interface HeaderProps {
    activeTab: 'analysis' | 'history';
    onTabChange: (tab: 'analysis' | 'history') => void;
}

export function Header({ activeTab, onTabChange }: HeaderProps) {
    return (
        <header className="flex items-center justify-between px-8 py-3.5 border-b border-stone-200/80 bg-white/80 backdrop-blur-md z-10 w-full">
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
                    <h1 className="text-xl font-black tracking-tight text-stone-800 leading-none group-hover:text-amber-600 transition-colors">
                        HIVE
                    </h1>
                    <span className="text-[9px] font-semibold tracking-[0.2em] text-stone-400 uppercase">
                        Smart Trading
                    </span>
                </div>
            </div>

            <nav className="flex items-center bg-stone-100/60 rounded-full p-1 border border-stone-200/60">
                <button
                    onClick={() => onTabChange('analysis')}
                    className={twMerge(
                        "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 tracking-wide",
                        activeTab === 'analysis'
                            ? "bg-white text-stone-800 shadow-sm ring-1 ring-stone-200/50"
                            : "text-stone-400 hover:text-stone-700"
                    )}
                >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Analysis
                </button>
                <button
                    onClick={() => onTabChange('history')}
                    className={twMerge(
                        "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200 flex items-center gap-2 tracking-wide",
                        activeTab === 'history'
                            ? "bg-white text-stone-800 shadow-sm ring-1 ring-stone-200/50"
                            : "text-stone-400 hover:text-stone-700"
                    )}
                >
                    <History className="w-3.5 h-3.5" />
                    History
                </button>
            </nav>
        </header>
    );
}
