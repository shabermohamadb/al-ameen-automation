import { NextResponse } from 'next/server';
import { getInstallations, createInstallation } from '@/lib/db';

export async function GET() {
  try {
    const installations = getInstallations();
    return NextResponse.json({ success: true, data: installations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.customer_id || !body.technician_name) {
      return NextResponse.json({ success: false, error: 'Customer and Technician are required' }, { status: 400 });
    }
    const installation = createInstallation(body);
    return NextResponse.json({ success: true, data: installation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
