import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { canAnalyze } from '@/lib/tokens';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const tokenInfo = await canAnalyze(user.id);
        
        // MOCK PLAN FOR TESTING (Change to 'free', 'starter', 'pro', or keep null for production DB)
        const MOCK_PLAN: 'free' | 'starter' | 'pro' | null = null; 
        
        if (MOCK_PLAN) {
            tokenInfo.plan = MOCK_PLAN;
            tokenInfo.planName = MOCK_PLAN === 'starter' ? 'Starter' : MOCK_PLAN === 'pro' ? 'Pro' : 'Free';
            tokenInfo.limit = MOCK_PLAN === 'starter' ? 10 : MOCK_PLAN === 'pro' ? 30 : 3;
            tokenInfo.remaining = Math.max(0, tokenInfo.limit - tokenInfo.used);
            tokenInfo.canAnalyze = true; // Bypassed daily limitation (originally: tokenInfo.remaining > 0)
        }

        return NextResponse.json(tokenInfo);
    } catch (error) {
        console.error('[tokens] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch token info' },
            { status: 500 }
        );
    }
}
