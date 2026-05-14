import { type NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { getDb } from '@/lib/mongodb';
import { ensureAppIndexes } from '@/lib/db-indexes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest): Promise<NextResponse> {
  const ip = getClientIp(req);
  const { allowed, retryAfterSec } = checkRateLimit(`newsletter:${ip}`, 5, 60 * 60 * 1000);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const email =
    typeof body === 'object' && body !== null && 'email' in body && typeof (body as Record<string, unknown>)['email'] === 'string'
      ? ((body as Record<string, unknown>)['email'] as string).trim().toLowerCase().slice(0, 320)
      : '';

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'A valid email address is required.' }, { status: 400 });
  }

  void ensureAppIndexes();

  try {
    const db = await getDb();
    await db.collection('newsletter_subscribers').updateOne(
      { email },
      { $setOnInsert: { email, subscribedAt: new Date().toISOString() } },
      { upsert: true },
    );
  } catch {
    // DB unavailable — acknowledge silently rather than surfacing infra errors to the user.
  }

  return NextResponse.json({ ok: true });
}
