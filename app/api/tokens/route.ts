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

        return NextResponse.json(tokenInfo);
    } catch (error) {
        console.error('[tokens] Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch token info' },
            { status: 500 }
        );
    }
}
