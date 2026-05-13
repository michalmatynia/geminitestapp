import { type NextRequest, NextResponse } from 'next/server';

export function POST(request: NextRequest): NextResponse {
  void request;
  return NextResponse.json(
    {
      error: 'Direct order creation has been retired. Use /api/checkout/blik so payment is confirmed before fulfillment.',
    },
    { status: 410 },
  );
}
