import { NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { assertAiPathRunQueueReady } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { retryPathRunNode } from '@/features/ai/ai-paths/server';
import { aiPathRunRetryNodeRequestSchema } from '@/shared/contracts/ai-paths';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-retry');
  const parsed = await parseJsonBody(req, aiPathRunRetryNodeRequestSchema, {
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
  await assertAiPathRunQueueReady();
  const run: unknown = await retryPathRunNode(runId, nodeId);
  return NextResponse.json({ run });
}
