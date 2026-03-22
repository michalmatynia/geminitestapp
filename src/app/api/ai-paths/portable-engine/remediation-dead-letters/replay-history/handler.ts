import { createHmac } from 'crypto';
import { gzipSync } from 'zlib';

import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { portablePathRemediationDeadLetterReplayHistoryQuerySchema } from '@/shared/contracts/ai-paths-portable-engine';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import {
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ALERT_TYPE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment,
  type PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode,
} from '@/shared/lib/ai-paths/portable-engine/server';
import { listSystemLogs } from '@/shared/lib/observability/system-log-repository';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 200;
const HISTORY_SCAN_PAGE_SIZE = 200;
const MAX_HISTORY_SCAN_PAGES = 10;
const REPLAY_HISTORY_CURSOR_VERSION = 1 as const;
const REPLAY_HISTORY_EXPORT_COMPRESSION_MIN_BYTES = 1024;
const REPLAY_HISTORY_REDACTED_VALUE = '[redacted]';

type ReplayAttemptHistoryRecord = {
  replayedAt: string | null;
  queuedAt: string | null;
  channel: string | null;
  endpoint: string | null;
  attempted: boolean;
  delivered: boolean;
  statusCode: number | null;
  error: string | null;
  signatureApplied: boolean;
  attemptCountBefore: number | null;
  attemptCountAfter: number | null;
};

type ReplayHistoryRecord = {
  loggedAt: string;
  level: string;
  dryRun: boolean;
  selectedCount: number;
  attemptedCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
  removedCount: number;
  retainedCount: number;
  persisted: boolean;
  filters: {
    channel: string | null;
    endpoint: string | null;
    limit: number | null;
  };
  replayPolicy: {
    replayWindowSeconds: number | null;
    minimumQueuedAt: string | null;
    endpointAllowlistCount: number | null;
  };
  attempts: ReplayAttemptHistoryRecord[] | null;
};

type ReplayHistoryCursorPayload = {
  version: 1;
  beforeLoggedAt: string;
  beforeLogId: string | null;
  from: string | null;
  to: string | null;
};

type ReplayHistoryPagination = {
  hasMore: boolean;
  nextCursor: string | null;
  cursor: ReplayHistoryCursorPayload | null;
  scanTruncated: boolean;
};

type ReplayHistoryPayload = {
  specVersion: string;
  kind: 'portable_audit_sink_auto_remediation_dead_letter_replay_history_export';
  generatedAt: string;
  limit: number;
  includeAttempts: boolean;
  filters: {
    from: string | null;
    to: string | null;
  };
  redaction: {
    mode: PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode;
    applied: boolean;
  };
  summary: {
    scannedLogCount: number;
    matchedReplayCount: number;
    returnedCount: number;
  };
  pagination: ReplayHistoryPagination;
  entries: ReplayHistoryRecord[];
};

type ReplayHistoryExportSignature = {
  algorithm: 'hmac_sha256';
  keyId: string | null;
  timestamp: string;
  value: string;
};

type ReplayHistoryExportFormat = 'json' | 'ndjson' | 'csv';

const REPLAY_HISTORY_EXPORT_FORMATS: ReplayHistoryExportFormat[] = ['json', 'ndjson', 'csv'];

export { portablePathRemediationDeadLetterReplayHistoryQuerySchema as querySchema };

const resolveReplayHistoryQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});

const parseHistoryLimit = (value: string | null): number => {
  if (!value) return DEFAULT_HISTORY_LIMIT;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw badRequestError('Invalid remediation replay history limit.');
  }
  const normalized = Math.floor(numeric);
  if (normalized <= 0 || normalized > MAX_HISTORY_LIMIT) {
    throw badRequestError(
      `Remediation replay history limit must be between 1 and ${MAX_HISTORY_LIMIT}.`
    );
  }
  return normalized;
};

const parseHistoryTimestamp = (label: 'from' | 'to', value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequestError(`Remediation replay history "${label}" timestamp is invalid.`);
  }
  return parsed;
};

const parseBooleanQuery = (label: string, value: string | null, fallback: boolean): boolean => {
  if (!value) return fallback;
  const normalized = value.trim().toLowerCase();
  if (normalized === '1' || normalized === 'true' || normalized === 'yes') return true;
  if (normalized === '0' || normalized === 'false' || normalized === 'no') return false;
  throw badRequestError(`Remediation replay history "${label}" must be boolean.`);
};

const parseReplayHistoryExportFormat = (value: string | null): ReplayHistoryExportFormat => {
  if (!value) return 'json';
  const normalized = value.trim().toLowerCase();
  if (REPLAY_HISTORY_EXPORT_FORMATS.includes(normalized as ReplayHistoryExportFormat)) {
    return normalized as ReplayHistoryExportFormat;
  }
  throw badRequestError('Remediation replay history "format" must be one of: json, ndjson, csv.');
};

const parseReplayHistoryCursor = (
  value: string | null,
  filters: {
    from: Date | null;
    to: Date | null;
  }
): ReplayHistoryCursorPayload | null => {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid_shape');
    }
    const payload = parsed as Partial<ReplayHistoryCursorPayload>;
    if (payload.version !== REPLAY_HISTORY_CURSOR_VERSION) {
      throw new Error('invalid_version');
    }
    if (typeof payload.beforeLoggedAt !== 'string' || payload.beforeLoggedAt.trim().length === 0) {
      throw new Error('invalid_before_logged_at');
    }
    const beforeLoggedAt = new Date(payload.beforeLoggedAt);
    if (Number.isNaN(beforeLoggedAt.getTime())) {
      throw new Error('invalid_before_logged_at');
    }
    const beforeLogId =
      typeof payload.beforeLogId === 'string' && payload.beforeLogId.trim().length > 0
        ? payload.beforeLogId
        : null;
    const cursorFrom =
      typeof payload.from === 'string' && payload.from.trim().length > 0 ? payload.from : null;
    const cursorTo =
      typeof payload.to === 'string' && payload.to.trim().length > 0 ? payload.to : null;
    const requestFrom = filters.from?.toISOString() ?? null;
    const requestTo = filters.to?.toISOString() ?? null;
    if (cursorFrom !== requestFrom || cursorTo !== requestTo) {
      throw new Error('cursor_filter_mismatch');
    }
    return {
      version: REPLAY_HISTORY_CURSOR_VERSION,
      beforeLoggedAt: beforeLoggedAt.toISOString(),
      beforeLogId,
      from: cursorFrom,
      to: cursorTo,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Remediation replay history cursor is invalid.');
  }
};

const encodeReplayHistoryCursor = (payload: ReplayHistoryCursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toOptionalString = (value: unknown): string | null =>
  typeof value === 'string' && value.trim().length > 0 ? value : null;

const toOptionalNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const toBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toReplayAttemptHistoryRecord = (value: unknown): ReplayAttemptHistoryRecord | null => {
  const record = asRecord(value);
  if (!record) return null;
  return {
    replayedAt: toOptionalString(record['replayedAt']),
    queuedAt: toOptionalString(record['queuedAt']),
    channel: toOptionalString(record['channel']),
    endpoint: toOptionalString(record['endpoint']),
    attempted: toBoolean(record['attempted']),
    delivered: toBoolean(record['delivered']),
    statusCode: toOptionalNumber(record['statusCode']),
    error: toOptionalString(record['error']),
    signatureApplied: toBoolean(record['signatureApplied']),
    attemptCountBefore: toOptionalNumber(record['attemptCountBefore']),
    attemptCountAfter: toOptionalNumber(record['attemptCountAfter']),
  };
};

type ReplayHistoryRecordWithCursor = ReplayHistoryRecord & {
  logId: string | null;
};

const toReplayHistoryRecord = (
  log: Record<string, unknown>,
  includeAttempts: boolean
): ReplayHistoryRecordWithCursor | null => {
  const logId = toOptionalString(log['id']);
  const context = asRecord(log['context']);
  if (!context) return null;
  if (
    context['alertType'] !== PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ALERT_TYPE
  ) {
    return null;
  }
  const filters = asRecord(context['filters']);
  const replayPolicy = asRecord(context['replayPolicy']);
  const attempts = Array.isArray(context['attempts'])
    ? context['attempts']
      .map((entry) => toReplayAttemptHistoryRecord(entry))
      .filter((entry): entry is ReplayAttemptHistoryRecord => entry !== null)
    : [];
  return {
    logId,
    loggedAt: toOptionalString(log['createdAt']) ?? new Date().toISOString(),
    level: toOptionalString(log['level']) ?? 'info',
    dryRun: toBoolean(context['dryRun']),
    selectedCount: toOptionalNumber(context['selectedCount']) ?? 0,
    attemptedCount: toOptionalNumber(context['attemptedCount']) ?? 0,
    deliveredCount: toOptionalNumber(context['deliveredCount']) ?? 0,
    failedCount: toOptionalNumber(context['failedCount']) ?? 0,
    skippedCount: toOptionalNumber(context['skippedCount']) ?? 0,
    removedCount: toOptionalNumber(context['removedCount']) ?? 0,
    retainedCount: toOptionalNumber(context['retainedCount']) ?? 0,
    persisted: toBoolean(context['persisted'], true),
    filters: {
      channel: toOptionalString(filters?.['channel']),
      endpoint: toOptionalString(filters?.['endpoint']),
      limit: toOptionalNumber(filters?.['limit']),
    },
    replayPolicy: {
      replayWindowSeconds: toOptionalNumber(replayPolicy?.['replayWindowSeconds']),
      minimumQueuedAt: toOptionalString(replayPolicy?.['minimumQueuedAt']),
      endpointAllowlistCount: toOptionalNumber(replayPolicy?.['endpointAllowlistCount']),
    },
    attempts: includeAttempts ? attempts : null,
  };
};

const compareReplayHistoryRecordsDesc = (
  left: ReplayHistoryRecordWithCursor,
  right: ReplayHistoryRecordWithCursor
): number => {
  const leftTime = Date.parse(left.loggedAt);
  const rightTime = Date.parse(right.loggedAt);
  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && rightTime !== leftTime) {
    return rightTime - leftTime;
  }
  if (left.loggedAt !== right.loggedAt) {
    return right.loggedAt.localeCompare(left.loggedAt);
  }
  return (right.logId ?? '').localeCompare(left.logId ?? '');
};

const isReplayHistoryRecordBeforeCursor = (
  entry: ReplayHistoryRecordWithCursor,
  cursor: ReplayHistoryCursorPayload | null
): boolean => {
  if (!cursor) return true;
  const entryTime = Date.parse(entry.loggedAt);
  const cursorTime = Date.parse(cursor.beforeLoggedAt);
  if (!Number.isFinite(entryTime) || !Number.isFinite(cursorTime)) return false;
  if (entryTime < cursorTime) return true;
  if (entryTime > cursorTime) return false;
  if (!cursor.beforeLogId || !entry.logId) return false;
  return entry.logId.localeCompare(cursor.beforeLogId) < 0;
};

const signReplayHistoryPayload = (
  payload: ReplayHistoryPayload,
  options: {
    timestamp: string;
    secret: string;
    keyId: string | null;
  }
): ReplayHistoryExportSignature => {
  const serialized = JSON.stringify(payload);
  const digest = createHmac('sha256', options.secret)
    .update(`${options.timestamp}.${serialized}`)
    .digest('hex');
  return {
    algorithm: 'hmac_sha256',
    keyId: options.keyId,
    timestamp: options.timestamp,
    value: `v1=${digest}`,
  };
};

const withSignatureHeaders = (
  headers: Headers,
  signature: ReplayHistoryExportSignature | null
): Headers => {
  if (!signature) return headers;
  headers.set('x-ai-paths-export-signature', signature.value);
  headers.set('x-ai-paths-export-signature-algorithm', signature.algorithm);
  headers.set('x-ai-paths-export-signature-timestamp', signature.timestamp);
  if (signature.keyId) {
    headers.set('x-ai-paths-export-signature-key-id', signature.keyId);
  }
  return headers;
};

const withReplayHistoryPaginationHeaders = (
  headers: Headers,
  pagination: ReplayHistoryPagination
): Headers => {
  headers.set('x-ai-paths-pagination-has-more', String(pagination.hasMore));
  headers.set('x-ai-paths-pagination-scan-truncated', String(pagination.scanTruncated));
  if (pagination.nextCursor) {
    headers.set('x-ai-paths-pagination-next-cursor', pagination.nextCursor);
  }
  return headers;
};

const withReplayHistoryRedactionHeaders = (
  headers: Headers,
  redactionMode: PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode
): Headers => {
  headers.set('x-ai-paths-export-redaction-mode', redactionMode);
  return headers;
};

const resolveReplayHistoryExportRedactionMode =
  (): PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode =>
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionModeFromEnvironment() ??
    'off';

const applyReplayHistoryRecordRedaction = (
  entry: ReplayHistoryRecord,
  redactionMode: PortablePathAuditSinkAutoRemediationDeadLetterReplayExportRedactionMode
): ReplayHistoryRecord => {
  if (redactionMode === 'off') return entry;
  return {
    ...entry,
    filters: {
      ...entry.filters,
      endpoint: null,
    },
    attempts:
      entry.attempts?.map((attempt) => ({
        ...attempt,
        endpoint: null,
        error: attempt.error === null ? null : REPLAY_HISTORY_REDACTED_VALUE,
      })) ?? null,
  };
};

const toMergedVaryHeader = (existing: string | null, value: string): string => {
  const current = (existing ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  if (!current.includes(value)) current.push(value);
  return current.join(', ');
};

const acceptsGzipEncoding = (request: NextRequest): boolean => {
  const header = request.headers.get('accept-encoding');
  if (!header) return false;
  return header
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .some((entry) => entry === 'gzip' || entry.startsWith('gzip;'));
};

const maybeCompressReplayHistoryExportBody = (
  request: NextRequest,
  body: string,
  headers: Headers
): string | ArrayBuffer => {
  headers.set('Vary', toMergedVaryHeader(headers.get('Vary'), 'Accept-Encoding'));
  const bodyBytes = Buffer.byteLength(body);
  headers.set('x-ai-paths-export-size-bytes', String(bodyBytes));
  if (!acceptsGzipEncoding(request) || bodyBytes < REPLAY_HISTORY_EXPORT_COMPRESSION_MIN_BYTES) {
    return body;
  }
  const compressed = gzipSync(body);
  headers.set('Content-Encoding', 'gzip');
  headers.set('x-ai-paths-export-compression', 'gzip');
  headers.set('x-ai-paths-export-size-compressed-bytes', String(compressed.byteLength));
  const start = compressed.byteOffset;
  const end = compressed.byteOffset + compressed.byteLength;
  return compressed.buffer.slice(start, end);
};

const escapeCsv = (value: string | number | boolean | null): string => {
  if (value === null) return '';
  const text = String(value);
  if (text.includes('"') || text.includes(',') || text.includes('\n')) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
};

const toReplayHistoryCsv = (entries: ReplayHistoryRecord[]): string => {
  const header = [
    'loggedAt',
    'level',
    'dryRun',
    'selectedCount',
    'attemptedCount',
    'deliveredCount',
    'failedCount',
    'skippedCount',
    'removedCount',
    'retainedCount',
    'persisted',
    'channel',
    'endpoint',
    'limit',
    'replayWindowSeconds',
    'minimumQueuedAt',
    'endpointAllowlistCount',
    'attemptsJson',
  ];
  const rows = entries.map((entry) =>
    [
      entry.loggedAt,
      entry.level,
      entry.dryRun,
      entry.selectedCount,
      entry.attemptedCount,
      entry.deliveredCount,
      entry.failedCount,
      entry.skippedCount,
      entry.removedCount,
      entry.retainedCount,
      entry.persisted,
      entry.filters.channel,
      entry.filters.endpoint,
      entry.filters.limit,
      entry.replayPolicy.replayWindowSeconds,
      entry.replayPolicy.minimumQueuedAt,
      entry.replayPolicy.endpointAllowlistCount,
      entry.attempts ? JSON.stringify(entry.attempts) : null,
    ]
      .map((value) =>
        escapeCsv(
          typeof value === 'boolean' || typeof value === 'number' || typeof value === 'string'
            ? value
            : null
        )
      )
      .join(',')
  );
  return `${header.join(',')}\n${rows.join('\n')}\n`;
};

const toReplayHistoryNdjson = (
  payload: ReplayHistoryPayload,
  signature: ReplayHistoryExportSignature | null
): string => {
  const lines = [
    JSON.stringify({
      type: 'meta',
      specVersion: payload.specVersion,
      kind: payload.kind,
      generatedAt: payload.generatedAt,
      limit: payload.limit,
      includeAttempts: payload.includeAttempts,
      filters: payload.filters,
      redaction: payload.redaction,
      summary: payload.summary,
      pagination: payload.pagination,
      signature,
    }),
    ...payload.entries.map((entry) => JSON.stringify({ type: 'entry', ...entry })),
  ];
  return `${lines.join('\n')}\n`;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const query = portablePathRemediationDeadLetterReplayHistoryQuerySchema.parse(
    resolveReplayHistoryQueryInput(req, _ctx)
  );
  const limit = parseHistoryLimit(query.limit ?? null);
  const from = parseHistoryTimestamp('from', query.from ?? null);
  const to = parseHistoryTimestamp('to', query.to ?? null);
  if (from && to && from.getTime() > to.getTime()) {
    throw badRequestError(
      'Remediation replay history "from" timestamp must be earlier than or equal to "to".'
    );
  }
  const includeAttempts = parseBooleanQuery('includeAttempts', query.includeAttempts ?? null, false);
  const signed = parseBooleanQuery('signed', query.signed ?? null, true);
  const format = parseReplayHistoryExportFormat(query.format ?? null);
  const cursor = parseReplayHistoryCursor(query.cursor ?? null, { from, to });

  const matchedEntries: ReplayHistoryRecordWithCursor[] = [];
  let matchedReplayCount = 0;
  let scannedLogCount = 0;
  let logsExhausted = false;
  for (let page = 1; page <= MAX_HISTORY_SCAN_PAGES; page += 1) {
    const result = await listSystemLogs({
      page,
      pageSize: HISTORY_SCAN_PAGE_SIZE,
      source: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
      category: PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
      from,
      to,
    });
    scannedLogCount += result.logs.length;
    for (const log of result.logs as unknown[]) {
      const replayLog = toReplayHistoryRecord(asRecord(log) ?? {}, includeAttempts);
      if (!replayLog) continue;
      if (!isReplayHistoryRecordBeforeCursor(replayLog, cursor)) continue;
      matchedReplayCount += 1;
      matchedEntries.push(replayLog);
    }
    if (page * HISTORY_SCAN_PAGE_SIZE >= result.total || result.logs.length === 0) {
      logsExhausted = true;
      break;
    }
  }

  const scanTruncated = !logsExhausted;
  matchedEntries.sort(compareReplayHistoryRecordsDesc);
  const selectedEntries = matchedEntries.slice(0, limit);
  const redactionMode = resolveReplayHistoryExportRedactionMode();
  const rawEntries: ReplayHistoryRecord[] = selectedEntries.map(
    ({ logId: _logId, ...entry }) => entry
  );
  const entries: ReplayHistoryRecord[] = rawEntries.map((entry) =>
    applyReplayHistoryRecordRedaction(entry, redactionMode)
  );
  const hasMore = matchedReplayCount > selectedEntries.length || scanTruncated;
  const nextCursor =
    hasMore && selectedEntries.length > 0
      ? encodeReplayHistoryCursor({
        version: REPLAY_HISTORY_CURSOR_VERSION,
        beforeLoggedAt: selectedEntries[selectedEntries.length - 1]!.loggedAt,
        beforeLogId: selectedEntries[selectedEntries.length - 1]!.logId,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      })
      : null;

  const generatedAt = new Date().toISOString();
  const payload: ReplayHistoryPayload = {
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'portable_audit_sink_auto_remediation_dead_letter_replay_history_export',
    generatedAt,
    limit,
    includeAttempts,
    filters: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    redaction: {
      mode: redactionMode,
      applied: redactionMode !== 'off',
    },
    summary: {
      scannedLogCount,
      matchedReplayCount,
      returnedCount: entries.length,
    },
    pagination: {
      hasMore,
      nextCursor,
      cursor,
      scanTruncated,
    },
    entries,
  };

  const exportSecret =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment();
  const exportKeyId =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment();
  const signature =
    signed && exportSecret
      ? signReplayHistoryPayload(payload, {
        timestamp: generatedAt,
        secret: exportSecret,
        keyId: exportKeyId,
      })
      : null;

  if (format === 'ndjson') {
    const headers = withReplayHistoryRedactionHeaders(
      withReplayHistoryPaginationHeaders(
        withSignatureHeaders(
          new Headers({
            'Cache-Control': 'no-store',
            'Content-Type': 'application/x-ndjson; charset=utf-8',
            'Content-Disposition':
              'attachment; filename="portable-remediation-dead-letter-replay-history.ndjson"',
          }),
          signature
        ),
        payload.pagination
      ),
      payload.redaction.mode
    );
    const body = maybeCompressReplayHistoryExportBody(
      req,
      toReplayHistoryNdjson(payload, signature),
      headers
    );
    return new Response(body, {
      status: 200,
      headers,
    });
  }

  if (format === 'csv') {
    const headers = withReplayHistoryRedactionHeaders(
      withReplayHistoryPaginationHeaders(
        withSignatureHeaders(
          new Headers({
            'Cache-Control': 'no-store',
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition':
              'attachment; filename="portable-remediation-dead-letter-replay-history.csv"',
          }),
          signature
        ),
        payload.pagination
      ),
      payload.redaction.mode
    );
    const body = maybeCompressReplayHistoryExportBody(
      req,
      toReplayHistoryCsv(payload.entries),
      headers
    );
    return new Response(body, {
      status: 200,
      headers,
    });
  }

  const responseHeaders = withReplayHistoryRedactionHeaders(
    withReplayHistoryPaginationHeaders(
      new Headers({
        'Cache-Control': 'no-store',
      }),
      payload.pagination
    ),
    payload.redaction.mode
  );

  return NextResponse.json(
    {
      ...payload,
      signature,
    },
    {
      headers: Object.fromEntries(responseHeaders.entries()),
    }
  );
}
