import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { rotateProductStudioImageSlot } from '@/features/products/services/product-studio-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const rotateSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  direction: z.enum(['left', 'right']),
});

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = rotateSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const product = await rotateProductStudioImageSlot({
    productId,
    imageSlotIndex: parsed.data.imageSlotIndex,
    direction: parsed.data.direction,
  });

  return NextResponse.json({ product });
}
