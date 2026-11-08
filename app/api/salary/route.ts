import { NextRequest, NextResponse } from 'next/server';
import { getSalaryPayments, recordSalaryPayment } from '@/lib/supabase-db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Salary records are restricted to Administrators.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId') || undefined;
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;

    let payments = await getSalaryPayments(month, year);
    if (employeeId) {
      payments = payments.filter((p: any) => p.employee_id === employeeId);
    }
    return NextResponse.json(payments);
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
      return NextResponse.json({ error: 'Forbidden: Only Administrators can disburse or record salary payments.' }, { status: 403 });
    }

    const body = await req.json();
    if (!body.employee_id || !body.period_month || !body.period_year || body.net_payable === undefined) {
      return NextResponse.json(
        { error: 'employee_id, period_month, period_year, and net_payable are required.' },
        { status: 400 }
      );
    }

    const payment = await recordSalaryPayment({
      ...body,
      recorded_by_user_id: session.userId,
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
