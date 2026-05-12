import { type NextRequest, NextResponse } from 'next/server';
import {
  applyInpostTrackingEvent,
  parseInpostTrackingEvent,
  verifyInpostWebhookSignature,
} from '@/lib/inpost';

export async function POST(req: NextRequest): Promise<NextResponse> {
  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-inpost-signature');

  if (!verifyInpostWebhookSignature(rawBody, signatureHeader)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const event = parseInpostTrackingEvent(payload);
  if (!event) {
    return NextResponse.json({ error: 'Invalid tracking event' }, { status: 400 });
  }

  const result = await applyInpostTrackingEvent(event);
  return NextResponse.json({
    ok: true,
    matched: result.matched,
    modified: result.modified,
    duplicate: result.duplicate,
    stale: result.stale,
    orderStatus: result.orderStatus,
  });
}
