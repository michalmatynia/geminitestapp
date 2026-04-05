import { NextRequest, NextResponse } from 'next/server';

import { getProductStudioSequencePreflight } from '@/features/ai/server';
import { productStudioPreflightResponseSchema, productStudioSequenceGenerationModeSchema } from '@/shared/contracts/products/studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const productId = params.id.trim();
  if (!productId) {
    throw badRequestError('Product id is required.');
  }

  const imageSlotIndexRaw = req.nextUrl.searchParams.get('imageSlotIndex');
  if (!imageSlotIndexRaw) {
    throw badRequestError('imageSlotIndex query param is required.');
  }
  const imageSlotIndex = Number.parseInt(imageSlotIndexRaw, 10);
  if (!Number.isFinite(imageSlotIndex)) {
    throw badRequestError('imageSlotIndex must be a number.');
  }

  const projectId = req.nextUrl.searchParams.get('projectId');
  const sequenceGenerationModeRaw = req.nextUrl.searchParams.get('sequenceGenerationMode');
  const sequenceGenerationModeParsed = productStudioSequenceGenerationModeSchema.safeParse(
    sequenceGenerationModeRaw?.trim() ?? null
  );
  if (sequenceGenerationModeRaw && !sequenceGenerationModeParsed.success) {
    throw badRequestError('Invalid sequenceGenerationMode query param.');
  }
  const sequenceGenerationMode = sequenceGenerationModeParsed.success
    ? sequenceGenerationModeParsed.data
    : null;

  const result = await getProductStudioSequencePreflight({
    productId,
    imageSlotIndex,
    projectId,
    sequenceGenerationMode,
  });

  return NextResponse.json(productStudioPreflightResponseSchema.parse(result));
}
