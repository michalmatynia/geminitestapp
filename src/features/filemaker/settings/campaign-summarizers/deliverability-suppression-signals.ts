import type {
  FilemakerEmailCampaignSuppressionReason,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import type { FilemakerEmailCampaignSuppressionReasonSummary } from '../../types/campaigns';
import { roundPercentage } from './utils';

const SUPPRESSION_REASONS: FilemakerEmailCampaignSuppressionReason[] = [
  'complaint',
  'bounced',
  'cold',
  'unsubscribed',
  'manual_block',
];

const createEmptySummary = (
  reason: FilemakerEmailCampaignSuppressionReason
): FilemakerEmailCampaignSuppressionReasonSummary => ({
  reason,
  count: 0,
  ratePercent: 0,
  latestSuppressedAt: null,
});

const resolveLatestTimestamp = (
  current: string | null,
  next: string | null | undefined
): string | null => {
  if (next === null || next === undefined || next.trim().length === 0) return current;
  if (Number.isNaN(Date.parse(next))) return current;
  if (current === null || Date.parse(next) > Date.parse(current)) return next;
  return current;
};

export const summarizeFilemakerEmailCampaignSuppressionSignals = ({
  knownAddressCount,
  suppressionRegistry,
}: {
  knownAddressCount: number;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
}): FilemakerEmailCampaignSuppressionReasonSummary[] => {
  const summaryByReason = new Map(
    SUPPRESSION_REASONS.map((reason) => [reason, createEmptySummary(reason)] as const)
  );

  for (const entry of suppressionRegistry.entries) {
    const summary = summaryByReason.get(entry.reason) ?? createEmptySummary(entry.reason);
    summary.count += 1;
    summary.latestSuppressedAt = resolveLatestTimestamp(
      summary.latestSuppressedAt,
      entry.updatedAt ?? entry.createdAt ?? null
    );
    summaryByReason.set(entry.reason, summary);
  }

  return SUPPRESSION_REASONS.map((reason) => {
    const summary = summaryByReason.get(reason) ?? createEmptySummary(reason);
    return {
      ...summary,
      ratePercent: roundPercentage(summary.count, knownAddressCount),
    };
  }).filter((summary) => summary.count > 0);
};
