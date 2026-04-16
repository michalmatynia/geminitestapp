import { type NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import { portablePathTrendSnapshotsQuerySchema } from '@/shared/contracts/ai-paths-portable-engine';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import { getPortablePathRunExecutionSnapshot } from '@/shared/lib/ai-paths/portable-engine/portable-engine-observability';
import {
  loadPortablePathAuditSinkAutoRemediationDeadLetters,
  loadPortablePathSigningPolicyTrendSnapshots,
  loadPortablePathAuditSinkStartupHealthState,
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
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const DEFAULT_TREND_SNAPSHOT_LIMIT = 50;
const MAX_TREND_SNAPSHOT_LIMIT = 500;
const DEFAULT_AUTO_REMEDIATION_THRESHOLD = 3;
const DEFAULT_AUTO_REMEDIATION_COOLDOWN_SECONDS = 300;
const DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS = 3600;
const DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS = 3;
const DEFAULT_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS = 8000;
const DEFAULT_AUTO_REMEDIATION_DEAD_LETTER_MAX_ENTRIES = 200;
const DEAD_LETTER_ERROR_BREAKDOWN_LIMIT = 5;
const RUN_EXECUTION_RECENT_FAILURE_LIMIT = 10;

export const querySchema = portablePathTrendSnapshotsQuerySchema;

const resolveTrendSnapshotsQueryInput = (
  req: Request,
  ctx: ApiHandlerContext
): Record<string, unknown> => ({
  ...Object.fromEntries(new URL(req.url).searchParams.entries()),
  ...((ctx.query ?? {}) as Record<string, unknown>),
});
const DEAD_LETTER_REPLAY_POLICY_SKIP_REASONS = new Set<string>([
  'dead_letter_endpoint_missing',
  'dead_letter_endpoint_invalid',
  'dead_letter_endpoint_disallowed',
  'dead_letter_outside_replay_window',
]);
const _TREND_SNAPSHOT_TRIGGERS = ['manual', 'threshold'] as const;
const TREND_SNAPSHOT_CURSOR_VERSION = 1 as const;

type TrendSnapshotTriggerFilter = (typeof _TREND_SNAPSHOT_TRIGGERS)[number];
type TrendSnapshotCursorPayload = {
  version: typeof TREND_SNAPSHOT_CURSOR_VERSION;
  beforeAt: string;
  trigger: TrendSnapshotTriggerFilter | null;
  from: string | null;
  to: string | null;
};

type PortablePathTrendSnapshot = Awaited<
  ReturnType<typeof loadPortablePathSigningPolicyTrendSnapshots>
>[number];

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
      payload.trigger === 'manual' || payload.trigger === 'threshold' ? payload.trigger : null;
    const cursorFrom =
      typeof payload.from === 'string' && payload.from.trim().length > 0 ? payload.from : null;
    const cursorTo =
      typeof payload.to === 'string' && payload.to.trim().length > 0 ? payload.to : null;
    const requestFrom = filters.from?.toISOString() ?? null;
    const requestTo = filters.to?.toISOString() ?? null;
    if (cursorTrigger !== filters.trigger || cursorFrom !== requestFrom || cursorTo !== requestTo) {
      throw new Error('cursor_filter_mismatch');
    }
    return {
      version: TREND_SNAPSHOT_CURSOR_VERSION,
      beforeAt: beforeAt.toISOString(),
      trigger: cursorTrigger,
      from: cursorFrom,
      to: cursorTo,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    throw badRequestError('Trend snapshot cursor is invalid.');
  }
};

const encodeTrendSnapshotCursor = (payload: TrendSnapshotCursorPayload): string =>
  Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');

const toTopDeadLetterErrorBreakdown = (
  counts: Record<string, number>,
  limit = DEAD_LETTER_ERROR_BREAKDOWN_LIMIT
): Array<{ reason: string; count: number }> =>
  Object.entries(counts)
    .sort((left, right) => {
      if (right[1] !== left[1]) return right[1] - left[1];
      return left[0].localeCompare(right[0]);
    })
    .slice(0, limit)
    .map(([reason, count]) => ({ reason, count }));

const createEmptyRunExecutionCounts = (): {
  attempts: number;
  successes: number;
  failures: number;
} => ({
  attempts: 0,
  successes: 0,
  failures: 0,
});

const computeRunExecutionRate = (part: number, whole: number): number => {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.max(0, Math.min(100, (part / whole) * 100));
};

const buildRunExecutionSummary = (): {
  source: 'in_memory' | 'unavailable';
  totals: {
    attempts: number;
    successes: number;
    failures: number;
    successRate: number;
    failureRate: number;
  };
  byRunner: {
    client: { attempts: number; successes: number; failures: number };
    server: { attempts: number; successes: number; failures: number };
  };
  bySurface: {
    canvas: { attempts: number; successes: number; failures: number };
    product: { attempts: number; successes: number; failures: number };
    api: { attempts: number; successes: number; failures: number };
  };
  byInputSource: {
    portable_package: { attempts: number; successes: number; failures: number };
    portable_envelope: { attempts: number; successes: number; failures: number };
    semantic_canvas: { attempts: number; successes: number; failures: number };
    path_config: { attempts: number; successes: number; failures: number };
  };
  failureStageCounts: {
    resolve: number;
    validation: number;
    runtime: number;
  };
  topFailureErrors: Array<{ reason: string; count: number }>;
  recentFailures: Array<{
    at: string;
    runner: 'client' | 'server';
    surface: 'canvas' | 'product' | 'api';
    source: 'portable_package' | 'portable_envelope' | 'semantic_canvas' | 'path_config' | null;
    stage: 'resolve' | 'validation' | 'runtime';
    error: string;
    durationMs: number;
    validateBeforeRun: boolean;
    validationMode: string | null;
  }>;
} => {
  const emptySummary = {
    source: 'unavailable' as const,
    totals: {
      attempts: 0,
      successes: 0,
      failures: 0,
      successRate: 0,
      failureRate: 0,
    },
    byRunner: {
      client: createEmptyRunExecutionCounts(),
      server: createEmptyRunExecutionCounts(),
    },
    bySurface: {
      canvas: createEmptyRunExecutionCounts(),
      product: createEmptyRunExecutionCounts(),
      api: createEmptyRunExecutionCounts(),
    },
    byInputSource: {
      portable_package: createEmptyRunExecutionCounts(),
      portable_envelope: createEmptyRunExecutionCounts(),
      semantic_canvas: createEmptyRunExecutionCounts(),
      path_config: createEmptyRunExecutionCounts(),
    },
    failureStageCounts: {
      resolve: 0,
      validation: 0,
      runtime: 0,
    },
    topFailureErrors: [],
    recentFailures: [],
  };

  try {
    const snapshot = getPortablePathRunExecutionSnapshot();
    const failureEvents = snapshot.recentEvents.filter((event) => event.outcome === 'failure');
    const recentFailures = failureEvents
      .slice(-RUN_EXECUTION_RECENT_FAILURE_LIMIT)
      .reverse()
      .map((event) => ({
        at: event.at,
        runner: event.runner,
        surface: event.surface,
        source: event.source,
        stage: (event.failureStage ?? 'runtime') as 'resolve' | 'validation' | 'runtime',
        error:
          typeof event.error === 'string' && event.error.trim().length > 0
            ? event.error
            : 'Unknown portable engine runtime failure.',
        durationMs: event.durationMs,
        validateBeforeRun: event.validateBeforeRun,
        validationMode: event.validationMode,
      }));
    const failureErrorCounts: Record<string, number> = {};
    for (const event of failureEvents) {
      const errorMessage =
        typeof event.error === 'string' && event.error.trim().length > 0
          ? event.error
          : 'Unknown portable engine runtime failure.';
      failureErrorCounts[errorMessage] = (failureErrorCounts[errorMessage] ?? 0) + 1;
    }
    const attempts = snapshot.totals.attempts;
    const successes = snapshot.totals.successes;
    const failures = snapshot.totals.failures;
    return {
      source: 'in_memory',
      totals: {
        attempts,
        successes,
        failures,
        successRate: computeRunExecutionRate(successes, attempts),
        failureRate: computeRunExecutionRate(failures, attempts),
      },
      byRunner: snapshot.byRunner,
      bySurface: snapshot.bySurface,
      byInputSource: snapshot.bySource,
      failureStageCounts: snapshot.failureStageCounts,
      topFailureErrors: toTopDeadLetterErrorBreakdown(failureErrorCounts),
      recentFailures,
    };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return emptySummary;
  }
};

export async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const query = querySchema.parse(resolveTrendSnapshotsQueryInput(req, _ctx));
  const limit = parseTrendSnapshotLimit(query.limit ?? null);
  const trigger = parseTrendSnapshotTrigger(query.trigger ?? null);
  const from = parseTrendSnapshotTimestamp('from', query.from ?? null);
  const to = parseTrendSnapshotTimestamp('to', query.to ?? null);
  if (from && to && from.getTime() > to.getTime()) {
    throw badRequestError('Trend snapshot "from" timestamp must be earlier than or equal to "to".');
  }
  const cursor = parseTrendSnapshotCursor(query.cursor ?? null, {
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

  const [snapshotsRaw, autoRemediationState, deadLettersRaw] = await Promise.all([
    loadPortablePathSigningPolicyTrendSnapshots({ maxSnapshots: loadLimit }),
    loadPortablePathAuditSinkStartupHealthState(),
    loadPortablePathAuditSinkAutoRemediationDeadLetters({
      maxEntries: deadLetterMaxEntries,
    }),
  ]);
  const snapshots = snapshotsRaw;
  const deadLetters = deadLettersRaw;

  const fromTime = from?.getTime() ?? null;
  const toTime = to?.getTime() ?? null;
  const filteredSnapshots = snapshots.filter((snapshot: PortablePathTrendSnapshot) => {
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
      : filteredSnapshots.filter((snapshot: PortablePathTrendSnapshot) => {
        const snapshotTime = Date.parse(snapshot.at);
        if (Number.isNaN(snapshotTime)) return false;
        return snapshotTime < cursorBeforeTime;
      });
  const pageSnapshots = cursorFilteredSnapshots.slice(-limit);
  const snapshotCount = pageSnapshots.length;
  const hasMore = cursorFilteredSnapshots.length > pageSnapshots.length;
  const driftAlertsTotal = pageSnapshots.reduce(
    (sum: number, snapshot: PortablePathTrendSnapshot) =>
      sum + (Array.isArray(snapshot.driftAlerts) ? snapshot.driftAlerts.length : 0),
    0
  );
  const sinkWritesFailedTotal = pageSnapshots.reduce(
    (sum: number, snapshot: PortablePathTrendSnapshot) => {
    const sinkTotals = snapshot.sinkTotals as { writesFailed?: number };
    return sum + (sinkTotals?.writesFailed ?? 0);
    },
    0
  );
  const lastSnapshot = snapshotCount > 0 ? pageSnapshots[snapshotCount - 1] : null;
  const latestSnapshotAt = lastSnapshot ? lastSnapshot.at : null;
  const firstSnapshot = snapshotCount > 0 ? pageSnapshots[0] : null;
  const nextCursor =
    hasMore && firstSnapshot
      ? encodeTrendSnapshotCursor({
        version: TREND_SNAPSHOT_CURSOR_VERSION,
        beforeAt: firstSnapshot.at,
        trigger,
        from: from?.toISOString() ?? null,
        to: to?.toISOString() ?? null,
      })
      : null;
  const notificationDeadLetterCount = deadLetters.length;
  const lastDeadLetter =
    notificationDeadLetterCount > 0 ? deadLetters[notificationDeadLetterCount - 1] : null;
  const latestNotificationDeadLetterAt = lastDeadLetter?.queuedAt ?? null;
  const deadLetterErrorCounts: Record<string, number> = {};
  const deadLetterReplayPolicySkipCounts: Record<string, number> = {};
  for (const entry of deadLetters) {
    const reason =
      typeof entry.error === 'string' && entry.error.trim().length > 0 ? entry.error : 'unknown';
    deadLetterErrorCounts[reason] = (deadLetterErrorCounts[reason] ?? 0) + 1;
    if (DEAD_LETTER_REPLAY_POLICY_SKIP_REASONS.has(reason)) {
      deadLetterReplayPolicySkipCounts[reason] =
        (deadLetterReplayPolicySkipCounts[reason] ?? 0) + 1;
    }
  }
  const deadLetterTopErrors = toTopDeadLetterErrorBreakdown(deadLetterErrorCounts);
  const deadLetterReplayPolicySkipReasons = toTopDeadLetterErrorBreakdown(
    deadLetterReplayPolicySkipCounts
  );
  const deadLetterReplayPolicySkipsTotal = Object.values(deadLetterReplayPolicySkipCounts).reduce(
    (sum, value) => sum + value,
    0
  );
  const runExecution = buildRunExecutionSummary();

  const notifications = {
    enabled:
      resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment() ?? true,
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
      topErrors: deadLetterTopErrors,
      replayPolicySkipsTotal: deadLetterReplayPolicySkipsTotal,
      replayPolicySkipReasons: deadLetterReplayPolicySkipReasons,
    },
  };

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
      notificationDeadLetterTopErrors: deadLetterTopErrors,
    },
    autoRemediation: {
      enabled: resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment() ?? true,
      strategy:
        resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment() ?? 'unregister_all',
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
      notifications,
      state: autoRemediationState,
    },
    runExecution,
    snapshots: pageSnapshots,
  });
}
