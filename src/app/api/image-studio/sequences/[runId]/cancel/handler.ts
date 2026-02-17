import { NextRequest, NextResponse } from 'next/server';

import { cancelImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string },
): Promise<Response> {
  const runId = params.runId?.trim();
  if (!runId) {
    throw badRequestError('Run id is required.');
  }

  const run = await cancelImageStudioSequenceRun(runId);
  return NextResponse.json({ run, cancelled: true, runId: run.id });
}
