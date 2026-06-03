import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, PLANS } from '@/lib/stripe';
import { getUserPlan } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
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

        const { plan } = await request.json();

        if (plan !== 'starter' && plan !== 'pro') {
            return NextResponse.json(
                { error: 'Invalid plan. Choose "starter" or "pro".' },
                { status: 400 }
            );
        }

        const planConfig = PLANS[plan];
        if (!planConfig.stripePriceId) {
            return NextResponse.json(
                { error: `Price ID not configured for ${plan} plan.` },
                { status: 500 }
            );
        }

        // Get or create Stripe customer
        const subscription = await getUserPlan(user.id);
        let customerId = subscription.stripeCustomerId;

        if (!customerId) {
            const customer = await stripe.customers.create({
                email: user.email,
                metadata: {
                    supabase_user_id: user.id,
                },
            });
            customerId = customer.id;

            // Store customer ID
            await supabase
                .from('user_subscriptions')
                .update({ stripe_customer_id: customerId })
                .eq('user_id', user.id);
        }

        // If user already has an active subscription, create a portal session
        // to change the plan instead of a new checkout
        if (subscription.stripeSubscriptionId && subscription.plan !== 'free') {
            const stripeSubscription = await stripe.subscriptions.retrieve(
                subscription.stripeSubscriptionId
            );

            if (stripeSubscription.status === 'active') {
                // Update the existing subscription to the new plan
                await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
                    items: [{
                        id: stripeSubscription.items.data[0].id,
                        price: planConfig.stripePriceId,
                    }],
                    proration_behavior: 'create_prorations',
                });

                // Update local DB
                await supabase
                    .from('user_subscriptions')
                    .update({
                        plan,
                        cancel_at_period_end: false,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', user.id);

                return NextResponse.json({
                    success: true,
                    message: `Plan updated to ${planConfig.name}`,
                    type: 'upgrade',
                });
            }
        }

        // Create a new checkout session
        const origin = request.headers.get('origin') || 'http://localhost:3000';

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price: planConfig.stripePriceId,
                quantity: 1,
            }],
            success_url: `${origin}/?checkout=success&plan=${plan}`,
            cancel_url: `${origin}/?checkout=canceled`,
            subscription_data: {
                metadata: {
                    supabase_user_id: user.id,
                    plan,
                },
            },
            metadata: {
                supabase_user_id: user.id,
                plan,
            },
        });

        return NextResponse.json({ url: session.url, type: 'checkout' });
    } catch (error: any) {
        console.error('[stripe/checkout] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session.' },
            { status: 500 }
        );
    }
}
