import { NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  markPathRunHandoffReady,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { parseJsonBody } from '@/features/products/server';
import { aiPathRunHandoffRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-handoff');
  const parsed = await parseJsonBody(req, aiPathRunHandoffRequestSchema, {
    logPrefix: 'ai-paths.runs.handoff',
  });
  if (!parsed.ok) return parsed.response;

  const runId: string = params.runId;
  const repo = await getPathRunRepository();
  const existing = await repo.findRunById(runId);
  if (!existing) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, existing);

  const run: unknown = await markPathRunHandoffReady({
    runId,
    reason: parsed.data?.reason ?? null,
    checkpointLineageId: parsed.data?.checkpointLineageId ?? null,
    requestedBy: access.userId,
  });
  const handoffRun =
    run && typeof run === 'object' ? (run as { status?: string }) : null;

  return NextResponse.json({
    run,
    handoffReady: handoffRun?.status === 'handoff_ready',
    runId,
  });
}
