"use client";

import React, { useState } from 'react';
import { Check, Crown, Zap, Loader2, ArrowLeft, AlertCircle, Sparkles } from 'lucide-react';
import { useToast } from './Toast';

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

interface PlansPageProps {
    tokenInfo: TokenInfo | null;
    onBack: () => void;
    onTokenRefresh: () => void;
}

const plans = [
    {
        id: 'free' as const,
        name: 'Free',
        price: '₱0',
        period: 'forever',
        dailyLimit: 3,
        icon: Sparkles,
        color: '#78716C',
        gradient: 'linear-gradient(135deg, #E7E5E4, #D6D3D1)',
        features: [
            '3 analyses per day',
            'Basic chart analysis',
            'Trade history access',
        ],
    },
    {
        id: 'starter' as const,
        name: 'Starter',
        price: '₱249',
        period: '/month',
        dailyLimit: 10,
        icon: Zap,
        color: '#3B82F6',
        gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)',
        popular: true,
        features: [
            '10 analyses per day',
            'Priority chart processing',
            'Trade history access',
            'Email support',
        ],
    },
    {
        id: 'pro' as const,
        name: 'Pro',
        price: '₱499',
        period: '/month',
        dailyLimit: 30,
        icon: Crown,
        color: '#A855F7',
        gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)',
        features: [
            '30 analyses per day',
            'Priority chart processing',
            'Trade history access',
            'Priority email support',
            'Early access to new features',
        ],
    },
];

export function PlansPage({ tokenInfo, onBack, onTokenRefresh }: PlansPageProps) {
    const toast = useToast();
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
    const [cancelLoading, setCancelLoading] = useState(false);

    const currentPlan = tokenInfo?.plan || 'free';

    const handleSubscribe = async (planId: 'starter' | 'pro') => {
        setLoadingPlan(planId);
        try {
            const res = await fetch('/api/stripe/checkout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to start checkout');
            }

            if (data.type === 'upgrade') {
                toast.success(data.message, 'Plan Updated');
                onTokenRefresh();
            } else if (data.url) {
                window.location.href = data.url;
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to process subscription', 'Error');
        } finally {
            setLoadingPlan(null);
        }
    };

    const handleCancel = async () => {
        setCancelLoading(true);
        try {
            const res = await fetch('/api/stripe/cancel', {
                method: 'POST',
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to cancel');
            }

            toast.success(data.message, 'Subscription Canceled');
            onTokenRefresh();
        } catch (error: any) {
            toast.error(error.message || 'Failed to cancel subscription', 'Error');
        } finally {
            setCancelLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6 flex-shrink-0">
                <button
                    onClick={onBack}
                    className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer"
                    style={{
                        backgroundColor: 'var(--nav-bg)',
                        border: '1px solid var(--border-light)',
                        color: 'var(--text-secondary)',
                    }}
                >
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                    <h2 className="text-lg font-black tracking-tight" style={{ color: 'var(--text-primary)' }}>
                        Plans & Pricing
                    </h2>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        Choose the perfect plan for your trading needs
                    </p>
                </div>
            </div>

            {/* Plans Grid */}
            <div className="flex-1 overflow-y-auto pb-4 flex flex-col justify-center">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto pt-4">
                    {plans.map((plan) => {
                        const isCurrentPlan = currentPlan === plan.id;
                        const Icon = plan.icon;
                        const isDowngrade = (currentPlan === 'pro' && plan.id === 'starter') || (currentPlan !== 'free' && plan.id === 'free');

                        return (
                            <div
                                key={plan.id}
                                className="relative rounded-2xl p-5 flex flex-col transition-all duration-300 hover:translate-y-[-2px]"
                                style={{
                                    backgroundColor: 'var(--surface)',
                                    border: plan.popular
                                        ? `2px solid ${plan.color}`
                                        : isCurrentPlan
                                            ? `1.5px dashed var(--border)`
                                            : '1px solid var(--border-light)',
                                    boxShadow: plan.popular
                                        ? `0 12px 24px -10px ${plan.color}40, 0 4px 12px -5px ${plan.color}20`
                                        : undefined,
                                }}
                            >
                                {/* Popular Badge */}
                                {plan.popular && (
                                    <div
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest text-white shadow-sm"
                                        style={{ background: plan.gradient }}
                                    >
                                        Most Popular
                                    </div>
                                )}

                                {/* Current Plan Badge */}
                                {isCurrentPlan && !plan.popular && (
                                    <div
                                        className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest border"
                                        style={{
                                            backgroundColor: 'var(--bg-secondary)',
                                            borderColor: 'var(--border-light)',
                                            color: 'var(--text-secondary)',
                                        }}
                                    >
                                        Current Plan
                                    </div>
                                )}

                                {/* Icon + Name */}
                                <div className="flex items-center gap-2.5 mb-3 mt-1">
                                    <div
                                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                                        style={{
                                            background: `${plan.color}15`,
                                            border: `1px solid ${plan.color}25`,
                                        }}
                                    >
                                        <Icon className="w-4 h-4" style={{ color: plan.color }} />
                                    </div>
                                    <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {plan.name}
                                    </h3>
                                </div>

                                {/* Price */}
                                <div className="mb-4">
                                    <span className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
                                        {plan.price}
                                    </span>
                                    <span className="text-xs font-medium ml-1" style={{ color: 'var(--text-tertiary)' }}>
                                        {plan.period}
                                    </span>
                                </div>

                                {/* Daily Limit */}
                                <div
                                    className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg"
                                    style={{
                                        backgroundColor: `${plan.color}08`,
                                        border: `1px solid ${plan.color}15`,
                                    }}
                                >
                                    <Zap className="w-3.5 h-3.5" style={{ color: plan.color }} />
                                    <span className="text-xs font-bold" style={{ color: plan.color }}>
                                        {plan.dailyLimit} analyses/day
                                    </span>
                                </div>

                                {/* Features */}
                                <ul className="flex-1 space-y-2.5 mb-5">
                                    {plan.features.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-2">
                                            <Check
                                                className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
                                                style={{ color: plan.color }}
                                            />
                                            <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                                                {feature}
                                            </span>
                                        </li>
                                    ))}
                                </ul>

                                {/* Action Button */}
                                {plan.id === 'free' ? (
                                    <div
                                        className="w-full py-2.5 rounded-xl text-xs font-bold text-center"
                                        style={{
                                            backgroundColor: isCurrentPlan ? 'var(--neutral-bg)' : 'transparent',
                                            color: 'var(--text-tertiary)',
                                        }}
                                    >
                                        {isCurrentPlan ? 'Your Current Plan' : 'Default Plan'}
                                    </div>
                                ) : isCurrentPlan ? (
                                    <button
                                        onClick={handleCancel}
                                        disabled={cancelLoading || tokenInfo?.cancelAtPeriodEnd}
                                        className="w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        style={{
                                            backgroundColor: 'var(--loss-bg)',
                                            color: 'var(--loss)',
                                            border: '1px solid var(--loss-border)',
                                        }}
                                    >
                                        {cancelLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {tokenInfo?.cancelAtPeriodEnd
                                            ? 'Cancellation Pending'
                                            : 'Cancel Subscription'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleSubscribe(plan.id)}
                                        disabled={loadingPlan !== null || isDowngrade}
                                        className="w-full py-2.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98]"
                                        style={{ background: plan.gradient }}
                                    >
                                        {loadingPlan === plan.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                        {currentPlan === 'free'
                                            ? `Get ${plan.name}`
                                            : isDowngrade
                                                ? 'Contact Support'
                                                : `Upgrade to ${plan.name}`}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Cancel Notice */}
                {tokenInfo?.cancelAtPeriodEnd && tokenInfo.currentPeriodEnd && (
                    <div
                        className="max-w-7xl mx-auto mt-4 flex items-center gap-2 p-3 rounded-xl text-xs"
                        style={{
                            backgroundColor: 'var(--loss-bg)',
                            color: 'var(--loss)',
                            border: '1px solid var(--loss-border)',
                        }}
                    >
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>
                            Your subscription will be canceled on{' '}
                            <strong>{new Date(tokenInfo.currentPeriodEnd).toLocaleDateString()}</strong>.
                            You'll keep your current plan benefits until then, after which you'll revert to the Free plan.
                        </span>
                    </div>
                )}

                {/* Info Footer */}
                <div className="max-w-7xl mx-auto mt-6 text-center">
                    <p className="text-[10px] font-medium" style={{ color: 'var(--text-tertiary)' }}>
                        All plans include access to AI-powered chart analysis. Daily limits reset at midnight UTC.
                        <br />
                        Cancel anytime — your subscription will remain active until the end of the billing period.
                    </p>
                </div>
            </div>
        </div>
    );
}
