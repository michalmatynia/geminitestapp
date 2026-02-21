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
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

const resumeSchema = z.object({
  mode: z.enum(['resume', 'replay']).optional(),
});

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-resume');
  const parsed = await parseJsonBody(req, resumeSchema, {
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
  const run: unknown = await resumePathRun(runId, mode);
  startAiPathRunQueue();
  return NextResponse.json({ run });
}
