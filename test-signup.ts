import { createClient } from '@supabase/supabase-js';

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.auth.signUp({
        email: 'testbloop@gmail.com',
        password: 'password123',
        options: {
            data: {
                phone_number: '1234567890'
            }
        }
    });
    console.log('Error:', error?.name, error?.message, error?.status);
    console.log('User:', data.user ? "Created successfully" : "Not created");
}
test();
