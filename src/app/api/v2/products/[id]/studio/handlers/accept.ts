import { NextRequest, NextResponse } from 'next/server';

import { acceptProductStudioVariant } from '@/features/ai/server';
import { productStudioAcceptRequestSchema as acceptSchema } from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

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
  const parsed = acceptSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const product = await acceptProductStudioVariant({
    productId,
    imageSlotIndex: parsed.data.imageSlotIndex,
    generationSlotId: parsed.data.generationSlotId,
    projectId: parsed.data.projectId ?? null,
  });

  return NextResponse.json({ product });
}
