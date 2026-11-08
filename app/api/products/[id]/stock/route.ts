import { NextResponse } from 'next/server';
import { adjustStock } from '@/lib/supabase-db';
import { getSession } from '@/lib/auth';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;
    const body = await request.json();
    const quantity = Number(body.quantity);
    const type = body.type as 'in' | 'out' | 'adjustment';
    const notes = body.notes || '';

    if (isNaN(quantity) || quantity < 0) {
      return NextResponse.json({ success: false, error: 'Valid quantity is required' }, { status: 400 });
    }

    await adjustStock(
      id,
      type,
      quantity,
      notes || 'Stock adjustment',
      session?.userId,
      session?.fullName || session?.username,
      session?.role,
      body.new_price ? Number(body.new_price) : undefined
    );

    return NextResponse.json({ success: true, message: 'Stock updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
