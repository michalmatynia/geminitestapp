import {
  createFilemakerEmailCampaignEvent,
  getFilemakerEmailCampaignSuppressionByAddress,
} from '../../settings';
import type { FilemakerEmailCampaignDelivery } from '../../types';
import { appendEventsToRegistry } from '../campaign-runtime.helpers';
import {
  FILEMAKER_CAMPAIGN_DOMAIN_GUARD_RETRY_DELAY_MS,
  shouldDeferDeliveryForDomainHealth,
} from './runtime-utils';
import { buildDeliveryAttemptContext } from './runtime-process-delivery-content';
import type { DeliveryHandlerInput } from './runtime-process-delivery-common';
import { replaceDeliveryInCollection } from './runtime-process-delivery-common';
import {
  markDeliveryFailed,
  markDeliverySent,
} from './runtime-process-delivery-outcomes';
import type {
  RuntimeDeliveryContext,
  RuntimeProcessState,
} from './runtime-process-types';

export { replaceDeliveryInCollection } from './runtime-process-delivery-common';

const markSuppressedDeliverySkipped = (input: DeliveryHandlerInput): RuntimeProcessState | null => {
  const suppression = getFilemakerEmailCampaignSuppressionByAddress(
    input.state.suppressionRegistry,
    input.delivery.emailAddress
  );
  if (suppression === null) return null;
  const deliveries = replaceDeliveryInCollection(input.state.deliveries, {
    ...input.delivery,
    ...input.attempt.contentMetadata,
    status: 'skipped',
    providerMessage: `Recipient is on the suppression list (${suppression.reason}).`,
    lastError: null,
    nextRetryAt: null,
    updatedAt: input.context.clock.nowIso,
  });
  return {
    ...input.state,
    deliveries,
    eventRegistry: appendEventsToRegistry(input.state.eventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: input.context.campaign.id,
        runId: input.context.run.id,
        deliveryId: input.delivery.id,
        type: 'status_changed',
        message: `Skipped ${input.delivery.emailAddress}: on suppression list (${suppression.reason}).`,
        deliveryStatus: 'skipped',
        createdAt: input.context.clock.nowIso,
        updatedAt: input.context.clock.nowIso,
      }),
    ]),
  };
};

const markDomainDeferredDelivery = (input: DeliveryHandlerInput): RuntimeProcessState | null => {
  if (
    !shouldDeferDeliveryForDomainHealth({
      delivery: input.delivery,
      deliveries: input.state.deliveries,
      attempts: input.state.attemptRegistry.attempts,
      nowMs: input.context.clock.nowMs,
    })
  ) {
    return null;
  }
  const nextRetryAt = new Date(
    input.context.clock.nowMs + FILEMAKER_CAMPAIGN_DOMAIN_GUARD_RETRY_DELAY_MS
  ).toISOString();
  const domain = input.delivery.emailAddress.split('@').at(-1)?.toLowerCase() ?? 'unknown';
  const message = `Deferred ${input.delivery.emailAddress}: recipient domain ${domain} is already failing in this run.`;
  const deliveries = replaceDeliveryInCollection(input.state.deliveries, {
    ...input.delivery,
    ...input.attempt.contentMetadata,
    status: 'failed',
    failureCategory: 'rate_limited',
    providerMessage: message,
    lastError: message,
    nextRetryAt,
    updatedAt: input.context.clock.nowIso,
  });
  return {
    ...input.state,
    deliveries,
    eventRegistry: appendEventsToRegistry(input.state.eventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: input.context.campaign.id,
        runId: input.context.run.id,
        deliveryId: input.delivery.id,
        type: 'delivery_deferred_domain',
        message,
        deliveryStatus: 'failed',
        createdAt: input.context.clock.nowIso,
        updatedAt: input.context.clock.nowIso,
      }),
    ]),
  };
};

const reserveWarmupSlot = async (
  context: RuntimeDeliveryContext
): Promise<Awaited<ReturnType<NonNullable<RuntimeDeliveryContext['deps']['reserveWarmupSlot']>>> | null> => {
  if (context.deps.reserveWarmupSlot === undefined) return null;
  const senderAccountId = context.campaign.mailAccountId?.trim() ?? '';
  const senderKey = senderAccountId.length > 0 ? senderAccountId : 'shared-smtp';
  return context.deps.reserveWarmupSlot(senderKey);
};

const markWarmupDeferredDelivery = (input: {
  handler: DeliveryHandlerInput;
  warmup: Exclude<Awaited<ReturnType<NonNullable<RuntimeDeliveryContext['deps']['reserveWarmupSlot']>>>, { ok: true }>;
}): RuntimeProcessState => {
  const senderAccountId = input.handler.context.campaign.mailAccountId?.trim() ?? '';
  const senderKey = senderAccountId.length > 0 ? senderAccountId : 'shared-smtp';
  const deliveries = replaceDeliveryInCollection(input.handler.state.deliveries, {
    ...input.handler.delivery,
    ...input.handler.attempt.contentMetadata,
    nextRetryAt: input.warmup.nextAvailableAt,
    updatedAt: input.handler.context.clock.nowIso,
  });
  return {
    ...input.handler.state,
    deliveries,
    eventRegistry: appendEventsToRegistry(input.handler.state.eventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: input.handler.context.campaign.id,
        runId: input.handler.context.run.id,
        deliveryId: input.handler.delivery.id,
        type: 'delivery_deferred_warmup',
        message: `Warm-up daily cap reached for sender ${senderKey} (${input.warmup.used}/${input.warmup.dailyCap}). Deferred to ${input.warmup.nextAvailableAt}.`,
        deliveryStatus: input.handler.delivery.status,
        createdAt: input.handler.context.clock.nowIso,
        updatedAt: input.handler.context.clock.nowIso,
      }),
    ]),
  };
};

const throttleDeliveryIfNeeded = async (
  context: RuntimeDeliveryContext,
  delivery: FilemakerEmailCampaignDelivery
): Promise<void> => {
  if (context.deps.throttleBeforeSend === undefined) return;
  await context.deps.throttleBeforeSend(delivery.emailAddress);
};

const sendDelivery = async (input: DeliveryHandlerInput): Promise<RuntimeProcessState> => {
  const warmup = await reserveWarmupSlot(input.context);
  if (warmup !== null && !warmup.ok) {
    return markWarmupDeferredDelivery({ handler: input, warmup });
  }
  await throttleDeliveryIfNeeded(input.context, input.delivery);
  const sendResult = await input.context.deps.sendCampaignEmail({
    to: input.delivery.emailAddress,
    subject: input.attempt.content.subject,
    text: input.attempt.text,
    html: input.attempt.html,
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    deliveryId: input.delivery.id,
    mailAccountId: input.context.campaign.mailAccountId ?? null,
    replyToEmail: input.context.campaign.replyToEmail ?? null,
    fromName: input.context.campaign.fromName ?? null,
  });
  return markDeliverySent({ ...input, sendResult });
};

export const processCampaignDelivery = async (input: {
  context: RuntimeDeliveryContext;
  delivery: FilemakerEmailCampaignDelivery;
  state: RuntimeProcessState;
}): Promise<RuntimeProcessState> => {
  const attempt = buildDeliveryAttemptContext(input.context, input.delivery, input.state);
  const handlerInput = { ...input, attempt };
  const skippedState = markSuppressedDeliverySkipped(handlerInput);
  if (skippedState !== null) return skippedState;
  const deferredState = markDomainDeferredDelivery(handlerInput);
  if (deferredState !== null) return deferredState;
  try {
    return await sendDelivery(handlerInput);
  } catch (error) {
    return markDeliveryFailed({ ...handlerInput, error });
  }
};
