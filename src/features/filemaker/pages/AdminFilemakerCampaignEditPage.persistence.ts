import { useCallback } from 'react';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  toPersistedFilemakerEmailCampaignContentGroupRegistry,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSchedulerStatus,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
} from '../settings';
import type { FilemakerEmailCampaign } from '../types';
import { removeCampaignArtifacts } from './AdminFilemakerCampaignEditPage.utils';
import type {
  CampaignEditPersistence,
  CampaignEditRegistries,
  UpdateSettingMutation,
} from './AdminFilemakerCampaignEditPage.model-types';

type SettingPayload = {
  key: string;
  value: string;
};

type CampaignDeletionPayloads = {
  campaigns: SettingPayload;
  runs: SettingPayload;
  deliveries: SettingPayload;
  attempts: SettingPayload;
  events: SettingPayload;
  schedulerStatus: SettingPayload;
};

type CampaignEditPersistenceInput = Pick<
  CampaignEditRegistries,
  'runRegistry' | 'deliveryRegistry' | 'attemptRegistry' | 'eventRegistry' | 'schedulerStatus'
> & {
  updateSetting: UpdateSettingMutation;
};

const toCampaignRegistryPayload = (campaigns: FilemakerEmailCampaign[]): SettingPayload => ({
  key: FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  value: JSON.stringify(toPersistedFilemakerEmailCampaignRegistry({ version: 1, campaigns })),
});

const buildDeletionPayloads = (
  input: CampaignEditPersistenceInput,
  deletionInput: Parameters<CampaignEditPersistence['persistCampaignDeletion']>[0]
): CampaignDeletionPayloads => {
  const cleaned = removeCampaignArtifacts({
    campaignId: deletionInput.campaignId,
    runRegistry: input.runRegistry,
    deliveryRegistry: input.deliveryRegistry,
    attemptRegistry: input.attemptRegistry,
    eventRegistry: input.eventRegistry,
    schedulerStatus: input.schedulerStatus,
  });
  return {
    campaigns: toCampaignRegistryPayload(deletionInput.nextCampaigns),
    runs: {
      key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
      value: JSON.stringify(toPersistedFilemakerEmailCampaignRunRegistry(cleaned.runRegistry)),
    },
    deliveries: {
      key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
      value: JSON.stringify(toPersistedFilemakerEmailCampaignDeliveryRegistry(cleaned.deliveryRegistry)),
    },
    attempts: {
      key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
      value: JSON.stringify(
        toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry(cleaned.attemptRegistry)
      ),
    },
    events: {
      key: FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
      value: JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(cleaned.eventRegistry)),
    },
    schedulerStatus: {
      key: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
      value: JSON.stringify(
        toPersistedFilemakerEmailCampaignSchedulerStatus(cleaned.schedulerStatus)
      ),
    },
  };
};

const persistDeletionPayloads = async (
  updateSetting: UpdateSettingMutation,
  payloads: CampaignDeletionPayloads
): Promise<void> => {
  await updateSetting.mutateAsync(payloads.campaigns);
  await updateSetting.mutateAsync(payloads.runs);
  await updateSetting.mutateAsync(payloads.deliveries);
  await updateSetting.mutateAsync(payloads.attempts);
  await updateSetting.mutateAsync(payloads.events);
  await updateSetting.mutateAsync(payloads.schedulerStatus);
};

export function useCampaignEditPersistence(
  input: CampaignEditPersistenceInput
): CampaignEditPersistence {
  const persistCampaignRegistry = useCallback(
    async (nextCampaigns: FilemakerEmailCampaign[]): Promise<void> => {
      await input.updateSetting.mutateAsync(toCampaignRegistryPayload(nextCampaigns));
    },
    [input.updateSetting]
  );
  const persistContentGroupRegistry = useCallback(
    async (
      nextRegistry: Parameters<CampaignEditPersistence['persistContentGroupRegistry']>[0]
    ): Promise<void> => {
      await input.updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignContentGroupRegistry(nextRegistry)),
      });
    },
    [input.updateSetting]
  );
  const persistCampaignDeletion = useCallback(
    async (
      deletionInput: Parameters<CampaignEditPersistence['persistCampaignDeletion']>[0]
    ): Promise<void> => {
      await persistDeletionPayloads(input.updateSetting, buildDeletionPayloads(input, deletionInput));
    },
    [input]
  );
  const persistSuppressionRegistry = useCallback(
    async (
      nextSuppressionRegistry: Parameters<CampaignEditPersistence['persistSuppressionRegistry']>[0]
    ): Promise<void> => {
      await input.updateSetting.mutateAsync({
        key: FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
        value: JSON.stringify(toPersistedFilemakerEmailCampaignSuppressionRegistry(nextSuppressionRegistry)),
      });
    },
    [input.updateSetting]
  );
  return {
    persistCampaignRegistry,
    persistContentGroupRegistry,
    persistCampaignDeletion,
    persistSuppressionRegistry,
  };
}
