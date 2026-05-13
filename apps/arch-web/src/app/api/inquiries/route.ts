import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email?: string };
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    const db = await getDb();
    const existing = await db.collection('inquiries').findOne({ email });
    if (existing) {
      return NextResponse.json({ message: 'Already registered' }, { status: 200 });
    }
    await db.collection('inquiries').insertOne({
      email,
      createdAt: new Date(),
      status: 'pending',
      source: 'cta-form',
    });
    return NextResponse.json({ message: 'Inquiry received' }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to save inquiry' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = await getDb();
    const inquiries = await db
      .collection('inquiries')
      .find({}, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    return NextResponse.json(inquiries);
  } catch {
    return NextResponse.json({ error: 'Failed to fetch inquiries' }, { status: 500 });
  }
}
