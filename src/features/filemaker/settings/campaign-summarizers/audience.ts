import {
  getFilemakerEmailById,
} from '../database-getters';
import {
  type FilemakerDatabase,
  type FilemakerEmail,
  type FilemakerEmailLink,
  type FilemakerEmailCampaignAudienceRule,
  type FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import {
  type FilemakerEmailCampaignAudiencePreview,
  type FilemakerEmailCampaignAudienceRecipient,
} from '../../types/campaigns';
import {
  normalizeCampaignAudienceRule,
  normalizeFilemakerEmailCampaignSuppressionRegistry,
} from '../campaign-factories';
import {
  evaluateAudienceConditionGroup,
} from '../campaign-audience-conditions';
import {
  buildOrganizationDemandValuesById,
  resolveOrganizationDemandValues,
} from '../campaign-audience-demand-values';
import {
  type AudiencePreviewContext,
  type AudiencePartyResolution,
  type AudienceLinkEvaluation,
  buildOrganizationsByEventId,
  collectEventIdsFromConditions,
  isAudienceEmailEligible,
  matchesAudiencePartyReferenceFilters,
  resolveAudienceParty,
  matchesAudienceOrganizationFilter,
  matchesAudiencePartyLocation,
  toAudienceRecipient,
  excludedAudienceLink,
  resolveEventIdsForLink,
} from '../campaign-audience-evaluation.helpers';

const evaluateAudienceConditions = ({
  context,
  link,
  email,
  resolution,
  matchedEventIds,
}: {
  context: AudiencePreviewContext;
  link: FilemakerEmailLink;
  email: FilemakerEmail;
  resolution: AudiencePartyResolution;
  matchedEventIds: string[];
}): boolean => {
  const organizationDemandValues = resolveOrganizationDemandValues(
    context.organizationDemandValuesById,
    resolution.organization
  );

  return evaluateAudienceConditionGroup(context.audience.conditionGroup, {
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

  const conditionsMatched = evaluateAudienceConditions({
    context,
    link,
    email,
    resolution,
    matchedEventIds,
  });

  if (!conditionsMatched) {
    return excludedAudienceLink();
  }

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
