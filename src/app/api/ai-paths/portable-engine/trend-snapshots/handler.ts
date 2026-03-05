import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';
import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import {
  loadPortablePathAuditSinkAutoRemediationDeadLetters,
  loadPortablePathAuditSinkStartupHealthState,
  loadPortablePathSigningPolicyTrendSnapshots,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';

const DEFAULT_TREND_SNAPSHOT_LIMIT = 50;
const MAX_TREND_SNAPSHOT_LIMIT = 500;
const DEFAULT_AUTO_REMEDIATION_THRESHOLD = 3;
const DEFAULT_AUTO_REMEDIATION_COOLDOWN_SECONDS = 300;
const DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS = 3600;
const DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS = 3;
const DEFAULT_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS = 8000;
const DEFAULT_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES = 200;
const TREND_SNAPSHOT_TRIGGERS = ['manual', 'threshold'] as const;
const TREND_SNAPSHOT_CURSOR_VERSION = 1 as const;

type TrendSnapshotTriggerFilter = (typeof TREND_SNAPSHOT_TRIGGERS)[number];
type TrendSnapshotCursorPayload = {
  version: typeof TREND_SNAPSHOT_CURSOR_VERSION;
  beforeAt: string;
  trigger: TrendSnapshotTriggerFilter | null;
  from: string | null;
  to: string | null;
};

const parseTrendSnapshotLimit = (value: string | null): number => {
  if (!value) return DEFAULT_TREND_SNAPSHOT_LIMIT;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    throw badRequestError('Invalid trend snapshot limit.');
  }
  const normalized = Math.floor(numeric);
  if (normalized <= 0 || normalized > MAX_TREND_SNAPSHOT_LIMIT) {
    throw badRequestError(
      `Trend snapshot limit must be between 1 and ${MAX_TREND_SNAPSHOT_LIMIT}.`
    );
  }
  return normalized;
};

const parseTrendSnapshotTrigger = (value: string | null): TrendSnapshotTriggerFilter | null => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'manual' || normalized === 'threshold') return normalized;
  throw badRequestError('Trend snapshot trigger must be one of: manual, threshold.');
};

const parseTrendSnapshotTimestamp = (label: 'from' | 'to', value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw badRequestError(`Trend snapshot "${label}" timestamp is invalid.`);
  }
  return parsed;
};

const parseTrendSnapshotCursor = (
  value: string | null,
  filters: {
    trigger: TrendSnapshotTriggerFilter | null;
    from: Date | null;
    to: Date | null;
  }
): TrendSnapshotCursorPayload | null => {
  if (!value) return null;
  try {
    const decoded = Buffer.from(value, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('invalid_shape');
    }
    const payload = parsed as Partial<TrendSnapshotCursorPayload>;
    if (payload.version !== TREND_SNAPSHOT_CURSOR_VERSION) {
      throw new Error('invalid_version');
    }
    if (typeof payload.beforeAt !== 'string' || payload.beforeAt.trim().length === 0) {
      throw new Error('invalid_before_at');
    }
    const beforeAt = new Date(payload.beforeAt);
    if (Number.isNaN(beforeAt.getTime())) {
      throw new Error('invalid_before_at');
    }
    const cursorTrigger =
      payload.trigger === 'manual' || payload.trigger === 'threshold'
        ? payload.trigger
        : null;
    const cursorFrom =
      typeof payload.from === 'string' && payload.from.trim().length > 0
        ? payload.from
        : null;
    const cursorTo =
      typeof payload.to === 'string' && payload.to.trim().length > 0
        ? payload.to
        : null;
    const requestFrom = filters.from?.toISOString() ?? null;
    const requestTo = filters.to?.toISOString() ?? null;
    if (
      cursorTrigger !== filters.trigger ||
      cursorFrom !== requestFrom ||
      cursorTo !== requestTo
    ) {
      throw new Error('cursor_filter_mismatch');
    }
    return {
      version: TREND_SNAPSHOT_CURSOR_VERSION,
      beforeAt: beforeAt.toISOString(),
      trigger: cursorTrigger,
      from: cursorFrom,
      to: cursorTo,
    };
  } catch {
    throw badRequestError('Trend snapshot cursor is invalid.');
  }
};

const encodeTrendSnapshotCursor = (payload: TrendSnapshotCursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const searchParams = getQueryParams(req);
  const limit = parseTrendSnapshotLimit(searchParams.get('limit'));
  const trigger = parseTrendSnapshotTrigger(searchParams.get('trigger'));
  const from = parseTrendSnapshotTimestamp('from', searchParams.get('from'));
  const to = parseTrendSnapshotTimestamp('to', searchParams.get('to'));
  if (from && to && from.getTime() > to.getTime()) {
    throw badRequestError('Trend snapshot "from" timestamp must be earlier than or equal to "to".');
  }
  const cursor = parseTrendSnapshotCursor(searchParams.get('cursor'), {
    trigger,
    from,
    to,
  });
  const hasFilters = Boolean(trigger || from || to);
  const hasCursor = cursor !== null;
  const loadLimit = hasFilters || hasCursor ? MAX_TREND_SNAPSHOT_LIMIT : limit;
  const deadLetterMaxEntries =
    resolvePortablePathAuditSinkAutoRemediationDeadLetterMaxEntriesFromEnvironment() ??
    DEFAULT_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES;

  const [snapshots, autoRemediationState, deadLetters] = await Promise.all([
    loadPortablePathSigningPolicyTrendSnapshots({ maxSnapshots: loadLimit }),
    loadPortablePathAuditSinkStartupHealthState(),
    loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: deadLetterMaxEntries,
    }),
  ]);
  const fromTime = from?.getTime() ?? null;
  const toTime = to?.getTime() ?? null;
  const filteredSnapshots = snapshots.filter((snapshot) => {
    if (trigger && snapshot.trigger !== trigger) return false;
    if (fromTime === null && toTime === null) return true;
    const snapshotTime = Date.parse(snapshot.at);
    if (Number.isNaN(snapshotTime)) return false;
    if (fromTime !== null && snapshotTime < fromTime) return false;
    if (toTime !== null && snapshotTime > toTime) return false;
    return true;
  });
  const cursorBeforeTime = cursor ? Date.parse(cursor.beforeAt) : null;
  const cursorFilteredSnapshots =
    cursorBeforeTime === null
      ? filteredSnapshots
      : filteredSnapshots.filter((snapshot) => {
          const snapshotTime = Date.parse(snapshot.at);
          if (Number.isNaN(snapshotTime)) return false;
          return snapshotTime < cursorBeforeTime;
        });
  const pageSnapshots = cursorFilteredSnapshots.slice(-limit);
  const snapshotCount = pageSnapshots.length;
  const hasMore = cursorFilteredSnapshots.length > pageSnapshots.length;
  const driftAlertsTotal = pageSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.driftAlerts.length,
    0
  );
  const sinkWritesFailedTotal = pageSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.sinkTotals.writesFailed,
    0
  );
  const latestSnapshotAt =
    snapshotCount > 0 ? pageSnapshots[snapshotCount - 1]!.at : null;
  const nextCursor =
    hasMore && snapshotCount > 0
      ? encodeTrendSnapshotCursor({
          version: TREND_SNAPSHOT_CURSOR_VERSION,
          beforeAt: pageSnapshots[0]!.at,
          trigger,
          from: from?.toISOString() ?? null,
          to: to?.toISOString() ?? null,
        })
      : null;
  const notificationDeadLetterCount = deadLetters.length;
  const latestNotificationDeadLetterAt =
    notificationDeadLetterCount > 0
      ? deadLetters[notificationDeadLetterCount - 1]!.queuedAt
      : null;

  return NextResponse.json({
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'portable_signing_policy_trend_snapshots',
    limit,
    matchedSnapshotCount: filteredSnapshots.length,
    snapshotCount,
    pagination: {
      hasMore,
      nextCursor,
      cursor,
    },
    filters: {
      trigger,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    summary: {
      latestSnapshotAt,
      driftAlertsTotal,
      sinkWritesFailedTotal,
      notificationDeadLetterCount,
      latestNotificationDeadLetterAt,
    },
    autoRemediation: {
      enabled:
        resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment() ??
        true,
      strategy:
        resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment() ??
        'unregister_all',
      threshold:
        resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment() ??
        DEFAULT_AUTO_REMEDIATION_THRESHOLD,
      cooldownSeconds:
        resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment() ??
        DEFAULT_AUTO_REMEDIATION_COOLDOWN_SECONDS,
      rateLimitWindowSeconds:
        resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment() ??
        DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS,
      rateLimitMaxActions:
        resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment() ??
        DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS,
      notifications: {
        enabled:
          resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment() ??
          true,
        webhookConfigured:
          resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment() !== null,
        webhookSigningConfigured:
          resolvePortablePathAuditSinkAutoRemediationWebhookSecretFromEnvironment() !== null,
        webhookSignatureKeyId:
          resolvePortablePathAuditSinkAutoRemediationWebhookSignatureKeyIdFromEnvironment(),
        emailWebhookConfigured:
          resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment() !== null,
        emailWebhookSigningConfigured:
          resolvePortablePathAuditSinkAutoRemediationEmailWebhookSecretFromEnvironment() !== null,
        emailWebhookSignatureKeyId:
          resolvePortablePathAuditSinkAutoRemediationEmailWebhookSignatureKeyIdFromEnvironment(),
        emailRecipients:
          resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment() ?? [],
        timeoutMs:
          resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment() ??
          DEFAULT_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS,
        deadLetter: {
          maxEntries: deadLetterMaxEntries,
          queuedCount: notificationDeadLetterCount,
          latestQueuedAt: latestNotificationDeadLetterAt,
        },
      },
      state: autoRemediationState,
    },
    snapshots: pageSnapshots,
  });
}
