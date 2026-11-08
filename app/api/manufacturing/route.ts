import { NextResponse } from 'next/server';
import { getManufacturingJobs, createManufacturingJob, updateJobStatus } from '@/lib/db';

export async function GET() {
  try {
    const jobs = getManufacturingJobs();
    return NextResponse.json({ success: true, data: jobs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.customer_id || !body.shutter_type) {
      return NextResponse.json({ success: false, error: 'Customer and Shutter Type are required' }, { status: 400 });
    }
    const job = createManufacturingJob(body);
    return NextResponse.json({ success: true, data: job }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    if (!body.id || !body.status) {
      return NextResponse.json({ success: false, error: 'Job ID and Status are required' }, { status: 400 });
    }
    const updated = updateJobStatus(body.id, body.status);
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
