import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunStatus,
} from '../../types';
import {
  type FilemakerEmailCampaignRunMetrics,
} from '../../types/campaigns';
import {
  createFilemakerEmailCampaignRun,
} from '../campaign-factories';

export const summarizeFilemakerEmailCampaignRunDeliveries = (
  deliveries: FilemakerEmailCampaignDelivery[]
): FilemakerEmailCampaignRunMetrics => ({
  recipientCount: deliveries.length,
  deliveredCount: deliveries.filter((delivery) => delivery.status === 'sent').length,
  failedCount: deliveries.filter(
    (delivery) => delivery.status === 'failed' || delivery.status === 'bounced'
  ).length,
  skippedCount: deliveries.filter((delivery) => delivery.status === 'skipped').length,
});

const resolveQueuedRunStatus = (
  currentStatus: FilemakerEmailCampaignRunStatus,
  processedCount: number
): FilemakerEmailCampaignRunStatus => {
  if (processedCount > 0) return 'running';
  if (currentStatus === 'pending') return 'pending';
  return 'queued';
};

const hasOnlySkippedDeliveries = (
  metrics: FilemakerEmailCampaignRunMetrics
): boolean =>
  metrics.deliveredCount === 0 && metrics.failedCount === 0 && metrics.skippedCount > 0;

const hasOnlyFailedDeliveries = (
  metrics: FilemakerEmailCampaignRunMetrics
): boolean =>
  metrics.deliveredCount === 0 && metrics.failedCount > 0 && metrics.skippedCount === 0;

export const resolveFilemakerEmailCampaignRunStatusFromDeliveries = (input: {
  currentStatus: FilemakerEmailCampaignRunStatus;
  deliveries: FilemakerEmailCampaignDelivery[];
}): FilemakerEmailCampaignRunStatus => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(input.deliveries);
  const queuedCount =
    metrics.recipientCount - metrics.deliveredCount - metrics.failedCount - metrics.skippedCount;
  const processedCount = metrics.deliveredCount + metrics.failedCount + metrics.skippedCount;

  if (metrics.recipientCount === 0) {
    return input.currentStatus;
  }
  if (queuedCount > 0) {
    return resolveQueuedRunStatus(input.currentStatus, processedCount);
  }
  if (hasOnlySkippedDeliveries(metrics)) {
    return 'cancelled';
  }
  if (hasOnlyFailedDeliveries(metrics)) {
    return 'failed';
  }
  return 'completed';
};

const isTerminalRunStatus = (status: FilemakerEmailCampaignRunStatus): boolean =>
  status === 'completed' || status === 'failed' || status === 'cancelled';

const resolveRunStartedAt = (
  run: FilemakerEmailCampaignRun,
  nextStatus: FilemakerEmailCampaignRunStatus,
  now: string
): string | null => {
  if (nextStatus === 'running') {
    return run.startedAt ?? now;
  }
  return run.startedAt ?? null;
};

const resolveRunCompletedAt = (
  run: FilemakerEmailCampaignRun,
  nextStatus: FilemakerEmailCampaignRunStatus,
  now: string
): string | null => {
  if (isTerminalRunStatus(nextStatus)) {
    return now;
  }
  return run.completedAt ?? null;
};

export const syncFilemakerEmailCampaignRunWithDeliveries = (input: {
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
  status?: FilemakerEmailCampaignRunStatus;
}): FilemakerEmailCampaignRun => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(input.deliveries);
  const now = new Date().toISOString();
  const nextStatus =
    input.status ??
    resolveFilemakerEmailCampaignRunStatusFromDeliveries({
      currentStatus: input.run.status,
      deliveries: input.deliveries,
    });
  return createFilemakerEmailCampaignRun({
    ...input.run,
    campaignId: input.run.campaignId,
    status: nextStatus,
    recipientCount: metrics.recipientCount,
    deliveredCount: metrics.deliveredCount,
    failedCount: metrics.failedCount,
    skippedCount: metrics.skippedCount,
    startedAt: resolveRunStartedAt(input.run, nextStatus, now),
    completedAt: resolveRunCompletedAt(input.run, nextStatus, now),
    updatedAt: now,
  });
};
