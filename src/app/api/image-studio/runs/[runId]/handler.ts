import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getImageStudioRunById } from '@/features/ai/server';
import type { ImageStudioRunDetailResponse } from '@/shared/contracts/image-studio/run';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { runId } = parsedParams.data;

  const run = await getImageStudioRunById(runId);
  if (!run) {
    throw notFoundError('Run not found', { runId });
  }

  const payload: ImageStudioRunDetailResponse = { run };
  return NextResponse.json(payload);
}
