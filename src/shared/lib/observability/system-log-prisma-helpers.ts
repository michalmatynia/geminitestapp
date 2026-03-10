import type {
  SystemLogLevelDto as SystemLogLevel,
  SystemLogMetricsDto as SystemLogMetrics,
  SystemLogRecordDto as SystemLogRecord,
} from '@/shared/contracts/observability';
import type { SystemLog } from '@/shared/lib/db/prisma-client';


type PrismaSystemLogMetricRow = Pick<
  SystemLog,
  'level' | 'source' | 'service' | 'path' | 'context' | 'createdAt'
>;

const readContextString = (
  context: Record<string, unknown> | null,
  key: string
): string | null => {
  const value = context?.[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const preferNonEmptyString = (
  value: string | null | undefined,
  fallback: string | null
): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const toTopSources = (counts: Map<string, number>): SystemLogMetrics['topSources'] =>
  [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([source, count]) => ({ source, count }));

const toTopServices = (counts: Map<string, number>): SystemLogMetrics['topServices'] =>
  [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([service, count]) => ({ service, count }));

const toTopPaths = (counts: Map<string, number>): SystemLogMetrics['topPaths'] =>
  [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([path, count]) => ({ path, count }));

export const readDurationMs = (
  context: Record<string, unknown> | null | undefined
): number | null => {
  const raw = context?.['durationMs'];
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.max(0, raw);
  }
  if (typeof raw === 'string') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
  }
  return null;
};

export const matchesMinDurationMs = (
  context: Record<string, unknown> | null | undefined,
  minDurationMs: number | null | undefined
): boolean => {
  if (typeof minDurationMs !== 'number' || !Number.isFinite(minDurationMs)) return true;
  const durationMs = readDurationMs(context);
  return durationMs !== null && durationMs >= minDurationMs;
};

export const toPrismaSystemLogRecord = (row: SystemLog): SystemLogRecord => {
  const context = (row.context as Record<string, unknown> | null) ?? null;

  return {
    ...row,
    level: row.level as SystemLogLevel,
    category: preferNonEmptyString(row.category, readContextString(context, 'category')),
    source: row.source ?? null,
    service: preferNonEmptyString(row.service, readContextString(context, 'service')),
    context,
    stack: row.stack ?? null,
    path: row.path ?? null,
    method: row.method ?? null,
    statusCode: row.statusCode ?? null,
    requestId: row.requestId ?? null,
    traceId: preferNonEmptyString(row.traceId, readContextString(context, 'traceId')),
    correlationId: preferNonEmptyString(
      row.correlationId,
      readContextString(context, 'correlationId')
    ),
    spanId: preferNonEmptyString(row.spanId, readContextString(context, 'spanId')),
    parentSpanId: preferNonEmptyString(
      row.parentSpanId,
      readContextString(context, 'parentSpanId')
    ),
    userId: row.userId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: null,
  };
};

export const getPrismaSystemLogMetricsWithMinDuration = (
  rows: PrismaSystemLogMetricRow[],
  minDurationMs: number,
  now: Date
): SystemLogMetrics => {
  const filteredRows = rows.filter((row) =>
    matchesMinDurationMs(
      (row.context as Record<string, unknown> | null) ?? null,
      minDurationMs
    )
  );

  const last24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const levels = { info: 0, warn: 0, error: 0 } as Record<SystemLogLevel, number>;
  const topSourceMap = new Map<string, number>();
  const topServiceMap = new Map<string, number>();
  const topPathMap = new Map<string, number>();

  let last24Hours = 0;
  let last7Days = 0;

  for (const row of filteredRows) {
    if (row.level === 'info' || row.level === 'warn' || row.level === 'error') {
      levels[row.level] += 1;
    }

    if (row.createdAt >= last24) last24Hours += 1;
    if (row.createdAt >= last7) last7Days += 1;

    if (typeof row.source === 'string' && row.source.trim().length > 0) {
      topSourceMap.set(row.source, (topSourceMap.get(row.source) ?? 0) + 1);
    }
    if (typeof row.service === 'string' && row.service.trim().length > 0) {
      topServiceMap.set(row.service, (topServiceMap.get(row.service) ?? 0) + 1);
    }
    if (typeof row.path === 'string' && row.path.trim().length > 0) {
      topPathMap.set(row.path, (topPathMap.get(row.path) ?? 0) + 1);
    }
  }

  return {
    total: filteredRows.length,
    levels,
    last24Hours,
    last7Days,
    topSources: toTopSources(topSourceMap),
    topServices: toTopServices(topServiceMap),
    topPaths: toTopPaths(topPathMap),
    generatedAt: now.toISOString(),
  };
};
