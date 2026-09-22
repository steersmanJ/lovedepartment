import { supabase } from './src/supabaseClient.js';

async function run() {
  console.log("Trying to insert into songs...");
  let { data, error } = await supabase.from('songs').insert({ title: 'Test from script', imageurl: null }).select('id, title, imageUrl:imageurl').single();
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success:", data);
  }
}

run();
