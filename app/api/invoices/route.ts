import { NextResponse } from 'next/server';
import { getSalesInvoices, createSalesInvoice } from '@/lib/supabase-db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const invoices = await getSalesInvoices();
    return NextResponse.json({ success: true, data: invoices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    const body = await request.json();
    if (!body.customer_id) {
      return NextResponse.json({ success: false, error: 'Customer is required' }, { status: 400 });
    }

    if (session) {
      body.created_by_user_id = session.userId;
      body.created_by_name = session.fullName || session.username;
    }

    const invoice = await createSalesInvoice(body);
    return NextResponse.json({ success: true, data: invoice }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
