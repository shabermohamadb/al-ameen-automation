import { NextResponse } from 'next/server';
import { getBusiness, updateBusiness, getBusinessSettings, updateBusinessSettings } from '@/lib/db';

export async function GET() {
  try {
    const business = getBusiness();
    const settings = getBusinessSettings();
    return NextResponse.json({ success: true, business, settings });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    if (body.business) {
      updateBusiness(body.business);
    }
    if (body.settings) {
      updateBusinessSettings(body.settings);
    }
    return NextResponse.json({ success: true, business: getBusiness(), settings: getBusinessSettings() });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
