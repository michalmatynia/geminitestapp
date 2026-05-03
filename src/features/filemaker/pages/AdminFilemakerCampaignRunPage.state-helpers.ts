import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerMailThread,
} from '../types';

export type CampaignMailThreadsResponse = {
  threads: FilemakerMailThread[];
};

export type CampaignMailFilingRepairResponse = {
  repairedCount: number;
  skippedCount: number;
  failedCount: number;
};

export type CampaignRunDeliveryCounts = {
  bouncedCount: number;
  failedCount: number;
  nextRetryAt: string | null;
  queuedCount: number;
  sentCount: number;
};

export const indexLinkedMailThreads = (
  linkedMailThreads: FilemakerMailThread[]
): Map<string, FilemakerMailThread> => {
  const mapping = new Map<string, FilemakerMailThread>();
  linkedMailThreads.forEach((thread) => {
    const deliveryId = thread.campaignContext?.deliveryId;
    if (typeof deliveryId === 'string' && deliveryId.length > 0 && !mapping.has(deliveryId)) {
      mapping.set(deliveryId, thread);
    }
  });
  return mapping;
};

const hasAssignedMailAccount = (campaign: FilemakerEmailCampaign | null): boolean =>
  campaign !== null &&
  typeof campaign.mailAccountId === 'string' &&
  campaign.mailAccountId.length > 0;

export const countPendingMailFiling = (input: {
  campaign: FilemakerEmailCampaign | null;
  deliveries: FilemakerEmailCampaignDelivery[];
  linkedMailThreadByDeliveryId: Map<string, FilemakerMailThread>;
}): number => {
  const expectsMailThread = hasAssignedMailAccount(input.campaign);
  return input.deliveries.filter(
    (delivery) =>
      expectsMailThread &&
      delivery.status === 'sent' &&
      !input.linkedMailThreadByDeliveryId.has(delivery.id)
  ).length;
};

export const summarizeDeliveries = (
  deliveries: FilemakerEmailCampaignDelivery[]
): CampaignRunDeliveryCounts => {
  const nextRetryAt =
    deliveries
      .map((entry) => entry.nextRetryAt)
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .sort((left, right) => Date.parse(left) - Date.parse(right))[0] ?? null;
  return {
    sentCount: deliveries.filter((entry) => entry.status === 'sent').length,
    failedCount: deliveries.filter((entry) => entry.status === 'failed').length,
    bouncedCount: deliveries.filter((entry) => entry.status === 'bounced').length,
    queuedCount: deliveries.filter((entry) => entry.status === 'queued').length,
    nextRetryAt,
  };
};
