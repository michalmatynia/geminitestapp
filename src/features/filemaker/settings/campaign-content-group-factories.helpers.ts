import { normalizeEmailBlocks, type EmailBlock } from '../components/email-builder/block-model';
import { compileBlocksToHtml } from '../components/email-builder/compile-blocks';
import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroup,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignContentVariant,
} from '../types';
import { normalizeStringList } from './campaign-factory-normalizers';
import { FILEMAKER_CAMPAIGN_CONTENT_GROUP_VERSION } from './campaign-factories.constants';
import {
  dedupeByNormalizedId,
  parseCampaignRegistryJson,
  sortRegistryEntriesNewestFirst,
} from './campaign-factory-utils.helpers';

export const createCampaignContentGroupId = (name: string): string => {
  const token = toIdToken(name);
  return `filemaker-email-content-group-${token.length > 0 ? token : 'untitled'}`;
};

export const createCampaignContentVariantId = (input: {
  groupId: string;
  languageCode: string;
  label?: string | null;
}): string => {
  const token = toIdToken(`${input.groupId}-${input.languageCode}-${input.label ?? ''}`);
  return `filemaker-email-content-variant-${token.length > 0 ? token : 'default'}`;
};

const normalizeLanguageCode = (input: unknown): string => {
  const value = normalizeString(input).toLowerCase();
  return value.length > 0 ? value : 'en';
};

const resolveVariantBody = (
  input: Partial<FilemakerEmailCampaignContentVariant> | undefined
): { bodyHtml: string | null; bodyBlocks: EmailBlock[] | null } => {
  const bodyBlocks = normalizeEmailBlocks(
    (input as { bodyBlocks?: unknown } | undefined)?.bodyBlocks
  );
  if (bodyBlocks.length > 0) {
    return { bodyHtml: compileBlocksToHtml(bodyBlocks), bodyBlocks };
  }
  const bodyHtml = normalizeString(input?.bodyHtml);
  return { bodyHtml: bodyHtml.length > 0 ? bodyHtml : null, bodyBlocks: null };
};

export const createFilemakerEmailCampaignContentVariant = (
  input?: Partial<FilemakerEmailCampaignContentVariant> &
    Pick<FilemakerEmailCampaignContentVariant, 'groupId'>
): FilemakerEmailCampaignContentVariant => {
  const safe = input ?? { groupId: '' };
  const now = new Date().toISOString();
  const groupId = normalizeString(safe.groupId);
  const languageCode = normalizeLanguageCode(safe.languageCode);
  const label = normalizeString(safe.label) || languageCode.toUpperCase();
  const previewText = normalizeString(safe.previewText);
  const bodyText = normalizeString(safe.bodyText);
  const body = resolveVariantBody(safe);

  return {
    id: normalizeString(safe.id) || createCampaignContentVariantId({ groupId, languageCode, label }),
    groupId,
    languageCode,
    label,
    countryIds: normalizeStringList(safe.countryIds),
    subject: normalizeString(safe.subject),
    previewText: previewText.length > 0 ? previewText : null,
    bodyText: bodyText.length > 0 ? bodyText : null,
    bodyHtml: body.bodyHtml,
    bodyBlocks: body.bodyBlocks,
    createdAt: safe.createdAt ?? now,
    updatedAt: safe.updatedAt ?? safe.createdAt ?? now,
  };
};

export const createFilemakerEmailCampaignContentGroup = (
  input?: Partial<FilemakerEmailCampaignContentGroup>
): FilemakerEmailCampaignContentGroup => {
  const safe = input ?? {};
  const now = new Date().toISOString();
  const name = normalizeString(safe.name) || 'Untitled email group';
  const id = normalizeString(safe.id) || createCampaignContentGroupId(name);
  const defaultLanguageCode = normalizeLanguageCode(safe.defaultLanguageCode);
  const variants = Array.isArray(safe.variants)
    ? safe.variants.map((variant) =>
        createFilemakerEmailCampaignContentVariant({
          ...variant,
          groupId: id,
        })
      )
    : [];
  const defaultVariantId = normalizeString(safe.defaultVariantId);
  const resolvedDefaultVariantId =
    variants.find((variant) => variant.id === defaultVariantId)?.id ??
    variants.find((variant) => variant.languageCode === defaultLanguageCode)?.id ??
    variants[0]?.id ??
    null;
  const description = normalizeString(safe.description);

  return {
    id,
    name,
    description: description.length > 0 ? description : null,
    defaultLanguageCode,
    defaultVariantId: resolvedDefaultVariantId,
    variants,
    createdAt: safe.createdAt ?? now,
    updatedAt: safe.updatedAt ?? safe.createdAt ?? now,
  };
};

export const createFilemakerEmailCampaignContentGroupFromCampaign = (input: {
  campaign: FilemakerEmailCampaign;
  name?: string | null;
  languageCode?: string | null;
}): FilemakerEmailCampaignContentGroup => {
  const now = new Date().toISOString();
  const languageCode = normalizeLanguageCode(input.languageCode);
  const name = normalizeString(input.name) || `${input.campaign.name} content`;
  const groupId = createCampaignContentGroupId(name);
  const variant = createFilemakerEmailCampaignContentVariant({
    id: createCampaignContentVariantId({
      groupId,
      languageCode,
      label: languageCode.toUpperCase(),
    }),
    groupId,
    languageCode,
    label: languageCode.toUpperCase(),
    subject: input.campaign.subject,
    previewText: input.campaign.previewText ?? null,
    bodyText: input.campaign.bodyText ?? null,
    bodyHtml: input.campaign.bodyHtml ?? null,
    bodyBlocks: input.campaign.bodyBlocks ?? null,
    createdAt: now,
    updatedAt: now,
  });

  return createFilemakerEmailCampaignContentGroup({
    id: groupId,
    name,
    defaultLanguageCode: languageCode,
    defaultVariantId: variant.id,
    variants: [variant],
    createdAt: now,
    updatedAt: now,
  });
};

export const createDefaultFilemakerEmailCampaignContentGroupRegistry =
  (): FilemakerEmailCampaignContentGroupRegistry => ({
    version: FILEMAKER_CAMPAIGN_CONTENT_GROUP_VERSION,
    groups: [],
  });

export const normalizeFilemakerEmailCampaignContentGroupRegistry = (
  value: unknown
): FilemakerEmailCampaignContentGroupRegistry => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignContentGroupRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawGroups = Array.isArray(record['groups']) ? record['groups'] : [];
  const groups = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(
      rawGroups.map((entry: unknown): FilemakerEmailCampaignContentGroup => {
        if (entry !== null && typeof entry === 'object') {
          return createFilemakerEmailCampaignContentGroup(
            entry as Partial<FilemakerEmailCampaignContentGroup>
          );
        }
        return createFilemakerEmailCampaignContentGroup();
      })
    )
  ).sort((left, right) => left.name.localeCompare(right.name));

  return {
    version: FILEMAKER_CAMPAIGN_CONTENT_GROUP_VERSION,
    groups,
  };
};

export const parseFilemakerEmailCampaignContentGroupRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignContentGroupRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  return normalizeFilemakerEmailCampaignContentGroupRegistry(parsed);
};

export const toPersistedFilemakerEmailCampaignContentGroupRegistry = (
  value: FilemakerEmailCampaignContentGroupRegistry | null | undefined
): FilemakerEmailCampaignContentGroupRegistry =>
  normalizeFilemakerEmailCampaignContentGroupRegistry(value);
