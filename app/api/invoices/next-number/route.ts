import { NextResponse } from 'next/server';
import { getNextInvoiceNumber } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nextNumber = getNextInvoiceNumber();
    return NextResponse.json(
      { success: true, nextNumber },
      { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0' } }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
