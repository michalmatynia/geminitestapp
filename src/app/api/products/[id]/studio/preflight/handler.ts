import { NextRequest, NextResponse } from 'next/server';

import { getProductStudioSequencePreflight } from '@/features/products/services/product-studio-service';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const normalizeSequenceMode = (value: string | null): 'auto' | 'studio_prompt_then_sequence' | 'model_full_sequence' | 'studio_native_sequencer_prior_generation' | null => {
  if (!value) return null;
  const normalized = value.trim();
  if (
    normalized === 'auto' ||
    normalized === 'studio_prompt_then_sequence' ||
    normalized === 'model_full_sequence' ||
    normalized === 'studio_native_sequencer_prior_generation'
  ) {
    return normalized;
  }
  return null;
};

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
  const sequenceGenerationMode = normalizeSequenceMode(sequenceGenerationModeRaw);
  if (sequenceGenerationModeRaw && !sequenceGenerationMode) {
    throw badRequestError('Invalid sequenceGenerationMode query param.');
  }

  const result = await getProductStudioSequencePreflight({
    productId,
    imageSlotIndex,
    projectId,
    sequenceGenerationMode,
  });

  return NextResponse.json(result);
}

