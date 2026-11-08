import { NextRequest, NextResponse } from 'next/server';
import { getCashiers } from '@/lib/supabase-db';
import { createCashier } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (session.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Cashier management is restricted to Administrators.' }, { status: 403 });
    }

    const cashiers = await getCashiers();
    return NextResponse.json(cashiers);
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
      return NextResponse.json({ error: 'Forbidden: Only Administrators can create cashier accounts.' }, { status: 403 });
    }

    const body = await req.json();
    const { full_name, email, username, phone, password } = body;

    if (!full_name || !email || !username || !password) {
      return NextResponse.json(
        { error: 'Full name, email, username, and password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const passwordHash = hashPassword(password);
    const cashier = createCashier({
      full_name,
      email,
      username,
      phone,
      password_hash: passwordHash,
    });

    return NextResponse.json(cashier, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
