import { NextRequest, NextResponse } from 'next/server';
import { getDailyAttendance, markAttendanceBatch, updateAttendanceRecord } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0];

    const records = getDailyAttendance(date);
    return NextResponse.json(records);
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

    const body = await req.json();
    const { date, records } = body;

    if (!date || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Date and an array of employee attendance records are required.' },
        { status: 400 }
      );
    }

    const updated = markAttendanceBatch(
      date,
      records,
      session.userId,
      session.fullName || session.username
    );

    return NextResponse.json({ success: true, count: records.length, records: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin can make audited corrections to historical attendance
    if (session.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Only Administrators can modify previously marked attendance records.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { attendance_id, new_status, reason } = body;

    if (!attendance_id || !new_status || !reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'attendance_id, new_status, and a valid reason for correction are required.' },
        { status: 400 }
      );
    }

    const updated = updateAttendanceRecord(
      attendance_id,
      new_status,
      reason.trim(),
      session.userId,
      session.fullName || session.username
    );

    return NextResponse.json({ success: true, record: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
