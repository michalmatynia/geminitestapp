import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { generateLogInterpretation } from '@/features/ai/insights/generator';
import { startAiInsightsQueue } from '@/features/jobs/server';
import { getSystemLogById } from '@/features/observability/server';
import { notFoundError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

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
  const insight = await generateLogInterpretation({
    source: 'manual',
    log: {
      id: log.id,
      level: log.level,
      message: log.message,
      source: log.source ?? null,
      context: log.context ?? null,
      stack: log.stack ?? null,
      path: log.path ?? null,
      method: log.method ?? null,
      statusCode: log.statusCode ?? null,
      ...(log.createdAt ? { createdAt: new Date(log.createdAt).toISOString() } : {}),
    },
  });
  return NextResponse.json({ insight });
}
