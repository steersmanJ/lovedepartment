import { supabase } from './src/supabaseClient.js';

async function run() {
  console.log("Trying to insert song with imageurl (lowercase)...");
  let insertRes = await supabase.from('songs').insert({ title: 'Test Song 3', imageurl: null }).select().single();
  console.log("Insert result:", insertRes.error || insertRes.data);
}

run();
