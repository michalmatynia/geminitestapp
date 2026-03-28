import 'server-only';

import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import {
  buildFilemakerEmailCampaignDeliveriesForPreview,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignRun,
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  createFilemakerEmailCampaignDeliveryAttempt,
  createFilemakerEmailCampaignSuppressionEntry,
  getFilemakerEmailCampaignDeliveriesForRun,
  getFilemakerEmailCampaignDeliveryAttemptsForDelivery,
  getFilemakerEmailCampaignSuppressionByAddress,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  isFilemakerEmailCampaignRetryableFailureCategory,
  resolveFilemakerEmailCampaignRetryDelayMs,
  resolveFilemakerEmailCampaignRetryDelayForAttemptCount,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  resolveFilemakerEmailCampaignAudiencePreview,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../../settings';
import {
  appendAttemptsToRegistry,
  appendEventsToRegistry,
  buildProgressSummary,
  replaceCampaignInRegistry,
  replaceRunDeliveriesInRegistry,
  replaceRunInRegistry,
} from '../campaign-runtime.helpers';
import {
  buildFilemakerCampaignManageAllPreferencesUrl,
  buildFilemakerCampaignOpenTrackingUrl,
  buildFilemakerCampaignPreferencesUrl,
  buildFilemakerCampaignUnsubscribeUrl,
} from '../campaign-unsubscribe-token';

import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRegistry,
} from '../../types';
import type {
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimeState,
  FilemakerCampaignRunLaunchResult,
  FilemakerCampaignRunProcessResult,
} from './runtime-types';
import {
  applyBounceThresholdToCampaign,
  applyCampaignRecipientTemplateTokens,
  assertCampaignReadyForDelivery,
  resolveCampaignBodyText,
  resolveFailureStatus,
} from './runtime-utils';

export const createCampaignRuntimeService = (deps: FilemakerCampaignRuntimeDeps) => {
  const readRuntimeState = async (): Promise<FilemakerCampaignRuntimeState> => {
    const [eventsRaw, suppressionsRaw, databaseRaw, campaignsRaw, runsRaw, deliveriesRaw, attemptsRaw] =
      await Promise.all([
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
        deps.readSettingValue(FILEMAKER_DATABASE_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY),
      ]);
    return {
      eventRegistry: parseFilemakerEmailCampaignEventRegistry(eventsRaw),
      suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw),
      database: parseFilemakerDatabase(databaseRaw),
      campaignRegistry: parseFilemakerEmailCampaignRegistry(campaignsRaw),
      runRegistry: parseFilemakerEmailCampaignRunRegistry(runsRaw),
      deliveryRegistry: parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw),
      attemptRegistry: parseFilemakerEmailCampaignDeliveryAttemptRegistry(attemptsRaw),
    };
  };

  const persistRuntimeState = async (input: {
    campaignRegistry?: FilemakerEmailCampaignRegistry;
    runRegistry?: FilemakerEmailCampaignRunRegistry;
    deliveryRegistry?: FilemakerEmailCampaignDeliveryRegistry;
    attemptRegistry?: FilemakerEmailCampaignDeliveryAttemptRegistry;
    eventRegistry?: FilemakerEmailCampaignEventRegistry;
  }): Promise<void> => {
    const writes: Array<Promise<boolean>> = [];
    if (input.eventRegistry) writes.push(deps.upsertSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY, JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(input.eventRegistry))));
    if (input.campaignRegistry) writes.push(deps.upsertSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY, JSON.stringify(toPersistedFilemakerEmailCampaignRegistry(input.campaignRegistry))));
    if (input.runRegistry) writes.push(deps.upsertSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, JSON.stringify(toPersistedFilemakerEmailCampaignRunRegistry(input.runRegistry))));
    if (input.deliveryRegistry) writes.push(deps.upsertSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY, JSON.stringify(toPersistedFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry))));
    if (input.attemptRegistry) writes.push(deps.upsertSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY, JSON.stringify(toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry(input.attemptRegistry))));
    await Promise.all(writes);
  };

  const launchCampaignRun = async (
    campaignId: string,
    mode: FilemakerEmailCampaignRunMode
  ): Promise<FilemakerCampaignRunLaunchResult> => {
    const state = await readRuntimeState();
    const campaign = state.campaignRegistry.campaigns.find((c) => c.id === campaignId);
    if (!campaign) throw notFoundError(`Campaign ${campaignId} not found.`);
    
    assertCampaignReadyForDelivery(campaign, mode);
    const now = deps.now();
    const nowIso = now.toISOString();
    
    const audience = resolveFilemakerEmailCampaignAudiencePreview({ campaign, database: state.database, suppressionRegistry: state.suppressionRegistry });
    const run = createFilemakerEmailCampaignRun({ campaignId, mode, recipientCount: audience.recipients.length });
    const deliveries = buildFilemakerEmailCampaignDeliveriesForPreview({ campaign, runId: run.id, audience });
    
    const nextRunRegistry = { ...state.runRegistry, runs: [run, ...state.runRegistry.runs] };
    const nextDeliveryRegistry = { ...state.deliveryRegistry, deliveries: [...state.deliveryRegistry.deliveries, ...deliveries] };
    const nextEventRegistry = appendEventsToRegistry(state.eventRegistry, [createFilemakerEmailCampaignEvent({ type: 'launched', campaignId, runId: run.id, message: `Launched ${mode} run with ${deliveries.length} recipients.` })]);
    
    await persistRuntimeState({ runRegistry: nextRunRegistry, deliveryRegistry: nextDeliveryRegistry, eventRegistry: nextEventRegistry });
    return { campaign, run, deliveries, queuedDeliveryCount: deliveries.length };
  };

  return { readRuntimeState, persistRuntimeState, launchCampaignRun };
};
