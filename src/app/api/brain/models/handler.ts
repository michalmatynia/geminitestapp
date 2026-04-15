import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  brainModelFamilySchema,
  brainModelModalitySchema,
} from '@/shared/contracts/ai-brain';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';
import {
  optionalBooleanQuerySchema,
  normalizeOptionalQueryString,
} from '@/shared/lib/api/query-schema';

export const querySchema = z.object({
  family: z.preprocess(normalizeOptionalQueryString, brainModelFamilySchema.optional()),
  modality: z.preprocess(normalizeOptionalQueryString, brainModelModalitySchema.optional()),
  streaming: optionalBooleanQuerySchema(),
});

const resolveBrainModelsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const query = querySchema.parse(resolveBrainModelsQueryInput(req, _ctx));
  const payload = await listBrainModels({
    ...(query.family ? { family: query.family } : {}),
    ...(query.modality ? { modality: query.modality } : {}),
    ...(typeof query.streaming === 'boolean' ? { streaming: query.streaming } : {}),
  });
  return NextResponse.json(payload);
}
