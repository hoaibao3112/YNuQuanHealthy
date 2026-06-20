const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Read the root .env file
const envContent = fs.readFileSync(path.join(__dirname, '../.env'), 'utf8');
const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] ? match[2].trim() : '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.substring(1, value.length - 1);
    }
    env[match[1]] = value;
  }
});

const supabaseUrl = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, shop_slug, category, is_active, price');

  if (error) {
    console.error("Error fetching items:", error);
    return;
  }

  console.log(`Total items in DB: ${data.length}`);
  const summary = {};
  data.forEach(item => {
    if (!summary[item.shop_slug]) {
      summary[item.shop_slug] = { total: 0, active: 0, inactive: 0, categories: {} };
    }
    summary[item.shop_slug].total++;
    if (item.is_active) {
      summary[item.shop_slug].active++;
    } else {
      summary[item.shop_slug].inactive++;
    }
    summary[item.shop_slug].categories[item.category] = (summary[item.shop_slug].categories[item.category] || 0) + 1;
  });
  console.log("Database Summary by shop_slug:");
  console.log(JSON.stringify(summary, null, 2));

  console.log("\nSample items (first 5):");
  console.log(data.slice(0, 5));
}

run();
