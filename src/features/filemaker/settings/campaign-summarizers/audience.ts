import { normalizeString } from '../../filemaker-settings.helpers';
import {
  getFilemakerEmailById,
  getFilemakerOrganizationsForEvent,
} from '../database-getters';
import { getFilemakerOrganizationById, getFilemakerPersonById } from '../party-getters';
import {
  type FilemakerDatabase,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEmailCampaignAudienceRule,
  type FilemakerEmailCampaignSuppressionRegistry,
  type FilemakerOrganization,
  type FilemakerOrganizationLegacyDemand,
  type FilemakerPartyKind,
  type FilemakerPartyReference,
  type FilemakerPerson,
  type FilemakerValue,
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
import {
  evaluateAudienceConditionGroup,
} from '../campaign-audience-conditions';
import type {
  FilemakerAudienceCondition,
  FilemakerAudienceConditionGroup,
} from '@/shared/contracts/filemaker';

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
  if (normalizedCandidate.length === 0) return false;
  return values.some((value: string): boolean => value.trim().toLowerCase() === normalizedCandidate);
};

type AudiencePreviewContext = {
  database: FilemakerDatabase;
  audience: FilemakerEmailCampaignAudienceRule;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  organizationDemandValuesById: Map<string, OrganizationDemandConditionValues>;
  organizationsByEventId: Map<string, Set<string>>;
};

type AudiencePartyResolution = {
  party: FilemakerPerson | FilemakerOrganization;
  person: FilemakerPerson | null;
  organization: FilemakerOrganization | null;
};

type AudienceLinkEvaluation = {
  recipient: FilemakerEmailCampaignAudienceRecipient | null;
  suppressed: boolean;
};

type OrganizationDemandConditionValues = {
  labels: string[];
  legacyValueUuids: string[];
  paths: string[];
  valueIds: string[];
};

const EMPTY_ORGANIZATION_DEMAND_VALUES: OrganizationDemandConditionValues = {
  labels: [],
  legacyValueUuids: [],
  paths: [],
  valueIds: [],
};

const addUniqueNormalizedValue = (target: string[], value: string | null | undefined): void => {
  const normalizedValue = normalizeString(value);
  if (normalizedValue.length === 0 || target.includes(normalizedValue)) return;
  target.push(normalizedValue);
};

const resolveDemandValueLabel = (
  value: FilemakerValue | null | undefined,
  fallback: string
): string => {
  const label = normalizeString(value?.label);
  if (label.length > 0) return label;
  const rawValue = normalizeString(value?.value);
  if (rawValue.length > 0) return rawValue;
  return fallback;
};

const buildOrganizationDemandValuesById = (
  database: FilemakerDatabase
): Map<string, OrganizationDemandConditionValues> => {
  const valuesById = new Map<string, FilemakerValue>(
    database.values.map((value: FilemakerValue): [string, FilemakerValue] => [value.id, value])
  );
  const demandsByOrganizationId = new Map<string, OrganizationDemandConditionValues>();

  database.organizationLegacyDemands.forEach(
    (demand: FilemakerOrganizationLegacyDemand): void => {
      const organizationId = normalizeString(demand.organizationId);
      if (organizationId.length === 0) return;

      const pathValueIds = demand.valueIds
        .map((valueId: string): string => normalizeString(valueId))
        .filter((valueId: string): boolean => valueId.length > 0);
      if (pathValueIds.length === 0) return;

      const current =
        demandsByOrganizationId.get(organizationId) ?? {
          labels: [],
          legacyValueUuids: [],
          paths: [],
          valueIds: [],
        };
      const pathLabels: string[] = [];

      pathValueIds.forEach((valueId: string): void => {
        const value = valuesById.get(valueId);
        addUniqueNormalizedValue(current.valueIds, valueId);
        addUniqueNormalizedValue(current.legacyValueUuids, value?.legacyUuid);
        const label = resolveDemandValueLabel(value, valueId);
        addUniqueNormalizedValue(current.labels, label);
        pathLabels.push(label);
      });

      addUniqueNormalizedValue(current.paths, pathValueIds.join('>'));
      addUniqueNormalizedValue(current.paths, pathLabels.join(' > '));
      demandsByOrganizationId.set(organizationId, current);
    }
  );

  return demandsByOrganizationId;
};

const buildOrganizationsByEventId = (
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
    if (condition.field === 'eventId' && condition.value) {
      collected.add(condition.value);
    }
  });
};

const collectEventIdsFromConditions = (
  group: FilemakerAudienceConditionGroup
): string[] => {
  const collected = new Set<string>();
  collectEventIdValuesFromGroup(group, collected);
  return Array.from(collected);
};

const isEmailSuppressed = (
  registry: FilemakerEmailCampaignSuppressionRegistry,
  emailAddress: string
): boolean => getFilemakerEmailCampaignSuppressionByAddress(registry, emailAddress) !== null;

const isAudienceEmailEligible = (
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

const matchesAudiencePartyReferenceFilters = (
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

const resolveAudienceParty = (
  database: FilemakerDatabase,
  link: FilemakerEmailLink
): AudiencePartyResolution | null => {
  const person = link.partyKind === 'person' ? getFilemakerPersonById(database, link.partyId) : null;
  const organization =
    link.partyKind === 'organization' ? getFilemakerOrganizationById(database, link.partyId) : null;
  const party = person ?? organization;
  return party !== null ? { party, person, organization } : null;
};

const matchesAudienceOrganizationFilter = (
  audience: FilemakerEmailCampaignAudienceRule,
  link: FilemakerEmailLink
): boolean => {
  if (audience.organizationIds.length === 0) return true;
  return link.partyKind === 'organization' && audience.organizationIds.includes(link.partyId);
};

const matchesAudiencePartyLocation = (
  audience: FilemakerEmailCampaignAudienceRule,
  party: FilemakerPerson | FilemakerOrganization
): boolean =>
  matchesLocationFilter(audience.countries, party.country) &&
  matchesLocationFilter(audience.cities, party.city);

const resolveOrganizationPartyName = (
  organization: FilemakerOrganization | null,
  fallback: string
): string => {
  const name = organization?.name ?? '';
  return name.length > 0 ? name : fallback;
};

const resolvePersonPartyName = (person: FilemakerPerson | null, fallback: string): string => {
  const firstName = person?.firstName ?? '';
  const lastName = person?.lastName ?? '';
  const personName = [firstName, lastName]
    .filter((value: string): boolean => value.length > 0)
    .join(' ')
    .trim();
  return personName.length > 0 ? personName : fallback;
};

const resolveAudiencePartyName = (
  link: FilemakerEmailLink,
  resolution: AudiencePartyResolution
): string => {
  if (link.partyKind === 'organization') {
    return resolveOrganizationPartyName(resolution.organization, link.partyId);
  }
  return resolvePersonPartyName(resolution.person, link.partyId);
};

const toAudienceRecipient = (
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

const excludedAudienceLink = (suppressed = false): AudienceLinkEvaluation => ({
  recipient: null,
  suppressed,
});

const resolveEventIdsForLink = (
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

const evaluateAudienceEmailLink = (
  context: AudiencePreviewContext,
  link: FilemakerEmailLink
): AudienceLinkEvaluation => {
  const email = getFilemakerEmailById(context.database, link.emailId);
  if (email === null) return excludedAudienceLink();

  const emailEligibility = isAudienceEmailEligible(context, link, email);
  if (emailEligibility !== null) return emailEligibility;
  if (!matchesAudiencePartyReferenceFilters(context.audience, link)) return excludedAudienceLink();

  const resolution = resolveAudienceParty(context.database, link);
  if (resolution === null) return excludedAudienceLink();
  if (!matchesAudienceOrganizationFilter(context.audience, link)) return excludedAudienceLink();

  const matchedEventIds = resolveEventIdsForLink(context, link);
  if (!matchesAudiencePartyLocation(context.audience, resolution.party)) return excludedAudienceLink();
  const organizationDemandValues =
    resolution.organization !== null
      ? context.organizationDemandValuesById.get(resolution.organization.id) ??
        EMPTY_ORGANIZATION_DEMAND_VALUES
      : EMPTY_ORGANIZATION_DEMAND_VALUES;

  const conditionsMatch = evaluateAudienceConditionGroup(context.audience.conditionGroup, {
    person: resolution.person,
    organization: resolution.organization,
    email,
    organizationIds: link.partyKind === 'organization' ? [link.partyId] : [],
    eventIds: matchedEventIds,
    organizationDemandLabels: organizationDemandValues.labels,
    organizationDemandLegacyValueUuids: organizationDemandValues.legacyValueUuids,
    organizationDemandPaths: organizationDemandValues.paths,
    organizationDemandValueIds: organizationDemandValues.valueIds,
  });
  if (!conditionsMatch) return excludedAudienceLink();

  return {
    recipient: toAudienceRecipient(email, link, resolution, matchedEventIds),
    suppressed: false,
  };
};

const dedupeAudienceRecipients = (
  recipients: FilemakerEmailCampaignAudienceRecipient[]
): FilemakerEmailCampaignAudienceRecipient[] =>
  Array.from(
    recipients.reduce<Map<string, FilemakerEmailCampaignAudienceRecipient>>((map, entry) => {
      const key = entry.email.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, entry);
      }
      return map;
    }, new Map())
  ).map(([, value]) => value);

const limitAudienceRecipients = (
  recipients: FilemakerEmailCampaignAudienceRecipient[],
  limit: number | null | undefined
): FilemakerEmailCampaignAudienceRecipient[] => {
  if (limit === null || limit === undefined || limit <= 0) return recipients;
  return recipients.slice(0, limit);
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
  const eventIdsInConditions = collectEventIdsFromConditions(normalizedAudience.conditionGroup);
  const context = {
    database,
    audience: normalizedAudience,
    suppressionRegistry: normalizedSuppressionRegistry,
    organizationDemandValuesById: buildOrganizationDemandValuesById(database),
    organizationsByEventId: buildOrganizationsByEventId(database, eventIdsInConditions),
  };

  database.emailLinks.forEach((link): void => {
    totalLinkedEmailCount += 1;
    const evaluation = evaluateAudienceEmailLink(context, link);
    if (evaluation.recipient === null) {
      excludedCount += 1;
      if (evaluation.suppressed) suppressedCount += 1;
      return;
    }
    recipients.push(evaluation.recipient);
  });

  const dedupedRecipients = normalizedAudience.dedupeByEmail
    ? dedupeAudienceRecipients(recipients)
    : recipients;
  const limitedRecipients = limitAudienceRecipients(dedupedRecipients, normalizedAudience.limit);

  return {
    recipients: limitedRecipients,
    excludedCount,
    suppressedCount,
    dedupedCount: recipients.length - dedupedRecipients.length,
    totalLinkedEmailCount,
    sampleRecipients: limitedRecipients.slice(0, 8),
  };
};
