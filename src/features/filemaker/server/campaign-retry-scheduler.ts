import 'server-only';

import {
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  resolveFilemakerEmailCampaignRetryableDeliveries,
} from '../settings';

export type FilemakerEmailCampaignSchedulerDueRetryRun = {
  campaignId: string;
  runId: string;
  retryableDeliveryCount: number;
  nextRetryAt: string | null;
};

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const resolveEarlierRetryAt = (
  current: string | null,
  candidate: string | null
): string | null => {
  const currentMs = parseTimestamp(current);
  const candidateMs = parseTimestamp(candidate);
  if (candidateMs === null) return current;
  if (currentMs === null || candidateMs < currentMs) return candidate;
  return current;
};

export const resolveDueFilemakerEmailCampaignRetryRuns = (input: {
  deliveriesRaw: string | null;
  attemptsRaw: string | null;
  runsRaw: string | null;
  now?: Date;
}): FilemakerEmailCampaignSchedulerDueRetryRun[] => {
  const now = input.now ?? new Date();
  const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(input.deliveriesRaw);
  const attemptRegistry = parseFilemakerEmailCampaignDeliveryAttemptRegistry(input.attemptsRaw);
  const runRegistry = parseFilemakerEmailCampaignRunRegistry(input.runsRaw);
  const queuedLiveRunIds = new Set(
    runRegistry.runs
      .filter((run) => run.mode === 'live' && run.status === 'queued')
      .map((run) => run.id)
  );
  if (queuedLiveRunIds.size === 0) return [];

  const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries({
    deliveries: deliveryRegistry.deliveries,
    attemptRegistry,
    maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
    nowMs: now.getTime(),
  });
  const retryRuns = retrySummary.retryableDeliveries.reduce<
    Map<string, FilemakerEmailCampaignSchedulerDueRetryRun>
  >((map, delivery) => {
    if (!queuedLiveRunIds.has(delivery.runId)) return map;
    const existing = map.get(delivery.runId);
    map.set(delivery.runId, {
      campaignId: delivery.campaignId,
      runId: delivery.runId,
      retryableDeliveryCount: (existing?.retryableDeliveryCount ?? 0) + 1,
      nextRetryAt: resolveEarlierRetryAt(existing?.nextRetryAt ?? null, delivery.nextRetryAt),
    });
    return map;
  }, new Map());

  return Array.from(retryRuns.values()).sort((left, right) => {
    const leftNextRetryAt = parseTimestamp(left.nextRetryAt) ?? 0;
    const rightNextRetryAt = parseTimestamp(right.nextRetryAt) ?? 0;
    return leftNextRetryAt - rightNextRetryAt;
  });
};
