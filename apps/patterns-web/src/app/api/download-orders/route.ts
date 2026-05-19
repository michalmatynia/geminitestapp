import { NextResponse } from 'next/server';
import {
  createDownloadOrder,
  getOrderDownloadLinks,
  type CreateDownloadOrderInput,
} from '@/lib/orders';

export const dynamic = 'force-dynamic';

const badRequest = (message: string): NextResponse =>
  NextResponse.json({ error: message }, { status: 400 });

export async function POST(request: Request): Promise<NextResponse> {
  let body: CreateDownloadOrderInput;
  try {
    body = (await request.json()) as CreateDownloadOrderInput;
  } catch {
    return badRequest('Invalid order payload.');
  }

  try {
    const order = await createDownloadOrder(body);
    return NextResponse.json({ order, downloads: getOrderDownloadLinks(order) }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create order.';
    return badRequest(message);
  }
}
