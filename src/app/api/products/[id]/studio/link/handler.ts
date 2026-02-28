import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { linkProductImageToStudio } from '@/shared/lib/products/services/product-studio-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const linkSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  projectId: z.string().trim().nullable().optional(),
  rotateBeforeSendDeg: z.literal(90).nullable().optional(),
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

  return NextResponse.json(result);
}
