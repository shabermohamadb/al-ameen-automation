import { NextResponse } from 'next/server';
import { getPendingEWayBillInvoices } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const pending = getPendingEWayBillInvoices();
    return NextResponse.json({ success: true, data: pending }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
