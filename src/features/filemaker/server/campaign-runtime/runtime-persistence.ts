import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignContentGroupRegistry,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
} from '../../settings';
import type {
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimePersistInput,
  FilemakerCampaignRuntimePersistence,
  FilemakerCampaignRuntimeState,
} from './runtime-types';

type RuntimeSettingWrite = {
  key: string;
  value: string;
};

const buildOptionalWrite = <Value,>(
  key: string,
  value: Value | undefined,
  serialize: (value: Value) => unknown
): RuntimeSettingWrite | null => {
  if (value === undefined) return null;
  return {
    key,
    value: JSON.stringify(serialize(value)),
  };
};

const compactWrites = (
  writes: Array<RuntimeSettingWrite | null>
): RuntimeSettingWrite[] => writes.filter((write): write is RuntimeSettingWrite => write !== null);

const buildRuntimeStateWrites = (
  input: FilemakerCampaignRuntimePersistInput
): RuntimeSettingWrite[] =>
  compactWrites([
    buildOptionalWrite(
      FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
      input.eventRegistry,
      toPersistedFilemakerEmailCampaignEventRegistry
    ),
    buildOptionalWrite(
      FILEMAKER_EMAIL_CAMPAIGNS_KEY,
      input.campaignRegistry,
      toPersistedFilemakerEmailCampaignRegistry
    ),
    buildOptionalWrite(
      FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
      input.contentGroupRegistry,
      (registry) => registry
    ),
    buildOptionalWrite(
      FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
      input.runRegistry,
      toPersistedFilemakerEmailCampaignRunRegistry
    ),
    buildOptionalWrite(
      FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
      input.deliveryRegistry,
      toPersistedFilemakerEmailCampaignDeliveryRegistry
    ),
    buildOptionalWrite(
      FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
      input.attemptRegistry,
      toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry
    ),
    buildOptionalWrite(
      FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
      input.suppressionRegistry,
      toPersistedFilemakerEmailCampaignSuppressionRegistry
    ),
  ]);

export const createCampaignRuntimePersistence = (
  deps: FilemakerCampaignRuntimeDeps
): FilemakerCampaignRuntimePersistence => {
  const readRuntimeState = async (): Promise<FilemakerCampaignRuntimeState> => {
    const [
      eventsRaw,
      suppressionsRaw,
      databaseRaw,
      contentGroupsRaw,
      campaignsRaw,
      runsRaw,
      deliveriesRaw,
      attemptsRaw,
    ] = await Promise.all([
      deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
      deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
      deps.readSettingValue(FILEMAKER_DATABASE_KEY),
      deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY),
      deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
      deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
      deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
      deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY),
    ]);

    return {
      eventRegistry: parseFilemakerEmailCampaignEventRegistry(eventsRaw),
      suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw),
      database: parseFilemakerDatabase(databaseRaw),
      contentGroupRegistry: parseFilemakerEmailCampaignContentGroupRegistry(contentGroupsRaw),
      campaignRegistry: parseFilemakerEmailCampaignRegistry(campaignsRaw),
      runRegistry: parseFilemakerEmailCampaignRunRegistry(runsRaw),
      deliveryRegistry: parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw),
      attemptRegistry: parseFilemakerEmailCampaignDeliveryAttemptRegistry(attemptsRaw),
    };
  };

  const persistRuntimeState = async (
    input: FilemakerCampaignRuntimePersistInput
  ): Promise<void> => {
    const writes = buildRuntimeStateWrites(input).map((write) =>
      deps.upsertSettingValue(write.key, write.value)
    );
    await Promise.all(writes);
  };

  return { persistRuntimeState, readRuntimeState };
};
