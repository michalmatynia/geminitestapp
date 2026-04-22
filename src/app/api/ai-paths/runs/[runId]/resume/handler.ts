import { type NextRequest, NextResponse } from 'next/server';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { assertAiPathRunQueueReady } from '@/features/ai/ai-paths/workers/aiPathRunQueue';
import { resumePathRun } from '@/features/ai/ai-paths/server';
import { aiPathRunResumeRequestSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { notFoundError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-resume');
  const parsed = await parseJsonBody(req, aiPathRunResumeRequestSchema, {
    logPrefix: 'ai-paths.runs.resume',
  });
  if (!parsed.ok) return parsed.response;

  const runId: string = params.runId;
  const repo = await getPathRunRepository();
  const existing = await repo.findRunById(runId);
  if (!existing) {
    throw notFoundError('Run not found', { runId });
  }
  assertAiPathRunAccess(access, existing);
  const mode = parsed.data?.mode ?? 'resume';
  await assertAiPathRunQueueReady();
  const run: unknown = await resumePathRun(runId, mode);
  return NextResponse.json({ run });
}
