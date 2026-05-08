import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { downloadInpostLabel } from '@/lib/inpost';
import { getDb } from '@/lib/mongodb';
import { ORDERS_COLLECTION, serializeOrder } from '@/lib/orders';

function acceptForFormat(format: string | null): string {
  return format === 'A4'
    ? 'application/pdf;format=A4'
    : 'application/pdf;format=A6';
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (!session?.isSuperAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orderId } = await params;
  if (!orderId || typeof orderId !== 'string') {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const db = await getDb();
  const doc = await db.collection(ORDERS_COLLECTION).findOne({ orderId });
  if (!doc) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const order = serializeOrder(doc);
  if (order.shippingCarrier !== 'inpost' || !order.inpostShipment?.trackingNumber) {
    return NextResponse.json({ error: 'InPost tracking number is required' }, { status: 400 });
  }

  try {
    const format = req.nextUrl.searchParams.get('format') === 'A4' ? 'A4' : 'A6';
    const label = await downloadInpostLabel(order, acceptForFormat(format));
    const filename = `${order.orderId}-inpost-label-${format}.pdf`;
    const body = label.bytes.buffer.slice(
      label.bytes.byteOffset,
      label.bytes.byteOffset + label.bytes.byteLength,
    ) as ArrayBuffer;
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': label.contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'InPost label download failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
