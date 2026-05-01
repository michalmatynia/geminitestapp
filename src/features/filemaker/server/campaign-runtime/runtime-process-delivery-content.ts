import {
  getFilemakerEmailCampaignDeliveryAttemptsForDelivery,
  resolveFilemakerCampaignContentBodyText,
  resolveFilemakerCampaignContentForRecipient,
  toFilemakerCampaignContentDeliveryMetadata,
} from '../../settings';
import type { FilemakerEmailCampaignDelivery } from '../../types';
import {
  buildFilemakerCampaignManageAllPreferencesUrl,
  buildFilemakerCampaignOpenTrackingUrl,
  buildFilemakerCampaignPreferencesUrl,
  buildFilemakerCampaignUnsubscribeUrl,
} from '../campaign-unsubscribe-token';
import { applyCampaignRecipientTemplateTokens } from './runtime-utils';
import type { DeliveryAttemptContext } from './runtime-process-delivery-common';
import type {
  RuntimeDeliveryContext,
  RuntimeProcessState,
} from './runtime-process-types';

type DeliveryUrls = {
  manageAllPreferencesUrl: string;
  openTrackingUrl: string;
  preferencesUrl: string;
  unsubscribeUrl: string;
};

const buildDeliveryUrls = (
  context: RuntimeDeliveryContext,
  delivery: FilemakerEmailCampaignDelivery
): DeliveryUrls => ({
  unsubscribeUrl: buildFilemakerCampaignUnsubscribeUrl({
    emailAddress: delivery.emailAddress,
    campaignId: context.campaign.id,
    runId: context.run.id,
    deliveryId: delivery.id,
    now: context.clock.nowMs,
  }),
  preferencesUrl: buildFilemakerCampaignPreferencesUrl({
    emailAddress: delivery.emailAddress,
    campaignId: context.campaign.id,
    runId: context.run.id,
    deliveryId: delivery.id,
    now: context.clock.nowMs,
  }),
  manageAllPreferencesUrl: buildFilemakerCampaignManageAllPreferencesUrl({
    emailAddress: delivery.emailAddress,
    campaignId: context.campaign.id,
    runId: context.run.id,
    deliveryId: delivery.id,
    now: context.clock.nowMs,
  }),
  openTrackingUrl: buildFilemakerCampaignOpenTrackingUrl({
    emailAddress: delivery.emailAddress,
    campaignId: context.campaign.id,
    runId: context.run.id,
    deliveryId: delivery.id,
    now: context.clock.nowMs,
  }),
});

const applyDeliveryTemplateTokens = (input: {
  context: RuntimeDeliveryContext;
  delivery: FilemakerEmailCampaignDelivery;
  htmlMode: boolean;
  template: string | null;
  urls: DeliveryUrls;
}): string | null =>
  applyCampaignRecipientTemplateTokens(input.template, {
    emailAddress: input.delivery.emailAddress,
    unsubscribeUrl: input.urls.unsubscribeUrl,
    preferencesUrl: input.urls.preferencesUrl,
    manageAllPreferencesUrl: input.urls.manageAllPreferencesUrl,
    openTrackingUrl: input.urls.openTrackingUrl,
    campaignId: input.context.campaign.id,
    runId: input.context.run.id,
    deliveryId: input.delivery.id,
    nowMs: input.context.clock.nowMs,
    htmlMode: input.htmlMode,
  });

export const buildDeliveryAttemptContext = (
  context: RuntimeDeliveryContext,
  delivery: FilemakerEmailCampaignDelivery,
  state: RuntimeProcessState
): DeliveryAttemptContext => {
  const content = resolveFilemakerCampaignContentForRecipient({
    campaign: context.campaign,
    contentGroupRegistry: context.runtimeState.contentGroupRegistry,
    database: context.runtimeState.database,
    partyKind: delivery.partyKind,
    partyId: delivery.partyId,
    contentVariantId: delivery.contentVariantId ?? null,
  });
  const urls = buildDeliveryUrls(context, delivery);
  return {
    attemptNumber:
      getFilemakerEmailCampaignDeliveryAttemptsForDelivery(state.attemptRegistry, delivery.id).length + 1,
    content,
    contentMetadata: toFilemakerCampaignContentDeliveryMetadata(content),
    html: applyDeliveryTemplateTokens({
      context,
      delivery,
      htmlMode: true,
      template: content.bodyHtml ?? null,
      urls,
    }),
    text:
      applyDeliveryTemplateTokens({
        context,
        delivery,
        htmlMode: false,
        template: resolveFilemakerCampaignContentBodyText(content),
        urls,
      }) ?? '',
  };
};
