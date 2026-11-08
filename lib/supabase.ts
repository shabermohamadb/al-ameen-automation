import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const isSupabaseConfigured = () => Boolean(supabaseUrl && (supabaseServiceKey || supabaseAnonKey));

// Standard client with anon key (safe for client and server)
export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

// Admin client with service role secret key (bypasses RLS, server-only)
export const supabaseAdmin = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseServiceKey || supabaseAnonKey || 'placeholder', {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function checkSupabaseConnection() {
  try {
    const { data, error } = await supabaseAdmin.from('businesses').select('id, name').limit(1);
    if (error) {
      return { connected: false, error: error.message, code: error.code };
    }
    return { connected: true, data };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
