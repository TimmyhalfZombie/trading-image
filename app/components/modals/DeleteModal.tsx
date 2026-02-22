"use client";

import React from 'react';
import { Trash2 } from 'lucide-react';

interface DeleteModalProps {
    isOpen: boolean;
    type: 'single' | 'all';
    onCancel: () => void;
    onConfirm: () => void;
}

export function DeleteModal({ isOpen, type, onCancel, onConfirm }: DeleteModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            style={{ backgroundColor: 'var(--overlay)' }}
        >
            <div
                className="rounded-3xl shadow-xl p-6 max-w-[320px] w-full animate-in zoom-in-95 duration-200"
                style={{
                    backgroundColor: 'var(--modal-bg)',
                    border: '1px solid var(--border-light)',
                }}
            >
                <div className="flex flex-col items-center text-center">
                    <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                        style={{ backgroundColor: 'var(--loss-bg)', border: '1px solid var(--loss-border)' }}
                    >
                        <Trash2 className="w-6 h-6 stroke-[1.5]" style={{ color: 'var(--loss)' }} />
                    </div>
                    <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {type === 'all' ? 'Clear All History' : 'Delete Record'}
                    </h3>
                    <p className="text-xs mb-6 leading-relaxed px-2" style={{ color: 'var(--text-secondary)' }}>
                        {type === 'all'
                            ? "This will permanently remove all signal records. This cannot be undone."
                            : "This record will be permanently deleted."}
                    </p>
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={onCancel}
                            className="flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                            style={{
                                backgroundColor: 'var(--surface)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold hover:bg-red-600 shadow-sm shadow-red-500/20 transition-colors cursor-pointer"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
