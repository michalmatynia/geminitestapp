export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { retryPathRunNode } from '@/features/ai/ai-paths/services/path-run-service';
import { startAiPathRunQueue } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import { notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const retrySchema = z.object({
  nodeId: z.string().trim().min(1),
});

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  enforceAiPathsActionRateLimit(access, 'run-retry');
  const parsed = await parseJsonBody(req, retrySchema, {
    logPrefix: 'ai-paths.runs.retry-node',
  });
  if (!parsed.ok) return parsed.response;

  const runId: string = params.runId;
  const repo = await getPathRunRepository();
  const existing = await repo.findRunById(runId);
  if (!existing) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, existing);
  const { nodeId } = parsed.data;
  const run: unknown = await retryPathRunNode(runId, nodeId);
  startAiPathRunQueue();
  return NextResponse.json({ run });
}

export const POST = apiHandlerWithParams<{ runId: string }>(POST_handler, {
  source: 'ai-paths.runs.retry-node',
});
