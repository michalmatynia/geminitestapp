export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { sendProductImageToStudio } from '@/features/products/services/product-studio-service';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import { idParamSchema } from '@/shared/validations/api-schemas';

const sendSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  projectId: z.string().trim().nullable().optional(),
});

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const result = await sendProductImageToStudio({
    productId,
    imageSlotIndex: parsed.data.imageSlotIndex,
    projectId: parsed.data.projectId ?? null,
  });

  return NextResponse.json(result);
}

export const POST = apiHandlerWithParams<{ id: string }>(
  async (
    req: NextRequest,
    ctx: ApiHandlerContext,
    params: { id: string }
  ): Promise<Response> => POST_handler(req, ctx, params),
  {
    source: 'products.[id].studio.send.POST',
    paramsSchema: idParamSchema,
    logSuccess: true,
  }
);
