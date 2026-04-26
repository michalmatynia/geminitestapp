import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import {
  type FilemakerEmailCampaignDelivery,
  type FilemakerEmailCampaignDeliveryRegistry,
  type FilemakerEmailCampaignRun,
  type FilemakerEmailCampaignRunStatus,
} from '../types';
import type { FilemakerEmailCampaignAudienceRecipient } from '../types/campaigns';
import {
  FILEMAKER_CAMPAIGN_DELIVERY_VERSION,
} from './campaign-factories.constants';
import {
  sortRegistryEntriesNewestFirst,
  parseCampaignRegistryJson,
  dedupeByNormalizedId,
} from './campaign-factory-utils.helpers';

const resolveDeliveryId = (input: Partial<FilemakerEmailCampaignDelivery>): string => {
  const id = normalizeString(input.id);
  if (id !== '') return id;
  const token = toIdToken(`${input.runId}-${input.partyKind}-${input.partyId}-${input.emailAddress}`);
  return `filemaker-email-campaign-delivery-${token !== '' ? token : 'entry'}`;
};

const resolveDeliveryStatus = (status: string): FilemakerEmailCampaignDelivery['status'] => {
  const normalized = normalizeString(status).toLowerCase();
  const valid = ['queued', 'sent', 'failed', 'skipped', 'bounced'];
  if (valid.includes(normalized)) return normalized as FilemakerEmailCampaignDelivery['status'];
  return 'queued';
};

const resolveDeliveryProvider = (
  provider: string | undefined
): FilemakerEmailCampaignDelivery['provider'] => {
  const normalized = normalizeString(provider).toLowerCase();
  if (normalized === 'webhook' || normalized === 'smtp') {
    return normalized as FilemakerEmailCampaignDelivery['provider'];
  }
  return null;
};

const resolveFailureCategory = (
  category: string | undefined
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

const resolveDeliveryTimes = (
  input: Partial<FilemakerEmailCampaignDelivery>
): {
  sentAt: string | null;
  nextRetryAt: string | null;
} => {
  const sentAt = normalizeString(input.sentAt);
  const nextRetryAt = normalizeString(input.nextRetryAt);
  return {
    sentAt: sentAt !== '' ? sentAt : null,
    nextRetryAt: nextRetryAt !== '' ? nextRetryAt : null,
  };
};

const resolveDeliveryErrors = (
  input: Partial<FilemakerEmailCampaignDelivery>
): {
  providerMessage: string | null;
  lastError: string | null;
} => {
  const providerMessage = normalizeString(input.providerMessage);
  const lastError = normalizeString(input.lastError);
  return {
    providerMessage: providerMessage !== '' ? providerMessage : null,
    lastError: lastError !== '' ? lastError : null,
  };
};

const resolveDeliveryContentMetadata = (
  input: Partial<FilemakerEmailCampaignDelivery>
): Pick<
  FilemakerEmailCampaignDelivery,
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

export const createFilemakerEmailCampaignDelivery = (
  input: Partial<FilemakerEmailCampaignDelivery> &
    Pick<
      FilemakerEmailCampaignDelivery,
      'campaignId' | 'runId' | 'emailAddress' | 'partyKind' | 'partyId'
    >
): FilemakerEmailCampaignDelivery => {
  const now = new Date().toISOString();
  const times = resolveDeliveryTimes(input);
  const errors = resolveDeliveryErrors(input);
  const contentMetadata = resolveDeliveryContentMetadata(input);
  const emailId = normalizeString(input.emailId);

  return {
    id: resolveDeliveryId(input),
    campaignId: normalizeString(input.campaignId),
    runId: normalizeString(input.runId),
    emailId: emailId !== '' ? emailId : null,
    emailAddress: normalizeString(input.emailAddress).toLowerCase(),
    partyKind: input.partyKind,
    partyId: normalizeString(input.partyId),
    status: resolveDeliveryStatus(input.status ?? ''),
    provider: resolveDeliveryProvider(input.provider),
    failureCategory: resolveFailureCategory(input.failureCategory),
    ...contentMetadata,
    ...errors,
    ...times,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignDeliveryRegistry =
  (): FilemakerEmailCampaignDeliveryRegistry => ({
    version: FILEMAKER_CAMPAIGN_DELIVERY_VERSION,
    deliveries: [],
  });

const normalizeDeliveryEntry = (entry: unknown): FilemakerEmailCampaignDelivery => {
  if (entry !== null && typeof entry === 'object') {
    return createFilemakerEmailCampaignDelivery(
      entry as Partial<FilemakerEmailCampaignDelivery> &
        Pick<
          FilemakerEmailCampaignDelivery,
          'campaignId' | 'runId' | 'emailAddress' | 'partyKind' | 'partyId'
        >
    );
  }
  return {
    id: '',
    campaignId: '',
    runId: '',
    emailAddress: '',
    partyKind: 'person',
    partyId: '',
    status: 'queued',
    createdAt: '',
    updatedAt: '',
  };
};

export const normalizeFilemakerEmailCampaignDeliveryRegistry = (
  value: unknown
): FilemakerEmailCampaignDeliveryRegistry => {
  if (value === null || value === undefined || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignDeliveryRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawDeliveries = Array.isArray(record['deliveries']) ? record['deliveries'] : [];
  const deliveries = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(rawDeliveries.map(normalizeDeliveryEntry))
  );

  return {
    version: FILEMAKER_CAMPAIGN_DELIVERY_VERSION,
    deliveries,
  };
};

export const getFilemakerEmailCampaignDeliveriesForRun = (
  registry: FilemakerEmailCampaignDeliveryRegistry,
  runId: string
): FilemakerEmailCampaignDelivery[] =>
  normalizeFilemakerEmailCampaignDeliveryRegistry(registry).deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.runId === runId
  );

export const buildFilemakerEmailCampaignDeliveriesForPreview = (input: {
  campaignId: string;
  runId: string;
  preview: { recipients: FilemakerEmailCampaignAudienceRecipient[] };
  mode: FilemakerEmailCampaignRun['mode'];
}): FilemakerEmailCampaignDelivery[] => {
  const now = new Date().toISOString();
  return input.preview.recipients.map((recipient: FilemakerEmailCampaignAudienceRecipient) =>
    createFilemakerEmailCampaignDelivery({
      campaignId: input.campaignId,
      runId: input.runId,
      emailId: recipient.emailId,
      emailAddress: recipient.email,
      partyKind: recipient.partyKind,
      partyId: recipient.partyId,
      status: input.mode === 'dry_run' ? 'skipped' : 'queued',
      createdAt: now,
      updatedAt: now,
    })
  );
};

export const applyFilemakerEmailCampaignRunStatusToDeliveries = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  runStatus: FilemakerEmailCampaignRunStatus;
}): FilemakerEmailCampaignDelivery[] => {
  const now = new Date().toISOString();
  return input.deliveries.map((delivery: FilemakerEmailCampaignDelivery) => {
    if (input.runStatus === 'completed' || input.runStatus === 'cancelled') {
      return delivery.status === 'queued'
        ? { ...delivery, status: 'skipped', nextRetryAt: null, updatedAt: now }
        : delivery;
    }
    if (input.runStatus === 'failed') {
      return delivery.status === 'queued'
        ? {
            ...delivery,
            status: 'failed',
            nextRetryAt: null,
            lastError: delivery.lastError ?? 'Run was marked failed manually.',
            updatedAt: now,
          }
        : delivery;
    }
    return delivery;
  });
};

export const parseFilemakerEmailCampaignDeliveryRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignDeliveryRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  return normalizeFilemakerEmailCampaignDeliveryRegistry(parsed);
};

export const toPersistedFilemakerEmailCampaignDeliveryRegistry = (
  value: FilemakerEmailCampaignDeliveryRegistry | null | undefined
): FilemakerEmailCampaignDeliveryRegistry =>
  normalizeFilemakerEmailCampaignDeliveryRegistry(value);
