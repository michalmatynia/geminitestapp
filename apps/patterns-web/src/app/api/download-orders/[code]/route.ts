import { NextResponse } from 'next/server';
import { getDownloadOrderByCode, getOrderDownloadLinks } from '@/lib/orders';

export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ code: string }>;
};

export async function GET(request: Request, context: RouteContext): Promise<NextResponse> {
  const { code } = await context.params;
  const token = new URL(request.url).searchParams.get('token') ?? '';
  const order = await getDownloadOrderByCode(code, token);

  if (order === null) {
    return NextResponse.json({ error: 'Download order was not found.' }, { status: 404 });
  }

  return NextResponse.json({
    order: {
      code: order.code,
      email: order.email,
      items: order.items,
      currency: order.currency,
      subtotal: order.subtotal,
      status: order.status,
      createdAt: order.createdAt,
      downloadExpiresAt: order.downloadExpiresAt,
    },
    downloads: getOrderDownloadLinks(order),
  });
}
