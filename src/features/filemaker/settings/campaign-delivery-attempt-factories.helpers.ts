import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import {
  type FilemakerEmailCampaignDelivery,
  type FilemakerEmailCampaignDeliveryAttempt,
  type FilemakerEmailCampaignDeliveryAttemptRegistry,
} from '../types';
import {
  FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION,
} from './campaign-factories.constants';
import {
  dedupeByNormalizedId,
  parseCampaignRegistryJson,
  sortRegistryEntriesNewestFirst,
} from './campaign-factory-utils.helpers';

const resolveDeliveryProvider = (
  provider: unknown
): FilemakerEmailCampaignDelivery['provider'] => {
  const normalized = normalizeString(provider).toLowerCase();
  if (normalized === 'webhook' || normalized === 'smtp') {
    return normalized as FilemakerEmailCampaignDelivery['provider'];
  }
  return null;
};

const resolveFailureCategory = (
  category: unknown
): FilemakerEmailCampaignDelivery['failureCategory'] => {
  const normalized = normalizeString(category).toLowerCase();
  const valid = [
    'soft_bounce',
    'hard_bounce',
    'provider_rejected',
    'rate_limited',
    'timeout',
    'invalid_recipient',
    'unknown',
  ];
  if (valid.includes(normalized)) {
    return normalized as FilemakerEmailCampaignDelivery['failureCategory'];
  }
  return null;
};

const resolveAttemptId = (input: Partial<FilemakerEmailCampaignDeliveryAttempt>): string => {
  const id = normalizeString(input.id);
  if (id !== '') return id;
  const now = new Date().toISOString();
  const token = toIdToken(`${input.deliveryId}-${input.attemptNumber}-${input.status}-${now}`);
  return `filemaker-email-campaign-delivery-attempt-${token !== '' ? token : 'entry'}`;
};

const resolveAttemptStatus = (
  status: unknown
): FilemakerEmailCampaignDeliveryAttempt['status'] => {
  const normalized = normalizeString(status).toLowerCase();
  const valid = ['sent', 'failed', 'bounced'];
  if (valid.includes(normalized)) return normalized as FilemakerEmailCampaignDeliveryAttempt['status'];
  return 'failed';
};

const resolveAttemptNumber = (attemptNumber: unknown): number => {
  const num = Number(attemptNumber);
  if (Number.isNaN(num)) return 1;
  return Math.max(1, Math.trunc(num));
};

const resolveAttemptContentMetadata = (
  input: Partial<FilemakerEmailCampaignDeliveryAttempt>
): Pick<
  FilemakerEmailCampaignDeliveryAttempt,
  | 'contentGroupId'
  | 'contentVariantId'
  | 'languageCode'
  | 'resolvedCountryId'
  | 'resolvedCountryName'
  | 'usedFallbackContent'
> => {
  const contentGroupId = normalizeString(input.contentGroupId);
  const contentVariantId = normalizeString(input.contentVariantId);
  const languageCode = normalizeString(input.languageCode).toLowerCase();
  const resolvedCountryId = normalizeString(input.resolvedCountryId);
  const resolvedCountryName = normalizeString(input.resolvedCountryName);
  return {
    contentGroupId: contentGroupId !== '' ? contentGroupId : null,
    contentVariantId: contentVariantId !== '' ? contentVariantId : null,
    languageCode: languageCode !== '' ? languageCode : null,
    resolvedCountryId: resolvedCountryId !== '' ? resolvedCountryId : null,
    resolvedCountryName: resolvedCountryName !== '' ? resolvedCountryName : null,
    usedFallbackContent: input.usedFallbackContent === true,
  };
};

export const createFilemakerEmailCampaignDeliveryAttempt = (
  input: Partial<FilemakerEmailCampaignDeliveryAttempt> &
    Pick<
      FilemakerEmailCampaignDeliveryAttempt,
      | 'campaignId'
      | 'runId'
      | 'deliveryId'
      | 'emailAddress'
      | 'partyKind'
      | 'partyId'
      | 'attemptNumber'
      | 'status'
    >
): FilemakerEmailCampaignDeliveryAttempt => {
  const now = new Date().toISOString();
  const providerMessage = normalizeString(input.providerMessage);
  const errorMessage = normalizeString(input.errorMessage);
  const attemptedAt = normalizeString(input.attemptedAt);
  const contentMetadata = resolveAttemptContentMetadata(input);

  return {
    id: resolveAttemptId(input),
    campaignId: normalizeString(input.campaignId),
    runId: normalizeString(input.runId),
    deliveryId: normalizeString(input.deliveryId),
    emailAddress: normalizeString(input.emailAddress).toLowerCase(),
    partyKind: input.partyKind,
    partyId: normalizeString(input.partyId),
    attemptNumber: resolveAttemptNumber(input.attemptNumber),
    status: resolveAttemptStatus(input.status),
    provider: resolveDeliveryProvider(input.provider),
    failureCategory: resolveFailureCategory(input.failureCategory),
    ...contentMetadata,
    providerMessage: providerMessage !== '' ? providerMessage : null,
    errorMessage: errorMessage !== '' ? errorMessage : null,
    attemptedAt: attemptedAt !== '' ? attemptedAt : null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignDeliveryAttemptRegistry =
  (): FilemakerEmailCampaignDeliveryAttemptRegistry => ({
    version: FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION,
    attempts: [],
  });

const normalizeAttemptEntry = (entry: unknown): FilemakerEmailCampaignDeliveryAttempt => {
  if (entry !== null && typeof entry === 'object') {
    return createFilemakerEmailCampaignDeliveryAttempt(
      entry as Partial<FilemakerEmailCampaignDeliveryAttempt> &
        Pick<
          FilemakerEmailCampaignDeliveryAttempt,
          | 'campaignId'
          | 'runId'
          | 'deliveryId'
          | 'emailAddress'
          | 'partyKind'
          | 'partyId'
          | 'attemptNumber'
          | 'status'
        >
    );
  }
  return {
    id: '',
    campaignId: '',
    runId: '',
    deliveryId: '',
    emailAddress: '',
    partyKind: 'person',
    partyId: '',
    attemptNumber: 1,
    status: 'failed',
    createdAt: '',
    updatedAt: '',
  };
};

export const normalizeFilemakerEmailCampaignDeliveryAttemptRegistry = (
  value: unknown
): FilemakerEmailCampaignDeliveryAttemptRegistry => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignDeliveryAttemptRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawAttempts = Array.isArray(record['attempts']) ? record['attempts'] : [];
  const attempts = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(rawAttempts.map(normalizeAttemptEntry))
  );

  return {
    version: FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION,
    attempts,
  };
};

export const getFilemakerEmailCampaignDeliveryAttemptsForDelivery = (
  registry: FilemakerEmailCampaignDeliveryAttemptRegistry,
  deliveryId: string
): FilemakerEmailCampaignDeliveryAttempt[] =>
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(registry).attempts.filter(
    (attempt: FilemakerEmailCampaignDeliveryAttempt): boolean => attempt.deliveryId === deliveryId
  );

export const parseFilemakerEmailCampaignDeliveryAttemptRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignDeliveryAttemptRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  return normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(parsed);
};

export const toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry = (
  value: FilemakerEmailCampaignDeliveryAttemptRegistry | null | undefined
): FilemakerEmailCampaignDeliveryAttemptRegistry =>
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(value);
