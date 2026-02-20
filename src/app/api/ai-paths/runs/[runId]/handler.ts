import { NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
  requireAiPathsRunAccess,
} from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { deletePathRunWithRepository } from '@/features/ai/ai-paths/services/path-run-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

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
  const runMeta =
    run.meta && typeof run.meta === 'object'
      ? run.meta
      : null;
  const compile =
    runMeta?.['graphCompile'] && typeof runMeta['graphCompile'] === 'object'
      ? (runMeta['graphCompile'] as Record<string, unknown>)
      : null;
  return NextResponse.json({ run, nodes, events, compile });
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
  const deleted = await deletePathRunWithRepository(repo, runId);
  if (!deleted) {
    throw notFoundError('Run not found', { runId });
  }
  return NextResponse.json({ deleted: true, runId });
}
