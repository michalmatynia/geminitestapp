import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import { normalizeEmailBlocks, type EmailBlock } from '../components/email-builder/block-model';
import { compileBlocksToHtml } from '../components/email-builder/compile-blocks';
import {
  normalizeEmailStatuses,
  normalizeNullableBoundedInt,
  normalizeNullablePositiveInt,
  normalizePartyKinds,
  normalizePartyReferences,
  normalizeRecurringRule,
  normalizeStringList,
} from './campaign-factory-normalizers';
import {
  type FilemakerEmailCampaign,
  type FilemakerEmailCampaignAudienceRule,
  type FilemakerEmailCampaignRegistry,
  type FilemakerEmailCampaignLaunchRule,
} from '../types';
import {
  FILEMAKER_CAMPAIGN_VERSION,
} from './campaign-factories.constants';
import {
  parseCampaignRegistryJson,
} from './campaign-factory-utils.helpers';
import {
  buildDefaultAudienceConditionGroup,
  normalizeAudienceConditionGroup,
} from './campaign-audience-normalization.helpers';
import {
  foldLegacyFieldsIntoConditionGroup,
} from './campaign-audience-legacy.helpers';
import type { FilemakerAudienceConditionGroup } from '@/shared/contracts/filemaker';

export const createCampaignId = (name: string): string => {
  const token = toIdToken(name);
  return `filemaker-email-campaign-${token.length > 0 ? token : 'untitled'}`;
};

const resolveAudienceConditionGroup = (
  input: Partial<FilemakerEmailCampaignAudienceRule>
): FilemakerAudienceConditionGroup => {
  const group = input.conditionGroup;
  if (group !== undefined) return normalizeAudienceConditionGroup(group);
  return buildDefaultAudienceConditionGroup();
};

export const normalizeCampaignAudienceRule = (
  input: Partial<FilemakerEmailCampaignAudienceRule> | null | undefined
): FilemakerEmailCampaignAudienceRule => {
  const safe = input ?? {};
  const legacy = {
    organizationIds: normalizeStringList(safe.organizationIds),
    eventIds: normalizeStringList(safe.eventIds),
    countries: normalizeStringList(safe.countries),
    cities: normalizeStringList(safe.cities),
  };
  const conditionGroup = foldLegacyFieldsIntoConditionGroup(
    resolveAudienceConditionGroup(safe),
    legacy
  );
  return {
    partyKinds: normalizePartyKinds(safe.partyKinds),
    emailStatuses: normalizeEmailStatuses(safe.emailStatuses),
    includePartyReferences: normalizePartyReferences(safe.includePartyReferences),
    excludePartyReferences: normalizePartyReferences(safe.excludePartyReferences),
    conditionGroup,
    organizationIds: [],
    eventIds: [],
    countries: [],
    cities: [],
    dedupeByEmail: safe.dedupeByEmail ?? true,
    limit: normalizeNullablePositiveInt(safe.limit),
  };
};

const resolveBounceRatePercent = (percent: unknown): number | null => {
  if (percent === null || percent === undefined) return null;
  return Math.min(100, Math.max(0, Number(percent)));
};

const resolveLaunchMode = (mode: string | undefined): FilemakerEmailCampaignLaunchRule['mode'] => {
  const normalized = normalizeString(mode).toLowerCase();
  if (normalized === 'scheduled' || normalized === 'recurring') return normalized;
  return 'manual';
};

export const normalizeCampaignLaunchRule = (
  input: Partial<FilemakerEmailCampaignLaunchRule> | null | undefined
): FilemakerEmailCampaignLaunchRule => {
  const safe = input ?? {};
  const numAudienceSize = Number(safe.minAudienceSize);
  const minAudienceSize = !Number.isNaN(numAudienceSize) ? numAudienceSize : 0;
  const scheduledAt = normalizeString(safe.scheduledAt);
  const timezone = normalizeString(safe.timezone);
  return {
    mode: resolveLaunchMode(safe.mode),
    scheduledAt: scheduledAt.length > 0 ? scheduledAt : null,
    recurring: normalizeRecurringRule(safe.recurring),
    minAudienceSize: Math.max(0, Math.trunc(minAudienceSize)),
    requireApproval: safe.requireApproval ?? false,
    onlyWeekdays: safe.onlyWeekdays ?? false,
    allowedHourStart: normalizeNullableBoundedInt(safe.allowedHourStart, 0, 23),
    allowedHourEnd: normalizeNullableBoundedInt(safe.allowedHourEnd, 0, 23),
    pauseOnBounceRatePercent: resolveBounceRatePercent(safe.pauseOnBounceRatePercent),
    timezone: timezone.length > 0 ? timezone : 'UTC',
  };
};

const resolveCampaignStatus = (status: string): FilemakerEmailCampaign['status'] => {
  const normalized = normalizeString(status).toLowerCase();
  const valid = ['draft', 'active', 'paused', 'archived'];
  if (valid.includes(normalized)) return normalized as FilemakerEmailCampaign['status'];
  return 'draft';
};

const resolveCampaignBody = (
  input: Partial<FilemakerEmailCampaign> | undefined
): { bodyHtml: string | null; bodyBlocks: FilemakerEmailCampaign['bodyBlocks'] } => {
  const bodyBlocks = normalizeEmailBlocks(
    (input as { bodyBlocks?: unknown } | undefined)?.bodyBlocks
  );
  if (bodyBlocks.length > 0) {
    return {
      bodyHtml: compileBlocksToHtml(bodyBlocks),
      bodyBlocks: toPersistedEmailBlocks(bodyBlocks),
    };
  }
  const bodyHtml = normalizeString(input?.bodyHtml);
  return { bodyHtml: bodyHtml.length > 0 ? bodyHtml : null, bodyBlocks: null };
};

const toPersistedEmailBlocks = (
  blocks: EmailBlock[]
): NonNullable<FilemakerEmailCampaign['bodyBlocks']> =>
  blocks.map((block: EmailBlock): Record<string, unknown> => ({ ...block }));

const resolveCampaignId = (input: Partial<FilemakerEmailCampaign>, name: string): string => {
  const id = normalizeString(input.id);
  return id.length > 0 ? id : createCampaignId(name);
};

const resolveCampaignMetadata = (input: Partial<FilemakerEmailCampaign>): {
  approvalGrantedAt: string | null;
  approvedBy: string | null;
  lastLaunchedAt: string | null;
  lastEvaluatedAt: string | null;
} => {
  const approvalGrantedAt = normalizeString(input.approvalGrantedAt);
  const approvedBy = normalizeString(input.approvedBy);
  const lastLaunchedAt = normalizeString(input.lastLaunchedAt);
  const lastEvaluatedAt = normalizeString(input.lastEvaluatedAt);
  return {
    approvalGrantedAt: approvalGrantedAt.length > 0 ? approvalGrantedAt : null,
    approvedBy: approvedBy.length > 0 ? approvedBy : null,
    lastLaunchedAt: lastLaunchedAt.length > 0 ? lastLaunchedAt : null,
    lastEvaluatedAt: lastEvaluatedAt.length > 0 ? lastEvaluatedAt : null,
  };
};

const resolveCampaignIdentity = (input: Partial<FilemakerEmailCampaign>): {
  description: string | null;
  contentGroupId: string | null;
  defaultContentVariantId: string | null;
  mailAccountId: string | null;
  fromName: string | null;
  previewText: string | null;
  replyToEmail: string | null;
  bodyText: string | null;
} => {
  const description = normalizeString(input.description);
  const contentGroupId = normalizeString(input.contentGroupId);
  const defaultContentVariantId = normalizeString(input.defaultContentVariantId);
  const mailAccountId = normalizeString(input.mailAccountId);
  const fromName = normalizeString(input.fromName);
  const previewText = normalizeString(input.previewText);
  const replyToEmail = normalizeString(input.replyToEmail).toLowerCase();
  const bodyText = normalizeString(input.bodyText);
  return {
    description: description.length > 0 ? description : null,
    contentGroupId: contentGroupId.length > 0 ? contentGroupId : null,
    defaultContentVariantId:
      defaultContentVariantId.length > 0 ? defaultContentVariantId : null,
    mailAccountId: mailAccountId.length > 0 ? mailAccountId : null,
    fromName: fromName.length > 0 ? fromName : null,
    previewText: previewText.length > 0 ? previewText : null,
    replyToEmail: replyToEmail.length > 0 ? replyToEmail : null,
    bodyText: bodyText.length > 0 ? bodyText : null,
  };
};

export const createFilemakerEmailCampaign = (
  input?: Partial<FilemakerEmailCampaign>
): FilemakerEmailCampaign => {
  const safe = input ?? {};
  const now = new Date().toISOString();
  const normalizedName = normalizeString(safe.name);
  const name = normalizedName.length > 0 ? normalizedName : 'Untitled campaign';
  const { bodyHtml, bodyBlocks } = resolveCampaignBody(input);
  const meta = resolveCampaignMetadata(safe);
  const identity = resolveCampaignIdentity(safe);

  return {
    id: resolveCampaignId(safe, name),
    name,
    status: resolveCampaignStatus(safe.status ?? ''),
    subject: normalizeString(safe.subject),
    translatedSendingEnabled: safe.translatedSendingEnabled === true,
    bodyHtml,
    bodyBlocks,
    audience: normalizeCampaignAudienceRule(safe.audience),
    launch: normalizeCampaignLaunchRule(safe.launch),
    ...identity,
    ...meta,
    createdAt: safe.createdAt ?? now,
    updatedAt: safe.updatedAt ?? safe.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignRegistry = (): FilemakerEmailCampaignRegistry => ({
  version: FILEMAKER_CAMPAIGN_VERSION,
  campaigns: [],
});

export const normalizeFilemakerEmailCampaignRegistry = (
  value: unknown
): FilemakerEmailCampaignRegistry => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawCampaigns = Array.isArray(record['campaigns']) ? record['campaigns'] : [];
  const usedIds = new Set<string>();
  const campaigns = rawCampaigns.map((entry: unknown, index: number): FilemakerEmailCampaign => {
    if (entry !== null && typeof entry === 'object') {
      const campaign = createFilemakerEmailCampaign(entry as Partial<FilemakerEmailCampaign>);
      const id = normalizeString(campaign.id);
      const name = normalizeString(campaign.name);
      const baseId =
        id.length > 0
          ? id
          : createCampaignId(name.length > 0 ? name : `campaign-${index + 1}`);
      let resolvedId = baseId;
      let suffix = 2;
      while (usedIds.has(resolvedId)) {
        resolvedId = `${baseId}-${suffix}`;
        suffix += 1;
      }
      usedIds.add(resolvedId);
      return { ...campaign, id: resolvedId };
    }
    return createFilemakerEmailCampaign({ name: `campaign-${index + 1}` });
  });

  return { version: FILEMAKER_CAMPAIGN_VERSION, campaigns };
};

export const parseFilemakerEmailCampaignRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (parsed === null || parsed === undefined) return createDefaultFilemakerEmailCampaignRegistry();
  return normalizeFilemakerEmailCampaignRegistry(parsed);
};

export const toPersistedFilemakerEmailCampaignRegistry = (
  value: FilemakerEmailCampaignRegistry | null | undefined
): FilemakerEmailCampaignRegistry => normalizeFilemakerEmailCampaignRegistry(value);

export * from './campaign-factories.constants';
export * from './campaign-run-factories.helpers';
export * from './campaign-content-group-factories.helpers';
export * from './campaign-delivery-factories.helpers';
export * from './campaign-delivery-attempt-factories.helpers';
export * from './campaign-event-factories.helpers';
export * from './campaign-suppression-factories.helpers';
export * from './campaign-retry-logic.helpers';
