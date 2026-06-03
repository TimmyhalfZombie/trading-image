import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Use admin client for webhook (no user session)
function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
        // Fall back to anon key with limited permissions
        return createAdminClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    }
    
    return createAdminClient(url, serviceKey);
}

export async function POST(request: Request) {
    try {
        if (!stripe) {
            return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
        }

        const body = await request.text();
        const signature = request.headers.get('stripe-signature');

        if (!signature) {
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[stripe/webhook] STRIPE_WEBHOOK_SECRET not set');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        let event;
        try {
            event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        } catch (err: any) {
            console.error('[stripe/webhook] Signature verification failed:', err.message);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const supabase = getAdminClient();

        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.metadata?.supabase_user_id;
                const plan = session.metadata?.plan;
                const subscriptionId = session.subscription as string;
                const customerId = session.customer as string;

                if (!userId || !plan) {
                    console.error('[stripe/webhook] Missing metadata in checkout session');
                    break;
                }

                // Fetch subscription details for period dates
                const sub = await stripe.subscriptions.retrieve(subscriptionId);

                await supabase
                    .from('user_subscriptions')
                    .upsert({
                        user_id: userId,
                        plan,
                        stripe_customer_id: customerId,
                        stripe_subscription_id: subscriptionId,
                        status: 'active',
                        cancel_at_period_end: false,
                        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });

                console.log(`[stripe/webhook] User ${userId} subscribed to ${plan}`);
                break;
            }

            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const userId = sub.metadata?.supabase_user_id;

                if (!userId) {
                    console.error('[stripe/webhook] Missing user_id in subscription metadata');
                    break;
                }

                // Determine plan from price ID
                const priceId = sub.items.data[0]?.price?.id;
                let plan = 'free';
                if (priceId === process.env.STRIPE_STARTER_PRICE_ID) plan = 'starter';
                if (priceId === process.env.STRIPE_PRO_PRICE_ID) plan = 'pro';

                const status = sub.status === 'active' ? 'active'
                    : sub.status === 'past_due' ? 'past_due'
                    : sub.status === 'canceled' ? 'canceled'
                    : 'active';

                await supabase
                    .from('user_subscriptions')
                    .update({
                        plan,
                        status,
                        cancel_at_period_end: sub.cancel_at_period_end || false,
                        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
                        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                console.log(`[stripe/webhook] Subscription updated for ${userId}: ${plan} (${status})`);
                break;
            }

            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const userId = sub.metadata?.supabase_user_id;

                if (!userId) break;

                // Revert to free plan
                await supabase
                    .from('user_subscriptions')
                    .update({
                        plan: 'free',
                        status: 'active',
                        stripe_subscription_id: null,
                        cancel_at_period_end: false,
                        current_period_start: null,
                        current_period_end: null,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('user_id', userId);

                console.log(`[stripe/webhook] Subscription deleted for ${userId}, reverted to free`);
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const subscriptionId = invoice.subscription as string;

                if (subscriptionId) {
                    const sub = await stripe.subscriptions.retrieve(subscriptionId);
                    const userId = sub.metadata?.supabase_user_id;

                    if (userId) {
                        await supabase
                            .from('user_subscriptions')
                            .update({
                                status: 'past_due',
                                updated_at: new Date().toISOString(),
                            })
                            .eq('user_id', userId);

                        console.log(`[stripe/webhook] Payment failed for ${userId}`);
                    }
                }
                break;
            }

            default:
                console.log(`[stripe/webhook] Unhandled event: ${event.type}`);
        }

        return NextResponse.json({ received: true });
    } catch (error) {
        console.error('[stripe/webhook] Error:', error);
        return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
}
