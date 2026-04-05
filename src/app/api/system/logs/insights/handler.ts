import { NextRequest, NextResponse } from 'next/server';

import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { generateLogsInsight } from '@/features/ai/insights/server';
import { listAiInsights } from '@/features/ai/insights/server';
import { startAiInsightsQueue } from '@/features/jobs/server';
import type { AiInsightResponse, AiInsightsResponse } from '@/shared/contracts/ai-insights';
import {
  systemLogsInsightRequestSchema,
  systemLogsInsightsListQuerySchema,
} from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { resolveObservabilityContextRegistryEnvelope } from '@/shared/lib/observability/runtime-context/server';

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  startAiInsightsQueue();
  const url = new URL(req.url);
  const parsed = systemLogsInsightsListQuerySchema.parse(
    Object.fromEntries(url.searchParams.entries())
  );
  const insights = await listAiInsights('logs', parsed.limit ?? 10);
  const response: AiInsightsResponse = { insights };
  return NextResponse.json(response);
}

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  startAiInsightsQueue();
  const parsed = await parseJsonBody(req, systemLogsInsightRequestSchema, {
    logPrefix: 'system.logs.insights.POST',
    allowEmpty: true,
  });
  if (!parsed.ok) {
    return parsed.response;
  }

  const contextRegistry = await resolveObservabilityContextRegistryEnvelope(
    parsed.data.contextRegistry,
    contextRegistryEngine.resolveRefs.bind(contextRegistryEngine)
  );
  const insight = await generateLogsInsight({
    source: 'manual',
    contextRegistry,
  });
  const response: AiInsightResponse = { insight };
  return NextResponse.json(response);
}
