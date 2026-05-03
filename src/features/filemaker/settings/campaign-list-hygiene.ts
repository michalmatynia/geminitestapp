import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';
import type { FilemakerEmailCampaignAudienceRecipient } from '../types/campaigns';
import {
  buildDuplicateIssues,
  buildRecipientIssues,
  type RecentDeliveryIndexes,
} from './campaign-list-hygiene-issues';

export type CampaignListHygieneSeverity = 'error' | 'warning' | 'info';

export type CampaignListHygieneIssueCode =
  | 'duplicate_address'
  | 'role_address'
  | 'syntax_invalid'
  | 'currently_suppressed'
  | 'recently_bounced'
  | 'recently_failed';

export interface CampaignListHygieneIssue {
  code: CampaignListHygieneIssueCode;
  severity: CampaignListHygieneSeverity;
  emailAddress: string;
  message: string;
  recipientIndex?: number | undefined;
  recipientId?: string | undefined;
}

export interface CampaignListHygieneSummary {
  totalRecipients: number;
  uniqueAddresses: number;
  issues: CampaignListHygieneIssue[];
  byCode: Record<CampaignListHygieneIssueCode, number>;
  bySeverity: Record<CampaignListHygieneSeverity, number>;
  affectedAddresses: string[];
}

const DEFAULT_RECENT_BOUNCE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const DEFAULT_RECENT_FAILURE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const normalizeAddress = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const buildEmptyByCode = (): Record<CampaignListHygieneIssueCode, number> => ({
  duplicate_address: 0,
  role_address: 0,
  syntax_invalid: 0,
  currently_suppressed: 0,
  recently_bounced: 0,
  recently_failed: 0,
});

const buildEmptyBySeverity = (): Record<CampaignListHygieneSeverity, number> => ({
  error: 0,
  warning: 0,
  info: 0,
});

interface RunListHygieneCheckInput {
  recipients: FilemakerEmailCampaignAudienceRecipient[];
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  nowMs?: number;
  recentBounceWindowMs?: number;
  recentFailureWindowMs?: number;
}

const buildSuppressionReasonByAddress = (
  registry: FilemakerEmailCampaignSuppressionRegistry
): Map<string, string> => {
  const suppressionByAddress = new Map<string, string>();
  registry.entries.forEach((entry) => {
    const key = normalizeAddress(entry.emailAddress);
    if (key.length > 0) suppressionByAddress.set(key, entry.reason);
  });
  return suppressionByAddress;
};

const getDeliveryActivityAt = (delivery: FilemakerEmailCampaignDelivery): number | null => {
  const parsed = Date.parse(delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? '');
  return Number.isFinite(parsed) ? parsed : null;
};

const isNewerDelivery = (
  existing: FilemakerEmailCampaignDelivery | undefined,
  nextActivityAt: number
): boolean => {
  if (existing === undefined) return true;
  const existingActivityAt = Date.parse(existing.sentAt ?? existing.updatedAt ?? existing.createdAt ?? '0');
  return existingActivityAt < nextActivityAt;
};

const maybeIndexRecentBounce = (input: {
  activityAt: number;
  delivery: FilemakerEmailCampaignDelivery;
  key: string;
  nowMs: number;
  recentBouncesByAddress: Map<string, FilemakerEmailCampaignDelivery>;
  windowMs: number;
}): void => {
  if (input.delivery.status !== 'bounced') return;
  if (input.nowMs - input.activityAt > input.windowMs) return;
  if (isNewerDelivery(input.recentBouncesByAddress.get(input.key), input.activityAt)) {
    input.recentBouncesByAddress.set(input.key, input.delivery);
  }
};

const maybeIndexRecentFailure = (input: {
  activityAt: number;
  delivery: FilemakerEmailCampaignDelivery;
  key: string;
  nowMs: number;
  recentFailuresByAddress: Map<string, FilemakerEmailCampaignDelivery>;
  windowMs: number;
}): void => {
  if (input.delivery.status !== 'failed') return;
  if (input.nowMs - input.activityAt > input.windowMs) return;
  if (isNewerDelivery(input.recentFailuresByAddress.get(input.key), input.activityAt)) {
    input.recentFailuresByAddress.set(input.key, input.delivery);
  }
};

const indexRecentDeliveries = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  nowMs: number;
  bounceWindowMs: number;
  failureWindowMs: number;
}): RecentDeliveryIndexes => {
  const recentBouncesByAddress = new Map<string, FilemakerEmailCampaignDelivery>();
  const recentFailuresByAddress = new Map<string, FilemakerEmailCampaignDelivery>();
  input.deliveries.forEach((delivery) => {
    const key = normalizeAddress(delivery.emailAddress);
    const activityAt = getDeliveryActivityAt(delivery);
    if (key.length === 0 || activityAt === null) return;
    maybeIndexRecentBounce({
      activityAt,
      delivery,
      key,
      nowMs: input.nowMs,
      recentBouncesByAddress,
      windowMs: input.bounceWindowMs,
    });
    maybeIndexRecentFailure({
      activityAt,
      delivery,
      key,
      nowMs: input.nowMs,
      recentFailuresByAddress,
      windowMs: input.failureWindowMs,
    });
  });
  return { recentBouncesByAddress, recentFailuresByAddress };
};

export const runListHygieneCheck = (
  input: RunListHygieneCheckInput
): CampaignListHygieneSummary => {
  const nowMs = input.nowMs ?? Date.now();
  const bounceWindowMs = input.recentBounceWindowMs ?? DEFAULT_RECENT_BOUNCE_WINDOW_MS;
  const failureWindowMs = input.recentFailureWindowMs ?? DEFAULT_RECENT_FAILURE_WINDOW_MS;

  const issues: CampaignListHygieneIssue[] = [];
  const seenCounts = new Map<string, number>();
  const suppressionByAddress = buildSuppressionReasonByAddress(input.suppressionRegistry);
  const recentDeliveries = indexRecentDeliveries({
    deliveries: input.deliveryRegistry.deliveries,
    nowMs,
    bounceWindowMs,
    failureWindowMs,
  });

  input.recipients.forEach((recipient, index) => {
    const address = normalizeAddress(recipient.email);
    seenCounts.set(address, (seenCounts.get(address) ?? 0) + 1);
    issues.push(
      ...buildRecipientIssues({
        address,
        index,
        recipient,
        recentDeliveries,
        suppressionByAddress,
      })
    );
  });

  issues.push(...buildDuplicateIssues(seenCounts));

  const byCode = buildEmptyByCode();
  const bySeverity = buildEmptyBySeverity();
  const affected = new Set<string>();

  issues.forEach((issue) => {
    byCode[issue.code] += 1;
    bySeverity[issue.severity] += 1;
    if (issue.emailAddress.length > 0) affected.add(normalizeAddress(issue.emailAddress));
  });

  return {
    totalRecipients: input.recipients.length,
    uniqueAddresses: seenCounts.size,
    issues,
    byCode,
    bySeverity,
    affectedAddresses: Array.from(affected),
  };
};

export const isCampaignListHygieneBlocking = (summary: CampaignListHygieneSummary): boolean =>
  summary.bySeverity.error > 0;
