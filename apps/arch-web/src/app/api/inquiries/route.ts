import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { email, message, locale } = await req.json() as {
      email?: string;
      message?: string;
      locale?: string;
    };

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (!message || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const db = await getDb();
    await db.collection('inquiries').insertOne({
      email,
      message: message.trim(),
      createdAt: new Date(),
      status: 'pending',
      source: 'cta-form',
      ...(locale !== undefined && { locale }),
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
