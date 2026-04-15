import { type NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { resolveAiInsightsContextRegistryEnvelope } from '@/features/ai/insights/context-registry/server';
import { generateRuntimeAnalyticsInsight } from '@/features/ai/insights/generator';
import { listAiInsights } from '@/features/ai/insights/repository';
import { startAiInsightsQueue } from '@/features/ai/insights/workers/aiInsightsQueue';
import {
  runtimeAnalyticsInsightsListQuerySchema,
  runtimeAnalyticsInsightRunRequestSchema,
  type AiInsightResponse,
  type AiInsightsResponse,
} from '@/shared/contracts/ai-insights';
import type { AiPathRuntimeAnalyticsRange } from '@/shared/contracts/ai-paths';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { getQueryParams } from '@/shared/lib/api/api-handler';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const RANGE_VALUES: readonly AiPathRuntimeAnalyticsRange[] = ['1h', '24h', '7d', '30d'];

export { runtimeAnalyticsInsightsListQuerySchema as listSchema };

const resolveRange = (rangeRaw: string | undefined): AiPathRuntimeAnalyticsRange => {
  const value = (rangeRaw ?? '24h') as AiPathRuntimeAnalyticsRange;
  if (!RANGE_VALUES.includes(value)) return '24h';
  return value;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  startAiInsightsQueue();

  const parsed = runtimeAnalyticsInsightsListQuerySchema.parse(
    Object.fromEntries(getQueryParams(req).entries())
  );
  const insights = await listAiInsights('runtime_analytics', parsed.limit ?? 10);
  const response: AiInsightsResponse = { insights };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();
  startAiInsightsQueue();

  const query = runtimeAnalyticsInsightsListQuerySchema.parse(
    Object.fromEntries(getQueryParams(req).entries())
  );
  const parsed = await parseJsonBody(req, runtimeAnalyticsInsightRunRequestSchema, {
    logPrefix: 'ai-paths.runtime-analytics.insights.POST',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const contextRegistry = await resolveAiInsightsContextRegistryEnvelope(
    parsed.data.contextRegistry
  );
  const insight = await generateRuntimeAnalyticsInsight({
    source: 'user_triggered',
    range: resolveRange(parsed.data.range ?? query.range),
    contextRegistry,
  });
  const response: AiInsightResponse = { insight };
  return NextResponse.json(response);
}
