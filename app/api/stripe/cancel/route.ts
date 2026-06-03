import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe } from '@/lib/stripe';
import { getUserPlan } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function POST() {
    try {
        if (!stripe) {
            return NextResponse.json(
                { error: 'Stripe is not configured.' },
                { status: 500 }
            );
        }

        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await getUserPlan(user.id);

        if (!subscription.stripeSubscriptionId) {
            return NextResponse.json(
                { error: 'No active subscription to cancel.' },
                { status: 400 }
            );
        }

        // Cancel at period end — subscription continues until billing period ends
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
            cancel_at_period_end: true,
        });

        // Update local DB
        await supabase
            .from('user_subscriptions')
            .update({
                cancel_at_period_end: true,
                updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id);

        return NextResponse.json({
            success: true,
            message: 'Subscription will be canceled at the end of the billing period.',
            currentPeriodEnd: subscription.currentPeriodEnd,
        });
    } catch (error: any) {
        console.error('[stripe/cancel] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to cancel subscription.' },
            { status: 500 }
        );
    }
}
