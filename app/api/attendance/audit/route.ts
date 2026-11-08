import { NextRequest, NextResponse } from 'next/server';
import { getAttendanceAuditLogs } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const attendanceId = searchParams.get('attendanceId') || undefined;
    const employeeId = searchParams.get('employeeId') || undefined;

    const logs = getAttendanceAuditLogs(attendanceId, employeeId);
    return NextResponse.json(logs);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
