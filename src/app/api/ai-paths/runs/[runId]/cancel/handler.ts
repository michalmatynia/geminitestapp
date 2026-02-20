import { NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { mongoPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository/mongo-path-run-repository';
import { prismaPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository/prisma-path-run-repository';
import {
  cancelPathRunWithRepository,
} from '@/features/ai/ai-paths/services/path-run-service';
import type { AiPathRunRepository } from '@/shared/contracts/ai-paths';
import { removePathRunQueueEntries } from '@/features/jobs/workers/aiPathRunQueue';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);

const resolveFallbackRepository = (
  primary: AiPathRunRepository
): AiPathRunRepository | null => {
  if (primary === prismaPathRunRepository) {
    return process.env['MONGODB_URI'] ? mongoPathRunRepository : null;
  }
  if (primary === mongoPathRunRepository) {
    return process.env['DATABASE_URL'] ? prismaPathRunRepository : null;
  }
  return null;
};

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-cancel');
  const runId: string = params.runId;
  const repo = await getPathRunRepository();
  let repoForRun: AiPathRunRepository = repo;
  let existing: AiPathRunRecord | null = await repo.findRunById(runId);
  if (!existing) {
    const fallbackRepo = resolveFallbackRepository(repo);
    if (fallbackRepo) {
      const fallbackRun = await fallbackRepo.findRunById(runId);
      if (fallbackRun) {
        existing = fallbackRun;
        repoForRun = fallbackRepo;
      }
    }
  }
  if (!existing) {
    await removePathRunQueueEntries([runId]);
    return NextResponse.json({
      run: null,
      canceled: false,
      runId,
      message: 'Run already missing. Queue entry (if present) has been removed.',
    });
  }
  assertAiPathRunAccess(access, existing);
  if (TERMINAL_STATUSES.has(existing.status)) {
    await removePathRunQueueEntries([runId]);
    return NextResponse.json({
      run: existing,
      canceled: false,
      runId,
      message: `Run is already ${existing.status}.`,
    });
  }
  const run: unknown = await cancelPathRunWithRepository(repoForRun, runId);
  await removePathRunQueueEntries([runId]);
  return NextResponse.json({ run, canceled: true, runId });
}
