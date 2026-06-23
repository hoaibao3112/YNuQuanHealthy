const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Updating shop_slug in Supabase from 'quan-test' to 'quan'...");

  // Update menu_items
  const { data: d1, error: e1 } = await supabase
    .from('menu_items')
    .update({ shop_slug: 'quan' })
    .eq('shop_slug', 'quan-test');

  if (e1) {
    console.error("Error updating menu_items:", e1);
  } else {
    console.log("Successfully updated menu_items shop_slug to 'quan'");
  }

  // Update orders
  const { data: d2, error: e2 } = await supabase
    .from('orders')
    .update({ shop_slug: 'quan' })
    .eq('shop_slug', 'quan-test');

  if (e2) {
    console.error("Error updating orders:", e2);
  } else {
    console.log("Successfully updated orders shop_slug to 'quan'");
  }
}

run();
