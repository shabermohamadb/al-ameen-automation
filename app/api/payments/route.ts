import { NextResponse } from 'next/server';
import { getPayments, createPayment } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'in' | 'out' | null;
    const payments = getPayments(type || undefined);
    return NextResponse.json({ success: true, data: payments });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.amount || !body.entity_id) {
      return NextResponse.json({ success: false, error: 'Entity and Amount are required' }, { status: 400 });
    }
    const payment = createPayment(body);
    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
