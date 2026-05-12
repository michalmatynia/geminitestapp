import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { fulfillInpostOrderByOrderId } from '@/lib/inpost';

function skipStatus(reason: string | undefined): number {
  switch (reason) {
    case 'not_inpost':
    case 'missing_point':
      return 400;
    case 'not_configured':
      return 503;
    case 'not_ready':
      return 409;
    case 'already_fulfilled':
      return 200;
    default:
      return 200;
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
): Promise<NextResponse> {
  const session = await getSession();
  if (session?.isSuperAdmin !== true) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { orderId } = await params;
  if (orderId === '') {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  try {
    const result = await fulfillInpostOrderByOrderId(orderId);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        orderId: result.order.orderId,
        created: result.created,
        skippedReason: result.skippedReason,
        shipment: result.shipment,
      },
      { status: skipStatus(result.skippedReason) },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'InPost shipment creation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
