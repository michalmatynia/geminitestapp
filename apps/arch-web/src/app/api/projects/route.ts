import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    const projects = await db
      .collection('projects')
      .find({ status: 'published' }, { projection: { _id: 0 } })
      .sort({ order: 1 })
      .toArray();
    return NextResponse.json(projects);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }
}
