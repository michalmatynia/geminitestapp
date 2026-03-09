import { NextRequest, NextResponse } from 'next/server';

import { resolveImageStudioContextRegistryEnvelope } from '@/features/ai/image-studio/context-registry/server';
import { sendProductImageToStudio } from '@/features/ai/server';
import { productStudioSendRequestSchema as sendSchema } from '@/shared/contracts/products';
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
  const parsed = sendSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const basePayload = {
    productId,
    imageSlotIndex: parsed.data.imageSlotIndex,
    projectId: parsed.data.projectId ?? null,
    rotateBeforeSendDeg: parsed.data.rotateBeforeSendDeg ?? null,
  } as const;
  const contextRegistry = await resolveImageStudioContextRegistryEnvelope(
    parsed.data.contextRegistry ?? null
  );

  const result = await sendProductImageToStudio({
    ...basePayload,
    sequenceGenerationMode: parsed.data.sequenceGenerationMode,
    ...(contextRegistry ? { contextRegistry } : {}),
  });

  return NextResponse.json(result);
}
