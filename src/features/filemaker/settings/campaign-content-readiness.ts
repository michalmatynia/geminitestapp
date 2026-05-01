import { badRequestError } from '@/shared/errors/app-error';

import { buildFilemakerMailPlainText } from '../mail-utils';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignDelivery,
} from '../types';
import {
  type FilemakerCampaignResolvedContent,
  resolveFilemakerEmailCampaignContentGroup,
  resolveFilemakerEmailCampaignDefaultContentVariant,
} from './campaign-content-routing';

export const resolveFilemakerCampaignContentBodyText = (
  content: {
    bodyHtml?: string | null;
    bodyText?: string | null;
  }
): string => {
  const text = content.bodyText?.trim() ?? '';
  if (text.length > 0) return text;
  const html = content.bodyHtml?.trim() ?? '';
  return html.length > 0 ? buildFilemakerMailPlainText(html) : '';
};

export const toFilemakerCampaignContentDeliveryMetadata = (
  content: FilemakerCampaignResolvedContent
): Pick<
  FilemakerEmailCampaignDelivery,
  | 'contentGroupId'
  | 'contentVariantId'
  | 'languageCode'
  | 'resolvedCountryId'
  | 'resolvedCountryName'
  | 'usedFallbackContent'
> => ({
  contentGroupId: content.contentGroupId,
  contentVariantId: content.contentVariantId,
  languageCode: content.languageCode,
  resolvedCountryId: content.resolvedCountryId,
  resolvedCountryName: content.resolvedCountryName,
  usedFallbackContent: content.usedFallbackContent,
});

const validateLegacyCampaignContent = (campaign: FilemakerEmailCampaign): string[] => {
  const blockers: string[] = [];
  if (campaign.subject.trim().length === 0) {
    blockers.push('Campaign subject is required before launching a live send.');
  }
  if (
    (campaign.bodyText?.trim() ?? '').length === 0 &&
    (campaign.bodyHtml?.trim() ?? '').length === 0
  ) {
    blockers.push('Campaign body text or HTML is required before launching a live send.');
  }
  return blockers;
};

const validateContentVariant = (
  variant: NonNullable<
    ReturnType<typeof resolveFilemakerEmailCampaignDefaultContentVariant>
  >
): string[] => {
  const blockers: string[] = [];
  if (variant.subject.trim().length === 0) {
    blockers.push(`${variant.label} variant subject is required before launching a live send.`);
  }
  if (resolveFilemakerCampaignContentBodyText(variant).length === 0) {
    blockers.push(`${variant.label} variant body text or HTML is required before launching a live send.`);
  }
  return blockers;
};

export const validateFilemakerCampaignContentReadiness = (input: {
  campaign: FilemakerEmailCampaign;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry | null;
}): string[] => {
  const group = resolveFilemakerEmailCampaignContentGroup(
    input.contentGroupRegistry,
    input.campaign.contentGroupId
  );
  if (input.campaign.contentGroupId === null || input.campaign.contentGroupId.length === 0) {
    return validateLegacyCampaignContent(input.campaign);
  }
  if (group === null) return ['Selected email content group could not be found.'];
  const defaultVariant = resolveFilemakerEmailCampaignDefaultContentVariant({
    campaign: input.campaign,
    group,
  });
  if (defaultVariant === null) return ['Selected email content group needs a default language variant.'];
  const variants = input.campaign.translatedSendingEnabled ? group.variants : [defaultVariant];
  return variants.flatMap(validateContentVariant);
};

export const assertFilemakerCampaignContentReadyForDelivery = (input: {
  campaign: FilemakerEmailCampaign;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry | null;
}): void => {
  const blockers = validateFilemakerCampaignContentReadiness(input);
  if (blockers.length > 0) {
    throw badRequestError(blockers[0] ?? 'Campaign content is not ready for delivery.');
  }
};
