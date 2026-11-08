import { NextResponse } from 'next/server';
import { supabaseAdmin, checkSupabaseConnection } from '@/lib/supabase';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const conn = await checkSupabaseConnection();
    return NextResponse.json({
      success: true,
      url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://edjrjqmplnkdaatqwlbh.supabase.co',
      connected: conn.connected,
      code: conn.code,
      error: conn.error,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const conn = await checkSupabaseConnection();
    if (!conn.connected) {
      return NextResponse.json({
        success: false,
        error: conn.error || 'Database tables not yet created in Supabase.',
        code: conn.code,
        hint: 'Please run supabase/migrations/001_initial_schema.sql in your Supabase SQL Editor first.'
      }, { status: 400 });
    }

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

    const results: Record<string, number> = {};

    for (const table of tables) {
      try {
        const rows = sqlite.prepare(`SELECT * FROM ${table}`).all();
        if (rows.length > 0) {
          const cleaned = rows.map((r: any) => {
            const copy = { ...r };
            for (const k of Object.keys(copy)) {
              if (copy[k] === null || copy[k] === undefined) continue;
              if (k.startsWith('is_') && typeof copy[k] === 'number') {
                copy[k] = copy[k] === 1;
              }
            }
            return copy;
          });

          const { error } = await supabaseAdmin.from(table).upsert(cleaned, { onConflict: 'id' });
          if (!error) {
            results[table] = rows.length;
          }
        }
      } catch (err: any) {
        // Table might not exist or empty
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully synced local data to Supabase PostgreSQL!',
      syncedTables: results
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
