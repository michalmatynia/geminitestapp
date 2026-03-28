import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunStatus,
} from '../../types';
import {
  FilemakerEmailCampaignRunMetrics,
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
    if (processedCount > 0) return 'running';
    if (input.currentStatus === 'pending') return 'pending';
    return 'queued';
  }
  if (metrics.deliveredCount === 0 && metrics.failedCount === 0 && metrics.skippedCount > 0) {
    return 'cancelled';
  }
  if (metrics.deliveredCount === 0 && metrics.failedCount > 0 && metrics.skippedCount === 0) {
    return 'failed';
  }
  return 'completed';
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
    startedAt:
      nextStatus === 'running'
        ? input.run.startedAt ?? now
        : input.run.startedAt ?? null,
    completedAt:
      nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'cancelled'
        ? now
        : input.run.completedAt ?? null,
    updatedAt: now,
  });
};
