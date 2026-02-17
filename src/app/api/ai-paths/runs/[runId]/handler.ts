import { NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { removePathRunQueueEntries } from '@/features/jobs/workers/aiPathRunQueue';
import { notFoundError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/types/api/api';

export async function GET_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const runId = params.runId;
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (run === null) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, run);
  const nodes = await repo.listRunNodes(runId);
  const events = await repo.listRunEvents(runId);
  return NextResponse.json({ run, nodes, events });
}

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-delete');
  const runId = params.runId;
  const repo = await getPathRunRepository();
  const run = await repo.findRunById(runId);
  if (run === null) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, run);
  await removePathRunQueueEntries([runId]);
  const deleted = await repo.deleteRun(runId);
  if (!deleted) {
    throw notFoundError('Run not found', { runId });
  }
  return NextResponse.json({ deleted: true, runId });
}
