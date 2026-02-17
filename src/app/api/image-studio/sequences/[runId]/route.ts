export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { getImageStudioSequenceRunById } from '@/features/ai/image-studio/server/sequence-run-repository';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string },
): Promise<Response> {
  const runId = params.runId?.trim();
  if (!runId) {
    throw badRequestError('Run id is required.');
  }

  const run = await getImageStudioSequenceRunById(runId);
  if (!run) {
    throw notFoundError('Sequence run not found.', { runId });
  }

  return NextResponse.json({ run });
}

export const GET = apiHandlerWithParams<{ runId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { runId: string }): Promise<Response> =>
    GET_handler(req, ctx, params),
  {
    source: 'image-studio.sequences.[runId].GET',
  },
);
