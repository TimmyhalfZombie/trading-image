import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLANS, isPayMongoConfigured, createCheckoutSession, createCustomer } from '@/lib/stripe';
import { getUserPlan } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        if (!isPayMongoConfigured()) {
            return NextResponse.json(
                { error: 'Payment system is not configured.' },
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
        const subscription = await getUserPlan(user.id);

        // Get or create PayMongo customer
        let customerId = subscription.stripeCustomerId; // reusing column name

        if (!customerId) {
            try {
                const customerRes = await createCustomer(
                    user.email || '',
                    user.user_metadata?.full_name || 'Trader',
                    { supabase_user_id: user.id }
                );
                customerId = customerRes.data.id;

                // Store customer ID
                await supabase
                    .from('user_subscriptions')
                    .update({ stripe_customer_id: customerId })
                    .eq('user_id', user.id);
            } catch (err: any) {
                console.error('[paymongo/checkout] Failed to create customer:', err.message);
            }
        }

        // Create a PayMongo Checkout Session
        const origin = request.headers.get('origin') || 'http://localhost:3000';

        const session = await createCheckoutSession(
            plan,
            user.email || '',
            `${origin}/?checkout=success&plan=${plan}`,
            `${origin}/?checkout=canceled`,
            {
                supabase_user_id: user.id,
                plan,
                ...(customerId ? { customer_id: customerId } : {}),
            }
        );

        const checkoutUrl = session.data.attributes.checkout_url;

        if (!checkoutUrl) {
            throw new Error('No checkout URL returned from PayMongo');
        }

        return NextResponse.json({
            url: checkoutUrl,
            type: 'checkout',
            checkoutId: session.data.id,
        });
    } catch (error: any) {
        console.error('[paymongo/checkout] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to create checkout session.' },
            { status: 500 }
        );
    }
}
