import { createClient } from '@/lib/supabase/server';
import { PLANS, type PlanType } from '@/lib/paymongo'; // PayMongo-backed config

export interface TokenInfo {
    plan: PlanType;
    planName: string;
    limit: number;
    used: number;
    remaining: number;
    canAnalyze: boolean;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
}

/**
 * Get the user's current subscription plan.
 * Falls back to 'free' if no subscription record exists.
 */
export async function getUserPlan(userId: string): Promise<{
    plan: PlanType;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
}> {
    const supabase = await createClient();
    const { data } = await supabase
        .from('user_subscriptions')
        .select('plan, cancel_at_period_end, current_period_end, stripe_subscription_id, stripe_customer_id')
        .eq('user_id', userId)
        .single();

    if (!data) {
        return {
            plan: 'free',
            cancelAtPeriodEnd: false,
            currentPeriodEnd: null,
            stripeSubscriptionId: null,
            stripeCustomerId: null,
        };
    }

    return {
        plan: (data.plan as PlanType) || 'free',
        cancelAtPeriodEnd: data.cancel_at_period_end || false,
        currentPeriodEnd: data.current_period_end || null,
        stripeSubscriptionId: data.stripe_subscription_id || null,
        stripeCustomerId: data.stripe_customer_id || null,
    };
}

/**
 * Get daily limit for a plan.
 */
export function getDailyLimit(plan: PlanType): number {
    return PLANS[plan]?.dailyLimit ?? PLANS.free.dailyLimit;
}

/**
 * Get today's usage count for a user.
 */
export async function getDailyUsage(userId: string): Promise<number> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const { data } = await supabase
        .from('daily_usage')
        .select('analysis_count')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();

    return data?.analysis_count ?? 0;
}

/**
 * Increment the user's daily usage count.
 * Upserts — creates the row if it doesn't exist for today.
 */
export async function incrementUsage(userId: string): Promise<void> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Try to increment existing row
    const { data: existing } = await supabase
        .from('daily_usage')
        .select('id, analysis_count')
        .eq('user_id', userId)
        .eq('usage_date', today)
        .single();

    if (existing) {
        await supabase
            .from('daily_usage')
            .update({ analysis_count: existing.analysis_count + 1 })
            .eq('id', existing.id);
    } else {
        await supabase
            .from('daily_usage')
            .insert({ user_id: userId, usage_date: today, analysis_count: 1 });
    }
}

/**
 * Check if a user can perform an analysis.
 * Returns full token info including remaining count.
 */
export async function canAnalyze(userId: string): Promise<TokenInfo> {
    const subscription = await getUserPlan(userId);
    const limit = getDailyLimit(subscription.plan);
    const used = await getDailyUsage(userId);
    const remaining = Math.max(0, limit - used);

    return {
        plan: subscription.plan,
        planName: PLANS[subscription.plan]?.name ?? 'Free',
        limit,
        used,
        remaining,
        canAnalyze: true, // Daily limitation bypassed (originally: remaining > 0)
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        currentPeriodEnd: subscription.currentPeriodEnd,
    };
}
