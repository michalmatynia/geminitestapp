import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getEcomAuthDb } from '@/lib/mongodb';

export async function GET(): Promise<NextResponse> {
  const session = await getSession();
  if (!session || !session.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const db = await getEcomAuthDb();
  const users = db.collection('ecom_users');

  const docs = await users
    .find({}, { projection: { _id: 1, email: 1, name: 1, createdAt: 1 } })
    .sort({ createdAt: -1 })
    .toArray();

  const list = docs.map((d) => ({
    id: d['_id'].toString(),
    email: d['email'] as string,
    name: d['name'] as string,
    createdAt: d['createdAt'] as Date,
  }));

  return NextResponse.json({ users: list, total: list.length });
}
