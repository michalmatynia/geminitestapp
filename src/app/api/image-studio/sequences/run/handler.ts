import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { startImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const pointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
});

const sequenceStartSchema = z.object({
  projectId: z.string().trim().min(1),
  sourceSlotId: z.string().trim().min(1),
  prompt: z.string().trim().min(1),
  paramsState: z.record(z.string(), z.unknown()).nullable().optional(),
  referenceSlotIds: z.array(z.string().trim().min(1)).optional(),
  mask: z
    .object({
      polygons: z.array(z.array(pointSchema).min(3)).min(1),
      invert: z.boolean().optional(),
      feather: z.number().min(0).max(50).optional(),
    })
    .nullable()
    .optional(),
  studioSettings: z.record(z.string(), z.unknown()).nullable().optional(),
  steps: z.array(z.unknown()).optional(),
  presetId: z.string().trim().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).nullable().optional(),
});

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = sequenceStartSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const result = await startImageStudioSequenceRun({
    projectId: parsed.data.projectId,
    sourceSlotId: parsed.data.sourceSlotId,
    prompt: parsed.data.prompt,
    paramsState: parsed.data.paramsState ?? null,
    referenceSlotIds: parsed.data.referenceSlotIds ?? [],
    mask: parsed.data.mask
      ? {
        polygons: parsed.data.mask.polygons,
        invert: Boolean(parsed.data.mask.invert),
        feather: parsed.data.mask.feather ?? 0,
      }
      : null,
    studioSettings: parsed.data.studioSettings ?? null,
    steps: parsed.data.steps,
    presetId: parsed.data.presetId ?? null,
    metadata: parsed.data.metadata ?? null,
  });

  return NextResponse.json(result);
}
