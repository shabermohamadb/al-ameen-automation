import { getDb } from '../lib/db';
import { supabaseAdmin, checkSupabaseConnection } from '../lib/supabase';

async function main() {
  console.log('====================================================');
  console.log('   AL AMEEN AUTOMATION: SQLITE -> SUPABASE SYNC     ');
  console.log('====================================================');

  console.log('\n[1/3] Testing Supabase Connection...');
  const conn = await checkSupabaseConnection();
  if (!conn.connected) {
    if (conn.code === 'PGRST205') {
      console.log('⚠️  Connected to Supabase project, but PostgreSQL tables are not yet created.');
      console.log('\n👉 HOW TO INITIALIZE DATABASE IN SUPABASE:');
      console.log('1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/edjrjqmplnkdaatqwlbh');
      console.log('2. In the left navigation, click "SQL Editor" (or New Query).');
      console.log('3. Open the file: supabase/migrations/001_initial_schema.sql');
      console.log('4. Copy and paste the entire SQL contents into the SQL Editor and click "Run".');
      console.log('5. Once done, re-run this sync script: npm run sync:supabase\n');
      return;
    }
    console.error('❌ Supabase connection error:', conn.error);
    return;
  }

  console.log('✅ Connected to Supabase PostgreSQL database.');

  console.log('\n[2/3] Extracting records from local SQLite...');
  const sqlite = getDb();

  const tables = [
    'businesses',
    'business_settings',
    'users',
    'product_categories',
    'products',
    'customers',
    'suppliers',
    'quotations',
    'quotation_items',
    'sales_invoices',
    'sales_invoice_items',
    'stock_movements',
    'payments',
    'expenses',
    'manufacturing_jobs',
    'installations',
    'service_requests',
    'party_prices'
  ];

  console.log('\n[3/3] Uploading records to Supabase...');
  for (const table of tables) {
    try {
      const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
      console.log(`- ${table}: found ${rows.length} local rows.`);
      if (rows.length === 0) continue;

      // Clean rows for PostgreSQL (convert booleans/numbers if needed)
      const cleaned = rows.map((r: any) => {
        const copy = { ...r };
        for (const k of Object.keys(copy)) {
          if (copy[k] === null || copy[k] === undefined) continue;
          // SQLite stores booleans as 0 or 1
          if (k.startsWith('is_') && typeof copy[k] === 'number') {
            copy[k] = copy[k] === 1;
          }
        }
        return copy;
      });

      const { data, error } = await supabaseAdmin.from(table).upsert(cleaned, { onConflict: 'id' });
      if (error) {
        console.warn(`  ⚠️ Warning syncing table ${table}:`, error.message);
      } else {
        console.log(`  ✅ Synced ${rows.length} rows to ${table}`);
      }
    } catch (e: any) {
      console.warn(`  ⚠️ Error querying SQLite table ${table}:`, e.message);
    }
  }

  console.log('\n====================================================');
  console.log('🎉 Data synchronization to Supabase complete!');
  console.log('====================================================');
}

main().catch(console.error);
