import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { resolveAiInsightsContextRegistryEnvelope } from '@/features/ai/insights/context-registry/server';
import { generateAnalyticsInsight } from '@/features/ai/insights/server';
import { listAiInsights } from '@/features/ai/insights/server';
import { startAiInsightsQueue } from '@/features/jobs/server';
import {
  analyticsInsightRunRequestSchema,
  type AiInsightResponse,
  type AiInsightsResponse,
} from '@/shared/contracts/ai-insights';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const url = new URL(req.url);
  const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const insights = await listAiInsights('analytics', parsed.limit ?? 10);
  const response: AiInsightsResponse = { insights };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
