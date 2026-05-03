import type { FilemakerEmailCampaignSchedulerStatus, summarizeFilemakerEmailCampaignAnalytics } from '../settings';
import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';

export type CampaignRow = {
  campaign: FilemakerEmailCampaign;
  previewCount: number;
  isLaunchReady: boolean;
  latestRun: FilemakerEmailCampaignRun | null;
  analytics: ReturnType<typeof summarizeFilemakerEmailCampaignAnalytics>;
  nextAutomationAt: string | null;
  schedulerFailureMessage: string | null;
  deliverabilityDecisionCount: number;
  coldSuppressionCount: number;
};

export type ParsedCampaignSettings = {
  database: FilemakerDatabase;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  schedulerStatus: FilemakerEmailCampaignSchedulerStatus;
};
