export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import {
  getRuntimeAnalyticsSummary,
  resolveRuntimeAnalyticsRangeWindow,
} from '@/features/ai/ai-paths/services/runtime-analytics-service';
import { startAiInsightsQueue, startAiPathRunQueue } from '@/features/jobs/server';
import { badRequestError } from '@/shared/errors/app-error';
import { apiHandler, getQueryParams } from '@/shared/lib/api/api-handler';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/types/ai-paths';
import type { ApiHandlerContext } from '@/shared/types/api';

const RANGE_VALUES: readonly AiPathRuntimeAnalyticsRange[] = ['1h', '24h', '7d', '30d'];

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  startAiPathRunQueue();
  startAiInsightsQueue();

  const searchParams = getQueryParams(req);
  const rangeRaw = (searchParams.get('range') ?? '24h') as AiPathRuntimeAnalyticsRange;
  if (!RANGE_VALUES.includes(rangeRaw)) {
    throw badRequestError('Invalid range.');
  }
  const { from, to } = resolveRuntimeAnalyticsRangeWindow(rangeRaw);
  const summary = await getRuntimeAnalyticsSummary({ from, to, range: rangeRaw });
  return NextResponse.json({ summary });
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'ai-paths.runtime-analytics.summary.GET' }
);
