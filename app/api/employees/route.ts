import { NextRequest, NextResponse } from 'next/server';
import { getEmployees, createEmployee } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const department = searchParams.get('department') || undefined;
    const search = searchParams.get('search') || undefined;

    const employees = getEmployees({ status, department, search });
    return NextResponse.json(employees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only Administrators can add employees.' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.full_name || !body.phone) {
      return NextResponse.json({ error: 'Full name and phone number are required.' }, { status: 400 });
    }

    const employee = createEmployee(body);
    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
