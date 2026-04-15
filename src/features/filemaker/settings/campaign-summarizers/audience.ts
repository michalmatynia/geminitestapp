import { normalizeString } from '../../filemaker-settings.helpers';
import {
  getFilemakerEmailById,
  getFilemakerOrganizationsForEvent,
} from '../database-getters';
import { getFilemakerOrganizationById, getFilemakerPersonById } from '../party-getters';
import {
  type FilemakerDatabase,
  type FilemakerEmailCampaignAudienceRule,
  type FilemakerEmailCampaignSuppressionRegistry,
  type FilemakerPartyKind,
  type FilemakerPartyReference,
} from '../../types';
import {
  type FilemakerEmailCampaignAudiencePreview,
  type FilemakerEmailCampaignAudienceRecipient,
} from '../../types/campaigns';
import {
  getFilemakerEmailCampaignSuppressionByAddress,
  normalizeCampaignAudienceRule,
  normalizeFilemakerEmailCampaignSuppressionRegistry,
} from '../campaign-factories';

export const matchesPartyReferenceFilter = (
  references: FilemakerPartyReference[],
  partyKind: FilemakerPartyKind,
  partyId: string
): boolean =>
  references.some(
    (reference: FilemakerPartyReference): boolean =>
      reference.kind === partyKind && reference.id === partyId
  );

export const matchesLocationFilter = (
  values: string[],
  candidate: string
): boolean => {
  if (values.length === 0) return true;
  const normalizedCandidate = normalizeString(candidate).toLowerCase();
  if (!normalizedCandidate) return false;
  return values.some((value: string): boolean => value.trim().toLowerCase() === normalizedCandidate);
};

export const resolveFilemakerEmailCampaignAudiencePreview = (
  database: FilemakerDatabase,
  audience: FilemakerEmailCampaignAudienceRule,
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null
): FilemakerEmailCampaignAudiencePreview => {
  const normalizedAudience = normalizeCampaignAudienceRule(audience);
  const normalizedSuppressionRegistry = normalizeFilemakerEmailCampaignSuppressionRegistry(
    suppressionRegistry
  );
  const recipients: FilemakerEmailCampaignAudienceRecipient[] = [];
  let excludedCount = 0;
  let suppressedCount = 0;
  let totalLinkedEmailCount = 0;
  const organizationsByEventId = new Map<string, Set<string>>();

  normalizedAudience.eventIds.forEach((eventId: string): void => {
    organizationsByEventId.set(
      eventId,
      new Set(getFilemakerOrganizationsForEvent(database, eventId).map((entry) => entry.id))
    );
  });

  database.emailLinks.forEach((link): void => {
    totalLinkedEmailCount += 1;
    const email = getFilemakerEmailById(database, link.emailId);
    if (!email) {
      excludedCount += 1;
      return;
    }
    if (!normalizedAudience.partyKinds.includes(link.partyKind)) {
      excludedCount += 1;
      return;
    }
    if (!normalizedAudience.emailStatuses.includes(email.status)) {
      excludedCount += 1;
      return;
    }
    if (getFilemakerEmailCampaignSuppressionByAddress(normalizedSuppressionRegistry, email.email)) {
      excludedCount += 1;
      suppressedCount += 1;
      return;
    }
    if (
      normalizedAudience.includePartyReferences.length > 0 &&
      !matchesPartyReferenceFilter(
        normalizedAudience.includePartyReferences,
        link.partyKind,
        link.partyId
      )
    ) {
      excludedCount += 1;
      return;
    }
    if (
      matchesPartyReferenceFilter(
        normalizedAudience.excludePartyReferences,
        link.partyKind,
        link.partyId
      )
    ) {
      excludedCount += 1;
      return;
    }

    const person =
      link.partyKind === 'person' ? getFilemakerPersonById(database, link.partyId) : null;
    const organization =
      link.partyKind === 'organization'
        ? getFilemakerOrganizationById(database, link.partyId)
        : null;
    const party = person ?? organization;
    if (!party) {
      excludedCount += 1;
      return;
    }

    if (
      normalizedAudience.organizationIds.length > 0 &&
      (link.partyKind !== 'organization' ||
        !normalizedAudience.organizationIds.includes(link.partyId))
    ) {
      excludedCount += 1;
      return;
    }

    const matchedEventIds =
      normalizedAudience.eventIds.length === 0
        ? []
        : normalizedAudience.eventIds.filter((eventId: string): boolean =>
            organizationsByEventId.get(eventId)?.has(link.partyId) ?? false
          );

    if (normalizedAudience.eventIds.length > 0 && matchedEventIds.length === 0) {
      excludedCount += 1;
      return;
    }

    if (!matchesLocationFilter(normalizedAudience.countries, party.country)) {
      excludedCount += 1;
      return;
    }
    if (!matchesLocationFilter(normalizedAudience.cities, party.city)) {
      excludedCount += 1;
      return;
    }

    recipients.push({
      emailId: email.id,
      email: email.email,
      emailStatus: email.status,
      partyKind: link.partyKind,
      partyId: link.partyId,
      partyName:
        link.partyKind === 'person'
          ? [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() || link.partyId
          : organization?.name || link.partyId,
      city: party.city,
      country: party.country,
      matchedEventIds,
    });
  });

  const dedupedRecipients =
    normalizedAudience.dedupeByEmail
      ? Array.from(
          recipients.reduce<Map<string, FilemakerEmailCampaignAudienceRecipient>>((map, entry) => {
            const key = entry.email.trim().toLowerCase();
            if (!map.has(key)) {
              map.set(key, entry);
            }
            return map;
          }, new Map())
        ).map(([, value]) => value)
      : recipients;
  const limitedRecipients =
    normalizedAudience.limit && normalizedAudience.limit > 0
      ? dedupedRecipients.slice(0, normalizedAudience.limit)
      : dedupedRecipients;

  return {
    recipients: limitedRecipients,
    excludedCount,
    suppressedCount,
    dedupedCount: recipients.length - dedupedRecipients.length,
    totalLinkedEmailCount,
    sampleRecipients: limitedRecipients.slice(0, 8),
  };
};
