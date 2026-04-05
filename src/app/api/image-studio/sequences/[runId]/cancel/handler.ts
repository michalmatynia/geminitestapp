import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { cancelImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';

const paramsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});

export async function POST_handler(
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

  const run = await cancelImageStudioSequenceRun(runId);
  return NextResponse.json({ run, cancelled: true, runId: run.id });
}
