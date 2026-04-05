import { NextRequest, NextResponse } from 'next/server';

import { linkProductImageToStudio } from '@/features/ai/server';
import { productStudioLinkRequestSchema as linkSchema, productStudioLinkResponseSchema } from '@/shared/contracts/products/studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
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
  const parsed = linkSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const result = await linkProductImageToStudio({
    productId,
    imageSlotIndex: parsed.data.imageSlotIndex,
    projectId: parsed.data.projectId ?? null,
    rotateBeforeSendDeg: parsed.data.rotateBeforeSendDeg ?? null,
  });

  return NextResponse.json(productStudioLinkResponseSchema.parse(result));
}
