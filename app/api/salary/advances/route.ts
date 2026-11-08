import { NextRequest, NextResponse } from 'next/server';
import { getSalaryAdvances, recordSalaryAdvance } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Restricted to Administrators.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;

    const advances = getSalaryAdvances(employeeId);
    return NextResponse.json(advances);
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
      return NextResponse.json({ error: 'Forbidden: Only Administrators can issue advances.' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.employee_id || !body.amount || Number(body.amount) <= 0) {
      return NextResponse.json({ error: 'employee_id and a valid positive amount are required.' }, { status: 400 });
    }

    const advance = recordSalaryAdvance({
      employee_id: body.employee_id,
      amount: Number(body.amount),
      advance_date: body.advance_date,
      notes: body.notes,
      recorded_by_user_id: session.userId,
    });

    return NextResponse.json(advance, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
