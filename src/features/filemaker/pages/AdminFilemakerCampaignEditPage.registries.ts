import { useMemo } from 'react';

import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignContentGroupRegistry,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSchedulerStatus,
  parseFilemakerEmailCampaignSuppressionRegistry,
} from '../settings';
import type {
  CampaignEditRegistries,
  CampaignEditSettingsStore,
} from './AdminFilemakerCampaignEditPage.model-types';

export function useCampaignEditRegistries(
  settingsStore: CampaignEditSettingsStore
): CampaignEditRegistries {
  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawContentGroups = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawAttempts = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
  const rawSchedulerStatus = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY);
  const rawSuppressions = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY);
  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const campaignRegistry = useMemo(() => parseFilemakerEmailCampaignRegistry(rawCampaigns), [rawCampaigns]);
  const contentGroupRegistry = useMemo(
    () => parseFilemakerEmailCampaignContentGroupRegistry(rawContentGroups),
    [rawContentGroups]
  );
  const runRegistry = useMemo(() => parseFilemakerEmailCampaignRunRegistry(rawRuns), [rawRuns]);
  const deliveryRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries),
    [rawDeliveries]
  );
  const attemptRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryAttemptRegistry(rawAttempts),
    [rawAttempts]
  );
  const eventRegistry = useMemo(() => parseFilemakerEmailCampaignEventRegistry(rawEvents), [rawEvents]);
  const suppressionRegistry = useMemo(
    () => parseFilemakerEmailCampaignSuppressionRegistry(rawSuppressions),
    [rawSuppressions]
  );
  const schedulerStatus = useMemo(
    () => parseFilemakerEmailCampaignSchedulerStatus(rawSchedulerStatus),
    [rawSchedulerStatus]
  );
  return {
    database,
    campaignRegistry,
    contentGroupRegistry,
    runRegistry,
    deliveryRegistry,
    attemptRegistry,
    eventRegistry,
    suppressionRegistry,
    schedulerStatus,
  };
}
