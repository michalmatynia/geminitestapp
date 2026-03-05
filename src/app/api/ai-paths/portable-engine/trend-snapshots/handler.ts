import { NextRequest, NextResponse } from 'next/server';

import { requireAiPathsAccess } from '@/features/ai/ai-paths/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getQueryParams } from '@/shared/lib/api/api-handler';
import { AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION } from '@/shared/lib/ai-paths/portable-engine';
import {
  loadPortablePathAuditSinkStartupHealthState,
  loadPortablePathSigningPolicyTrendSnapshots,
  resolvePortablePathAuditSinkAutoRemediationCooldownSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationNotificationsEnabledFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitMaxActionsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationRateLimitWindowSecondsFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationStrategyFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationThresholdFromEnvironment,
  resolvePortablePathAuditSinkAutoRemediationWebhookUrlFromEnvironment,
} from '@/shared/lib/ai-paths/portable-engine/server';

const DEFAULT_TREND_SNAPSHOT_LIMIT = 50;
const MAX_TREND_SNAPSHOT_LIMIT = 500;
const DEFAULT_AUTO_REMEDIATION_THRESHOLD = 3;
const DEFAULT_AUTO_REMEDIATION_COOLDOWN_SECONDS = 300;
const DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_WINDOW_SECONDS = 3600;
const DEFAULT_AUTO_REMEDIATION_RATE_LIMIT_MAX_ACTIONS = 3;
const DEFAULT_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS = 8000;
const TREND_SNAPSHOT_TRIGGERS = ['manual', 'threshold'] as const;

type TrendSnapshotTriggerFilter = (typeof TREND_SNAPSHOT_TRIGGERS)[number];

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
  const hasFilters = Boolean(trigger || from || to);
  const loadLimit = hasFilters ? MAX_TREND_SNAPSHOT_LIMIT : limit;

  const [snapshots, autoRemediationState] = await Promise.all([
    loadPortablePathSigningPolicyTrendSnapshots({ maxSnapshots: loadLimit }),
    loadPortablePathAuditSinkStartupHealthState(),
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
  const truncatedSnapshots = filteredSnapshots.slice(-limit);
  const snapshotCount = truncatedSnapshots.length;
  const driftAlertsTotal = truncatedSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.driftAlerts.length,
    0
  );
  const sinkWritesFailedTotal = truncatedSnapshots.reduce(
    (sum, snapshot) => sum + snapshot.sinkTotals.writesFailed,
    0
  );
  const latestSnapshotAt =
    snapshotCount > 0 ? truncatedSnapshots[snapshotCount - 1]!.at : null;

  return NextResponse.json({
    specVersion: AI_PATH_PORTABLE_PACKAGE_SPEC_VERSION,
    kind: 'portable_signing_policy_trend_snapshots',
    limit,
    matchedSnapshotCount: filteredSnapshots.length,
    snapshotCount,
    filters: {
      trigger,
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    summary: {
      latestSnapshotAt,
      driftAlertsTotal,
      sinkWritesFailedTotal,
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
        emailWebhookConfigured:
          resolvePortablePathAuditSinkAutoRemediationEmailWebhookUrlFromEnvironment() !== null,
        emailRecipients:
          resolvePortablePathAuditSinkAutoRemediationEmailRecipientsFromEnvironment() ?? [],
        timeoutMs:
          resolvePortablePathAuditSinkAutoRemediationNotificationTimeoutMsFromEnvironment() ??
          DEFAULT_AUTO_REMEDIATION_NOTIFICATION_TIMEOUT_MS,
      },
      state: autoRemediationState,
    },
    snapshots: truncatedSnapshots,
  });
}
