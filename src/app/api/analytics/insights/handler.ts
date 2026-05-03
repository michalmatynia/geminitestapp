import { type NextRequest, NextResponse } from 'next/server';

import { resolveAiInsightsContextRegistryEnvelope } from '@/features/ai/insights/context-registry/server';
import { generateAnalyticsInsight } from '@/features/ai/insights/server';
import { listAiInsights } from '@/features/ai/insights/server';
import { startAiInsightsQueue } from '@/features/jobs/server';
import {
  aiInsightsListQuerySchema,
  analyticsInsightRunRequestSchema,
  type AiInsightResponse,
  type AiInsightsResponse,
} from '@/shared/contracts/ai-insights';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

export { aiInsightsListQuerySchema as listSchema };

export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const url = new URL(req.url);
  const parsed = aiInsightsListQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const insights = await listAiInsights('analytics', parsed.limit ?? 10);
  const response: AiInsightsResponse = { insights };
  return NextResponse.json(response);
}

export async function postHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const parsed = await parseJsonBody(req, analyticsInsightRunRequestSchema, {
    logPrefix: 'analytics.insights.POST',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const contextRegistry = await resolveAiInsightsContextRegistryEnvelope(
    parsed.data.contextRegistry
  );
  const insight = await generateAnalyticsInsight({
    source: 'user_triggered',
    contextRegistry,
  });
  const response: AiInsightResponse = { insight };
  return NextResponse.json(response);
}
