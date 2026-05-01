import {
  createFilemakerEmailCampaignDeliveryAttempt,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignSuppressionEntry,
  isFilemakerEmailCampaignRetryableFailureCategory,
  resolveFilemakerEmailCampaignRetryDelayForAttemptCount,
  upsertFilemakerEmailCampaignSuppressionEntry,
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
} from '../../settings';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailCampaignEvent,
} from '../../types';
import {
  resolveFilemakerCampaignEmailFailureMetadata,
  type FilemakerCampaignEmailSendResult,
} from '../campaign-email-delivery';
import {
  appendAttemptsToRegistry,
  appendEventsToRegistry,
} from '../campaign-runtime.helpers';
import type { DeliveryHandlerInput } from './runtime-process-delivery-common';
import { replaceDeliveryInCollection } from './runtime-process-delivery-common';
import type { RuntimeDeliveryContext, RuntimeProcessState } from './runtime-process-types';
import {
  isFilemakerEmailCampaignPermanentFailureCategory,
  resolveFailureStatus,
  shouldPauseRunForBounceRate,
} from './runtime-utils';

type DeliveryFailureMetadata = ReturnType<typeof resolveFilemakerCampaignEmailFailureMetadata>;

const buildSentDelivery = (
  input: DeliveryHandlerInput & { sendResult: FilemakerCampaignEmailSendResult }
): FilemakerEmailCampaignDelivery => ({
  ...input.delivery,
  ...input.attempt.contentMetadata,
  status: 'sent',
  provider: input.sendResult.provider,
  failureCategory: null,
  providerMessage: input.sendResult.providerMessage,
  lastError: null,
  sentAt: input.sendResult.sentAt,
  nextRetryAt: null,
  updatedAt: input.context.clock.nowIso,
});

const buildSentAttempt = (
  input: DeliveryHandlerInput & { sendResult: FilemakerCampaignEmailSendResult }
): FilemakerEmailCampaignDeliveryAttempt =>
  createFilemakerEmailCampaignDeliveryAttempt({
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    deliveryId: input.delivery.id,
    emailAddress: input.delivery.emailAddress,
    partyKind: input.delivery.partyKind,
    partyId: input.delivery.partyId,
    ...input.attempt.contentMetadata,
    attemptNumber: input.attempt.attemptNumber,
    status: 'sent',
    provider: input.sendResult.provider,
    failureCategory: null,
    providerMessage: input.sendResult.providerMessage,
    attemptedAt: input.sendResult.sentAt,
    createdAt: input.context.clock.nowIso,
    updatedAt: input.context.clock.nowIso,
  });

const buildMailFilingFailureEvent = (
  input: DeliveryHandlerInput & { sendResult: FilemakerCampaignEmailSendResult }
): FilemakerEmailCampaignEvent | null => {
  if (input.sendResult.mailFilingStatus !== 'failed') return null;
  return createFilemakerEmailCampaignEvent({
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    deliveryId: input.delivery.id,
    type: 'status_changed',
    message: `Delivered to ${input.delivery.emailAddress}, but filing into the mail client failed: ${
      input.sendResult.mailFilingError ?? 'unknown error'
    }`,
    deliveryStatus: 'sent',
    createdAt: input.context.clock.nowIso,
    updatedAt: input.context.clock.nowIso,
  });
};

const buildSentEvents = (
  input: DeliveryHandlerInput & { sendResult: FilemakerCampaignEmailSendResult }
): FilemakerEmailCampaignEvent[] => {
  const deliveredEvent = createFilemakerEmailCampaignEvent({
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    deliveryId: input.delivery.id,
    type: 'delivery_sent',
    message: `Delivered to ${input.delivery.emailAddress}.`,
    deliveryStatus: 'sent',
    mailThreadId: input.sendResult.mailThreadId ?? null,
    mailMessageId: input.sendResult.mailMessageId ?? null,
    createdAt: input.context.clock.nowIso,
    updatedAt: input.context.clock.nowIso,
  });
  const filingFailureEvent = buildMailFilingFailureEvent(input);
  if (filingFailureEvent === null) return [deliveredEvent];
  return [deliveredEvent, filingFailureEvent];
};

export const markDeliverySent = (
  input: DeliveryHandlerInput & { sendResult: FilemakerCampaignEmailSendResult }
): RuntimeProcessState => ({
  ...input.state,
  deliveries: replaceDeliveryInCollection(input.state.deliveries, buildSentDelivery(input)),
  attemptRegistry: appendAttemptsToRegistry(input.state.attemptRegistry, [buildSentAttempt(input)]),
  eventRegistry: appendEventsToRegistry(input.state.eventRegistry, buildSentEvents(input)),
});

const resolveNextRetryAt = (input: {
  attemptNumber: number;
  clock: RuntimeDeliveryContext['clock'];
  failureCategory: NonNullable<FilemakerEmailCampaignDelivery['failureCategory']>;
}): string | null => {
  const isRetryable =
    isFilemakerEmailCampaignRetryableFailureCategory(input.failureCategory) &&
    input.attemptNumber < FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS;
  if (!isRetryable) return null;
  return new Date(
    input.clock.nowMs + resolveFilemakerEmailCampaignRetryDelayForAttemptCount(input.attemptNumber)
  ).toISOString();
};

const buildFailedDelivery = (
  input: DeliveryHandlerInput & { failure: DeliveryFailureMetadata; status: FilemakerEmailCampaignDeliveryStatus }
): FilemakerEmailCampaignDelivery => ({
  ...input.delivery,
  ...input.attempt.contentMetadata,
  status: input.status,
  provider: input.failure.provider,
  failureCategory: input.failure.failureCategory,
  providerMessage: input.failure.message,
  lastError: input.failure.message,
  nextRetryAt: resolveNextRetryAt({
    attemptNumber: input.attempt.attemptNumber,
    clock: input.context.clock,
    failureCategory: input.failure.failureCategory,
  }),
  updatedAt: input.context.clock.nowIso,
});

const buildFailedAttempt = (
  input: DeliveryHandlerInput & { failure: DeliveryFailureMetadata; status: FilemakerEmailCampaignDeliveryStatus }
): FilemakerEmailCampaignDeliveryAttempt =>
  createFilemakerEmailCampaignDeliveryAttempt({
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    deliveryId: input.delivery.id,
    emailAddress: input.delivery.emailAddress,
    partyKind: input.delivery.partyKind,
    partyId: input.delivery.partyId,
    ...input.attempt.contentMetadata,
    attemptNumber: input.attempt.attemptNumber,
    status: input.status,
    provider: input.failure.provider,
    failureCategory: input.failure.failureCategory,
    providerMessage: input.failure.message,
    errorMessage: input.failure.message,
    attemptedAt: input.context.clock.nowIso,
    createdAt: input.context.clock.nowIso,
    updatedAt: input.context.clock.nowIso,
  });

const buildFailedEvent = (
  input: DeliveryHandlerInput & { failure: DeliveryFailureMetadata; status: FilemakerEmailCampaignDeliveryStatus }
): FilemakerEmailCampaignEvent =>
  createFilemakerEmailCampaignEvent({
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    deliveryId: input.delivery.id,
    type: input.status === 'bounced' ? 'delivery_bounced' : 'delivery_failed',
    message: input.failure.message,
    deliveryStatus: input.status,
    createdAt: input.context.clock.nowIso,
    updatedAt: input.context.clock.nowIso,
  });

const appendPermanentBounceSuppression = (input: {
  context: RuntimeDeliveryContext;
  delivery: FilemakerEmailCampaignDelivery;
  failure: DeliveryFailureMetadata;
  state: RuntimeProcessState;
  status: FilemakerEmailCampaignDeliveryStatus;
}): RuntimeProcessState => {
  if (input.status !== 'bounced') return input.state;
  if (!isFilemakerEmailCampaignPermanentFailureCategory(input.failure.failureCategory)) return input.state;
  return {
    ...input.state,
    suppressionRegistry: upsertFilemakerEmailCampaignSuppressionEntry({
      registry: input.state.suppressionRegistry,
      entry: createFilemakerEmailCampaignSuppressionEntry({
        emailAddress: input.delivery.emailAddress,
        reason: 'bounced',
        campaignId: input.context.campaign.id,
        runId: input.context.run.id,
        deliveryId: input.delivery.id,
        notes: `Auto-suppressed after ${input.failure.failureCategory} from ${input.delivery.emailAddress}: ${input.failure.message}`,
        createdAt: input.context.clock.nowIso,
        updatedAt: input.context.clock.nowIso,
      }),
    }),
  };
};

const appendBounceCircuitBreakerEvent = (
  context: RuntimeDeliveryContext,
  state: RuntimeProcessState
): RuntimeProcessState => {
  if (!shouldPauseRunForBounceRate({ campaign: context.campaign, deliveries: state.deliveries })) return state;
  return {
    ...state,
    stopped: true,
    eventRegistry: appendEventsToRegistry(state.eventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: context.campaign.id,
        runId: context.run.id,
        type: 'run_paused_circuit_breaker',
        message: `Run halted mid-flight: bounce rate exceeded ${context.campaign.launch.pauseOnBounceRatePercent}% threshold to protect sender reputation.`,
        runStatus: 'queued',
        createdAt: context.clock.nowIso,
        updatedAt: context.clock.nowIso,
      }),
    ]),
  };
};

export const markDeliveryFailed = (
  input: DeliveryHandlerInput & { error: unknown }
): RuntimeProcessState => {
  const failure = resolveFilemakerCampaignEmailFailureMetadata(input.error);
  const status = resolveFailureStatus(failure.failureCategory);
  const failedInput = { ...input, failure, status };
  const failedState = {
    ...input.state,
    deliveries: replaceDeliveryInCollection(input.state.deliveries, buildFailedDelivery(failedInput)),
    attemptRegistry: appendAttemptsToRegistry(input.state.attemptRegistry, [buildFailedAttempt(failedInput)]),
    eventRegistry: appendEventsToRegistry(input.state.eventRegistry, [buildFailedEvent(failedInput)]),
  };
  const suppressedState = appendPermanentBounceSuppression({
    context: input.context,
    delivery: input.delivery,
    failure,
    state: failedState,
    status,
  });
  return appendBounceCircuitBreakerEvent(input.context, suppressedState);
};
