import { badRequestError } from '@/shared/errors/app-error';
import type { CountryOption } from '@/shared/contracts/internationalization';

import { buildFilemakerMailPlainText } from '../mail-utils';
import type {
  FilemakerAddress,
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroup,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignContentVariant,
  FilemakerEmailCampaignDelivery,
  FilemakerOrganization,
  FilemakerPerson,
} from '../types';
import {
  getFilemakerDefaultAddressForOwner,
} from './database-getters';
import {
  getFilemakerOrganizationById,
  getFilemakerPersonById,
} from './party-getters';
import {
  buildFilemakerCountryList,
  buildFilemakerCountryLookup,
  resolveFilemakerCountry,
} from './filemaker-country-options';

type ResolvedCountry = {
  id: string;
  name: string;
  code: string;
} | null;

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

const fallbackCountries = buildFilemakerCountryList([]);
const fallbackCountryLookup = buildFilemakerCountryLookup(fallbackCountries);

const normalizeToken = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const isUsefulToken = (value: string | null | undefined): boolean =>
  normalizeToken(value).length > 0;

const collectCountryCandidates = (
  input:
    | Pick<
        FilemakerAddress,
        'countryId' | 'country' | 'countryValueId' | 'countryValueLabel' | 'legacyCountryUuid'
      >
    | Pick<FilemakerOrganization | FilemakerPerson, 'countryId' | 'country'>
    | null
    | undefined
): Array<{ id: string | null | undefined; name: string | null | undefined }> => {
  if (!input) return [];
  const candidates: Array<{ id: string | null | undefined; name: string | null | undefined }> = [
    { id: input.countryId, name: input.country },
    { id: input.country, name: input.countryId },
  ];
  if ('countryValueId' in input) {
    candidates.push(
      { id: input.countryValueId, name: input.countryValueLabel },
      { id: input.legacyCountryUuid, name: input.countryValueLabel }
    );
  }
  return candidates.filter(
    (candidate) => isUsefulToken(candidate.id) || isUsefulToken(candidate.name)
  );
};

const resolveCountryFromCandidates = (
  candidates: Array<{ id: string | null | undefined; name: string | null | undefined }>,
  countries: readonly CountryOption[],
  countryLookup = buildFilemakerCountryLookup(countries)
): ResolvedCountry => {
  for (const candidate of candidates) {
    const country = resolveFilemakerCountry(
      candidate.id,
      candidate.name,
      countries,
      countryLookup
    );
    if (country) {
      return {
        id: country.id,
        name: country.name,
        code: country.code,
      };
    }
  }
  const first = candidates[0];
  const fallback = first?.id ?? first?.name ?? '';
  return fallback.trim().length > 0
    ? { id: fallback.trim(), name: (first?.name ?? fallback).trim(), code: '' }
    : null;
};

export const resolveFilemakerCampaignRecipientCountry = (input: {
  database: FilemakerDatabase;
  partyKind: FilemakerEmailCampaignDelivery['partyKind'];
  partyId: string;
  countries?: readonly CountryOption[];
}): ResolvedCountry => {
  const countries = input.countries ?? fallbackCountries;
  const countryLookup = input.countries ? buildFilemakerCountryLookup(countries) : fallbackCountryLookup;
  if (input.partyKind === 'organization') {
    const organization = getFilemakerOrganizationById(input.database, input.partyId);
    const defaultAddress = getFilemakerDefaultAddressForOwner(
      input.database,
      'organization',
      input.partyId
    );
    return resolveCountryFromCandidates(
      collectCountryCandidates(defaultAddress).concat(collectCountryCandidates(organization)),
      countries,
      countryLookup
    );
  }

  const person = getFilemakerPersonById(input.database, input.partyId);
  const defaultAddress = getFilemakerDefaultAddressForOwner(input.database, 'person', input.partyId);
  return resolveCountryFromCandidates(
    collectCountryCandidates(defaultAddress).concat(collectCountryCandidates(person)),
    countries,
    countryLookup
  );
};

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
  if (country) {
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
  if (!country || variant.countryIds.length === 0) return false;
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
  resolvedCountryId: country?.id ?? null,
  resolvedCountryName: country?.name ?? null,
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
  resolvedCountryId: input.country?.id ?? null,
  resolvedCountryName: input.country?.name ?? null,
  usedFallbackContent: input.usedFallbackContent,
  source: 'content_group',
  reason: input.reason,
});

export const resolveFilemakerCampaignContentForRecipient = (input: {
  campaign: FilemakerEmailCampaign;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry | null;
  database: FilemakerDatabase;
  partyKind: FilemakerEmailCampaignDelivery['partyKind'];
  partyId: string;
  contentVariantId?: string | null;
  countries?: readonly CountryOption[];
}): FilemakerCampaignResolvedContent => {
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
  if (!group) {
    return toLegacyCampaignContent(input.campaign, country, 'campaign-content');
  }

  const explicitVariant = input.contentVariantId
    ? group.variants.find((variant) => variant.id === input.contentVariantId) ?? null
    : null;
  const defaultVariant = resolveFilemakerEmailCampaignDefaultContentVariant({
    campaign: input.campaign,
    group,
  });
  const matchedVariant =
    input.campaign.translatedSendingEnabled && country
      ? group.variants.find((variant) => variantMatchesCountry(variant, country, countries)) ?? null
      : null;
  const variant = explicitVariant ?? matchedVariant ?? defaultVariant;
  if (!variant) {
    return toLegacyCampaignContent(input.campaign, country, 'content-group-without-variant');
  }

  const usedFallbackContent = explicitVariant
    ? false
    : input.campaign.translatedSendingEnabled && matchedVariant === null;
  return toVariantContent({
    campaign: input.campaign,
    group,
    variant,
    country,
    usedFallbackContent,
    reason: explicitVariant
      ? 'explicit-variant'
      : matchedVariant
        ? 'country-match'
        : input.campaign.translatedSendingEnabled
          ? 'default-fallback'
          : 'translated-sending-disabled',
  });
};

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

export const validateFilemakerCampaignContentReadiness = (input: {
  campaign: FilemakerEmailCampaign;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry | null;
}): string[] => {
  const group = resolveFilemakerEmailCampaignContentGroup(
    input.contentGroupRegistry,
    input.campaign.contentGroupId
  );
  if (!input.campaign.contentGroupId) {
    const blockers: string[] = [];
    if (input.campaign.subject.trim().length === 0) {
      blockers.push('Campaign subject is required before launching a live send.');
    }
    if (
      (input.campaign.bodyText?.trim() ?? '').length === 0 &&
      (input.campaign.bodyHtml?.trim() ?? '').length === 0
    ) {
      blockers.push('Campaign body text or HTML is required before launching a live send.');
    }
    return blockers;
  }
  if (!group) return ['Selected email content group could not be found.'];
  const defaultVariant = resolveFilemakerEmailCampaignDefaultContentVariant({
    campaign: input.campaign,
    group,
  });
  if (!defaultVariant) return ['Selected email content group needs a default language variant.'];
  const variants = input.campaign.translatedSendingEnabled ? group.variants : [defaultVariant];
  const blockers: string[] = [];
  variants.forEach((variant) => {
    if (variant.subject.trim().length === 0) {
      blockers.push(`${variant.label} variant subject is required before launching a live send.`);
    }
    if (resolveFilemakerCampaignContentBodyText(variant).length === 0) {
      blockers.push(`${variant.label} variant body text or HTML is required before launching a live send.`);
    }
  });
  return blockers;
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
