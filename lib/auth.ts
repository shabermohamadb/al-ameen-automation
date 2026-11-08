import crypto from 'crypto';
import { cookies } from 'next/headers';
import { getDb } from './db';

const SESSION_COOKIE_NAME = 'al_ameen_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'al_ameen_automation_secret_key_2026_secure_jwt_token_brand';

export interface UserSession {
  userId: string;
  email: string;
  username: string;
  fullName: string;
  role: 'admin' | 'cashier';
  expiresAt: number;
}

/**
 * Hash password securely using Node.js crypto scrypt with random salt
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify plaintext password against stored salt:hash
 */
export function verifyPassword(password: string, storedHash?: string): boolean {
  if (!storedHash || !storedHash.includes(':')) {
    // Fallback for legacy plain text passwords during initial migration
    if (storedHash && storedHash === password) return true;
    return false;
  }
  try {
    const [salt, key] = storedHash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch (e) {
    return false;
  }
}

/**
 * Create HMAC signed token for session
 */
export function signSessionToken(session: UserSession): string {
  const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

/**
 * Verify HMAC signed token
 */
export function verifySessionToken(token: string): UserSession | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payload, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
    if (signature !== expectedSig) return null;

    const session: UserSession = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
    if (session.expiresAt && session.expiresAt < Date.now()) {
      return null; // Expired
    }
    return session;
  } catch (e) {
    return null;
  }
}

/**
 * Get current session from Request or Next.js Cookies
 */
export async function getSession(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch (e) {
    return null;
  }
}

/**
 * Get session synchronously from a Cookie header string (for middleware / API)
 */
export function getSessionFromCookieHeader(cookieHeader?: string | null): UserSession | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
  if (!match) return null;
  return verifySessionToken(match[1]);
}

export { SESSION_COOKIE_NAME };
