import { type NextRequest, NextResponse } from 'next/server';
import { getEcomAuthDb } from '@/lib/mongodb';
import {
  verifyPassword,
  createSessionToken,
  sessionCookieOptions,
  isSuperAdmin,
  type SessionUser,
} from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body as Record<string, unknown>;

  if (typeof email !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const db = await getEcomAuthDb();
  const users = db.collection('ecom_users');

  const doc = await users.findOne({ email: email.toLowerCase() });
  if (!doc) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const valid = await verifyPassword(password, doc['passwordHash'] as string);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const user: SessionUser = {
    id: doc['_id'].toString(),
    email: doc['email'] as string,
    name: doc['name'] as string,
    isSuperAdmin: isSuperAdmin(doc['email'] as string),
  };

  const token = await createSessionToken(user);
  const opts = sessionCookieOptions(token);

  const response = NextResponse.json({ user });
  response.cookies.set(opts.name, opts.value, {
    httpOnly: opts.httpOnly,
    sameSite: opts.sameSite,
    secure: opts.secure,
    path: opts.path,
    maxAge: opts.maxAge,
  });
  return response;
}
