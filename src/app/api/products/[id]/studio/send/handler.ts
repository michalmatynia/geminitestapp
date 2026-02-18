import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { sendProductImageToStudio } from '@/features/products/services/product-studio-service';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const sendSchema = z.object({
  imageSlotIndex: z.number().int().min(0),
  projectId: z.string().trim().nullable().optional(),
  rotateBeforeSendDeg: z.literal(90).nullable().optional(),
  sequenceGenerationMode: z
    .enum([
      'auto',
      'studio_prompt_then_sequence',
      'model_full_sequence',
      'studio_native_sequencer_prior_generation',
    ])
    .optional(),
});

const LEGACY_NATIVE_SEQUENCE_DISABLED_ERROR =
  'Native Image Studio sequence mode is selected, but project sequencing is disabled. Enable sequencing steps in Image Studio project settings.';

const asErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return '';
};

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

  let result;
  try {
    result = await sendProductImageToStudio({
      ...basePayload,
      sequenceGenerationMode: parsed.data.sequenceGenerationMode,
    });
  } catch (error) {
    const message = asErrorMessage(error);
    if (!message.includes(LEGACY_NATIVE_SEQUENCE_DISABLED_ERROR)) {
      throw error;
    }

    result = await sendProductImageToStudio({
      ...basePayload,
      sequenceGenerationMode: 'studio_prompt_then_sequence',
    });
    const existingWarnings = Array.isArray(result.warnings)
      ? result.warnings
      : [];
    result = {
      ...result,
      warnings: [
        ...existingWarnings,
        'Retried with Prompt then Sequencer compatibility mode after a legacy sequencing guard blocked native mode.',
      ],
    };
  }

  return NextResponse.json(result);
}
