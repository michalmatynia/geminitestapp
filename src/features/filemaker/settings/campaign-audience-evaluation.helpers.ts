import {
  type FilemakerDatabase,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEmailCampaignAudienceRule,
  type FilemakerEmailCampaignSuppressionRegistry,
  type FilemakerOrganization,
  type FilemakerPerson,
} from '../types';
import {
  type FilemakerEmailCampaignAudienceRecipient,
} from '../types/campaigns';
import {
  getFilemakerEmailCampaignSuppressionByAddress,
} from './campaign-suppression-factories.helpers';
import { getFilemakerOrganizationsForEvent } from './database-getters';
import { getFilemakerOrganizationById, getFilemakerPersonById } from './party-getters';
import {
  matchesPartyReferenceFilter,
  matchesLocationFilter,
} from './campaign-audience-filters';
import { type OrganizationDemandConditionValues } from './campaign-audience-demand-values';
import type { FilemakerAudienceConditionGroup } from '@/shared/contracts/filemaker';

export type AudiencePreviewContext = {
  database: FilemakerDatabase;
  audience: FilemakerEmailCampaignAudienceRule;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  organizationDemandValuesById: Map<string, OrganizationDemandConditionValues>;
  organizationsByEventId: Map<string, Set<string>>;
};

export type AudiencePartyResolution = {
  party: FilemakerPerson | FilemakerOrganization;
  person: FilemakerPerson | null;
  organization: FilemakerOrganization | null;
};

export type AudienceLinkEvaluation = {
  recipient: FilemakerEmailCampaignAudienceRecipient | null;
  suppressed: boolean;
};

export const buildOrganizationsByEventId = (
  database: FilemakerDatabase,
  eventIds: string[]
): Map<string, Set<string>> => {
  const organizationsByEventId = new Map<string, Set<string>>();
  eventIds.forEach((eventId: string): void => {
    organizationsByEventId.set(
      eventId,
      new Set(getFilemakerOrganizationsForEvent(database, eventId).map((entry) => entry.id))
    );
  });
  return organizationsByEventId;
};

const collectEventIdValuesFromGroup = (
  group: FilemakerAudienceConditionGroup,
  collected: Set<string>
): void => {
  group.children.forEach((child) => {
    if (child.type === 'group') {
      collectEventIdValuesFromGroup(child, collected);
      return;
    }
    const condition = child;
    if (condition.field === 'eventId' && condition.value.length > 0) {
      collected.add(condition.value);
    }
  });
};

export const collectEventIdsFromConditions = (
  group: FilemakerAudienceConditionGroup
): string[] => {
  const collected = new Set<string>();
  collectEventIdValuesFromGroup(group, collected);
  return Array.from(collected);
};

export const isEmailSuppressed = (
  registry: FilemakerEmailCampaignSuppressionRegistry,
  emailAddress: string
): boolean => getFilemakerEmailCampaignSuppressionByAddress(registry, emailAddress) !== null;

export const isAudienceEmailEligible = (
  context: AudiencePreviewContext,
  link: FilemakerEmailLink,
  email: FilemakerEmail
): AudienceLinkEvaluation | null => {
  if (!context.audience.partyKinds.includes(link.partyKind)) {
    return { recipient: null, suppressed: false };
  }
  if (!context.audience.emailStatuses.includes(email.status)) {
    return { recipient: null, suppressed: false };
  }
  if (isEmailSuppressed(context.suppressionRegistry, email.email)) {
    return { recipient: null, suppressed: true };
  }
  return null;
};

export const matchesAudiencePartyReferenceFilters = (
  audience: FilemakerEmailCampaignAudienceRule,
  link: FilemakerEmailLink
): boolean => {
  if (
    audience.includePartyReferences.length > 0 &&
    !matchesPartyReferenceFilter(audience.includePartyReferences, link.partyKind, link.partyId)
  ) {
    return false;
  }
  return !matchesPartyReferenceFilter(audience.excludePartyReferences, link.partyKind, link.partyId);
};

export const resolveAudienceParty = (
  database: FilemakerDatabase,
  link: FilemakerEmailLink
): AudiencePartyResolution | null => {
  const person = link.partyKind === 'person' ? getFilemakerPersonById(database, link.partyId) : null;
  const organization =
    link.partyKind === 'organization' ? getFilemakerOrganizationById(database, link.partyId) : null;
  const party = person ?? organization;
  return party !== null ? { party, person, organization } : null;
};

export const matchesAudienceOrganizationFilter = (
  audience: FilemakerEmailCampaignAudienceRule,
  link: FilemakerEmailLink
): boolean => {
  if (audience.organizationIds.length === 0) return true;
  return link.partyKind === 'organization' && audience.organizationIds.includes(link.partyId);
};

export const matchesAudiencePartyLocation = (
  audience: FilemakerEmailCampaignAudienceRule,
  party: FilemakerPerson | FilemakerOrganization
): boolean =>
  matchesLocationFilter(audience.countries, party.country) &&
  matchesLocationFilter(audience.cities, party.city);

export const excludedAudienceLink = (suppressed = false): AudienceLinkEvaluation => ({
  recipient: null,
  suppressed,
});

export const resolveOrganizationPartyName = (
  organization: FilemakerOrganization | null,
  fallback: string
): string => {
  const name = organization?.name ?? '';
  return name.length > 0 ? name : fallback;
};

export const resolvePersonPartyName = (person: FilemakerPerson | null, fallback: string): string => {
  const firstName = person?.firstName ?? '';
  const lastName = person?.lastName ?? '';
  const personName = [firstName, lastName]
    .filter((value: string): boolean => value.length > 0)
    .join(' ')
    .trim();
  return personName.length > 0 ? personName : fallback;
};

export const resolveAudiencePartyName = (
  link: FilemakerEmailLink,
  resolution: AudiencePartyResolution
): string => {
  if (link.partyKind === 'organization') {
    return resolveOrganizationPartyName(resolution.organization, link.partyId);
  }
  return resolvePersonPartyName(resolution.person, link.partyId);
};

export const toAudienceRecipient = (
  email: FilemakerEmail,
  link: FilemakerEmailLink,
  resolution: AudiencePartyResolution,
  matchedEventIds: string[]
): FilemakerEmailCampaignAudienceRecipient => ({
  emailId: email.id,
  email: email.email,
  emailStatus: email.status,
  partyKind: link.partyKind,
  partyId: link.partyId,
  partyName: resolveAudiencePartyName(link, resolution),
  city: resolution.party.city,
  country: resolution.party.country,
  matchedEventIds,
});

export const resolveEventIdsForLink = (
  context: AudiencePreviewContext,
  link: FilemakerEmailLink
): string[] => {
  if (context.organizationsByEventId.size === 0) return [];
  const matched: string[] = [];
  context.organizationsByEventId.forEach((organizationIds, eventId) => {
    if (organizationIds.has(link.partyId)) matched.push(eventId);
  });
  return matched;
};
