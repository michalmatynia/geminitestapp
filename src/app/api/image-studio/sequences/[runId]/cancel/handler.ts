import { NextRequest, NextResponse } from 'next/server';

import { cancelImageStudioSequenceRun } from '@/shared/lib/ai/image-studio/server/sequence-runtime';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const runId = params.runId?.trim();
  if (!runId) {
    throw badRequestError('Run id is required.');
  }

  const run = await cancelImageStudioSequenceRun(runId);
  return NextResponse.json({ run, cancelled: true, runId: run.id });
}
