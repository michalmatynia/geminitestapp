import { badRequestError } from '@/shared/errors/app-error';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import type { PortablePathTrendSnapshotsQuery } from '@/shared/contracts/ai-paths-portable-engine';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const DEFAULT_TREND_SNAPSHOT_LIMIT = 50;
const MAX_TREND_SNAPSHOT_LIMIT = 500;
const TREND_SNAPSHOT_CURSOR_VERSION = 1 as const;

export type TrendSnapshotTriggerFilter = 'manual' | 'threshold';

export type TrendSnapshotCursorPayload = {
  version: typeof TREND_SNAPSHOT_CURSOR_VERSION;
  beforeAt: string;
  trigger: TrendSnapshotTriggerFilter | null;
  from: string | null;
  to: string | null;
};

export type PortablePathTrendSnapshot = {
  at: string;
  trigger: TrendSnapshotTriggerFilter;
  driftAlerts: unknown[];
  sinkTotals: {
    writesFailed: number;
  };
};

export type TrendSnapshotQueryOptions = {
  limit: number;
  trigger: TrendSnapshotTriggerFilter | null;
  from: Date | null;
  to: Date | null;
  cursor: TrendSnapshotCursorPayload | null;
};

export const resolveTrendSnapshotsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

const trimOrNull = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const parseTrendSnapshotLimit = (value: string | null): number => {
  const normalized = trimOrNull(value);
  if (normalized === null) return DEFAULT_TREND_SNAPSHOT_LIMIT;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw badRequestError('Invalid trend snapshot limit.');
  const normalizedNumber = Math.floor(parsed);
  if (normalizedNumber <= 0 || normalizedNumber > MAX_TREND_SNAPSHOT_LIMIT) {
    throw badRequestError(`Trend snapshot limit must be between 1 and ${MAX_TREND_SNAPSHOT_LIMIT}.`);
  }
  return normalizedNumber;
};

export const parseTrendSnapshotTrigger = (value: string | null): TrendSnapshotTriggerFilter | null => {
  const normalized = trimOrNull(value);
  if (normalized === null) return null;
  const lowered = normalized.toLowerCase();
  if (lowered === 'manual' || lowered === 'threshold') return lowered;
  throw badRequestError('Trend snapshot trigger must be one of: manual, threshold.');
};

export const parseTrendSnapshotTimestamp = (
  label: 'from' | 'to',
  value: string | null
): Date | null => {
  const normalized = trimOrNull(value);
  if (normalized === null) return null;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequestError(`Trend snapshot "${label}" timestamp is invalid.`);
  }
  return parsed;
};

const parseTrendSnapshotCursorTrigger = (
  value: unknown
): TrendSnapshotTriggerFilter | null => {
  if (typeof value !== 'string') return null;
  const lowered = value.trim().toLowerCase();
  if (lowered === 'manual' || lowered === 'threshold') return lowered;
  return null;
};

const parseTrendSnapshotCursorString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const parseTrendSnapshotCursorPayload = (value: unknown): Partial<TrendSnapshotCursorPayload> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('invalid_shape');
  }
  return value as Partial<TrendSnapshotCursorPayload>;
};

const decodeTrendSnapshotCursor = (value: string): unknown => {
  const decoded = Buffer.from(value, 'base64url').toString('utf8');
  return JSON.parse(decoded) as unknown;
};

const assertCursorFilterMatch = (
  params: {
    cursorTrigger: TrendSnapshotTriggerFilter | null;
    cursorFrom: string | null;
    cursorTo: string | null;
    requestFrom: string | null;
    requestTo: string | null;
    triggerFilter: TrendSnapshotTriggerFilter | null;
  }
): void => {
  if (
    params.cursorTrigger === params.triggerFilter &&
    params.cursorFrom === params.requestFrom &&
    params.cursorTo === params.requestTo
  ) {
    return;
  }
  throw new Error('cursor_filter_mismatch');
};

const buildTrendSnapshotCursorPayload = (
  payload: Partial<TrendSnapshotCursorPayload>,
  filters: {
    trigger: TrendSnapshotTriggerFilter | null;
    from: Date | null;
    to: Date | null;
  }
): TrendSnapshotCursorPayload => {
  if (payload.version !== TREND_SNAPSHOT_CURSOR_VERSION) {
    throw new Error('invalid_version');
  }
  const beforeAt = parseTrendSnapshotCursorString(payload.beforeAt);
  if (beforeAt === null) throw new Error('invalid_before_at');
  const beforeAtDate = new Date(beforeAt);
  if (Number.isNaN(beforeAtDate.getTime())) {
    throw new Error('invalid_before_at');
  }
  const cursorTrigger = parseTrendSnapshotCursorTrigger(payload.trigger);
  const cursorFrom = parseTrendSnapshotCursorString(payload.from);
  const cursorTo = parseTrendSnapshotCursorString(payload.to);
  const requestFrom = filters.from === null ? null : filters.from.toISOString();
  const requestTo = filters.to === null ? null : filters.to.toISOString();
  assertCursorFilterMatch({
    cursorTrigger,
    cursorFrom,
    cursorTo,
    requestFrom,
    requestTo,
    triggerFilter: filters.trigger,
  });
  return {
    version: TREND_SNAPSHOT_CURSOR_VERSION,
    beforeAt,
    trigger: cursorTrigger,
    from: cursorFrom,
    to: cursorTo,
  };
};

export const parseTrendSnapshotCursor = (
  value: string | null,
  filters: {
    trigger: TrendSnapshotTriggerFilter | null;
    from: Date | null;
    to: Date | null;
  }
): TrendSnapshotCursorPayload | null => {
  const normalized = trimOrNull(value);
  if (normalized === null) return null;
  try {
    const payload = parseTrendSnapshotCursorPayload(decodeTrendSnapshotCursor(normalized));
    return buildTrendSnapshotCursorPayload(payload, filters);
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Trend snapshot cursor is invalid.');
  }
};

export const encodeTrendSnapshotCursor = (payload: TrendSnapshotCursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const assertRange = (from: Date | null, to: Date | null): void => {
  if (from === null || to === null) return;
  if (from.getTime() > to.getTime()) {
    throw badRequestError('Trend snapshot "from" timestamp must be earlier than or equal to "to".');
  }
};

export const resolveTrendSnapshotQuery = (
  query: PortablePathTrendSnapshotsQuery
): TrendSnapshotQueryOptions => {
  const limit = parseTrendSnapshotLimit(query.limit ?? null);
  const trigger = parseTrendSnapshotTrigger(query.trigger ?? null);
  const from = parseTrendSnapshotTimestamp('from', query.from ?? null);
  const to = parseTrendSnapshotTimestamp('to', query.to ?? null);
  assertRange(from, to);
  const cursor = parseTrendSnapshotCursor(query.cursor ?? null, { trigger, from, to });
  return { limit, trigger, from, to, cursor };
};

export const buildTrendSnapshotPaging = (options: {
  limit: number;
  trigger: TrendSnapshotTriggerFilter | null;
  cursor: TrendSnapshotCursorPayload | null;
  from: Date | null;
  to: Date | null;
}): { loadLimit: number } => {
  const hasFilters = options.trigger !== null || options.from !== null || options.to !== null;
  const hasCursor = options.cursor !== null;
  return {
    loadLimit:
      hasFilters || hasCursor ? MAX_TREND_SNAPSHOT_LIMIT : options.limit,
  };
};

const isSnapshotInTimeRange = (
  snapshotTime: number,
  fromTime: number | null,
  toTime: number | null
): boolean => {
  if (fromTime !== null && snapshotTime < fromTime) return false;
  if (toTime !== null && snapshotTime > toTime) return false;
  return true;
};

export const filterTrendSnapshots = (
  snapshots: PortablePathTrendSnapshot[],
  trigger: TrendSnapshotTriggerFilter | null,
  fromTime: number | null,
  toTime: number | null
): PortablePathTrendSnapshot[] =>
  snapshots.filter((snapshot) => {
    if (trigger !== null && snapshot.trigger !== trigger) return false;
    if (fromTime === null && toTime === null) return true;
    const snapshotTime = Date.parse(snapshot.at);
    if (Number.isNaN(snapshotTime)) return false;
    return isSnapshotInTimeRange(snapshotTime, fromTime, toTime);
  });

const isSnapshotBeforeCursor = (snapshotTime: number, cursorBeforeTime: number): boolean =>
  Number.isNaN(snapshotTime) ? false : snapshotTime < cursorBeforeTime;

export const filterTrendSnapshotsByCursor = (
  snapshots: PortablePathTrendSnapshot[],
  cursor: TrendSnapshotCursorPayload | null
): PortablePathTrendSnapshot[] => {
  if (cursor === null) return snapshots;
  const cursorBeforeTime = Date.parse(cursor.beforeAt);
  if (Number.isNaN(cursorBeforeTime)) return snapshots;
  const filtered: PortablePathTrendSnapshot[] = [];
  for (const snapshot of snapshots) {
    if (isSnapshotBeforeCursor(Date.parse(snapshot.at), cursorBeforeTime)) {
      filtered.push(snapshot);
    }
  }
  return filtered;
};
