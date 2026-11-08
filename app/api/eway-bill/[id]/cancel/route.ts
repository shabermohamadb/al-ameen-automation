import { NextResponse } from 'next/server';
import { cancelEWayBill, getEWayBillById, getEWayBillSettings } from '@/lib/db';
import { dispatchEWayBillCancel } from '@/lib/eway-bill/gsp-client';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.reason_code) {
      return NextResponse.json(
        { success: false, error: 'Cancellation reason code is required (1: Duplicate, 2: Order Cancelled, 3: Data Entry Error, 4: Others)' },
        { status: 400 }
      );
    }

    const currentEwb = getEWayBillById(id);
    if (!currentEwb) {
      return NextResponse.json({ success: false, error: 'E-Way Bill not found' }, { status: 404 });
    }

    const settings = getEWayBillSettings();

    // If API integration is active, notify government portal
    if (currentEwb.generation_method === 'api' && currentEwb.eway_bill_number) {
      const apiRes = await dispatchEWayBillCancel(
        {
          ewbNo: currentEwb.eway_bill_number,
          cancelRsnCode: parseInt(body.reason_code, 10) || 2,
          cancelRmrk: body.remarks || 'Cancelled by business',
        },
        settings
      );
      if (!apiRes.success) {
        return NextResponse.json({ success: false, error: apiRes.error }, { status: 400 });
      }
    }

    const cancelled = cancelEWayBill(id, body.reason_code, body.remarks || '');
    return NextResponse.json({ success: true, data: cancelled });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
