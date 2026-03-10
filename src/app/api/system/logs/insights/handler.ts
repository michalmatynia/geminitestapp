import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { contextRegistryEngine } from '@/features/ai/ai-context-registry/server';
import { generateLogsInsight } from '@/features/ai/insights/server';
import { listAiInsights } from '@/features/ai/insights/server';
import { startAiInsightsQueue } from '@/features/jobs/server';
import { resolveObservabilityContextRegistryEnvelope } from '@/features/observability/context-registry/server';
import { systemLogsInsightRequestSchema } from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { assertSettingsManageAccess } from '@/shared/lib/auth/settings-manage-access';

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(50).optional(),
});

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  startAiInsightsQueue();
  const url = new URL(req.url);
  const parsed = listSchema.parse(Object.fromEntries(url.searchParams.entries()));
  const insights = await listAiInsights('logs', parsed.limit ?? 10);
  return NextResponse.json({ insights });
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
  return NextResponse.json({ insight });
}
