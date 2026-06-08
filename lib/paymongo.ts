import crypto from 'crypto';

// PayMongo API config
const PAYMONGO_API_URL = 'https://api.paymongo.com/v1';

function getAuthHeader(): string {
    const secretKey = process.env.PAYMONGO_SECRET_KEY;
    if (!secretKey) {
        throw new Error('PAYMONGO_SECRET_KEY is not set');
    }
    return `Basic ${Buffer.from(secretKey + ':').toString('base64')}`;
}

/**
 * Make an authenticated request to the PayMongo API.
 */
async function paymongoRequest(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    body?: any
): Promise<any> {
    const res = await fetch(`${PAYMONGO_API_URL}${endpoint}`, {
        method,
        headers: {
            'Authorization': getAuthHeader(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json();

    if (!res.ok) {
        const errorMsg = data?.errors?.[0]?.detail || data?.errors?.[0]?.code || `PayMongo API error (${res.status})`;
        throw new Error(errorMsg);
    }

    return data;
}

// ── Plan Configuration ─────────────────────────────────────────────────────

export const PLANS = {
    free: {
        name: 'Free',
        dailyLimit: Number(process.env.PLAN_LIMIT_FREE) || 3,
        price: 0,
        amountCentavos: 0,
        paymongoplanId: null as string | null,
    },
    starter: {
        name: 'Starter',
        dailyLimit: Number(process.env.PLAN_LIMIT_STARTER) || 10,
        price: 249, // ₱249/month
        amountCentavos: 24900, // in centavos
        paymongoplanId: process.env.PAYMONGO_STARTER_PLAN_ID || null,
    },
    pro: {
        name: 'Pro',
        dailyLimit: Number(process.env.PLAN_LIMIT_PRO) || 30,
        price: 499, // ₱499/month
        amountCentavos: 49900, // in centavos
        paymongoplanId: process.env.PAYMONGO_PRO_PLAN_ID || null,
    },
} as const;

export type PlanType = keyof typeof PLANS;

// ── PayMongo API Functions ─────────────────────────────────────────────────

/**
 * Create a PayMongo customer.
 */
export async function createCustomer(email: string, name: string, metadata?: Record<string, string>) {
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0] || 'Trader';
    const lastName = nameParts.slice(1).join(' ') || 'User';

    return paymongoRequest('/customers', 'POST', {
        data: {
            attributes: {
                email,
                first_name: firstName,
                last_name: lastName,
                phone: '+639000000000',
                metadata: metadata || {},
            },
        },
    });
}

/**
 * Create a subscription plan in PayMongo.
 * Call this once during setup to create your plans.
 */
export async function createPlan(name: string, amountCentavos: number, interval: 'month' | 'year' = 'month') {
    return paymongoRequest('/subscriptions/plans', 'POST', {
        data: {
            attributes: {
                name,
                amount: amountCentavos,
                currency: 'PHP',
                interval,
                interval_count: 1,
            },
        },
    });
}

/**
 * Create a subscription for a customer.
 */
export async function createSubscription(planId: string, customerId: string, metadata?: Record<string, string>) {
    return paymongoRequest('/subscriptions', 'POST', {
        data: {
            attributes: {
                plan: planId,
                customer: customerId,
                metadata: metadata || {},
            },
        },
    });
}

/**
 * Retrieve a subscription by ID.
 */
export async function getSubscription(subscriptionId: string) {
    return paymongoRequest(`/subscriptions/${subscriptionId}`);
}

/**
 * Cancel a subscription.
 */
export async function cancelSubscription(subscriptionId: string) {
    return paymongoRequest(`/subscriptions/${subscriptionId}`, 'DELETE');
}

/**
 * Create a Checkout Session for a subscription plan.
 * This is the simplest approach — PayMongo handles the payment UI.
 */
export async function createCheckoutSession(
    planType: 'starter' | 'pro',
    email: string,
    successUrl: string,
    cancelUrl: string,
    metadata?: Record<string, string>
) {
    const plan = PLANS[planType];

    return paymongoRequest('/checkout_sessions', 'POST', {
        data: {
            attributes: {
                description: `${plan.name} Plan - Monthly Subscription`,
                line_items: [
                    {
                        name: `${plan.name} Plan (Monthly)`,
                        quantity: 1,
                        amount: plan.amountCentavos,
                        currency: 'PHP',
                    },
                ],
                payment_method_types: ['gcash', 'card', 'paymaya', 'grab_pay'],
                success_url: successUrl,
                cancel_url: cancelUrl,
                metadata: metadata || {},
            },
        },
    });
}

/**
 * Verify a PayMongo webhook signature.
 */
export function verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string,
    webhookSecretKey: string
): boolean {
    try {
        // PayMongo signature format: t=<timestamp>,te=<test_signature>,li=<live_signature>
        const parts = signatureHeader.split(',');
        const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
        const testSig = parts.find(p => p.startsWith('te='))?.slice(3);
        const liveSig = parts.find(p => p.startsWith('li='))?.slice(3);

        if (!timestamp) return false;

        // Compute expected signature
        const payload = `${timestamp}.${rawBody}`;
        const expectedSig = crypto
            .createHmac('sha256', webhookSecretKey)
            .update(payload)
            .digest('hex');

        // Compare against test or live signature
        const signature = liveSig || testSig;
        if (!signature) return false;

        return crypto.timingSafeEqual(
            Buffer.from(expectedSig),
            Buffer.from(signature)
        );
    } catch {
        return false;
    }
}

/**
 * Check if PayMongo is configured.
 */
export function isPayMongoConfigured(): boolean {
    return !!process.env.PAYMONGO_SECRET_KEY;
}
