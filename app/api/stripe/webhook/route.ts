import { NextResponse } from 'next/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { verifyWebhookSignature } from '@/lib/stripe';

export const dynamic = 'force-dynamic';

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!serviceKey) {
        return createAdminClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    }
    
    return createAdminClient(url, serviceKey);
}

export async function POST(request: Request) {
    try {
        const rawBody = await request.text();
        const signature = request.headers.get('paymongo-signature');

        if (!signature) {
            console.warn('[paymongo/webhook] Missing paymongo-signature header');
            return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
        }

        const webhookSecret = process.env.PAYMONGO_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error('[paymongo/webhook] PAYMONGO_WEBHOOK_SECRET not set');
            return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
        }

        // Verify webhook signature
        const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
        if (!isValid) {
            console.error('[paymongo/webhook] Signature verification failed');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
        }

        const payload = JSON.parse(rawBody);
        const eventType = payload?.data?.attributes?.type;
        const eventData = payload?.data?.attributes?.data;

        console.log(`[paymongo/webhook] Received event: ${eventType}`);

        const supabase = getAdminClient();

        if (eventType === 'checkout_session.payment.paid') {
            const checkoutSession = eventData;
            const attributes = checkoutSession?.attributes;
            const metadata = attributes?.metadata;
            
            const userId = metadata?.supabase_user_id;
            const plan = metadata?.plan;
            const customerId = metadata?.customer_id || null;
            const checkoutSessionId = checkoutSession?.id;

            if (!userId || !plan) {
                console.error('[paymongo/webhook] Missing user_id or plan in checkout session metadata:', metadata);
                return NextResponse.json({ error: 'Missing metadata' }, { status: 400 });
            }

            // Set plan active for 30 days (standard billing period)
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(startDate.getDate() + 30);

            const { error } = await supabase
                .from('user_subscriptions')
                .upsert({
                    user_id: userId,
                    plan,
                    stripe_customer_id: customerId, // reusing the column name
                    stripe_subscription_id: checkoutSessionId, // store session ID to identify the transaction
                    status: 'active',
                    cancel_at_period_end: true, // One-time session automatically expires unless renewed manually
                    current_period_start: startDate.toISOString(),
                    current_period_end: endDate.toISOString(),
                    updated_at: new Date().toISOString(),
                }, { onConflict: 'user_id' });

            if (error) {
                console.error('[paymongo/webhook] Failed to upsert subscription:', error);
                return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
            }

            console.log(`[paymongo/webhook] Successfully activated ${plan} plan for user ${userId}`);
        }

        return NextResponse.json({ received: true });
    } catch (error: any) {
        console.error('[paymongo/webhook] Error handling webhook:', error);
        return NextResponse.json({ error: error.message || 'Webhook handler failed' }, { status: 500 });
    }
}
