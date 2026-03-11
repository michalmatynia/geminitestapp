import { NextResponse } from 'next/server';
import { z } from 'zod';

import {
  productStudioSendRequestSchema as sendSchema,
  productStudioSendResponseSchema,
} from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

import type { NextRequest } from 'next/server';

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
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: z.treeifyError(parsed.error) });
  }

  const basePayload = {
    productId,
    imageSlotIndex: parsed.data.imageSlotIndex,
    projectId: parsed.data.projectId ?? null,
    rotateBeforeSendDeg: parsed.data.rotateBeforeSendDeg ?? null,
  } as const;
  const { resolveImageStudioContextRegistryEnvelope } = await import(
    '@/features/ai/image-studio/context-registry/server'
  );
  const contextRegistry = await resolveImageStudioContextRegistryEnvelope(
    parsed.data.contextRegistry ?? null
  );
  const { sendProductImageToStudio } = await import(
    '@/features/ai/image-studio/product-studio/product-studio-service'
  );

  const result = await sendProductImageToStudio({
    ...basePayload,
    sequenceGenerationMode: parsed.data.sequenceGenerationMode,
    ...(contextRegistry ? { contextRegistry } : {}),
  });

  return NextResponse.json(productStudioSendResponseSchema.parse(result));
}
