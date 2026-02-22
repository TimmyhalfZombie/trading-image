import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    console.log("Trading History API Route invoked");

    if (!supabase) {
        console.warn("Supabase client not initialized. Check your environment variables.");
        return NextResponse.json({ error: "Supabase client initialization failed" }, { status: 500 });
    }

    try {
        const { data: records, error } = await supabase
            .from('trading_signals')
            .select('*')
            .in('signal_type', ['BUY', 'SELL'])
            .order('created_at', { ascending: false })
            .limit(20);

        if (error) {
            console.error("Supabase error fetching history:", error);
            return NextResponse.json({
                error: `Supabase Error: ${error.message}`,
                details: error.details,
                code: error.code,
                hint: error.hint
            }, { status: 500 });
        }

        // Map database columns to frontend interface
        // Database might have: signal_type OR signal, stop_loss OR sl, etc.
        const trades = (records || []).map((record: any) => ({
            id: record.id,
            created_at: record.created_at,
            asset: record.asset || record.asset_name || 'Unknown',
            signal: record.signal || record.signal_type || 'NEUTRAL',
            outcome: (record.outcome || 'PENDING').toUpperCase(),
            confidence: record.confidence || 0,
            pnl: record.pnl || 0,
            // Additional fields if needed but frontend doesn't use them all
            sl: record.sl || record.stop_loss || 0,
            tp: record.tp || record.take_profit || 0,
            reasoning: record.reasoning || ""
        }));

        return NextResponse.json(trades);
    } catch (err: any) {
        console.error("Internal Server Error in /api/trading-history:", err);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: err.message
        }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    console.log("Trading History DELETE API invoked");

    if (!supabase) {
        return NextResponse.json({ error: "Supabase client initialization failed" }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const deleteAll = searchParams.get('all') === 'true';



        let error;

        if (deleteAll) {
            // Delete all records where ID is not the zero UUID (effectively all valid UUIDs)
            const result = await supabase
                .from('trading_signals')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000');
            error = result.error;
        } else if (id) {
            const result = await supabase
                .from('trading_signals')
                .delete()
                .eq('id', id);
            error = result.error;
        } else {
            return NextResponse.json({ error: "Missing 'id' parameter or 'all=true'" }, { status: 400 });
        }

        if (error) {
            console.error("Supabase error deleting record:", error);
            return NextResponse.json({
                error: `Supabase Error: ${error.message}`,
                details: error.details
            }, { status: 500 });
        }

        return NextResponse.json({ message: "Record deleted successfully" });
    } catch (err: any) {
        console.error("Internal Server Error in DELETE /api/trading-history:", err);
        return NextResponse.json({
            error: 'Internal Server Error',
            details: err.message
        }, { status: 500 });
    }
}
