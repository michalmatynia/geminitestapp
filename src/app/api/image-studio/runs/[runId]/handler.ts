import { NextRequest, NextResponse } from 'next/server';

import { getImageStudioRunById } from '@/features/ai/image-studio/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const runId = params.runId?.trim();
  if (!runId) {
    throw badRequestError('Run id is required.');
  }

  const run = await getImageStudioRunById(runId);
  if (!run) {
    throw notFoundError('Run not found', { runId });
  }

  return NextResponse.json({ run });
}
