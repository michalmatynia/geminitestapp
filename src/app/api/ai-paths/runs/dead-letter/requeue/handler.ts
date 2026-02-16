import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { resumePathRun } from '@/features/ai/ai-paths/services/path-run-service';
import { startAiPathRunQueue } from '@/features/jobs/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const requeueSchema = z.object({
  runIds: z.array(z.string().trim().min(1)).optional(),
  pathId: z.string().trim().optional().nullable(),
  query: z.string().trim().optional(),
  mode: z.enum(['resume', 'replay']).optional(),
  limit: z.number().int().min(1).max(1000).optional(),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-requeue');
  const parsed = await parseJsonBody(req, requeueSchema, {
    logPrefix: 'ai-paths.runs.dead-letter.requeue',
  });
  if (!parsed.ok) return parsed.response;

  const runIds = Array.isArray(parsed.data?.runIds) ? parsed.data.runIds : [];
  const pathId = parsed.data?.pathId?.trim() || undefined;
  const mode = parsed.data?.mode ?? 'resume';
  const query = parsed.data?.query?.trim() || undefined;
  const limit = parsed.data?.limit ?? undefined;

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
      errors.push({
        runId,
        error: error instanceof Error ? error.message : 'Failed to requeue run',
      });
    }
  }

  if (requeuedRunIds.length > 0) {
    startAiPathRunQueue();
  }

  if (errors.length > 0) {
    const { logger } = await import('@/shared/utils/logger');
    logger.warn(`[ai-paths.runs.requeue] ${errors.length} runs failed to requeue`, {
      errors: errors.slice(0, 5),
      totalErrors: errors.length
    });
  }

  return NextResponse.json({
    requeued: requeuedRunIds.length,
    runIds: requeuedRunIds,
    errors,
  });
}
