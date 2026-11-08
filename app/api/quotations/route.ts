import { NextResponse } from 'next/server';
import { getQuotations, createQuotation } from '@/lib/db';

export async function GET() {
  try {
    const quotations = getQuotations();
    return NextResponse.json({ success: true, data: quotations });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.customer_id) {
      return NextResponse.json({ success: false, error: 'Customer is required' }, { status: 400 });
    }
    const quotation = createQuotation(body);
    return NextResponse.json({ success: true, data: quotation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
