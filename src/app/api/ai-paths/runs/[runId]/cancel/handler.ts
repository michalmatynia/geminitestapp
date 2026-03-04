import { NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { getPathRunRepository } from '@/features/ai/ai-paths/services/path-run-repository';
import { cancelPathRunWithRepository } from '@/features/ai/ai-paths/services/path-run-service';
import { removePathRunQueueEntries } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-cancel');
  const runId: string = params.runId;
  const repo = await getPathRunRepository();
  let existing: AiPathRunRecord | null = await repo.findRunById(runId);
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
    await cancelPathRunWithRepository(repo, runId);
    return NextResponse.json({
      run: existing,
      canceled: false,
      runId,
      message: `Run is already ${existing.status}.`,
    });
  }
  const run: unknown = await cancelPathRunWithRepository(repo, runId);
  return NextResponse.json({ run, canceled: true, runId });
}
