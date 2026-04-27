import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function listFiles() {
    console.log("--- BAB 5 ---");
    const { data: bab5, error: e1 } = await supabase.storage.from('report-images').list('bab5', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
    });
    console.dir(bab5, { depth: null });
    
    console.log("--- RICH TEXT ---");
    const { data: rich, error: e2 } = await supabase.storage.from('report-images').list('rich_text', {
        limit: 10,
        sortBy: { column: 'created_at', order: 'desc' }
    });
    console.dir(rich, { depth: null });
    
    console.log("--- DB RECORD BAB 5 ---");
    const { data: rec } = await supabase.from('monthly_reports').select('content').eq('section_key', 'bab5').single();
    if(rec) {
        console.log("BAB 5 content:", rec.content.substring(0, 100));
    }
}
listFiles();
