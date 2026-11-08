import { NextResponse } from 'next/server';
import { getEWayBillById } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bill = getEWayBillById(id);
    if (!bill) {
      return NextResponse.json({ success: false, error: 'E-Way Bill not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: bill }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
