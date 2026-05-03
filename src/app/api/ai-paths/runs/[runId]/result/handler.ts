import { type NextRequest, NextResponse } from 'next/server';

import { assertAiPathRunAccess, requireAiPathsRunAccess } from '@/features/ai/ai-paths/server';
import { aiPathRunRouteParamsSchema } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { notFoundError, validationError } from '@/shared/errors/app-error';
import { resolvePathRunRepository } from '@/shared/lib/ai-paths/services/path-run-repository';

const parseRunId = (params: { runId: string }): string => {
  const parsed = aiPathRunRouteParamsSchema.safeParse(params);
  if (!parsed.success) {
    throw validationError('Invalid route parameters', {
      issues: parsed.error.flatten(),
    });
  }
  return parsed.data.runId;
};

export async function getHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const access = await requireAiPathsRunAccess();
  const runId = parseRunId(params);
  const repoSelection = await resolvePathRunRepository();
  const run = await repoSelection.repo.findRunById(runId);
  if (run === null) {
    throw notFoundError('Run not found', { runId });
  }

  assertAiPathRunAccess(access, run);

  return NextResponse.json(
    { run },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Ai-Paths-Run-Provider': repoSelection.provider,
        'X-Ai-Paths-Run-Route-Mode': repoSelection.routeMode,
        'X-Ai-Paths-Run-Read-Provider': repoSelection.provider,
        'X-Ai-Paths-Run-Read-Mode': 'selected',
      },
    }
  );
}
