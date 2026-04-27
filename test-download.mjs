import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testFetch() {
    const { data: rec } = await supabase.from('monthly_reports').select('content').eq('section_key', 'bab5').single();
    if(rec) {
        console.log("BAB 5 content:", rec.content);
    }
}
testFetch();
