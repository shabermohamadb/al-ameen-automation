import { NextResponse } from 'next/server';
import { getPurchases, createPurchase } from '@/lib/db';

export async function GET() {
  try {
    const purchases = getPurchases();
    return NextResponse.json({ success: true, data: purchases });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.supplier_id) {
      return NextResponse.json({ success: false, error: 'Supplier is required' }, { status: 400 });
    }
    const purchase = createPurchase(body);
    return NextResponse.json({ success: true, data: purchase }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
