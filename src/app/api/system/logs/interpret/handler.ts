import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateLogInterpretation } from '@/features/ai/insights/generator';
import { startAiInsightsQueue } from '@/features/jobs/server';
import { getSystemLogById } from '@/shared/lib/observability/system-logger';
import { hydrateSystemLogRecordRuntimeContext } from '@/shared/lib/observability/runtime-context/hydrate-system-log-runtime-context';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';

const schema = z.object({
  logId: z.string().trim().min(1),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  startAiInsightsQueue();
  const parsed = await parseJsonBody(req, schema, {
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
  const insight = await generateLogInterpretation({
    source: 'manual',
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
