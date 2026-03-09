import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  assertAiPathRunAccess,
  enforceAiPathsActionRateLimit,
  markPathRunHandoffReady,
  requireAiPathsAccess,
} from '@/features/ai/ai-paths/server';
import { parseJsonBody } from '@/features/products/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { getPathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

const handoffSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
  checkpointLineageId: z.string().trim().min(1).max(200).optional(),
});

export async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsAccess();
  await enforceAiPathsActionRateLimit(access, 'run-handoff');
  const parsed = await parseJsonBody(req, handoffSchema, {
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
