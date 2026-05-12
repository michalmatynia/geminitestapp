import { type NextRequest, NextResponse } from 'next/server';
import type { Collection } from 'mongodb';
import { getEcomAuthDb } from '@/lib/mongodb';
import {
  hashPassword,
  createSessionToken,
  sessionCookieOptions,
  isSuperAdmin,
  type SessionUser,
} from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { ensureAppIndexes } from '@/lib/db-indexes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getRegistrationValidation(
  name: string,
  email: string,
  password: string,
): { error: string; status: number } | null {
  if (name.length < 2) {
    return { error: 'Name must be at least 2 characters', status: 400 };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: 'Invalid email address', status: 400 };
  }
  if (password.length < 8) {
    return { error: 'Password must be at least 8 characters', status: 400 };
  }
  return null;
}

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

type RegisterValidationFailure = {
  error: string;
  status: number;
};

type EcomAuthUserDocument = {
  email: string;
  name: string;
  passwordHash: string;
  emailVerified: null;
  createdAt: Date;
  updatedAt: Date;
};

function getRegistrationPayload(body: unknown): RegisterPayload | RegisterValidationFailure {
  const { name, email, password } = body as {
    name: unknown;
    email: unknown;
    password: unknown;
  };

  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.toLowerCase() : '';
  const normalizedPassword = typeof password === 'string' ? password : '';

  const validationError = getRegistrationValidation(normalizedName, normalizedEmail, normalizedPassword);
  if (validationError !== null) {
    return validationError;
  }

  return {
    name: normalizedName,
    email: normalizedEmail,
    password: normalizedPassword,
  };
}

async function createRegisteredSessionUser(
  users: Collection<EcomAuthUserDocument>,
  payload: RegisterPayload,
): Promise<SessionUser> {
  const passwordHash = await hashPassword(payload.password);
  const now = new Date();
  const result = await users.insertOne({
    email: payload.email,
    name: payload.name,
    passwordHash,
    emailVerified: null,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: result.insertedId.toString(),
    email: payload.email,
    name: payload.name,
    isSuperAdmin: isSuperAdmin(payload.email),
  };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  void ensureAppIndexes();
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`register:${ip}`, 10, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many registration attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = getRegistrationPayload(body);
  if ('error' in payload) {
    return NextResponse.json({ error: payload.error }, { status: payload.status });
  }

  const db = await getEcomAuthDb();
  const users = db.collection<EcomAuthUserDocument>('ecom_users');

  const existing = await users.findOne({ email: payload.email });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }
  const user = await createRegisteredSessionUser(users, {
    name: payload.name,
    email: payload.email,
    password: payload.password,
  });

  const token = await createSessionToken(user);
  const opts = sessionCookieOptions(token);

  const response = NextResponse.json({ user }, { status: 201 });
  response.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return response;
}
