import { NextRequest, NextResponse } from 'next/server';
import { getUserByIdentifier, updateLastLogin } from '@/lib/db';
import { verifyPassword, signSessionToken, SESSION_COOKIE_NAME, UserSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identifier, password, expectedRole } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'Username/Email and Password are required.' },
        { status: 400 }
      );
    }

    const user = getUserByIdentifier(identifier);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid username/email or password.' },
        { status: 401 }
      );
    }

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'This account has been deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    const isPasswordValid = verifyPassword(password, user.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid username/email or password.' },
        { status: 401 }
      );
    }

    // Determine normalized role
    const userRole: 'admin' | 'cashier' = (user.role === 'admin' || user.role === 'owner') ? 'admin' : 'cashier';

    // Strict role check: enforce tab matching
    if (expectedRole) {
      const normalizedExpected = String(expectedRole).toLowerCase();
      if (normalizedExpected === 'admin' && userRole !== 'admin') {
        return NextResponse.json(
          { error: 'Access denied: Manager accounts cannot log in through Admin Portal. Please use the Manager Login tab.' },
          { status: 403 }
        );
      }
      if ((normalizedExpected === 'manager' || normalizedExpected === 'cashier') && userRole !== 'cashier') {
        return NextResponse.json(
          { error: 'Access denied: Admin accounts must log in through Admin Portal. Please use the Admin Login tab.' },
          { status: 403 }
        );
      }
    }

    // Update last login
    updateLastLogin(user.id);

    // Create session token
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
    const session: UserSession = {
      userId: user.id,
      email: user.email,
      username: user.username || user.email.split('@')[0],
      fullName: user.full_name,
      role: userRole,
      expiresAt,
    };

    const token = signSessionToken(session);

    const redirectUrl = userRole === 'admin' ? '/' : '/cashier';

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        role: userRole,
      },
      redirectUrl,
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error during authentication.' },
      { status: 500 }
    );
  }
}
