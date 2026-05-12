import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type * as bcryptTypes from 'bcryptjs';
import { createRequire } from 'module';

// bcryptjs needs createRequire in ESM context
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs') as typeof bcryptTypes;

export const COOKIE_NAME = 'ecom_session';
const MIN_AUTH_SECRET_LENGTH = 32;

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  isSuperAdmin: boolean;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (secret === '' || secret === undefined) {
    throw new Error('AUTH_SECRET env var is not set');
  }
  if (secret.length < MIN_AUTH_SECRET_LENGTH) {
    throw new Error('AUTH_SECRET must be at least 32 characters');
  }

  return new TextEncoder().encode(secret);
}

export function isSuperAdmin(email: string): boolean {
  const configuredEmail = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  return Boolean(configuredEmail) && email.trim().toLowerCase() === configuredEmail;
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const id = payload['id'];
    const email = payload['email'];
    const name = payload['name'];
    if (typeof id !== 'string' || typeof email !== 'string' || typeof name !== 'string') {
      return null;
    }
    return {
      id,
      email,
      name,
      isSuperAdmin: isSuperAdmin(email),
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (token === '' || token === undefined) return null;
  return verifySessionToken(token);
}

export function sessionCookieOptions(token: string): {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}

export function clearSessionCookieOptions(): {
  name: string;
  value: string;
  httpOnly: boolean;
  sameSite: 'lax';
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
}
