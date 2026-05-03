import type { CountryOption } from '@/shared/contracts/internationalization';

import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroup,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignContentVariant,
  FilemakerEmailCampaignDelivery,
} from '../types';
import {
  buildFilemakerCountryLookup,
  resolveFilemakerCountry,
} from './filemaker-country-options';
import {
  fallbackCountries,
  resolveFilemakerCampaignRecipientCountry,
  type ResolvedCountry,
} from './campaign-content-country-routing';

export type FilemakerCampaignResolvedContent = {
  subject: string;
  previewText: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  bodyBlocks: FilemakerEmailCampaignContentVariant['bodyBlocks'] | FilemakerEmailCampaign['bodyBlocks'];
  contentGroupId: string | null;
  contentVariantId: string | null;
  languageCode: string | null;
  resolvedCountryId: string | null;
  resolvedCountryName: string | null;
  usedFallbackContent: boolean;
  source: 'campaign' | 'content_group';
  reason: string;
};

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

export const resolveFilemakerEmailCampaignContentGroup = (
  registry: FilemakerEmailCampaignContentGroupRegistry | null | undefined,
  groupId: string | null | undefined
): FilemakerEmailCampaignContentGroup | null => {
  const normalizedGroupId = groupId?.trim() ?? '';
  if (normalizedGroupId.length === 0) return null;
  return registry?.groups.find((group) => group.id === normalizedGroupId) ?? null;
};

export const resolveFilemakerEmailCampaignDefaultContentVariant = (input: {
  campaign: FilemakerEmailCampaign;
  group: FilemakerEmailCampaignContentGroup;
}): FilemakerEmailCampaignContentVariant | null => {
  const preferredVariantId = input.campaign.defaultContentVariantId ?? input.group.defaultVariantId;
  return (
    input.group.variants.find((variant) => variant.id === preferredVariantId) ??
    input.group.variants.find(
      (variant) => variant.languageCode === input.group.defaultLanguageCode
    ) ??
    input.group.variants[0] ??
    null
  );
};

const resolveCountryAssignmentTokens = (
  countryId: string,
  countries: readonly CountryOption[],
  countryLookup = buildFilemakerCountryLookup(countries)
): Set<string> => {
  const country = resolveFilemakerCountry(countryId, countryId, countries, countryLookup);
  const tokens = new Set<string>([normalizeToken(countryId)]);
  if (country !== undefined) {
    tokens.add(normalizeToken(country.id));
    tokens.add(normalizeToken(country.code));
    tokens.add(normalizeToken(country.name));
  }
  return tokens;
};

const variantMatchesCountry = (
  variant: FilemakerEmailCampaignContentVariant,
  country: ResolvedCountry,
  countries: readonly CountryOption[]
): boolean => {
  if (country === null || variant.countryIds.length === 0) return false;
  const countryLookup = buildFilemakerCountryLookup(countries);
  const targetTokens = new Set<string>([
    normalizeToken(country.id),
    normalizeToken(country.code),
    normalizeToken(country.name),
  ]);
  return variant.countryIds.some((countryId) => {
    const assignmentTokens = resolveCountryAssignmentTokens(countryId, countries, countryLookup);
    for (const token of assignmentTokens) {
      if (targetTokens.has(token)) return true;
    }
    return false;
  });
};

const getResolvedCountryId = (country: ResolvedCountry): string | null =>
  country !== null ? country.id : null;

const getResolvedCountryName = (country: ResolvedCountry): string | null =>
  country !== null ? country.name : null;

const toLegacyCampaignContent = (
  campaign: FilemakerEmailCampaign,
  country: ResolvedCountry,
  reason: string
): FilemakerCampaignResolvedContent => ({
  subject: campaign.subject,
  previewText: campaign.previewText ?? null,
  bodyText: campaign.bodyText ?? null,
  bodyHtml: campaign.bodyHtml ?? null,
  bodyBlocks: campaign.bodyBlocks ?? null,
  contentGroupId: null,
  contentVariantId: null,
  languageCode: null,
  resolvedCountryId: getResolvedCountryId(country),
  resolvedCountryName: getResolvedCountryName(country),
  usedFallbackContent: false,
  source: 'campaign',
  reason,
});

const toVariantContent = (input: {
  campaign: FilemakerEmailCampaign;
  group: FilemakerEmailCampaignContentGroup;
  variant: FilemakerEmailCampaignContentVariant;
  country: ResolvedCountry;
  usedFallbackContent: boolean;
  reason: string;
}): FilemakerCampaignResolvedContent => ({
  subject: input.variant.subject,
  previewText: input.variant.previewText ?? null,
  bodyText: input.variant.bodyText ?? null,
  bodyHtml: input.variant.bodyHtml ?? null,
  bodyBlocks: input.variant.bodyBlocks ?? null,
  contentGroupId: input.group.id,
  contentVariantId: input.variant.id,
  languageCode: input.variant.languageCode,
  resolvedCountryId: getResolvedCountryId(input.country),
  resolvedCountryName: getResolvedCountryName(input.country),
  usedFallbackContent: input.usedFallbackContent,
  source: 'content_group',
  reason: input.reason,
});

type ResolveCampaignContentInput = {
  campaign: FilemakerEmailCampaign;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry | null;
  database: FilemakerDatabase;
  partyKind: FilemakerEmailCampaignDelivery['partyKind'];
  partyId: string;
  contentVariantId?: string | null;
  countries?: readonly CountryOption[];
};

const resolveExplicitContentVariant = (
  group: FilemakerEmailCampaignContentGroup,
  contentVariantId: string | null | undefined
): FilemakerEmailCampaignContentVariant | null => {
  const normalizedContentVariantId = contentVariantId?.trim() ?? '';
  if (normalizedContentVariantId.length === 0) return null;
  return group.variants.find((variant) => variant.id === normalizedContentVariantId) ?? null;
};

const resolveMatchedContentVariant = (input: {
  campaign: FilemakerEmailCampaign;
  countries: readonly CountryOption[];
  country: ResolvedCountry;
  group: FilemakerEmailCampaignContentGroup;
}): FilemakerEmailCampaignContentVariant | null => {
  if (!input.campaign.translatedSendingEnabled || input.country === null) return null;
  return (
    input.group.variants.find((variant) =>
      variantMatchesCountry(variant, input.country, input.countries)
    ) ?? null
  );
};

const resolveContentRouteReason = (input: {
  campaign: FilemakerEmailCampaign;
  explicitVariant: FilemakerEmailCampaignContentVariant | null;
  matchedVariant: FilemakerEmailCampaignContentVariant | null;
}): string => {
  if (input.explicitVariant !== null) return 'explicit-variant';
  if (input.matchedVariant !== null) return 'country-match';
  return input.campaign.translatedSendingEnabled
    ? 'default-fallback'
    : 'translated-sending-disabled';
};

const resolveUsedFallbackContent = (input: {
  campaign: FilemakerEmailCampaign;
  explicitVariant: FilemakerEmailCampaignContentVariant | null;
  matchedVariant: FilemakerEmailCampaignContentVariant | null;
}): boolean =>
  input.explicitVariant === null &&
  input.campaign.translatedSendingEnabled &&
  input.matchedVariant === null;

export const resolveFilemakerCampaignContentForRecipient = (
  input: ResolveCampaignContentInput
): FilemakerCampaignResolvedContent => {
  const countries = input.countries ?? fallbackCountries;
  const country = resolveFilemakerCampaignRecipientCountry({
    database: input.database,
    partyKind: input.partyKind,
    partyId: input.partyId,
    countries,
  });
  const group = resolveFilemakerEmailCampaignContentGroup(
    input.contentGroupRegistry,
    input.campaign.contentGroupId
  );
  if (group === null) {
    return toLegacyCampaignContent(input.campaign, country, 'campaign-content');
  }

  const explicitVariant = resolveExplicitContentVariant(group, input.contentVariantId);
  const defaultVariant = resolveFilemakerEmailCampaignDefaultContentVariant({
    campaign: input.campaign,
    group,
  });
  const matchedVariant = resolveMatchedContentVariant({
    campaign: input.campaign,
    countries,
    country,
    group,
  });
  const variant = explicitVariant ?? matchedVariant ?? defaultVariant;
  if (variant === null) {
    return toLegacyCampaignContent(input.campaign, country, 'content-group-without-variant');
  }

  return toVariantContent({
    campaign: input.campaign,
    group,
    variant,
    country,
    usedFallbackContent: resolveUsedFallbackContent({
      campaign: input.campaign,
      explicitVariant,
      matchedVariant,
    }),
    reason: resolveContentRouteReason({
      campaign: input.campaign,
      explicitVariant,
      matchedVariant,
    }),
  });
};
