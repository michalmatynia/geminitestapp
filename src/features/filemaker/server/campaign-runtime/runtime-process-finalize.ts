import {
  autoSuppressColdAddresses,
  computeEngagementSnapshot,
  createFilemakerEmailCampaignEvent,
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  resolveFilemakerEmailCampaignRetryDelayMs,
  syncFilemakerEmailCampaignRunWithDeliveries,
} from '../../settings';
import type { FilemakerEmailCampaignEventRegistry } from '../../types';
import {
  appendEventsToRegistry,
  buildProgressSummary,
  replaceCampaignInRegistry,
  replaceRunDeliveriesInRegistry,
  replaceRunInRegistry,
} from '../campaign-runtime.helpers';
import type {
  RuntimeDeliveryContext,
  RuntimeProcessState,
} from './runtime-process-types';
import type {
  FilemakerCampaignRunProcessResult,
  FilemakerCampaignRuntimePersistence,
  FilemakerCampaignRuntimeState,
} from './runtime-types';
import { applyBounceThresholdToCampaign } from './runtime-utils';

type FinalizeProcessedRunInput = {
  context: RuntimeDeliveryContext;
  persistence: FilemakerCampaignRuntimePersistence;
  processedState: RuntimeProcessState;
  runningRun: FilemakerCampaignRunProcessResult['run'];
  runtimeState: FilemakerCampaignRuntimeState;
};

type ProcessRetryStats = {
  retryableDeliveryCount: number;
  retryExhaustedCount: number;
  suggestedRetryDelayMs: number | null;
};

const buildProcessRetryStats = (
  input: FinalizeProcessedRunInput
): ProcessRetryStats => {
  const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries({
    deliveries: input.processedState.deliveries,
    attemptRegistry: input.processedState.attemptRegistry,
    maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  });
  return {
    retryableDeliveryCount: retrySummary.retryableDeliveries.length,
    retryExhaustedCount: retrySummary.exhaustedDeliveries.length,
    suggestedRetryDelayMs: resolveFilemakerEmailCampaignRetryDelayMs({
      deliveries: input.processedState.deliveries,
      attemptRegistry: input.processedState.attemptRegistry,
      maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
      nowMs: input.context.clock.nowMs,
    }),
  };
};

const appendRetryQueuedEvents = (input: {
  context: RuntimeDeliveryContext;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  retryableDeliveryCount: number;
}): FilemakerEmailCampaignEventRegistry => {
  if (input.retryableDeliveryCount === 0) return input.eventRegistry;
  return appendEventsToRegistry(input.eventRegistry, [
    createFilemakerEmailCampaignEvent({
      campaignId: input.context.campaign.id,
      runId: input.context.run.id,
      type: 'status_changed',
      message: `Queued ${input.retryableDeliveryCount} retryable deliveries for another attempt.`,
      runStatus: 'queued',
      createdAt: input.context.clock.nowIso,
      updatedAt: input.context.clock.nowIso,
    }),
    createFilemakerEmailCampaignEvent({
      campaignId: input.context.campaign.id,
      runId: input.context.run.id,
      type: 'status_changed',
      message: `Run has ${input.retryableDeliveryCount} retryable deliveries pending another attempt.`,
      runStatus: 'queued',
      createdAt: input.context.clock.nowIso,
      updatedAt: input.context.clock.nowIso,
    }),
  ]);
};

const applyCompletionEffects = (input: {
  context: RuntimeDeliveryContext;
  deliveryRegistry: FilemakerCampaignRuntimeState['deliveryRegistry'];
  processState: RuntimeProcessState;
  runStatus: FilemakerCampaignRunProcessResult['run']['status'];
}): RuntimeProcessState => {
  if (input.runStatus !== 'completed') return input.processState;
  const completedEventRegistry = appendEventsToRegistry(input.processState.eventRegistry, [
    createFilemakerEmailCampaignEvent({
      campaignId: input.context.campaign.id,
      runId: input.context.run.id,
      type: 'completed',
      message: 'Run completed.',
      runStatus: 'completed',
      createdAt: input.context.clock.nowIso,
      updatedAt: input.context.clock.nowIso,
    }),
  ]);
  const autoSuppressionResult = autoSuppressColdAddresses({
    snapshot: computeEngagementSnapshot({
      eventRegistry: completedEventRegistry,
      deliveryRegistry: input.deliveryRegistry,
    }),
    suppressionRegistry: input.processState.suppressionRegistry,
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    actor: 'engagement-tracker',
  });
  if (autoSuppressionResult.addedEntries.length === 0) {
    return { ...input.processState, eventRegistry: completedEventRegistry };
  }
  return {
    ...input.processState,
    eventRegistry: appendEventsToRegistry(
      completedEventRegistry,
      autoSuppressionResult.addedEntries.map((entry) =>
        createFilemakerEmailCampaignEvent({
          campaignId: input.context.campaign.id,
          runId: input.context.run.id,
          type: 'unsubscribed',
          message: `Auto-suppressed ${entry.emailAddress} (cold) — ${entry.notes ?? 'no engagement after multiple sends.'}`,
          actor: 'engagement-tracker',
          runStatus: 'completed',
          createdAt: input.context.clock.nowIso,
          updatedAt: input.context.clock.nowIso,
        })
      )
    ),
    suppressionRegistry: autoSuppressionResult.nextRegistry,
  };
};

const appendCampaignPausedEvent = (input: {
  context: RuntimeDeliveryContext;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  nextRun: FilemakerCampaignRunProcessResult['run'];
  updatedCampaign: FilemakerCampaignRunProcessResult['campaign'];
}): FilemakerEmailCampaignEventRegistry => {
  if (input.updatedCampaign.status !== 'paused') return input.eventRegistry;
  if (input.context.campaign.status === 'paused') return input.eventRegistry;
  return appendEventsToRegistry(input.eventRegistry, [
    createFilemakerEmailCampaignEvent({
      campaignId: input.updatedCampaign.id,
      runId: input.context.run.id,
      type: 'paused',
      message: 'Campaign paused because the bounce threshold was exceeded.',
      runStatus: input.nextRun.status,
      createdAt: input.context.clock.nowIso,
      updatedAt: input.context.clock.nowIso,
    }),
  ]);
};

export const finalizeProcessedRun = async (
  input: FinalizeProcessedRunInput
): Promise<FilemakerCampaignRunProcessResult> => {
  const retryStats = buildProcessRetryStats(input);
  const nextRun = syncFilemakerEmailCampaignRunWithDeliveries({
    run: input.runningRun,
    deliveries: input.processedState.deliveries,
    status: retryStats.retryableDeliveryCount > 0 ? 'queued' : undefined,
  });
  const retryEventRegistry = appendRetryQueuedEvents({
    context: input.context,
    eventRegistry: input.processedState.eventRegistry,
    retryableDeliveryCount: retryStats.retryableDeliveryCount,
  });
  const completedState = applyCompletionEffects({
    context: input.context,
    deliveryRegistry: input.runtimeState.deliveryRegistry,
    processState: { ...input.processedState, eventRegistry: retryEventRegistry },
    runStatus: nextRun.status,
  });
  const updatedCampaign = applyBounceThresholdToCampaign({
    campaign: input.context.campaign,
    deliveries: completedState.deliveries,
    nowIso: input.context.clock.nowIso,
  });
  await input.persistence.persistRuntimeState({
    campaignRegistry: replaceCampaignInRegistry(input.runtimeState.campaignRegistry, updatedCampaign),
    runRegistry: replaceRunInRegistry(input.runtimeState.runRegistry, nextRun),
    deliveryRegistry: replaceRunDeliveriesInRegistry(
      input.runtimeState.deliveryRegistry,
      input.context.run.id,
      completedState.deliveries
    ),
    attemptRegistry: completedState.attemptRegistry,
    eventRegistry: appendCampaignPausedEvent({
      context: input.context,
      eventRegistry: completedState.eventRegistry,
      nextRun,
      updatedCampaign,
    }),
    suppressionRegistry: completedState.suppressionRegistry,
  });
  return {
    campaign: updatedCampaign,
    run: nextRun,
    deliveries: completedState.deliveries,
    progress: buildProgressSummary(completedState.deliveries),
    ...retryStats,
  };
};
