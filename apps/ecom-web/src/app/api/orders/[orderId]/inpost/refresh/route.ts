import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { refreshInpostShipmentByOrderId } from '@/lib/inpost';

function skipStatus(reason: string | undefined): number {
  switch (reason) {
    case 'not_configured':
      return 503;
    case 'not_inpost':
    case 'missing_tracking':
      return 400;
    default:
      return 200;
  }
}

export async function POST(
  _req: NextRequest,
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

  try {
    const result = await refreshInpostShipmentByOrderId(orderId);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        orderId: result.order.orderId,
        refreshed: result.refreshed,
        skippedReason: result.skippedReason,
        shipment: result.shipment,
      },
      { status: skipStatus(result.skippedReason) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'InPost shipment refresh failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
