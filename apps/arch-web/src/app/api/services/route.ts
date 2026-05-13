import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    const services = await db
      .collection('services')
      .find({}, { projection: { _id: 0 } })
      .sort({ order: 1 })
      .toArray();
    return NextResponse.json(services);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch services' }, { status: 500 });
  }
}
