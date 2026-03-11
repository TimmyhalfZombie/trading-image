import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const email = `test_obj_${Date.now()}@example.com`;
    
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email,
        password: 'password123',
    });
    
    fs.writeFileSync('out-json.txt', JSON.stringify({
        email,
        signUpError: signUpError?.message || null,
        sessionExists: !!signUpData?.session,
        isConfirmed: signUpData?.user?.email_confirmed_at != null
    }, null, 2), 'utf-8');
}

check();
