import { NextRequest, NextResponse } from 'next/server';

import { parseJsonBody } from '@/features/products/server';
import {
  type SystemLogsCreateRequest,
  type ClearLogsTargetDto as ClearLogsTarget,
  clearLogsTargetSchema,
  systemLogsClearQuerySchema,
  systemLogsCreateRequestSchema,
  systemLogsListQuerySchema,
  systemLogLevelSchema,
} from '@/shared/contracts/observability';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { clearAnalyticsEvents } from '@/shared/lib/analytics/server';
import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  hydrateLogRuntimeContext,
  hydrateSystemLogRecordRuntimeContext,
} from '@/features/observability/entry-server';
import { clearActivityLogs } from '@/shared/lib/observability/activity-repository';
import {
  clearSystemLogs,
  createSystemLog,
  listSystemLogs,
} from '@/shared/lib/observability/system-log-repository';

const parseCreateBody = async (
  req: NextRequest,
  ctx: ApiHandlerContext
): Promise<{ ok: true; data: SystemLogsCreateRequest } | { ok: false; response: Response }> => {
  if (ctx.body !== undefined) {
    const parsed = systemLogsCreateRequestSchema.safeParse(ctx.body);
    if (parsed.success) {
      return { ok: true, data: parsed.data };
    }
    return {
      ok: false,
      response: await createErrorResponse(
        validationError('Invalid payload', { issues: parsed.error.flatten() }),
        { request: req, source: 'systemLogs.POST' }
      ),
    };
  }
  return parseJsonBody(req, systemLogsCreateRequestSchema, { logPrefix: 'systemLogs.POST' });
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const url = new URL(req.url);
  const parsed = systemLogsListQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listSystemLogs({
    page: parsed.page ?? undefined,
    pageSize: parsed.pageSize ?? undefined,
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
  const logs = await Promise.all(
    result.logs.map((log) => hydrateSystemLogRecordRuntimeContext(log))
  );
  return NextResponse.json(
    {
      ...result,
      logs,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const parsed = await parseCreateBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;
  const hydratedContext = await hydrateLogRuntimeContext(data.context ?? null);
  const created = await createSystemLog({
    level: data.level ?? undefined,
    message: data.message,
    category: data.category ?? null,
    source: data.source ?? undefined,
    service: data.service ?? undefined,
    context: hydratedContext,
    stack: data.stack ?? null,
    path: data.path ?? null,
    method: data.method ?? null,
    statusCode: data.statusCode ?? null,
    requestId: data.requestId ?? null,
    traceId: data.traceId ?? null,
    correlationId: data.correlationId ?? null,
    spanId: data.spanId ?? null,
    parentSpanId: data.parentSpanId ?? null,
    userId: data.userId ?? null,
  });
  return NextResponse.json({ log: created });
}

export async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const url = new URL(req.url);
  const parsed = systemLogsClearQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const before = parsed.before ? new Date(parsed.before) : null;
  const target: ClearLogsTarget = clearLogsTargetSchema.parse(parsed.target);

  if (target === 'error_logs') {
    const result = await clearSystemLogs({ before, level: 'error' });
    return NextResponse.json({
      target,
      deleted: result.deleted,
      deletedByTarget: {
        systemLogs: result.deleted,
        activityLogs: 0,
        pageAccessLogs: 0,
      },
    });
  }

  if (target === 'info_logs') {
    const result = await clearSystemLogs({ before, level: 'info' });
    return NextResponse.json({
      target,
      deleted: result.deleted,
      deletedByTarget: {
        systemLogs: result.deleted,
        activityLogs: 0,
        pageAccessLogs: 0,
      },
    });
  }

  if (target === 'activity_logs') {
    const result = await clearActivityLogs({ before });
    return NextResponse.json({
      target,
      deleted: result.deleted,
      deletedByTarget: {
        systemLogs: 0,
        activityLogs: result.deleted,
        pageAccessLogs: 0,
      },
    });
  }

  if (target === 'page_access_logs') {
    const result = await clearAnalyticsEvents({ before, type: 'pageview' });
    return NextResponse.json({
      target,
      deleted: result.deleted,
      deletedByTarget: {
        systemLogs: 0,
        activityLogs: 0,
        pageAccessLogs: result.deleted,
      },
    });
  }

  const [systemLogsResult, activityLogsResult, pageAccessLogsResult] = await Promise.all([
    clearSystemLogs({ before }),
    clearActivityLogs({ before }),
    clearAnalyticsEvents({ before, type: 'pageview' }),
  ]);

  return NextResponse.json({
    target,
    deleted:
      systemLogsResult.deleted + activityLogsResult.deleted + pageAccessLogsResult.deleted,
    deletedByTarget: {
      systemLogs: systemLogsResult.deleted,
      activityLogs: activityLogsResult.deleted,
      pageAccessLogs: pageAccessLogsResult.deleted,
    },
  });
}
