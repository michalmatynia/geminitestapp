import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { cancelPathRunWithRepository } from '@/features/ai/ai-paths/server';
import { removePathRunQueueEntries } from '@/features/ai/server';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'canceled', 'dead_lettered']);
const paramsSchema = z.object({
  runId: z.string().trim().min(1, 'Run id is required'),
});

export async function POST_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-cancel');
  const parsedParams = paramsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { runId } = parsedParams.data;
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
