"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: 'dark',
    toggleTheme: () => { },
});

export function useTheme() {
    return useContext(ThemeContext);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('hive_theme') as Theme | null;
        if (saved === 'dark' || saved === 'light') {
            setTheme(saved);
        } else {
            setTheme('dark');
        }
        setMounted(true);
    }, []);

    useEffect(() => {
        if (mounted) {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('hive_theme', theme);
        }
    }, [theme, mounted]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        
        // Prevent all CSS transitions globally during Theme switch to avoid massive layout/paint lag on mobile
        const css = document.createElement('style');
        css.appendChild(document.createTextNode('* { -webkit-transition: none !important; transition: none !important; }'));
        document.head.appendChild(css);
        
        const removeCss = () => {
            // Force a reflow to ensure the disabled state is applied before putting transitions back
            const _ = window.getComputedStyle(css).opacity;
            if (document.head.contains(css)) document.head.removeChild(css);
        };

        if (!document.startViewTransition) {
            setTheme(newTheme);
            requestAnimationFrame(() => requestAnimationFrame(removeCss));
            return;
        }

        document.startViewTransition(() => {
            flushSync(() => {
                setTheme(newTheme);
            });
        }).finished.finally(removeCss);
    };

    // Prevent flash of wrong theme
    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
