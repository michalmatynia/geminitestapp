import { type NextRequest, NextResponse } from 'next/server';

import {
  systemLogsMetricsQuerySchema,
  systemLogLevelSchema,
} from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { assertSettingsManageAccess } from '@/features/auth/server';
import { getSystemLogMetrics } from '@/shared/lib/observability/system-log-repository';

/**
 * System Logs Metrics Handlers
 *
 * HTTP request handlers for system log metrics and aggregation.
 * Handlers: getHandler
 *
 * - Aggregates metrics from system logs
 * - Calculates performance statistics
 * - Provides trend analysis and forecasting
 */

/**
 * Handles HTTP requests.
 *
 * - Validates request inputs
 * - Performs business logic
 * - Returns appropriate response
 *
 * @param req - NextRequest object
 * @param ctx - API handler context
 * @returns Response with operation result
 */
export async function getHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const url = new URL(req.url);
  const parsed = systemLogsMetricsQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const metrics = await getSystemLogMetrics({
    level: parsed.level ? systemLogLevelSchema.parse(parsed.level) : undefined,
    source: parsed.source ?? undefined,
    service: parsed.service ?? undefined,
    method: parsed.method ?? undefined,
    statusCode: parsed.statusCode ?? undefined,
    minDurationMs: parsed.minDurationMs ?? undefined,
    requestId: parsed.requestId ?? undefined,
    traceId: parsed.traceId ?? undefined,
    correlationId: parsed.correlationId ?? undefined,
    userId: parsed.userId ?? undefined,
    fingerprint: parsed.fingerprint ?? undefined,
    category: parsed.category ?? undefined,
    query: parsed.query ?? undefined,
    from: parsed.from ? new Date(parsed.from) : null,
    to: parsed.to ? new Date(parsed.to) : null,
  });
  return NextResponse.json(
    { metrics },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
