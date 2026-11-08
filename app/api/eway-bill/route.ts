import { NextResponse } from 'next/server';
import {
  getEWayBills,
  createEWayBill,
  getEWayBillSettings,
  logEWayBillAction,
} from '@/lib/db';
import { buildNICPayload, validateGSTIN, validateVehicleNumber, validatePincode } from '@/lib/eway-bill/utils';
import { dispatchEWayBillGeneration } from '@/lib/eway-bill/gsp-client';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const search = searchParams.get('search') || '';
    const invoiceId = searchParams.get('invoiceId') || undefined;

    const bills = getEWayBills({ status, search, invoiceId });
    return NextResponse.json({ success: true, data: bills }, {
      headers: { 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Required fields validation
    if (!body.doc_number) {
      return NextResponse.json({ success: false, error: 'Document / Invoice Number is required' }, { status: 400 });
    }
    if (!body.to_name) {
      return NextResponse.json({ success: false, error: 'Recipient / Customer name is required' }, { status: 400 });
    }
    if (!body.to_pincode) {
      return NextResponse.json({ success: false, error: 'Delivery PIN code is required' }, { status: 400 });
    }

    const pinCheck = validatePincode(body.to_pincode);
    if (!pinCheck.valid) {
      return NextResponse.json({ success: false, error: pinCheck.error }, { status: 400 });
    }

    if (body.to_gstin && body.to_gstin.toUpperCase() !== 'URP') {
      const gstinCheck = validateGSTIN(body.to_gstin);
      if (!gstinCheck.valid) {
        return NextResponse.json({ success: false, error: gstinCheck.error }, { status: 400 });
      }
    }

    if (body.vehicle_number) {
      const vehCheck = validateVehicleNumber(body.vehicle_number);
      if (!vehCheck.valid) {
        return NextResponse.json({ success: false, error: vehCheck.error }, { status: 400 });
      }
      body.vehicle_number = vehCheck.normalized;
    }

    const settings = getEWayBillSettings();
    const generationMethod = body.generation_method || 'manual';

    // If API generation requested
    if (generationMethod === 'api') {
      const nicPayload = buildNICPayload(body);
      const apiResult = await dispatchEWayBillGeneration(nicPayload, settings);

      if (!apiResult.success) {
        return NextResponse.json(
          {
            success: false,
            error: apiResult.error,
            requiresManual: apiResult.requiresManual,
            preparedPayload: nicPayload,
          },
          { status: 400 }
        );
      }

      body.eway_bill_number = apiResult.ewayBillNo;
      body.eway_bill_date = apiResult.ewayBillDate;
      body.valid_until = apiResult.validUpto;
      body.nic_payload = nicPayload;
      body.generation_method = 'api';
    } else {
      // Manual portal entry mode
      if (!body.eway_bill_number) {
        return NextResponse.json(
          { success: false, error: 'Please enter the official 12-digit E-Way Bill Number obtained from https://ewaybillgst.gov.in/' },
          { status: 400 }
        );
      }
      body.generation_method = 'manual';
      body.nic_payload = buildNICPayload(body);
    }

    const created = createEWayBill(body);

    logEWayBillAction(
      'create',
      created.id,
      body,
      { success: true, eway_bill_number: created.eway_bill_number },
      'success'
    );

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
