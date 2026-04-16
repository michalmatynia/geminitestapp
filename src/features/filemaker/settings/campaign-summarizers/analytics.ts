import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import { type FilemakerEmailCampaignAnalytics } from '../../types/campaigns';
import { normalizeFilemakerEmailCampaignEventRegistry } from '../campaign-factories';
import { resolveFilemakerEmailCampaignAudiencePreview } from './audience';
import {
  applyClickRates,
  buildDeliveryMetrics,
  buildEngagementMetrics,
  buildLatestActivityMetrics,
  buildRunCountMetrics,
  groupCampaignEvents,
  resolveLatestRun,
  summarizeDeliveryTotals,
  summarizeTopClickedLinks,
} from './analytics-helpers';

const getCampaignRuns = (
  runRegistry: FilemakerEmailCampaignRunRegistry,
  campaignId: string
): FilemakerEmailCampaignRun[] =>
  runRegistry.runs.filter((run: FilemakerEmailCampaignRun): boolean => run.campaignId === campaignId);

const getCampaignEvents = (
  eventRegistry: FilemakerEmailCampaignEventRegistry | null | undefined,
  campaignId: string
): FilemakerEmailCampaignEvent[] =>
  normalizeFilemakerEmailCampaignEventRegistry(eventRegistry).events.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.campaignId === campaignId
  );

export const summarizeFilemakerEmailCampaignAnalytics = (input: {
  campaign: FilemakerEmailCampaign;
  database: FilemakerDatabase;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null;
}): FilemakerEmailCampaignAnalytics => {
  const runs = getCampaignRuns(input.runRegistry, input.campaign.id);
  const campaignEvents = getCampaignEvents(input.eventRegistry, input.campaign.id);
  const preview = resolveFilemakerEmailCampaignAudiencePreview(
    input.database,
    input.campaign.audience,
    input.suppressionRegistry
  );
  const eventGroups = groupCampaignEvents(campaignEvents);
  const deliveryTotals = summarizeDeliveryTotals(runs, input.deliveryRegistry);
  const processedCount =
    deliveryTotals.sentCount +
    deliveryTotals.failedCount +
    deliveryTotals.bouncedCount +
    deliveryTotals.skippedCount;
  const topClickedLinks = applyClickRates(
    summarizeTopClickedLinks(eventGroups.clickEvents),
    deliveryTotals.sentCount
  );
  const latestRun = resolveLatestRun(runs);

  return {
    ...buildRunCountMetrics(runs),
    ...buildDeliveryMetrics(deliveryTotals, processedCount),
    suppressionImpactCount: preview.suppressedCount,
    ...buildEngagementMetrics(eventGroups, deliveryTotals.sentCount),
    ...buildLatestActivityMetrics(latestRun, campaignEvents, eventGroups),
    topClickedLinks,
    eventCount: campaignEvents.length,
  };
};
