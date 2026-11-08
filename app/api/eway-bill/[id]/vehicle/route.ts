import { NextResponse } from 'next/server';
import { updateEWayBillVehicle, getEWayBillById, getEWayBillSettings } from '@/lib/db';
import { validateVehicleNumber } from '@/lib/eway-bill/utils';
import { dispatchVehicleUpdate } from '@/lib/eway-bill/gsp-client';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.vehicle_number) {
      return NextResponse.json({ success: false, error: 'Vehicle number is required' }, { status: 400 });
    }

    const vehCheck = validateVehicleNumber(body.vehicle_number);
    if (!vehCheck.valid) {
      return NextResponse.json({ success: false, error: vehCheck.error }, { status: 400 });
    }

    const currentEwb = getEWayBillById(id);
    if (!currentEwb) {
      return NextResponse.json({ success: false, error: 'E-Way Bill not found' }, { status: 404 });
    }

    const settings = getEWayBillSettings();

    // If API integration is active, notify government portal
    if (currentEwb.generation_method === 'api' && currentEwb.eway_bill_number) {
      const apiRes = await dispatchVehicleUpdate(
        {
          ewbNo: currentEwb.eway_bill_number,
          vehicleNo: vehCheck.normalized,
          fromPlace: body.from_place || currentEwb.from_place,
          fromState: parseInt(body.from_state_code || currentEwb.from_state_code, 10),
          reasonCode: body.reason_code || '1',
          remarks: body.remarks || 'Vehicle updated',
          transDocNo: body.transport_doc_no,
          transDocDate: body.transport_doc_date,
        },
        settings
      );
      if (!apiRes.success) {
        return NextResponse.json({ success: false, error: apiRes.error }, { status: 400 });
      }
    }

    const updated = updateEWayBillVehicle(id, {
      vehicle_number: vehCheck.normalized,
      transport_doc_no: body.transport_doc_no,
      transport_doc_date: body.transport_doc_date,
      from_place: body.from_place,
      reason_code: body.reason_code,
      remarks: body.remarks,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
