import { createClient } from '@supabase/supabase-js';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = 'invalid_api_key_123'; // INVALID!

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
    });
    console.log('OAuth Error:', error?.message);
    console.log('OAuth Data:', data);
}
test();
