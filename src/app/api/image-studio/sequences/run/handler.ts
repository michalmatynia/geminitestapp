import { type NextRequest, NextResponse } from 'next/server';

import { resolveImageStudioContextRegistryEnvelope } from '@/features/ai/image-studio/context-registry/server';
import { startImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import { imageStudioSequenceRunStartRequestSchema } from '@/shared/contracts/image-studio/sequence';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = imageStudioSequenceRunStartRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload.', { errors: parsed.error.format() });
  }

  const contextRegistry = await resolveImageStudioContextRegistryEnvelope(
    parsed.data.contextRegistry ?? null
  );

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
    contextRegistry,
  });

  return NextResponse.json(result);
}
