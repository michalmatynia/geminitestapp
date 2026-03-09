import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import {
  loadPortablePathAuditSinkAutoRemediationDeadLetters,
  replayPortablePathAuditSinkAutoRemediationDeadLetters,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';
import type {
  PortablePathAuditSinkAutoRemediationNotificationChannel,
  PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry,
} from '@/shared/lib/ai-paths/portable-engine/server';
import {
  normalizeOptionalQueryString,
  optionalIntegerQuerySchema,
  optionalTrimmedQueryString,
} from '@/shared/lib/api/query-schema';

const DEFAULT_DEAD_LETTER_LIMIT = 50;
const MAX_DEAD_LETTER_LIMIT = 500;
const DEFAULT_DEAD_LETTER_REPLAY_LIMIT = 20;
const MAX_DEAD_LETTER_REPLAY_LIMIT = 200;
const DEFAULT_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES = 200;
const DEFAULT_DEAD_LETTER_REPLAY_WINDOW_SECONDS = 7 * 24 * 60 * 60;

export const querySchema = z.object({
  limit: optionalIntegerQuerySchema(z.number().int().min(1).max(MAX_DEAD_LETTER_LIMIT)),
  channel: z.preprocess(
    (value: unknown) => normalizeOptionalQueryString(value)?.toLowerCase(),
    z.enum(['webhook', 'email']).optional()
  ),
  endpoint: optionalTrimmedQueryString(),
});

const parseDeadLetterLimit = (value: unknown): number => {
  if (value === undefined || value === null) return DEFAULT_DEAD_LETTER_LIMIT;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw badRequestError('Invalid remediation dead-letter limit.');
  }
  const normalized = Math.floor(numeric);
  if (normalized <= 0 || normalized > MAX_DEAD_LETTER_LIMIT) {
    throw badRequestError(
      `Remediation dead-letter limit must be between 1 and ${MAX_DEAD_LETTER_LIMIT}.`
    );
  }
  return normalized;
};

const parseDeadLetterReplayLimit = (value: unknown): number => {
  if (value === undefined || value === null) return DEFAULT_DEAD_LETTER_REPLAY_LIMIT;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw badRequestError('Invalid remediation dead-letter replay limit.');
  }
  const normalized = Math.floor(numeric);
  if (normalized <= 0 || normalized > MAX_DEAD_LETTER_REPLAY_LIMIT) {
    throw badRequestError(
      `Remediation dead-letter replay limit must be between 1 and ${MAX_DEAD_LETTER_REPLAY_LIMIT}.`
    );
  }
  return normalized;
};

const parseDeadLetterChannel = (
  value: unknown
): PortablePathAuditSinkAutoRemediationNotificationChannel | null => {
  const normalized = normalizeOptionalQueryString(value)?.toLowerCase();
  if (!normalized) return null;
  if (normalized === 'webhook' || normalized === 'email') return normalized;
  throw badRequestError('Remediation dead-letter channel must be one of: webhook, email.');
};

const parseDeadLetterEndpoint = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveDeadLetterQueryInput = (
  req: NextRequest,
  ctx: ApiHandlerContext
): Record<string, unknown> => {
  if (ctx.query && Object.keys(ctx.query).length > 0) {
    return ctx.query as Record<string, unknown>;
  }

  return {
    limit: req.nextUrl.searchParams.get('limit'),
    channel: req.nextUrl.searchParams.get('channel'),
    endpoint: req.nextUrl.searchParams.get('endpoint'),
  };
};

type ReplayRequestBody = {
  action?: string;
  dryRun?: boolean;
  limit?: number;
  channel?: string;
  endpoint?: string;
  timeoutMs?: number;
};

const parseReplayRequestBody = (
  value: unknown
): Required<Pick<ReplayRequestBody, 'action' | 'dryRun'>> &
  Pick<ReplayRequestBody, 'timeoutMs'> & {
    limit: number;
    channel: PortablePathAuditSinkAutoRemediationNotificationChannel | null;
    endpoint: string | null;
  } => {
  if (
    value !== undefined &&
    (typeof value !== 'object' || value === null || Array.isArray(value))
  ) {
    throw badRequestError('Remediation dead-letter replay payload must be an object.');
  }
  const payload = (value ?? {}) as ReplayRequestBody;
  const action = String(payload.action ?? 'replay')
    .trim()
    .toLowerCase();
  if (action !== 'replay') {
    throw badRequestError('Unsupported remediation dead-letter action.');
  }
  const dryRun = payload.dryRun ?? true;
  if (typeof dryRun !== 'boolean') {
    throw badRequestError('Remediation dead-letter replay "dryRun" must be boolean.');
  }
  const timeoutMs =
    payload.timeoutMs === undefined || payload.timeoutMs === null
      ? undefined
      : Number(payload.timeoutMs);
  if (timeoutMs !== undefined && !Number.isFinite(timeoutMs)) {
    throw badRequestError('Remediation dead-letter replay "timeoutMs" must be numeric.');
  }
  return {
    action: 'replay',
    dryRun,
    limit: parseDeadLetterReplayLimit(payload.limit),
    channel: parseDeadLetterChannel(payload.channel),
    endpoint: parseDeadLetterEndpoint(payload.endpoint),
    timeoutMs,
  };
};

export async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const query = resolveDeadLetterQueryInput(req, ctx);
  const limit = parseDeadLetterLimit(query['limit']);
  const channel = parseDeadLetterChannel(query['channel']);
  const endpoint = parseDeadLetterEndpoint(query['endpoint']);
  const deadLetterMaxEntries =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment() ??
    DEFAULT_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES;
  const entriesRaw = await loadPortablePathAuditSinkAutoRemediationDeadLetters({
    maxEntries: Math.max(deadLetterMaxEntries, limit),
  });
  const entries = Array.isArray(entriesRaw) ? entriesRaw : [];
  const filtered = entries.filter((entry) => {
    if (channel && entry.channel !== channel) return false;
    if (endpoint && entry.endpoint !== endpoint) return false;
    return true;
  });
  const sliced = filtered.slice(-limit);
  const latestEntry =
    sliced.length > 0
      ? (sliced[
        sliced.length - 1
      ] as PortablePathAuditSinkAutoRemediationNotificationDeadLetterEntry)
      : null;
  const latestQueuedAt = latestEntry ? latestEntry.queuedAt : null;
  const byChannel = {
    webhook: sliced.filter((entry) => entry.channel === 'webhook').length,
    email: sliced.filter((entry) => entry.channel === 'email').length,
  };

  const summary = {
    totalStored: entries.length,
    matchedCount: filtered.length,
    returnedCount: sliced.length,
    latestQueuedAt,
    byChannel,
    maxEntries: deadLetterMaxEntries,
  };

  return NextResponse.json({
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'portable_audit_sink_auto_remediation_dead_letters',
    limit,
    filters: {
      channel,
      endpoint,
    },
    summary,
    entries: sliced,
  });
}

export async function POST_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const body = parseReplayRequestBody(ctx.body);
  const deadLetterMaxEntries =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment() ??
    DEFAULT_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES;
  const replayWindowSeconds =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayWindowSecondsFromEnvironment() ??
    DEFAULT_DEAD_LETTER_REPLAY_WINDOW_SECONDS;
  const replayEndpointAllowlist = Array.from(
    new Set(
      [
        resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment(),
        resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment(),
        ...(resolvePortablePathAuditSinkAutoRemediationDeadLetterReplayEndpointAllowlistFromEnvironment() ??
          []),
      ].filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0)
    )
  );
  const result = await replayPortablePathAuditSinkAutoRemediationDeadLetters({
    dryRun: body.dryRun,
    limit: body.limit,
    channel: body.channel ?? undefined,
    endpoint: body.endpoint,
    replayWindowSeconds,
    endpointAllowlist: replayEndpointAllowlist,
    timeoutMs: body.timeoutMs,
    maxEntries: deadLetterMaxEntries,
    webhookSecret: resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment(),
    webhookSignatureKeyId:
      resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment(),
    emailWebhookSecret:
      resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment(),
    emailWebhookSignatureKeyId:
      resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment(),
  });

  return NextResponse.json({
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'portable_audit_sink_auto_remediation_dead_letter_replay',
    request: {
      action: body.action,
      dryRun: body.dryRun,
      limit: body.limit,
      channel: body.channel,
      endpoint: body.endpoint,
      timeoutMs: body.timeoutMs ?? null,
      maxEntries: deadLetterMaxEntries,
      replayWindowSeconds,
      endpointAllowlistCount: replayEndpointAllowlist.length,
    },
    result,
  });
}
