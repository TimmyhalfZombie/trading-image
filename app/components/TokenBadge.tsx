"use client";

import React from 'react';

interface TokenBadgeProps {
    used: number;
    limit: number;
}

export function TokenBadge({ used, limit }: TokenBadgeProps) {
    const remaining = Math.max(0, limit - used);
    const percent = limit > 0 ? (used / limit) * 100 : 0;

    const color = remaining === 0
        ? 'var(--loss)'
        : percent > 75
            ? '#F59E0B'
            : 'var(--win)';

    const bgColor = remaining === 0
        ? 'var(--loss-bg)'
        : percent > 75
            ? 'rgba(245, 158, 11, 0.1)'
            : 'var(--win-bg)';

    const borderColor = remaining === 0
        ? 'var(--loss-border)'
        : percent > 75
            ? 'rgba(245, 158, 11, 0.2)'
            : 'var(--win-border)';

    return (
        <div
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[10px] font-bold tracking-wide transition-all duration-300"
            style={{
                backgroundColor: bgColor,
                color: color,
                border: `1px solid ${borderColor}`,
            }}
            title={`${remaining} analyses remaining today (${used}/${limit} used)`}
        >
            <div
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
            />
            <span>{remaining}/{limit}</span>
        </div>
    );
}
