import { NextResponse } from 'next/server';
import { getServiceRequests, createServiceRequest } from '@/lib/db';

export async function GET() {
  try {
    const services = getServiceRequests();
    return NextResponse.json({ success: true, data: services });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.customer_id || !body.product_name) {
      return NextResponse.json({ success: false, error: 'Customer and Product Name are required' }, { status: 400 });
    }
    const serviceReq = createServiceRequest(body);
    return NextResponse.json({ success: true, data: serviceReq }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
