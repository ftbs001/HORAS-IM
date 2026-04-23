import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const file = Buffer.from('test', 'utf-8');

async function testUploads() {
    console.log("Testing upload to bab5/...");
    let res = await supabase.storage.from('report-images').upload('bab5/test.png', file, {upsert:true});
    console.log("bab5 res:", res.error?.message || "Success");

    console.log("Testing upload to reports/BAB I/...");
    res = await supabase.storage.from('report-images').upload('reports/BAB I/test.png', file, {upsert:true});
    console.log("reports res:", res.error?.message || "Success");
}
testUploads();
