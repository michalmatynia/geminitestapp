import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignAudienceRule,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignLaunchRule,
  FilemakerEmailCampaignRecurringRule,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignSuppressionEntry,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerEmailCampaignRunStatus,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailStatus,
  FilemakerPartyKind,
} from '../types';
import type { FilemakerEmailCampaignAudienceRecipient } from '../types/campaigns';

export const FILEMAKER_CAMPAIGN_VERSION = 1;
export const FILEMAKER_CAMPAIGN_RUN_VERSION = 1;
export const FILEMAKER_CAMPAIGN_DELIVERY_VERSION = 1;
export const FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION = 1;
export const FILEMAKER_CAMPAIGN_EVENT_VERSION = 1;
export const FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION = 1;
export const FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS = 3;

const FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS: FilemakerPartyKind[] = ['person', 'organization'];
const FILEMAKER_CAMPAIGN_AUDIENCE_EMAIL_STATUSES: FilemakerEmailStatus[] = [
  'active',
  'inactive',
  'bounced',
  'unverified',
];
const FILEMAKER_CAMPAIGN_EVENT_TYPES: FilemakerEmailCampaignEvent['type'][] = [
  'created',
  'updated',
  'unsubscribed',
  'resubscribed',
  'opened',
  'clicked',
  'launched',
  'processing_started',
  'delivery_sent',
  'delivery_failed',
  'delivery_bounced',
  'status_changed',
  'paused',
  'completed',
  'failed',
  'cancelled',
];
const FILEMAKER_CAMPAIGN_SUPPRESSION_REASONS: FilemakerEmailCampaignSuppressionEntry['reason'][] = [
  'manual_block',
  'unsubscribed',
  'bounced',
];

const normalizeStringList = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const unique = new Set<string>();
  input.forEach((entry: unknown) => {
    const normalized = normalizeString(entry);
    if (normalized) {
      unique.add(normalized);
    }
  });
  return Array.from(unique);
};

const normalizePartyKinds = (input: unknown): FilemakerPartyKind[] => {
  if (!Array.isArray(input)) return [...FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS];
  const values = input
    .map((entry: unknown) => normalizeString(entry).toLowerCase())
    .filter((entry: string): entry is FilemakerPartyKind =>
      FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS.includes(entry as FilemakerPartyKind)
    );
  return values.length > 0 ? Array.from(new Set(values)) : [...FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS];
};

const normalizeEmailStatuses = (input: unknown): FilemakerEmailStatus[] => {
  if (!Array.isArray(input)) return ['active'];
  const values = input
    .map((entry: unknown) => normalizeString(entry).toLowerCase())
    .filter((entry: string): entry is FilemakerEmailStatus =>
      FILEMAKER_CAMPAIGN_AUDIENCE_EMAIL_STATUSES.includes(entry as FilemakerEmailStatus)
    );
  return values.length > 0 ? Array.from(new Set(values)) : ['active'];
};

const normalizePartyReferences = (
  input: unknown
): FilemakerEmailCampaignAudienceRule['includePartyReferences'] => {
  if (!Array.isArray(input)) return [];
  const references: FilemakerEmailCampaignAudienceRule['includePartyReferences'] = [];
  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const partyKind = normalizeString(record['partyKind']).toLowerCase();
    const partyId = normalizeString(record['partyId']);
    if (
      !partyId ||
      !FILEMAKER_CAMPAIGN_AUDIENCE_PARTY_KINDS.includes(partyKind as FilemakerPartyKind)
    ) {
      return;
    }
    const dedupeKey = `${partyKind}:${partyId}`;
    if (references.some((reference) => `${reference.kind}:${reference.id}` === dedupeKey)) {
      return;
    }
    references.push({
      kind: partyKind as FilemakerPartyKind,
      id: partyId,
    });
  });
  return references;
};

const normalizeNullablePositiveInt = (input: unknown): number | null => {
  if (input == null || input === '') return null;
  const value = Math.trunc(Number(input));
  return Number.isFinite(value) && value > 0 ? value : null;
};

const normalizeNullableBoundedInt = (
  input: unknown,
  min: number,
  max: number
): number | null => {
  if (input == null || input === '') return null;
  const value = Math.trunc(Number(input));
  if (!Number.isFinite(value) || value < min || value > max) {
    return null;
  }
  return value;
};

const normalizeRecurringRule = (input: unknown): FilemakerEmailCampaignRecurringRule | null => {
  if (!input || typeof input !== 'object') return null;
  const record = input as Record<string, unknown>;
  const frequency = normalizeString(record['frequency']).toLowerCase();
  const interval = Math.trunc(Number(record['interval']));
  const weekdays = Array.isArray(record['weekdays'])
    ? Array.from(
        new Set(
          record['weekdays']
            .map((entry: unknown) => Math.trunc(Number(entry)))
            .filter((entry: number) => Number.isFinite(entry) && entry >= 0 && entry <= 6)
        )
      )
    : [];

  return {
    frequency:
      frequency === 'weekly' || frequency === 'monthly' ? frequency : 'daily',
    interval: Number.isFinite(interval) && interval > 0 ? interval : 1,
    weekdays,
    hourStart: normalizeNullableBoundedInt(record['hourStart'], 0, 23),
    hourEnd: normalizeNullableBoundedInt(record['hourEnd'], 0, 23),
  };
};

const isFilemakerEmailCampaignEventType = (
  value: string
): value is FilemakerEmailCampaignEvent['type'] =>
  FILEMAKER_CAMPAIGN_EVENT_TYPES.includes(value as FilemakerEmailCampaignEvent['type']);

const isFilemakerEmailCampaignSuppressionReason = (
  value: string
): value is FilemakerEmailCampaignSuppressionEntry['reason'] =>
  FILEMAKER_CAMPAIGN_SUPPRESSION_REASONS.includes(
    value as FilemakerEmailCampaignSuppressionEntry['reason']
  );

export const createCampaignId = (name: string): string =>
  `filemaker-email-campaign-${toIdToken(name) || 'untitled'}`;

export const normalizeCampaignAudienceRule = (
  input: Partial<FilemakerEmailCampaignAudienceRule> | null | undefined
): FilemakerEmailCampaignAudienceRule => {
  return {
    partyKinds: normalizePartyKinds(input?.partyKinds),
    emailStatuses: normalizeEmailStatuses(input?.emailStatuses),
    includePartyReferences: normalizePartyReferences(input?.includePartyReferences),
    excludePartyReferences: normalizePartyReferences(input?.excludePartyReferences),
    organizationIds: normalizeStringList(input?.organizationIds),
    eventIds: normalizeStringList(input?.eventIds),
    countries: normalizeStringList(input?.countries),
    cities: normalizeStringList(input?.cities),
    dedupeByEmail: input?.dedupeByEmail ?? true,
    limit: normalizeNullablePositiveInt(input?.limit),
  };
};

export const normalizeCampaignLaunchRule = (
  input: Partial<FilemakerEmailCampaignLaunchRule> | null | undefined
): FilemakerEmailCampaignLaunchRule => {
  const mode = normalizeString(input?.mode).toLowerCase();
  return {
    mode:
      mode === 'scheduled' || mode === 'recurring' ? mode : 'manual',
    scheduledAt: normalizeString(input?.scheduledAt) || null,
    recurring: normalizeRecurringRule(input?.recurring),
    minAudienceSize: Math.max(0, Math.trunc(Number(input?.minAudienceSize) || 0)),
    requireApproval: input?.requireApproval ?? false,
    onlyWeekdays: input?.onlyWeekdays ?? false,
    allowedHourStart: normalizeNullableBoundedInt(input?.allowedHourStart, 0, 23),
    allowedHourEnd: normalizeNullableBoundedInt(input?.allowedHourEnd, 0, 23),
    pauseOnBounceRatePercent:
      input?.pauseOnBounceRatePercent == null || input.pauseOnBounceRatePercent === ''
        ? null
        : Math.min(100, Math.max(0, Number(input.pauseOnBounceRatePercent))),
    timezone: normalizeString(input?.timezone) || 'UTC',
  };
};

export const createFilemakerEmailCampaign = (input?: Partial<FilemakerEmailCampaign>): FilemakerEmailCampaign => {
  const now = new Date().toISOString();
  const name = normalizeString(input?.name) || 'Untitled campaign';
  const status = normalizeString(input?.status).toLowerCase();

  return {
    id: normalizeString(input?.id) || createCampaignId(name),
    name,
    description: normalizeString(input?.description) || null,
    status:
      status === 'draft' || status === 'active' || status === 'paused' || status === 'archived'
        ? status
        : 'draft',
    subject: normalizeString(input?.subject),
    previewText: normalizeString(input?.previewText) || null,
    fromName: normalizeString(input?.fromName) || null,
    replyToEmail: normalizeString(input?.replyToEmail).toLowerCase() || null,
    bodyText: normalizeString(input?.bodyText) || null,
    bodyHtml: normalizeString(input?.bodyHtml) || null,
    audience: normalizeCampaignAudienceRule(input?.audience),
    launch: normalizeCampaignLaunchRule(input?.launch),
    approvalGrantedAt: normalizeString(input?.approvalGrantedAt) || null,
    approvedBy: normalizeString(input?.approvedBy) || null,
    lastLaunchedAt: normalizeString(input?.lastLaunchedAt) || null,
    lastEvaluatedAt: normalizeString(input?.lastEvaluatedAt) || null,
    createdAt: input?.createdAt ?? now,
    updatedAt: input?.updatedAt ?? input?.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignRegistry = (): FilemakerEmailCampaignRegistry => ({
  version: FILEMAKER_CAMPAIGN_VERSION,
  campaigns: [],
});

export const normalizeFilemakerEmailCampaignRegistry = (
  value: FilemakerEmailCampaignRegistry | null | undefined
): FilemakerEmailCampaignRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawCampaigns = Array.isArray(record['campaigns']) ? record['campaigns'] : [];
  const usedIds = new Set<string>();
  const campaigns = rawCampaigns.map((entry: unknown, index: number): FilemakerEmailCampaign => {
    const campaign = createFilemakerEmailCampaign(
      entry && typeof entry === 'object' ? (entry as Partial<FilemakerEmailCampaign>) : undefined
    );
    const baseId = normalizeString(campaign.id) || createCampaignId(campaign.name || `campaign-${index + 1}`);
    let resolvedId = baseId;
    if (usedIds.has(resolvedId)) {
      let suffix = 2;
      while (usedIds.has(`${baseId}-${suffix}`)) {
        suffix += 1;
      }
      resolvedId = `${baseId}-${suffix}`;
    }
    usedIds.add(resolvedId);
    return {
      ...campaign,
      id: resolvedId,
    };
  });

  return {
    version: FILEMAKER_CAMPAIGN_VERSION,
    campaigns,
  };
};

const sortRegistryEntriesNewestFirst = <
  T extends {
    updatedAt?: string | null | undefined;
    createdAt?: string | null | undefined;
  },
>(
  entries: T[]
): T[] =>
  [...entries].sort((left: T, right: T): number => {
    const leftTimestamp = Date.parse(left.updatedAt ?? left.createdAt ?? '');
    const rightTimestamp = Date.parse(right.updatedAt ?? right.createdAt ?? '');
    const normalizedLeft = Number.isNaN(leftTimestamp) ? 0 : leftTimestamp;
    const normalizedRight = Number.isNaN(rightTimestamp) ? 0 : rightTimestamp;
    return normalizedRight - normalizedLeft;
  });

const parseCampaignRegistryJson = (raw: string | null | undefined): unknown => {
  if (typeof raw !== 'string') return null;
  const trimmedRaw = raw.trim();
  if (!trimmedRaw) return null;

  try {
    return JSON.parse(trimmedRaw) as unknown;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

const dedupeByNormalizedId = <T extends { id: string }>(entries: T[]): T[] => {
  const uniqueById = new Map<string, T>();
  entries.forEach((entry: T) => {
    uniqueById.set(normalizeString(entry.id) || entry.id, entry);
  });
  return Array.from(uniqueById.values());
};

export const parseFilemakerEmailCampaignRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (!parsed) return createDefaultFilemakerEmailCampaignRegistry();
  return normalizeFilemakerEmailCampaignRegistry(parsed);
};

export const toPersistedFilemakerEmailCampaignRegistry = (
  value: FilemakerEmailCampaignRegistry | null | undefined
): FilemakerEmailCampaignRegistry => normalizeFilemakerEmailCampaignRegistry(value);

export const createFilemakerEmailCampaignRun = (
  input: Partial<FilemakerEmailCampaignRun> & Pick<FilemakerEmailCampaignRun, 'campaignId'>
): FilemakerEmailCampaignRun => {
  const now = new Date().toISOString();
  const status = normalizeString(input.status).toLowerCase();
  const mode = normalizeString(input.mode).toLowerCase();
  return {
    id:
      normalizeString(input.id) ||
      `filemaker-email-campaign-run-${toIdToken(`${input.campaignId}-${now}`) || 'entry'}`,
    campaignId: normalizeString(input.campaignId),
    mode: mode === 'dry_run' ? 'dry_run' : 'live',
    status:
      status === 'queued' ||
      status === 'running' ||
      status === 'completed' ||
      status === 'failed' ||
      status === 'cancelled' ||
      status === 'pending'
        ? status
        : 'pending',
    launchReason: normalizeString(input.launchReason) || null,
    startedAt: normalizeString(input.startedAt) || null,
    completedAt: normalizeString(input.completedAt) || null,
    recipientCount: Math.max(0, Math.trunc(Number(input.recipientCount) || 0)),
    deliveredCount: Math.max(0, Math.trunc(Number(input.deliveredCount) || 0)),
    failedCount: Math.max(0, Math.trunc(Number(input.failedCount) || 0)),
    skippedCount: Math.max(0, Math.trunc(Number(input.skippedCount) || 0)),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignRunRegistry =
  (): FilemakerEmailCampaignRunRegistry => ({
    version: FILEMAKER_CAMPAIGN_RUN_VERSION,
    runs: [],
  });

export const normalizeFilemakerEmailCampaignRunRegistry = (
  value: FilemakerEmailCampaignRunRegistry | null | undefined
): FilemakerEmailCampaignRunRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignRunRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawRuns = Array.isArray(record['runs']) ? record['runs'] : [];
  const runs = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(
      rawRuns.map((entry: unknown): FilemakerEmailCampaignRun =>
        createFilemakerEmailCampaignRun(
          entry && typeof entry === 'object'
            ? (entry as Partial<FilemakerEmailCampaignRun> & Pick<FilemakerEmailCampaignRun, 'campaignId'>)
            : { campaignId: '' }
        )
      )
    )
  );

  return {
    version: FILEMAKER_CAMPAIGN_RUN_VERSION,
    runs,
  };
};

export const parseFilemakerEmailCampaignRunRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignRunRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (!parsed) return createDefaultFilemakerEmailCampaignRunRegistry();
  return normalizeFilemakerEmailCampaignRunRegistry(parsed as FilemakerEmailCampaignRunRegistry);
};

export const toPersistedFilemakerEmailCampaignRunRegistry = (
  value: FilemakerEmailCampaignRunRegistry | null | undefined
): FilemakerEmailCampaignRunRegistry => normalizeFilemakerEmailCampaignRunRegistry(value);

export const createFilemakerEmailCampaignDelivery = (
  input: Partial<FilemakerEmailCampaignDelivery> &
    Pick<
      FilemakerEmailCampaignDelivery,
      'campaignId' | 'runId' | 'emailAddress' | 'partyKind' | 'partyId'
    >
): FilemakerEmailCampaignDelivery => {
  const now = new Date().toISOString();
  const normalizedStatus = normalizeString(input.status).toLowerCase();
  const normalizedProvider = normalizeString(input.provider).toLowerCase();
  const normalizedFailureCategory = normalizeString(input.failureCategory).toLowerCase();
  return {
    id:
      normalizeString(input.id) ||
      `filemaker-email-campaign-delivery-${toIdToken(
        `${input.runId}-${input.partyKind}-${input.partyId}-${input.emailAddress}`
      ) || 'entry'}`,
    campaignId: normalizeString(input.campaignId),
    runId: normalizeString(input.runId),
    emailId: normalizeString(input.emailId) || null,
    emailAddress: normalizeString(input.emailAddress).toLowerCase(),
    partyKind: input.partyKind,
    partyId: normalizeString(input.partyId),
    status:
      normalizedStatus === 'queued' ||
      normalizedStatus === 'sent' ||
      normalizedStatus === 'failed' ||
      normalizedStatus === 'skipped' ||
      normalizedStatus === 'bounced'
        ? normalizedStatus
        : 'queued',
    provider:
      normalizedProvider === 'webhook' || normalizedProvider === 'smtp'
        ? normalizedProvider
        : null,
    failureCategory:
      normalizedFailureCategory === 'soft_bounce' ||
      normalizedFailureCategory === 'hard_bounce' ||
      normalizedFailureCategory === 'provider_rejected' ||
      normalizedFailureCategory === 'rate_limited' ||
      normalizedFailureCategory === 'timeout' ||
      normalizedFailureCategory === 'invalid_recipient' ||
      normalizedFailureCategory === 'unknown'
        ? normalizedFailureCategory
        : null,
    providerMessage: normalizeString(input.providerMessage) || null,
    lastError: normalizeString(input.lastError) || null,
    sentAt: normalizeString(input.sentAt) || null,
    nextRetryAt: normalizeString(input.nextRetryAt) || null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignDeliveryRegistry =
  (): FilemakerEmailCampaignDeliveryRegistry => ({
    version: FILEMAKER_CAMPAIGN_DELIVERY_VERSION,
    deliveries: [],
  });

export const normalizeFilemakerEmailCampaignDeliveryRegistry = (
  value: FilemakerEmailCampaignDeliveryRegistry | null | undefined
): FilemakerEmailCampaignDeliveryRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignDeliveryRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawDeliveries = Array.isArray(record['deliveries']) ? record['deliveries'] : [];
  const deliveries = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(
      rawDeliveries.map((entry: unknown): FilemakerEmailCampaignDelivery =>
        createFilemakerEmailCampaignDelivery(
          entry && typeof entry === 'object'
            ? (entry as Partial<FilemakerEmailCampaignDelivery> &
                Pick<
                  FilemakerEmailCampaignDelivery,
                  'campaignId' | 'runId' | 'emailAddress' | 'partyKind' | 'partyId'
                >)
            : {
                campaignId: '',
                runId: '',
                emailAddress: '',
                partyKind: 'person',
                partyId: '',
              }
        )
      )
    )
  );

  return {
    version: FILEMAKER_CAMPAIGN_DELIVERY_VERSION,
    deliveries,
  };
};

export const parseFilemakerEmailCampaignDeliveryRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignDeliveryRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (!parsed) return createDefaultFilemakerEmailCampaignDeliveryRegistry();
  return normalizeFilemakerEmailCampaignDeliveryRegistry(
    parsed as FilemakerEmailCampaignDeliveryRegistry
  );
};

export const toPersistedFilemakerEmailCampaignDeliveryRegistry = (
  value: FilemakerEmailCampaignDeliveryRegistry | null | undefined
): FilemakerEmailCampaignDeliveryRegistry =>
  normalizeFilemakerEmailCampaignDeliveryRegistry(value);

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
  const normalizedStatus = normalizeString(input.status).toLowerCase();
  const normalizedProvider = normalizeString(input.provider).toLowerCase();
  const normalizedFailureCategory = normalizeString(input.failureCategory).toLowerCase();
  return {
    id:
      normalizeString(input.id) ||
      `filemaker-email-campaign-delivery-attempt-${toIdToken(
        `${input.deliveryId}-${input.attemptNumber}-${input.status}-${now}`
      ) || 'entry'}`,
    campaignId: normalizeString(input.campaignId),
    runId: normalizeString(input.runId),
    deliveryId: normalizeString(input.deliveryId),
    emailAddress: normalizeString(input.emailAddress).toLowerCase(),
    partyKind: input.partyKind,
    partyId: normalizeString(input.partyId),
    attemptNumber: Math.max(1, Math.trunc(Number(input.attemptNumber) || 1)),
    status:
      normalizedStatus === 'sent' ||
      normalizedStatus === 'failed' ||
      normalizedStatus === 'bounced'
        ? normalizedStatus
        : 'failed',
    provider:
      normalizedProvider === 'webhook' || normalizedProvider === 'smtp'
        ? normalizedProvider
        : null,
    failureCategory:
      normalizedFailureCategory === 'soft_bounce' ||
      normalizedFailureCategory === 'hard_bounce' ||
      normalizedFailureCategory === 'provider_rejected' ||
      normalizedFailureCategory === 'rate_limited' ||
      normalizedFailureCategory === 'timeout' ||
      normalizedFailureCategory === 'invalid_recipient' ||
      normalizedFailureCategory === 'unknown'
        ? normalizedFailureCategory
        : null,
    providerMessage: normalizeString(input.providerMessage) || null,
    errorMessage: normalizeString(input.errorMessage) || null,
    attemptedAt: normalizeString(input.attemptedAt) || null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignDeliveryAttemptRegistry =
  (): FilemakerEmailCampaignDeliveryAttemptRegistry => ({
    version: FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION,
    attempts: [],
  });

export const normalizeFilemakerEmailCampaignDeliveryAttemptRegistry = (
  value: FilemakerEmailCampaignDeliveryAttemptRegistry | null | undefined
): FilemakerEmailCampaignDeliveryAttemptRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignDeliveryAttemptRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawAttempts = Array.isArray(record['attempts']) ? record['attempts'] : [];
  const attempts = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(
      rawAttempts.map((entry: unknown): FilemakerEmailCampaignDeliveryAttempt =>
        createFilemakerEmailCampaignDeliveryAttempt(
          entry && typeof entry === 'object'
            ? (entry as Partial<FilemakerEmailCampaignDeliveryAttempt> &
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
                >)
            : {
                campaignId: '',
                runId: '',
                deliveryId: '',
                emailAddress: '',
                partyKind: 'person',
                partyId: '',
                attemptNumber: 1,
                status: 'failed',
              }
        )
      )
    )
  );

  return {
    version: FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION,
    attempts,
  };
};

export const parseFilemakerEmailCampaignDeliveryAttemptRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignDeliveryAttemptRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (!parsed) return createDefaultFilemakerEmailCampaignDeliveryAttemptRegistry();
  return normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(
    parsed as FilemakerEmailCampaignDeliveryAttemptRegistry
  );
};

export const toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry = (
  value: FilemakerEmailCampaignDeliveryAttemptRegistry | null | undefined
): FilemakerEmailCampaignDeliveryAttemptRegistry =>
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(value);

export const createFilemakerEmailCampaignEvent = (
  input: Partial<FilemakerEmailCampaignEvent> &
    Pick<FilemakerEmailCampaignEvent, 'campaignId' | 'type' | 'message'>
): FilemakerEmailCampaignEvent => {
  const now = new Date().toISOString();
  const normalizedType = normalizeString(input.type).toLowerCase();
  return {
    id:
      normalizeString(input.id) ||
      `filemaker-email-campaign-event-${toIdToken(
        `${input.campaignId}-${input.runId || 'campaign'}-${input.deliveryId || 'timeline'}-${
          input.type
        }-${normalizeString(input.message) || 'event'}-${now}`
      ) || 'entry'}`,
    campaignId: normalizeString(input.campaignId),
    runId: normalizeString(input.runId) || null,
    deliveryId: normalizeString(input.deliveryId) || null,
    type: isFilemakerEmailCampaignEventType(normalizedType) ? normalizedType : 'status_changed',
    message: normalizeString(input.message),
    actor: normalizeString(input.actor) || null,
    targetUrl: normalizeString(input.targetUrl) || null,
    runStatus:
      normalizeString(input.runStatus).toLowerCase() === 'pending' ||
      normalizeString(input.runStatus).toLowerCase() === 'queued' ||
      normalizeString(input.runStatus).toLowerCase() === 'running' ||
      normalizeString(input.runStatus).toLowerCase() === 'completed' ||
      normalizeString(input.runStatus).toLowerCase() === 'failed' ||
      normalizeString(input.runStatus).toLowerCase() === 'cancelled'
        ? (normalizeString(input.runStatus).toLowerCase() as FilemakerEmailCampaignRunStatus)
        : null,
    deliveryStatus:
      normalizeString(input.deliveryStatus).toLowerCase() === 'queued' ||
      normalizeString(input.deliveryStatus).toLowerCase() === 'sent' ||
      normalizeString(input.deliveryStatus).toLowerCase() === 'failed' ||
      normalizeString(input.deliveryStatus).toLowerCase() === 'skipped' ||
      normalizeString(input.deliveryStatus).toLowerCase() === 'bounced'
        ? (
            normalizeString(input.deliveryStatus).toLowerCase() as FilemakerEmailCampaignDeliveryStatus
          )
        : null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignEventRegistry =
  (): FilemakerEmailCampaignEventRegistry => ({
    version: FILEMAKER_CAMPAIGN_EVENT_VERSION,
    events: [],
  });

export const normalizeFilemakerEmailCampaignEventRegistry = (
  value: FilemakerEmailCampaignEventRegistry | null | undefined
): FilemakerEmailCampaignEventRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignEventRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawEvents = Array.isArray(record['events']) ? record['events'] : [];
  const events = sortRegistryEntriesNewestFirst(
    dedupeByNormalizedId(
      rawEvents.map((entry: unknown): FilemakerEmailCampaignEvent =>
        createFilemakerEmailCampaignEvent(
          entry && typeof entry === 'object'
            ? (entry as Partial<FilemakerEmailCampaignEvent> &
                Pick<FilemakerEmailCampaignEvent, 'campaignId' | 'type' | 'message'>)
            : {
                campaignId: '',
                type: 'status_changed',
                message: '',
              }
        )
      )
    )
  );

  return {
    version: FILEMAKER_CAMPAIGN_EVENT_VERSION,
    events,
  };
};

export const parseFilemakerEmailCampaignEventRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignEventRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (!parsed) return createDefaultFilemakerEmailCampaignEventRegistry();
  return normalizeFilemakerEmailCampaignEventRegistry(parsed as FilemakerEmailCampaignEventRegistry);
};

export const toPersistedFilemakerEmailCampaignEventRegistry = (
  value: FilemakerEmailCampaignEventRegistry | null | undefined
): FilemakerEmailCampaignEventRegistry => normalizeFilemakerEmailCampaignEventRegistry(value);

export const createFilemakerEmailCampaignSuppressionEntry = (
  input: Partial<FilemakerEmailCampaignSuppressionEntry> &
    Pick<FilemakerEmailCampaignSuppressionEntry, 'emailAddress' | 'reason'>
): FilemakerEmailCampaignSuppressionEntry => {
  const now = new Date().toISOString();
  const normalizedReason = normalizeString(input.reason).toLowerCase();
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  return {
    id:
      normalizeString(input.id) ||
      `filemaker-email-campaign-suppression-${toIdToken(
        `${normalizedEmailAddress}-${normalizedReason || 'manual'}`
      ) || 'entry'}`,
    emailAddress: normalizedEmailAddress,
    reason: isFilemakerEmailCampaignSuppressionReason(normalizedReason)
      ? normalizedReason
      : 'manual_block',
    actor: normalizeString(input.actor) || null,
    notes: normalizeString(input.notes) || null,
    campaignId: normalizeString(input.campaignId) || null,
    runId: normalizeString(input.runId) || null,
    deliveryId: normalizeString(input.deliveryId) || null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? input.createdAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignSuppressionRegistry =
  (): FilemakerEmailCampaignSuppressionRegistry => ({
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: [],
  });

export const normalizeFilemakerEmailCampaignSuppressionRegistry = (
  value: FilemakerEmailCampaignSuppressionRegistry | null | undefined
): FilemakerEmailCampaignSuppressionRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignSuppressionRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawEntries = Array.isArray(record['entries']) ? record['entries'] : [];
  const newestFirstEntries = sortRegistryEntriesNewestFirst(
    rawEntries.map((entry: unknown): FilemakerEmailCampaignSuppressionEntry =>
      createFilemakerEmailCampaignSuppressionEntry(
        entry && typeof entry === 'object'
          ? (entry as Partial<FilemakerEmailCampaignSuppressionEntry> &
              Pick<FilemakerEmailCampaignSuppressionEntry, 'emailAddress' | 'reason'>)
          : {
              emailAddress: '',
              reason: 'manual_block',
            }
      )
    )
  );

  const entries = Array.from(
    newestFirstEntries.reduce((uniqueEntries, entry) => {
      const normalizedEmail = normalizeString(entry.emailAddress).toLowerCase();
      if (!normalizedEmail || uniqueEntries.has(normalizedEmail)) return uniqueEntries;
      uniqueEntries.set(normalizedEmail, entry);
      return uniqueEntries;
    }, new Map<string, FilemakerEmailCampaignSuppressionEntry>()).values()
  );

  return {
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries,
  };
};

export const parseFilemakerEmailCampaignSuppressionRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignSuppressionRegistry => {
  const parsed = parseCampaignRegistryJson(raw);
  if (!parsed) return createDefaultFilemakerEmailCampaignSuppressionRegistry();
  return normalizeFilemakerEmailCampaignSuppressionRegistry(
    parsed as FilemakerEmailCampaignSuppressionRegistry
  );
};

export const toPersistedFilemakerEmailCampaignSuppressionRegistry = (
  value: FilemakerEmailCampaignSuppressionRegistry | null | undefined
): FilemakerEmailCampaignSuppressionRegistry =>
  normalizeFilemakerEmailCampaignSuppressionRegistry(value);

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

export const getFilemakerEmailCampaignDeliveriesForRun = (
  registry: FilemakerEmailCampaignDeliveryRegistry,
  runId: string
): FilemakerEmailCampaignDelivery[] =>
  normalizeFilemakerEmailCampaignDeliveryRegistry(registry).deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.runId === runId
  );

export const getFilemakerEmailCampaignDeliveryAttemptsForDelivery = (
  registry: FilemakerEmailCampaignDeliveryAttemptRegistry,
  deliveryId: string
): FilemakerEmailCampaignDeliveryAttempt[] =>
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(registry).attempts.filter(
    (attempt: FilemakerEmailCampaignDeliveryAttempt): boolean => attempt.deliveryId === deliveryId
  );

export const getFilemakerEmailCampaignSuppressionByAddress = (
  registry: FilemakerEmailCampaignSuppressionRegistry,
  emailAddress: string
): FilemakerEmailCampaignSuppressionEntry | null => {
  const normalizedEmailAddress = normalizeString(emailAddress).toLowerCase();
  if (!normalizedEmailAddress) return null;
  return (
    normalizeFilemakerEmailCampaignSuppressionRegistry(registry).entries.find(
      (entry: FilemakerEmailCampaignSuppressionEntry): boolean =>
        entry.emailAddress === normalizedEmailAddress
    ) ?? null
  );
};

export const upsertFilemakerEmailCampaignSuppressionEntry = (input: {
  registry: FilemakerEmailCampaignSuppressionRegistry;
  entry: FilemakerEmailCampaignSuppressionEntry;
}): FilemakerEmailCampaignSuppressionRegistry =>
  normalizeFilemakerEmailCampaignSuppressionRegistry({
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: normalizeFilemakerEmailCampaignSuppressionRegistry(input.registry).entries
      .filter(
        (existingEntry: FilemakerEmailCampaignSuppressionEntry): boolean =>
          existingEntry.emailAddress !== normalizeString(input.entry.emailAddress).toLowerCase()
      )
      .concat(createFilemakerEmailCampaignSuppressionEntry(input.entry)),
  });

export const removeFilemakerEmailCampaignSuppressionEntryByAddress = (input: {
  registry: FilemakerEmailCampaignSuppressionRegistry;
  emailAddress: string;
}): FilemakerEmailCampaignSuppressionRegistry => {
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  return normalizeFilemakerEmailCampaignSuppressionRegistry({
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: normalizeFilemakerEmailCampaignSuppressionRegistry(input.registry).entries.filter(
      (entry: FilemakerEmailCampaignSuppressionEntry): boolean =>
        entry.emailAddress !== normalizedEmailAddress
    ),
  });
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

export const isFilemakerEmailCampaignRetryableFailureCategory = (
  category: FilemakerEmailCampaignDelivery['failureCategory']
): boolean =>
  category === 'soft_bounce' ||
  category === 'provider_rejected' ||
  category === 'rate_limited' ||
  category === 'timeout' ||
  category === 'unknown';

export const resolveFilemakerEmailCampaignRetryDelayForAttemptCount = (
  attemptCount: number
): number => {
  if (attemptCount <= 1) return 60_000;
  if (attemptCount === 2) return 5 * 60_000;
  if (attemptCount === 3) return 15 * 60_000;
  return 60 * 60_000;
};

export const resolveFilemakerEmailCampaignRetryableDeliveries = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  maxAttempts?: number;
}): {
  retryableDeliveries: FilemakerEmailCampaignDelivery[];
  exhaustedDeliveries: FilemakerEmailCampaignDelivery[];
} => {
  const maxAttempts = input.maxAttempts ?? FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS;
  const attemptRegistry = normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(input.attemptRegistry);
  const retryableDeliveries: FilemakerEmailCampaignDelivery[] = [];
  const exhaustedDeliveries: FilemakerEmailCampaignDelivery[] = [];

  input.deliveries.forEach((delivery: FilemakerEmailCampaignDelivery) => {
    if (
      (delivery.status !== 'failed' && delivery.status !== 'bounced') ||
      !isFilemakerEmailCampaignRetryableFailureCategory(delivery.failureCategory)
    ) {
      return;
    }

    const attemptCount = getFilemakerEmailCampaignDeliveryAttemptsForDelivery(
      attemptRegistry,
      delivery.id
    ).length;
    if (attemptCount < maxAttempts) {
      retryableDeliveries.push(delivery);
      return;
    }
    exhaustedDeliveries.push(delivery);
  });

  return { retryableDeliveries, exhaustedDeliveries };
};

export const resolveFilemakerEmailCampaignRetryDelayMs = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  maxAttempts?: number;
}): number | null => {
  const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries(input);
  if (retrySummary.retryableDeliveries.length === 0) return null;
  const attemptRegistry = normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(input.attemptRegistry);
  return retrySummary.retryableDeliveries.reduce<number | null>((smallestDelay, delivery) => {
    const attemptCount = getFilemakerEmailCampaignDeliveryAttemptsForDelivery(
      attemptRegistry,
      delivery.id
    ).length;
    const nextDelay = resolveFilemakerEmailCampaignRetryDelayForAttemptCount(attemptCount);
    if (smallestDelay == null) return nextDelay;
    return Math.min(smallestDelay, nextDelay);
  }, null);
};
