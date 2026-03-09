import { NextRequest, NextResponse } from 'next/server';

import {
  buildContextRegistryConsumerEnvelope,
  mergeContextRegistryResolutionBundles,
} from '@/features/ai/ai-context-registry/context/page-context-shared';
import { generateLogInterpretation } from '@/features/ai/insights/server';
import { startAiInsightsQueue } from '@/features/jobs/server';
import { resolveObservabilityContextRegistryEnvelope } from '@/features/observability/context-registry/server';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { systemLogsInterpretRequestSchema } from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { hydrateSystemLogRecordRuntimeContext } from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';
import { getSystemLogById } from '@/shared/lib/observability/system-logger';

const readContextRegistryEnvelope = (
  value: unknown
): ContextRegistryConsumerEnvelope | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  return Array.isArray(record['refs']) ? (value as ContextRegistryConsumerEnvelope) : null;
};

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const parsed = await parseJsonBody(req, systemLogsInterpretRequestSchema, {
    logPrefix: 'system.logs.interpret.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const log = await getSystemLogById(parsed.data.logId);
  if (!log) {
    throw notFoundError('Log not found.');
  }
  const hydratedLog = await hydrateSystemLogRecordRuntimeContext(log);
  const pageContextRegistry = await resolveObservabilityContextRegistryEnvelope(
    parsed.data.contextRegistry
  );
  const logContextRegistry = readContextRegistryEnvelope(
    typeof hydratedLog.context === 'object' && hydratedLog.context !== null
      ? hydratedLog.context['contextRegistry']
      : null
  );
  const contextRegistry = buildContextRegistryConsumerEnvelope({
    refs: [...(pageContextRegistry?.refs ?? []), ...(logContextRegistry?.refs ?? [])],
    resolved: mergeContextRegistryResolutionBundles(
      pageContextRegistry?.resolved ?? null,
      logContextRegistry?.resolved ?? null
    ),
  });
  const insight = await generateLogInterpretation({
    source: 'manual',
    contextRegistry,
    log: {
      id: hydratedLog.id,
      level: hydratedLog.level,
      message: hydratedLog.message,
      source: hydratedLog.source ?? null,
      context: hydratedLog.context ?? null,
      stack: hydratedLog.stack ?? null,
      path: hydratedLog.path ?? null,
      method: hydratedLog.method ?? null,
      statusCode: hydratedLog.statusCode ?? null,
      ...(hydratedLog.createdAt
        ? { createdAt: new Date(hydratedLog.createdAt).toISOString() }
        : {}),
    },
  });
  return NextResponse.json({ insight });
}
