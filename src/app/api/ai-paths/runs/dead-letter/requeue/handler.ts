import { type NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { assertAiPathRunQueueReady } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { resumePathRun } from '@/features/ai/ai-paths/server';
import { aiPathRunDeadLetterRequeueRequestSchema } from '@/shared/contracts/ai-paths';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-requeue');
  const parsed = await parseJsonBody(req, aiPathRunDeadLetterRequeueRequestSchema, {
    logPrefix: 'ai-paths.runs.dead-letter.requeue',
  });
  if (!parsed.ok) return parsed.response;

  const runIds = Array.isArray(parsed.data?.runIds) ? parsed.data.runIds : [];
  const pathId = parsed.data?.pathId?.trim() || undefined;
  const mode = parsed.data?.mode ?? 'resume';
  const query = parsed.data?.query?.trim() || undefined;
  const limit = parsed.data?.limit ?? undefined;

  await assertAiPathRunQueueReady();

  const repo = await getPathRunRepository();
  let targetRunIds = runIds;

  if (targetRunIds.length === 0) {
    const { runs } = await repo.listRuns({
      ...(!access.isElevated ? { userId: access.userId } : {}),
      ...(pathId ? { pathId } : {}),
      ...(query ? { query } : {}),
      status: 'dead_lettered',
      ...(limit ? { limit } : {}),
    });
    targetRunIds = runs.map((run: { id: string }) => run.id);
  }

  if (targetRunIds.length === 0) {
    return NextResponse.json({ requeued: 0, runIds: [], errors: [] });
  }

  const requeuedRunIds: string[] = [];
  const errors: Array<{ runId: string; error: string }> = [];

  for (const runId of targetRunIds) {
    try {
      const run = await repo.findRunById(runId);
      if (!run) {
        errors.push({ runId, error: 'Run not found' });
        continue;
      }
      try {
        assertAiPathRunAccess(access, run);
      } catch (error) {
        void ErrorSystem.captureException(error);
        errors.push({
          runId,
          error: error instanceof Error ? error.message : 'Run access denied',
        });
        continue;
      }
      if (run.status !== 'dead_lettered') {
        errors.push({ runId, error: `Run is ${run.status}` });
        continue;
      }
      await resumePathRun(runId, mode);
      requeuedRunIds.push(runId);
    } catch (error) {
      void ErrorSystem.captureException(error);
      errors.push({
        runId,
        error: error instanceof Error ? error.message : 'Failed to requeue run',
      });
    }
  }

  if (errors.length > 0) {
    const { logger } = await import('@/shared/utils/logger');
    logger.warn(`[ai-paths.runs.requeue] ${errors.length} runs failed to requeue`, {
      errors: errors.slice(0, 5),
      totalErrors: errors.length,
    });
  }

  return NextResponse.json({
    requeued: requeuedRunIds.length,
    runIds: requeuedRunIds,
    errors,
  });
}
