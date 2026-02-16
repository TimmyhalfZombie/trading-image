"use client";

import React, { useEffect, useState } from 'react';
import { AlertCircle, Inbox, Loader2, RotateCcw, ArrowUpRight, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { twMerge } from 'tailwind-merge';
import { toast } from 'sonner';

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

function getRelativeTime(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay === 1) return 'Yesterday';
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
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
            <div className="flex flex-col h-full bg-white rounded-3xl border border-stone-200/60 overflow-hidden items-center justify-center p-16">
                <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center mb-4">
                    <Loader2 className="w-5 h-5 text-stone-400 animate-spin" />
                </div>
                <p className="text-stone-400 text-xs font-medium tracking-wide">Loading history...</p>
            </div>
        );
    }

    // ---------- ERROR STATE ----------
    if (error) {
        return (
            <div className="flex flex-col h-full bg-white rounded-3xl border border-stone-200/60 overflow-hidden items-center justify-center p-16 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100/50">
                    <AlertCircle className="w-6 h-6 text-red-400 stroke-[1.5]" />
                </div>
                <p className="text-stone-700 font-bold text-sm mb-1">Unable to load data</p>
                <p className="text-stone-400 text-xs mb-6 max-w-[240px] leading-relaxed">{error}</p>
                <button
                    onClick={fetchTrades}
                    className="flex items-center gap-2 px-5 py-2.5 bg-stone-50 text-stone-600 rounded-xl hover:bg-stone-100 transition-colors text-xs font-semibold border border-stone-200/60 shadow-sm"
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
            <div className="flex flex-col h-full bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden relative">
                {/* Header */}
                <div className="px-8 py-5 border-b border-stone-50 flex items-center justify-between bg-white sticky top-0 z-20">
                    <div className="flex items-center gap-3">
                        <h2 className="text-sm font-bold text-stone-800 tracking-tight">Signal History</h2>
                        <span className="text-[10px] text-stone-400 font-semibold bg-stone-50 px-2 py-0.5 rounded-md border border-stone-100">
                            {trades.length}
                        </span>
                    </div>
                    {trades.length > 0 && (
                        <button
                            onClick={handleDeleteAllClick}
                            className="text-[11px] font-semibold text-stone-400 hover:text-red-500 transition-colors px-2 py-1 rounded-md hover:bg-stone-50"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Table Content */}
                <div className="overflow-auto flex-1">
                    {trades.length === 0 ? (
                        /* Empty State */
                        <div className="flex flex-col items-center justify-center h-full text-center py-20 opacity-80">
                            <div className="w-16 h-16 rounded-2xl bg-stone-50 flex items-center justify-center mb-4 border border-stone-100/60">
                                <Inbox className="w-7 h-7 text-stone-300 stroke-[1.25]" />
                            </div>
                            <p className="text-sm font-semibold text-stone-600 mb-1">No signals recorded</p>
                            <p className="text-xs text-stone-400 max-w-[200px] leading-relaxed">
                                Completed analyses will appear here automatically
                            </p>
                        </div>
                    ) : (
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-stone-50/40 sticky top-0 z-10 border-b border-stone-50 backdrop-blur-sm">
                                <tr>
                                    <th className="px-8 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-widest w-1/6">Date</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-widest w-1/6">Asset</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-widest w-1/6 text-center">Signal</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-widest w-1/6 text-center">Confidence</th>
                                    <th className="px-6 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-widest w-1/6 text-right">P&L</th>
                                    <th className="px-8 py-4 text-[10px] font-semibold text-stone-400 uppercase tracking-widest w-1/6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-50">
                                {trades.map((trade) => {
                                    const relativeTime = getRelativeTime(trade.created_at);

                                    return (
                                        <tr key={trade.id} className="group hover:bg-stone-50/40 transition-colors duration-200">
                                            {/* Date */}
                                            <td className="px-8 py-5 text-xs font-medium text-stone-500 whitespace-nowrap">
                                                {relativeTime}
                                            </td>

                                            {/* Asset */}
                                            <td className="px-6 py-5">
                                                <span className="text-stone-700 text-xs font-bold px-2.5 py-1 rounded-md bg-stone-100/50 border border-stone-100 tracking-tight font-mono">
                                                    {trade.asset}
                                                </span>
                                            </td>

                                            {/* Signal Pill */}
                                            <td className="px-6 py-5 text-center">
                                                <span className={twMerge(
                                                    "text-[10px] font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 border shadow-sm",
                                                    trade.signal === 'BUY' ? "bg-emerald-50/70 text-emerald-700 border-emerald-100" :
                                                        trade.signal === 'SELL' ? "bg-red-50/70 text-red-700 border-red-100" :
                                                            "bg-stone-50 text-stone-500 border-stone-100"
                                                )}>
                                                    {trade.signal === 'BUY' ? <TrendingUp className="w-3 h-3 stroke-[2.5]" /> :
                                                        trade.signal === 'SELL' ? <TrendingDown className="w-3 h-3 stroke-[2.5]" /> :
                                                            <Minus className="w-3 h-3" />}
                                                    {trade.signal}
                                                </span>
                                            </td>

                                            {/* Confidence */}
                                            <td className="px-6 py-5 text-center">
                                                <div className="flex items-center justify-center gap-1.5">
                                                    <div className={twMerge(
                                                        "w-1.5 h-1.5 rounded-full",
                                                        trade.confidence >= 80 ? "bg-emerald-400" :
                                                            trade.confidence >= 50 ? "bg-amber-400" : "bg-stone-300"
                                                    )} />
                                                    <span className={twMerge(
                                                        "text-xs font-bold",
                                                        trade.confidence >= 80 ? "text-emerald-600" :
                                                            trade.confidence >= 50 ? "text-amber-600" : "text-stone-400"
                                                    )}>
                                                        {trade.confidence}%
                                                    </span>
                                                </div>
                                            </td>

                                            {/* P&L */}
                                            <td className="px-6 py-5 text-right">
                                                <span className={twMerge(
                                                    "text-sm font-mono font-bold tracking-tight",
                                                    trade.pnl > 0 ? "text-emerald-600" : trade.pnl < 0 ? "text-red-500" : "text-stone-300"
                                                )}>
                                                    {trade.pnl > 0 ? '+' : ''}{trade.pnl}
                                                    <span className="text-[10px] font-sans text-stone-300 ml-1 font-medium">USD</span>
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-8 py-5 text-right">
                                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-x-2 group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => onView && onView(trade)}
                                                        className="p-2 hover:bg-stone-100 text-stone-300 hover:text-stone-600 rounded-lg transition-colors"
                                                        title="View Analysis"
                                                    >
                                                        <ArrowUpRight className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteClick(trade.id, e)}
                                                        disabled={deletingId === trade.id}
                                                        className="p-2 hover:bg-red-50 text-stone-300 hover:text-red-500 rounded-lg transition-colors disabled:opacity-50"
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

            {/* Delete Confirmation Modal */}
            {deleteModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/20 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl shadow-xl border border-stone-100 p-6 max-w-[320px] w-full animate-in zoom-in-95 duration-200">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4 border border-red-100/50">
                                <Trash2 className="w-6 h-6 text-red-400 stroke-[1.5]" />
                            </div>
                            <h3 className="text-base font-bold text-stone-800 mb-1">
                                {deleteModal.type === 'all' ? 'Clear All History' : 'Delete Record'}
                            </h3>
                            <p className="text-xs text-stone-500 mb-6 leading-relaxed px-2">
                                {deleteModal.type === 'all'
                                    ? "This will permanently remove all signal records. This cannot be undone."
                                    : "This record will be permanently deleted."}
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
                                    className="flex-1 px-4 py-2.5 bg-white border border-stone-200 text-stone-600 rounded-xl text-xs font-bold hover:bg-stone-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 shadow-sm shadow-red-200 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
