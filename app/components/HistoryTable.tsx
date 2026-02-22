"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, Inbox, Loader2, RotateCcw, ArrowUpRight, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';
import { DeleteModal } from './modals/DeleteModal';

export interface Trade {
    id: string;
    created_at: string;
    asset: string;
    signal: 'BUY' | 'SELL' | 'NEUTRAL';
    outcome: 'WIN' | 'LOSS' | 'PENDING';
    confidence: number;
    pnl: number;
    sl: number;
    tp: number;
    reasoning: string;
}

interface HistoryTableProps {
    onView?: (trade: Trade) => void;
    onDelete?: (id: string) => void;
}

export function HistoryTable({ onView, onDelete }: HistoryTableProps) {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'single' | 'all'; id?: string }>({
        isOpen: false,
        type: 'single'
    });

    const fetchTrades = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/trading-history');

            if (!response.ok) {
                let errorMessage = 'Failed to fetch trading history';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorData.details || errorMessage;
                } catch (e) {
                    // unexpected error format
                }
                throw new Error(errorMessage);
            }
            const data = await response.json();
            setTrades(data);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to load history.');
        } finally {
            setIsLoading(false);
        }
    };

    const confirmDelete = async () => {
        const { type, id } = deleteModal;
        setDeleteModal(prev => ({ ...prev, isOpen: false }));

        if (type === 'all') {
            try {
                const response = await fetch('/api/trading-history?all=true', {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete all records');
                }

                setTrades([]);
                toast.success('All history deleted');
            } catch (error: any) {
                toast.error('Delete all failed', { description: error.message });
            }
        } else if (type === 'single' && id) {
            setDeletingId(id);
            try {
                const response = await fetch(`/api/trading-history?id=${id}`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to delete record');
                }

                setTrades(prev => prev.filter(t => t.id !== id));
                toast.success('Record deleted');
                if (onDelete) onDelete(id);
            } catch (error: any) {
                toast.error('Delete failed', { description: error.message });
            } finally {
                setDeletingId(null);
            }
        }
    };

    const handleDeleteClick = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleteModal({ isOpen: true, type: 'single', id });
    };

    const handleDeleteAllClick = () => {
        if (trades.length === 0) return;
        setDeleteModal({ isOpen: true, type: 'all' });
    };

    useEffect(() => {
        fetchTrades();
    }, []);

    // ---------- LOADING STATE ----------
    if (isLoading) {
        return (
            <div
                className="flex flex-col h-full rounded-3xl overflow-hidden items-center justify-center p-16 transition-colors duration-300"
                style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border-light)',
                }}
            >
                <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'var(--bg-secondary)' }}
                >
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                </div>
                <p className="text-xs font-medium tracking-wide" style={{ color: 'var(--text-tertiary)' }}>Loading history...</p>
            </div>
        );
    }

    // ---------- ERROR STATE ----------
    if (error) {
        return (
            <div
                className="flex flex-col h-full rounded-3xl overflow-hidden items-center justify-center p-16 text-center transition-colors duration-300"
                style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border-light)',
                }}
            >
                <div
                    className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
                    style={{ backgroundColor: 'var(--loss-bg)', border: '1px solid var(--loss-border)' }}
                >
                    <AlertCircle className="w-6 h-6 stroke-[1.5]" style={{ color: 'var(--loss)' }} />
                </div>
                <p className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>Unable to load data</p>
                <p className="text-xs mb-6 max-w-[240px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>{error}</p>
                <button
                    onClick={fetchTrades}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors"
                    style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-light)',
                    }}
                >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Retry
                </button>
            </div>
        );
    }

    // ---------- MAIN CONTENT ----------
    return (
        <>
            <div
                className="flex flex-col h-full rounded-3xl shadow-sm overflow-hidden relative transition-colors duration-300"
                style={{
                    backgroundColor: 'var(--surface)',
                    border: '1px solid var(--border-light)',
                }}
            >
                {/* Header */}
                <div
                    className="px-8 py-5 flex items-center justify-between sticky top-0 z-20"
                    style={{
                        backgroundColor: 'var(--surface)',
                        borderBottom: '1px solid var(--border-light)',
                    }}
                >
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Signal History</h2>
                        <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md"
                            style={{
                                backgroundColor: 'var(--bg-secondary)',
                                color: 'var(--text-tertiary)',
                                border: '1px solid var(--border-light)',
                            }}
                        >
                            {trades.length}
                        </span>
                    </div>
                    {trades.length > 0 && (
                        <button
                            onClick={handleDeleteAllClick}
                            className="text-[11px] font-bold transition-all px-3.5 py-1.5 rounded-lg cursor-pointer flex items-center gap-1.5 hover:opacity-90 active:scale-[0.97]"
                            style={{
                                backgroundColor: 'var(--loss-bg)',
                                color: 'var(--loss)',
                                border: '1px solid var(--loss-border)',
                            }}
                        >
                            <Trash2 className="w-3 h-3" />
                            Clear All
                        </button>
                    )}
                </div>

                {/* Table Content */}
                <div className="overflow-auto flex-1">
                    {trades.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-80">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                                style={{
                                    backgroundColor: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-light)',
                                }}
                            >
                                <Inbox className="w-7 h-7 stroke-[1.25]" style={{ color: 'var(--text-tertiary)' }} />
                            </div>
                            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>No signals recorded</p>
                            <p className="text-xs max-w-[200px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                                Completed analyses will appear here automatically
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead
                                className="sticky top-0 z-10 backdrop-blur-sm"
                                style={{
                                    backgroundColor: 'var(--surface-alt)',
                                    borderBottom: '1px solid var(--border-light)',
                                }}
                            >
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest w-1/6" style={{ color: 'var(--text-tertiary)' }}>Date</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest w-1/6" style={{ color: 'var(--text-tertiary)' }}>Time</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest w-1/6" style={{ color: 'var(--text-tertiary)' }}>Asset</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest w-1/6 text-center" style={{ color: 'var(--text-tertiary)' }}>Signal</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold uppercase tracking-widest w-1/6 text-center" style={{ color: 'var(--text-tertiary)' }}>Confidence</th>
                                    <th className="px-8 py-4 text-[10px] font-semibold uppercase tracking-widest w-1/6 text-right" style={{ color: 'var(--text-tertiary)' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trades.map((trade) => {
                                    const dateObj = new Date(trade.created_at);
                                    const dateStr = dateObj.toLocaleDateString(undefined, {
                                        year: 'numeric',
                                        month: 'short',
                                        day: '2-digit'
                                    });
                                    const timeStr = dateObj.toLocaleTimeString(undefined, {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                        hour12: true
                                    });

                                    return (
                                        <tr
                                            key={trade.id}
                                            className="group transition-colors duration-200"
                                            style={{ borderBottom: '1px solid var(--border-light)' }}
                                        >
                                            {/* Date */}
                                            <td className="px-6 py-5 text-xs font-medium whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                                                {dateStr}
                                            </td>

                                            {/* Time */}
                                            <td className="px-6 py-5 text-xs font-medium whitespace-nowrap font-mono" style={{ color: 'var(--text-tertiary)' }}>
                                                {timeStr}
                                            </td>

                                            {/* Asset */}
                                            <td className="px-6 py-5">
                                                <span
                                                    className="text-xs font-bold px-2.5 py-1 rounded-md tracking-tight font-mono"
                                                    style={{
                                                        color: 'var(--text-primary)',
                                                        backgroundColor: 'var(--neutral-bg)',
                                                        border: '1px solid var(--neutral-border)',
                                                    }}
                                                >
                                                    {trade.asset}
                                                </span>
                                            </td>

                                            {/* Signal Pill */}
                                            <td className="px-6 py-5 text-center">
                                                <span
                                                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm"
                                                    style={{
                                                        backgroundColor: trade.signal === 'BUY' ? 'var(--win-bg)' :
                                                            trade.signal === 'SELL' ? 'var(--loss-bg)' : 'var(--neutral-bg)',
                                                        color: trade.signal === 'BUY' ? 'var(--win)' :
                                                            trade.signal === 'SELL' ? 'var(--loss)' : 'var(--text-secondary)',
                                                        border: `1px solid ${trade.signal === 'BUY' ? 'var(--win-border)' :
                                                            trade.signal === 'SELL' ? 'var(--loss-border)' : 'var(--neutral-border)'}`,
                                                    }}
                                                >
                                                    {trade.signal === 'BUY' ? <TrendingUp className="w-3 h-3 stroke-[2.5]" /> :
                                                        trade.signal === 'SELL' ? <TrendingDown className="w-3 h-3 stroke-[2.5]" /> :
                                                            <Minus className="w-3 h-3" />}
                                                    {trade.signal}
                                                </span>
                                            </td>

                                            {/* Confidence */}
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <div
                                                        className="w-1.5 h-1.5 rounded-full"
                                                        style={{
                                                            backgroundColor: trade.confidence >= 80 ? 'var(--win)' :
                                                                trade.confidence >= 50 ? 'var(--accent)' : 'var(--text-tertiary)',
                                                        }}
                                                    />
                                                    <span
                                                        className="text-xs font-bold"
                                                        style={{
                                                            color: trade.confidence >= 80 ? 'var(--win)' :
                                                                trade.confidence >= 50 ? 'var(--accent)' : 'var(--text-tertiary)',
                                                        }}
                                                    >
                                                        {trade.confidence}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <button
                                                        onClick={() => onView && onView(trade)}
                                                        className="p-2 rounded-lg transition-colors cursor-pointer"
                                                        style={{ color: 'var(--text-tertiary)' }}
                                                        title="View Analysis"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteClick(trade.id, e)}
                                                        disabled={deletingId === trade.id}
                                                        className="p-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                                                        style={{ color: 'var(--text-tertiary)' }}
                                                        title="Delete Record"
                                                    >
                                                        {deletingId === trade.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <DeleteModal
                isOpen={deleteModal.isOpen}
                type={deleteModal.type}
                onCancel={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmDelete}
            />
        </>
    );
}
