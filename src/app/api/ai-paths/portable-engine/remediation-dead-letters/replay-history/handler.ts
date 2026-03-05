import { createHmac } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';
import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import {
  PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ALERT_TYPE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_BOOTSTRAP_SOURCE,
  PORTABLE_PATH_ENVELOPE_VERIFICATION_AUDIT_SINK_HEALTH_CATEGORY,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';
import { listSystemLogs } from '@/shared/lib/observability/system-logger';

const DEFAULT_HISTORY_LIMIT = 50;
const MAX_HISTORY_LIMIT = 200;
const HISTORY_SCAN_PAGE_SIZE = 200;
const MAX_HISTORY_SCAN_PAGES = 10;

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
  summary: {
    scannedLogCount: number;
    matchedReplayCount: number;
    returnedCount: number;
    hasMore: boolean;
  };
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

const toReplayHistoryRecord = (
  log: Record<string, unknown>,
  includeAttempts: boolean
): ReplayHistoryRecord | null => {
  const context = asRecord(log['context']);
  if (!context) return null;
  if (context['alertType'] !== PORTABLE_PATH_AUDIT_SINK_AUTO_REMEDIATION_DEAD_LETTER_REPLAY_ALERT_TYPE) {
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
      summary: payload.summary,
      signature,
    }),
    ...payload.entries.map((entry) => JSON.stringify({ type: 'entry', ...entry })),
  ];
  return `${lines.join('\n')}\n`;
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const searchParams = getQueryParams(req);
  const limit = parseHistoryLimit(searchParams.get('limit'));
  const from = parseHistoryTimestamp('from', searchParams.get('from'));
  const to = parseHistoryTimestamp('to', searchParams.get('to'));
  if (from && to && from.getTime() > to.getTime()) {
    throw badRequestError(
      'Remediation replay history "from" timestamp must be earlier than or equal to "to".'
    );
  }
  const includeAttempts = parseBooleanQuery(
    'includeAttempts',
    searchParams.get('includeAttempts'),
    false
  );
  const signed = parseBooleanQuery('signed', searchParams.get('signed'), true);
  const format = parseReplayHistoryExportFormat(searchParams.get('format'));

  const entries: ReplayHistoryRecord[] = [];
  let matchedReplayCount = 0;
  let scannedLogCount = 0;
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
      const replayLog = toReplayHistoryRecord(
        (asRecord(log) ?? {}),
        includeAttempts
      );
      if (!replayLog) continue;
      matchedReplayCount += 1;
      if (entries.length < limit) {
        entries.push(replayLog);
      }
    }
    if (page * HISTORY_SCAN_PAGE_SIZE >= result.total || result.logs.length === 0) {
      break;
    }
  }

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
    summary: {
      scannedLogCount,
      matchedReplayCount,
      returnedCount: entries.length,
      hasMore: matchedReplayCount > entries.length,
    },
    entries,
  };

  const exportSecret = resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportSecretFromEnvironment();
  const exportKeyId = resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayExportKeyIdFromEnvironment();
  const signature =
    signed && exportSecret
      ? signReplayHistoryPayload(payload, {
        timestamp: generatedAt,
        secret: exportSecret,
        keyId: exportKeyId,
      })
      : null;

  if (format === 'ndjson') {
    return new NextResponse(toReplayHistoryNdjson(payload, signature), {
      status: 200,
      headers: withSignatureHeaders(
        new Headers({
          'Cache-Control': 'no-store',
          'Content-Type': 'application/x-ndjson; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="portable-remediation-dead-letter-replay-history.ndjson"',
        }),
        signature
      ),
    });
  }

  if (format === 'csv') {
    return new NextResponse(toReplayHistoryCsv(payload.entries), {
      status: 200,
      headers: withSignatureHeaders(
        new Headers({
          'Cache-Control': 'no-store',
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition':
            'attachment; filename="portable-remediation-dead-letter-replay-history.csv"',
        }),
        signature
      ),
    });
  }

  return NextResponse.json(
    {
      ...payload,
      signature,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
