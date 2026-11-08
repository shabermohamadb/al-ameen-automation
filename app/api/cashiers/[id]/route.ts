import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateCashier, updateCashierStatus, resetCashierPassword, getCashierActivity } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const user = getUserById(id);
    if (!user) {
      return NextResponse.json({ error: 'Cashier not found' }, { status: 404 });
    }

    const activity = getCashierActivity(id);
    return NextResponse.json({ cashier: user, activity });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();

    if (body.toggle_status !== undefined) {
      const updated = updateCashierStatus(id, Boolean(body.is_active));
      return NextResponse.json(updated);
    }

    const updated = updateCashier(id, body);
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { new_password } = body;

    if (!new_password || new_password.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(new_password);
    const result = resetCashierPassword(id, passwordHash);
    return NextResponse.json({ success: true, message: 'Password reset successfully.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
