import { NextRequest, NextResponse } from 'next/server';
import { getEmployees, createEmployee } from '@/lib/supabase-db';
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

    let employees = await getEmployees();
    if (status) {
      employees = employees.filter((e: any) => e.employment_status === status);
    }
    if (department) {
      employees = employees.filter((e: any) => e.department === department);
    }
    if (search) {
      const q = search.toLowerCase();
      employees = employees.filter((e: any) =>
        e.full_name?.toLowerCase().includes(q) ||
        e.emp_code?.toLowerCase().includes(q) ||
        e.phone?.includes(q)
      );
    }

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

    const employee = await createEmployee(body);
    return NextResponse.json(employee, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
