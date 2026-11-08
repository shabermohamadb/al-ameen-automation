import { NextRequest, NextResponse } from 'next/server';
import { getMonthlyAttendanceSummary } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') || String(now.getFullYear()), 10);
    const employeeId = searchParams.get('employeeId') || undefined;

    const summary = getMonthlyAttendanceSummary(month, year, employeeId);
    return NextResponse.json(summary);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
