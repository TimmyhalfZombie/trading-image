import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('[stripe] STRIPE_SECRET_KEY not set — Stripe features will be unavailable.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
    ? new Stripe(process.env.STRIPE_SECRET_KEY, {
        typescript: true,
    })
    : null;

// Plan configuration
export const PLANS = {
    free: {
        name: 'Free',
        dailyLimit: Number(process.env.PLAN_LIMIT_FREE) || 3,
        price: 0,
        stripePriceId: null,
    },
    starter: {
        name: 'Starter',
        dailyLimit: Number(process.env.PLAN_LIMIT_STARTER) || 10,
        price: 4.99,
        stripePriceId: process.env.STRIPE_STARTER_PRICE_ID || null,
    },
    pro: {
        name: 'Pro',
        dailyLimit: Number(process.env.PLAN_LIMIT_PRO) || 30,
        price: 9.99,
        stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    },
} as const;

export type PlanType = keyof typeof PLANS;
