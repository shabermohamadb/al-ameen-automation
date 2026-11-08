import { NextResponse } from 'next/server';
import { getBusiness, updateBusiness, getBusinessSettings, updateBusinessSettings } from '@/lib/supabase-db';

export async function GET() {
  try {
    const business = await getBusiness();
    const settings = await getBusinessSettings();
    return NextResponse.json({ success: true, business, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body.business) {
      await updateBusiness(body.business);
    }
    if (body.settings) {
      await updateBusinessSettings(body.settings);
    }
    return NextResponse.json({ success: true, business: await getBusiness(), settings: await getBusinessSettings() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
