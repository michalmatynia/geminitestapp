import { NextRequest, NextResponse } from 'next/server';
import { getEcomAuthDb } from '@/lib/mongodb';
import {
  hashPassword,
  createSessionToken,
  sessionCookieOptions,
  isSuperAdmin,
  type SessionUser,
} from '@/lib/auth';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, password } = body as Record<string, unknown>;

  if (typeof name !== 'string' || name.trim().length < 2) {
    return NextResponse.json({ error: 'Name must be at least 2 characters' }, { status: 400 });
  }
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (typeof password !== 'string' || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const db = await getEcomAuthDb();
  const users = db.collection('ecom_users');

  const existing = await users.findOne({ email: email.toLowerCase() });
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const passwordHash = await hashPassword(password);
  const now = new Date();
  const result = await users.insertOne({
    email: email.toLowerCase(),
    name: name.trim(),
    passwordHash,
    emailVerified: null,
    createdAt: now,
    updatedAt: now,
  });

  const user: SessionUser = {
    id: result.insertedId.toString(),
    email: email.toLowerCase(),
    name: name.trim(),
    isSuperAdmin: isSuperAdmin(email.toLowerCase()),
  };

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
