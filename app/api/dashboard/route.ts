import { NextResponse } from 'next/server';
import { getDashboardMetrics } from '@/lib/supabase-db';

export async function GET() {
  try {
    const metrics = await getDashboardMetrics();
    return NextResponse.json({ success: true, data: metrics });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
