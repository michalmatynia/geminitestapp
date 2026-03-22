import { NextRequest, NextResponse } from 'next/server';

import {
  enforceAiPathsActionRateLimit,
  requireAiPathsAccessOrInternal,
} from '@/features/ai/ai-paths/server';
import { aiPathsPlaywrightRunRouteParamsSchema } from '@/shared/contracts/ai-paths';
import {
  readPlaywrightNodeRun,
  type PlaywrightNodeRunRecord,
} from '@/features/ai/ai-paths/services/playwright-node-runner';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError, validationError } from '@/shared/errors/app-error';

import { assertPlaywrightRunAccess } from '../access';

const toPublicRun = (
  run: PlaywrightNodeRunRecord
): Omit<PlaywrightNodeRunRecord, 'ownerUserId'> => {
  const { ownerUserId: _ownerUserId, ...rest } = run;
  return rest;
};

export async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { runId: string }
): Promise<Response> {
  const { access, isInternal } = await requireAiPathsAccessOrInternal(req);
  if (!isInternal) {
    await enforceAiPathsActionRateLimit(access, 'playwright-poll');
  }

  const parsedParams = aiPathsPlaywrightRunRouteParamsSchema.safeParse(params);
  if (!parsedParams.success) {
    throw validationError('Invalid route parameters', {
      issues: parsedParams.error.flatten(),
    });
  }
  const { runId } = parsedParams.data;

  const run = await readPlaywrightNodeRun(runId);
  if (!run) {
    throw notFoundError('Playwright run not found.', { runId });
  }
  assertPlaywrightRunAccess({ run, access, isInternal });

  return NextResponse.json({ run: toPublicRun(run) });
}
