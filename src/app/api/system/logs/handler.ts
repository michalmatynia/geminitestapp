import { type NextRequest, NextResponse } from 'next/server';

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
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { validationError } from '@/shared/errors/app-error';
import { createErrorResponse } from '@/shared/lib/api/handle-api-error';
import { clearAnalyticsEvents } from '@/shared/lib/analytics/server';
import { assertSettingsManageAccess } from '@/features/auth/server';
import {
  hydrateLogRuntimeContext,
  hydrateSystemLogRecordRuntimeContext,
} from '@/shared/lib/observability/entry-server';
import { clearActivityLogs } from '@/shared/lib/observability/activity-repository';
import {
  clearSystemLogs,
  createSystemLog,
  listSystemLogs,
} from '@/shared/lib/observability/system-log-repository';
import { normalizeObservabilityApplicationId } from '@/shared/lib/observability/application-log-origin';

/**
 * System Logs API Handlers
 *
 * HTTP request handlers for system log retrieval and filtering.
 * Handlers: getHandler
 *
 * - Retrieves system logs with filtering
 * - Manages log storage and retention
 * - Provides log search and analysis
 */

type SystemLogCreateInput = Parameters<typeof createSystemLog>[0];
type SystemLogsListQuery = ReturnType<typeof systemLogsListQuerySchema.parse>;
type SystemLogsListInput = Parameters<typeof listSystemLogs>[0];
type ClearLogsResponseBody = {
  target: ClearLogsTarget;
  deleted: number;
  deletedByTarget: {
    systemLogs: number;
    activityLogs: number;
    pageAccessLogs: number;
  };
};

const toOptional = <T,>(value: T | null | undefined): T | undefined => value ?? undefined;
const toNullable = <T,>(value: T | null | undefined): T | null => value ?? null;

const dateFromQuery = (value: string | null | undefined): Date | null =>
  value === null || value === undefined ? null : new Date(value);

const parseOptionalLogLevel = (
  value: string | null | undefined
): SystemLogsListInput['level'] =>
  value === null || value === undefined ? undefined : systemLogLevelSchema.parse(value);

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

const buildSystemLogCreateInput = ({
  data,
  hydratedContext,
}: {
  data: SystemLogsCreateRequest;
  hydratedContext: Awaited<ReturnType<typeof hydrateLogRuntimeContext>>;
}): SystemLogCreateInput => ({
  level: toOptional(data.level),
  message: data.message,
  category: toNullable(data.category),
  source: toOptional(data.source),
  service: toOptional(data.service),
  context: hydratedContext,
  stack: toNullable(data.stack),
  path: toNullable(data.path),
  method: toNullable(data.method),
  statusCode: toNullable(data.statusCode),
  requestId: toNullable(data.requestId),
  traceId: toNullable(data.traceId),
  correlationId: toNullable(data.correlationId),
  spanId: toNullable(data.spanId),
  parentSpanId: toNullable(data.parentSpanId),
  userId: toNullable(data.userId),
  applicationId: toNullable(data.applicationId),
  applicationName: toNullable(data.applicationName),
  environment: toNullable(data.environment),
  sourceService: toNullable(data.sourceService),
  originDatabase: toNullable(data.originDatabase),
  originCollection: toNullable(data.originCollection),
  originLogId: toNullable(data.originLogId),
});

const createSystemLogFromRequest = async (
  data: SystemLogsCreateRequest
): Promise<Awaited<ReturnType<typeof createSystemLog>>> => {
  const hydratedContext = await hydrateLogRuntimeContext(data.context ?? null);
  return await createSystemLog(
    buildSystemLogCreateInput({
      data,
      hydratedContext,
    })
  );
};

const buildSystemLogsListInput = (parsed: SystemLogsListQuery): SystemLogsListInput => ({
  page: toOptional(parsed.page),
  pageSize: toOptional(parsed.pageSize),
  level: parseOptionalLogLevel(parsed.level),
  source: toOptional(parsed.source),
  service: toOptional(parsed.service),
  method: toOptional(parsed.method),
  statusCode: toOptional(parsed.statusCode),
  minDurationMs: toOptional(parsed.minDurationMs),
  requestId: toOptional(parsed.requestId),
  traceId: toOptional(parsed.traceId),
  correlationId: toOptional(parsed.correlationId),
  userId: toOptional(parsed.userId),
  applicationId: normalizeObservabilityApplicationId(parsed.applicationId) ?? undefined,
  fingerprint: toOptional(parsed.fingerprint),
  category: toOptional(parsed.category),
  query: toOptional(parsed.query),
  from: dateFromQuery(parsed.from),
  to: dateFromQuery(parsed.to),
});

const buildClearLogsResponse = ({
  target,
  systemLogs,
  activityLogs,
  pageAccessLogs,
}: {
  target: ClearLogsTarget;
  systemLogs: number;
  activityLogs: number;
  pageAccessLogs: number;
}): Response => {
  const body: ClearLogsResponseBody = {
    target,
    deleted: systemLogs + activityLogs + pageAccessLogs,
    deletedByTarget: {
      systemLogs,
      activityLogs,
      pageAccessLogs,
    },
  };
  return NextResponse.json(body);
};

const clearLogsForTarget = async (
  target: ClearLogsTarget,
  before: Date | null
): Promise<Response> => {
  if (target === 'error_logs') {
    const result = await clearSystemLogs({ before, level: 'error' });
    return buildClearLogsResponse({ target, systemLogs: result.deleted, activityLogs: 0, pageAccessLogs: 0 });
  }
  if (target === 'info_logs') {
    const result = await clearSystemLogs({ before, level: 'info' });
    return buildClearLogsResponse({ target, systemLogs: result.deleted, activityLogs: 0, pageAccessLogs: 0 });
  }
  if (target === 'activity_logs') {
    const result = await clearActivityLogs({ before });
    return buildClearLogsResponse({ target, systemLogs: 0, activityLogs: result.deleted, pageAccessLogs: 0 });
  }
  if (target === 'page_access_logs') {
    const result = await clearAnalyticsEvents({ before, type: 'pageview' });
    return buildClearLogsResponse({ target, systemLogs: 0, activityLogs: 0, pageAccessLogs: result.deleted });
  }

  const [systemLogsResult, activityLogsResult, pageAccessLogsResult] = await Promise.all([
    clearSystemLogs({ before }),
    clearActivityLogs({ before }),
    clearAnalyticsEvents({ before, type: 'pageview' }),
  ]);
  return buildClearLogsResponse({
    target,
    systemLogs: systemLogsResult.deleted,
    activityLogs: activityLogsResult.deleted,
    pageAccessLogs: pageAccessLogsResult.deleted,
  });
};

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
  const parsed = systemLogsListQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const result = await listSystemLogs(buildSystemLogsListInput(parsed));
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
export async function postHandler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const parsed = await parseCreateBody(req, ctx);
  if (!parsed.ok) {
    return parsed.response;
  }
  const created = await createSystemLogFromRequest(parsed.data);
  return NextResponse.json({ log: created });
}

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
export async function deleteHandler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await assertSettingsManageAccess();
  const url = new URL(req.url);
  const parsed = systemLogsClearQuerySchema.parse(Object.fromEntries(url.searchParams.entries()));
  const before = dateFromQuery(parsed.before);
  const target: ClearLogsTarget = clearLogsTargetSchema.parse(parsed.target);
  return clearLogsForTarget(target, before);
}
