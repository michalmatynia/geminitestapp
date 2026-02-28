import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { acceptProductStudioVariant } from '@/shared/lib/products/services/product-studio-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const acceptSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  generationSlotId: z.string().trim().min(1),
  projectId: z.string().trim().nullable().optional(),
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
