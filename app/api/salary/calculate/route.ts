import { NextRequest, NextResponse } from 'next/server';
import { calculateMonthlySalary } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Salary calculation is restricted to Administrators.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);

    if (!employeeId) {
      return NextResponse.json({ error: 'employeeId parameter is required' }, { status: 400 });
    }

    const calculation = calculateMonthlySalary(employeeId, month, year);
    return NextResponse.json(calculation);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
