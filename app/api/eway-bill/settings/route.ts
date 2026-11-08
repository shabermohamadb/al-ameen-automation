import { NextResponse } from 'next/server';
import { getEWayBillSettings, updateEWayBillSettings } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const settings = getEWayBillSettings();
    return NextResponse.json({ success: true, data: settings }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const updated = updateEWayBillSettings(body);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
