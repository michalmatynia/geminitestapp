import { summarizeFilemakerEmailCampaignRunDeliveries } from '../settings';

import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRegistry,
} from '../types';

export type FilemakerCampaignRunProcessProgress = {
  totalCount: number;
  processedCount: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  bouncedCount: number;
};

export const replaceCampaignInRegistry = (
  registry: FilemakerEmailCampaignRegistry,
  campaign: FilemakerEmailCampaign
): FilemakerEmailCampaignRegistry => ({
  version: registry.version,
  campaigns: registry.campaigns
    .filter((entry: FilemakerEmailCampaign): boolean => entry.id !== campaign.id)
    .concat(campaign)
    .sort((left: FilemakerEmailCampaign, right: FilemakerEmailCampaign) =>
      left.name.localeCompare(right.name)
    ),
});

export const replaceRunInRegistry = (
  registry: FilemakerEmailCampaignRunRegistry,
  run: FilemakerEmailCampaignRun
): FilemakerEmailCampaignRunRegistry => ({
  version: registry.version,
  runs: registry.runs
    .filter((entry: FilemakerEmailCampaignRun): boolean => entry.id !== run.id)
    .concat(run)
    .sort(
      (left: FilemakerEmailCampaignRun, right: FilemakerEmailCampaignRun): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    ),
});

export const replaceRunDeliveriesInRegistry = (
  registry: FilemakerEmailCampaignDeliveryRegistry,
  runId: string,
  deliveries: FilemakerEmailCampaignDelivery[]
): FilemakerEmailCampaignDeliveryRegistry => ({
  version: registry.version,
  deliveries: registry.deliveries
    .filter((entry: FilemakerEmailCampaignDelivery): boolean => entry.runId !== runId)
    .concat(deliveries)
    .sort(
      (left: FilemakerEmailCampaignDelivery, right: FilemakerEmailCampaignDelivery): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    ),
});

export const appendAttemptsToRegistry = (
  registry: FilemakerEmailCampaignDeliveryAttemptRegistry,
  attempts: FilemakerEmailCampaignDeliveryAttempt[]
): FilemakerEmailCampaignDeliveryAttemptRegistry => ({
  version: registry.version,
  attempts: registry.attempts
    .concat(attempts)
    .sort(
      (left: FilemakerEmailCampaignDeliveryAttempt, right: FilemakerEmailCampaignDeliveryAttempt): number =>
        Date.parse(right.attemptedAt ?? right.createdAt ?? '') -
        Date.parse(left.attemptedAt ?? left.createdAt ?? '')
    ),
});

export const appendEventsToRegistry = (
  registry: FilemakerEmailCampaignEventRegistry,
  events: FilemakerEmailCampaignEvent[]
): FilemakerEmailCampaignEventRegistry => ({
  version: registry.version,
  events: registry.events
    .concat(events)
    .sort(
      (left: FilemakerEmailCampaignEvent, right: FilemakerEmailCampaignEvent): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    ),
});

export const buildProgressSummary = (
  deliveries: FilemakerEmailCampaignDelivery[]
): FilemakerCampaignRunProcessProgress => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(deliveries);
  const bouncedCount = deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'bounced'
  ).length;
  const queuedCount = deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'queued'
  ).length;
  return {
    totalCount: metrics.recipientCount,
    processedCount: metrics.deliveredCount + metrics.failedCount + metrics.skippedCount,
    queuedCount,
    sentCount: metrics.deliveredCount,
    failedCount: deliveries.filter(
      (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'failed'
    ).length,
    skippedCount: metrics.skippedCount,
    bouncedCount,
  };
};
