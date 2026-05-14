import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getDb();
  const docs = await db
    .collection('newsletter_subscribers')
    .find({}, { projection: { _id: 0, email: 1, subscribedAt: 1 } })
    .sort({ subscribedAt: -1 })
    .toArray();

  const subscribers = docs.map((d) => ({
    email: d['email'] as string,
    subscribedAt: d['subscribedAt'] as string,
  }));

  return NextResponse.json({ subscribers, total: subscribers.length });
}
