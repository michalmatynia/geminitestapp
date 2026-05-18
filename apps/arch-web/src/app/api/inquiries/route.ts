import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import {
  normalizeEmailAddress,
  resolveContactRecipient,
  sendContactInquiryEmail,
} from '@/lib/contactEmail';

export const runtime = 'nodejs';

const normalizeMessage = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeLocale = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as { email?: unknown; message?: unknown; locale?: unknown };
    const email = normalizeEmailAddress(payload.email);
    const message = normalizeMessage(payload.message);
    const locale = normalizeLocale(payload.locale);

    if (email === null) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (message === null) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const db = await getDb();
    const createdAt = new Date();
    const recipient = await resolveContactRecipient(db);
    await db.collection('inquiries').updateOne(
      { email },
      {
        $set: {
          email,
          message,
          createdAt,
          updatedAt: createdAt,
          lastSubmittedAt: createdAt,
          status: 'pending',
          source: 'cta-form',
          emailRecipient: recipient,
          emailDeliveryStatus: 'pending',
          ...(locale !== undefined && { locale }),
        },
        ...(locale === undefined ? { $unset: { locale: '' } } : {}),
        $inc: { submissionCount: 1 },
      },
      { upsert: true }
    );

    const delivery = await sendContactInquiryEmail({
      recipient,
      senderEmail: email,
      message,
      ...(locale !== undefined && { locale }),
      createdAt,
    });

    if (delivery.status === 'sent') {
      await db.collection('inquiries').updateOne(
        { email },
        {
          $set: {
            emailDeliveryStatus: 'sent',
            emailDeliveredAt: new Date(),
            emailDeliveryMessageId: delivery.messageId,
          },
        }
      );
      return NextResponse.json({ message: 'Inquiry received' }, { status: 201 });
    }

    await db.collection('inquiries').updateOne(
      { email },
      {
        $set: {
          emailDeliveryStatus: delivery.status,
          emailDeliveryError: delivery.error,
          emailDeliveryFailedAt: new Date(),
        },
      }
    );

    return NextResponse.json(
      {
        error:
          delivery.status === 'not_configured'
            ? 'Inquiry saved but email delivery is not configured'
            : 'Inquiry saved but email delivery failed',
      },
      { status: 502 }
    );
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
