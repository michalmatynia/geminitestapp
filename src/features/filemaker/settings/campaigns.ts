import { validationError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { normalizeString, toIdToken } from '../filemaker-settings.helpers';
import {
  getFilemakerEmailById,
  getFilemakerOrganizationsForEvent,
} from './database-getters';
import { getFilemakerOrganizationById, getFilemakerPersonById } from './party-getters';
import type {
  FilemakerDatabase,
  FilemakerEmail,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignAudienceRule,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailCampaignLifecycleStatus,
  FilemakerEmailCampaignLaunchMode,
  FilemakerEmailCampaignLaunchRule,
  FilemakerEmailCampaignRecurringRule,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRunStatus,
  FilemakerPartyKind,
  FilemakerPartyReference,
} from '../types';

export type FilemakerEmailCampaignAudienceRecipient = {
  emailId: string;
  email: string;
  emailStatus: FilemakerEmail['status'];
  partyKind: FilemakerPartyKind;
  partyId: string;
  partyName: string;
  city: string;
  country: string;
  matchedEventIds: string[];
};

export type FilemakerEmailCampaignAudiencePreview = {
  recipients: FilemakerEmailCampaignAudienceRecipient[];
  excludedCount: number;
  dedupedCount: number;
  totalLinkedEmailCount: number;
  sampleRecipients: FilemakerEmailCampaignAudienceRecipient[];
};

export type FilemakerEmailCampaignLaunchEvaluation = {
  isEligible: boolean;
  blockers: string[];
  nextEligibleAt: string | null;
};

export type FilemakerEmailCampaignRunMetrics = {
  recipientCount: number;
  deliveredCount: number;
  failedCount: number;
  skippedCount: number;
};

const FILEMAKER_CAMPAIGN_VERSION = 1;
const FILEMAKER_CAMPAIGN_RUN_VERSION = 1;
const FILEMAKER_CAMPAIGN_DELIVERY_VERSION = 1;
const DEFAULT_TIMEZONE = 'UTC';
const FILEMAKER_ALLOWED_EMAIL_STATUSES: ReadonlyArray<FilemakerEmail['status']> = [
  'active',
  'inactive',
  'bounced',
  'unverified',
];

const createDefaultCampaignAudienceRule = (): FilemakerEmailCampaignAudienceRule => ({
  partyKinds: ['person', 'organization'],
  emailStatuses: ['active'],
  includePartyReferences: [],
  excludePartyReferences: [],
  organizationIds: [],
  eventIds: [],
  countries: [],
  cities: [],
  dedupeByEmail: true,
  limit: null,
});

const createDefaultCampaignRecurringRule = (): FilemakerEmailCampaignRecurringRule => ({
  frequency: 'weekly',
  interval: 1,
  weekdays: [1, 2, 3, 4, 5],
  hourStart: null,
  hourEnd: null,
});

const createDefaultCampaignLaunchRule = (): FilemakerEmailCampaignLaunchRule => ({
  mode: 'manual',
  scheduledAt: null,
  recurring: null,
  minAudienceSize: 1,
  requireApproval: false,
  onlyWeekdays: false,
  allowedHourStart: null,
  allowedHourEnd: null,
  pauseOnBounceRatePercent: null,
  timezone: DEFAULT_TIMEZONE,
});

const createCampaignId = (name: string): string => {
  const token = toIdToken(name);
  return `filemaker-email-campaign-${token || 'draft'}`;
};

const normalizePartyReference = (value: unknown): FilemakerPartyReference | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const kind = normalizeString(record['kind']).toLowerCase();
  const id = normalizeString(record['id']);
  if (!id || (kind !== 'person' && kind !== 'organization')) return null;
  const name = normalizeString(record['name']) || undefined;
  return {
    kind,
    id,
    ...(name ? { name } : {}),
  };
};

const normalizeStringList = (value: unknown): string[] => {
  const unique = new Set<string>();
  if (Array.isArray(value)) {
    value.forEach((entry: unknown): void => {
      const normalized = normalizeString(entry);
      if (!normalized) return;
      unique.add(normalized);
    });
  }
  return Array.from(unique);
};

const normalizePartyKinds = (value: unknown): FilemakerPartyKind[] => {
  const resolved = normalizeStringList(value).filter(
    (entry): entry is FilemakerPartyKind => entry === 'person' || entry === 'organization'
  );
  return resolved.length > 0 ? resolved : ['person', 'organization'];
};

const normalizeEmailStatuses = (value: unknown): FilemakerEmail['status'][] => {
  const resolved = normalizeStringList(value).filter(
    (entry): entry is FilemakerEmail['status'] =>
      FILEMAKER_ALLOWED_EMAIL_STATUSES.includes(entry as FilemakerEmail['status'])
  );
  return resolved.length > 0 ? resolved : ['active'];
};

const normalizePartyReferenceList = (value: unknown): FilemakerPartyReference[] => {
  const unique = new Set<string>();
  const references: FilemakerPartyReference[] = [];
  if (!Array.isArray(value)) return references;
  value.forEach((entry: unknown): void => {
    const reference = normalizePartyReference(entry);
    if (!reference) return;
    const key = `${reference.kind}:${reference.id}`;
    if (unique.has(key)) return;
    unique.add(key);
    references.push(reference);
  });
  return references;
};

const normalizeCampaignAudienceRule = (value: unknown): FilemakerEmailCampaignAudienceRule => {
  const defaults = createDefaultCampaignAudienceRule();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const record = value as Record<string, unknown>;
  const rawLimit = Number(record['limit']);

  return {
    partyKinds: normalizePartyKinds(record['partyKinds']),
    emailStatuses: normalizeEmailStatuses(record['emailStatuses']),
    includePartyReferences: normalizePartyReferenceList(record['includePartyReferences']),
    excludePartyReferences: normalizePartyReferenceList(record['excludePartyReferences']),
    organizationIds: normalizeStringList(record['organizationIds']),
    eventIds: normalizeStringList(record['eventIds']),
    countries: normalizeStringList(record['countries']),
    cities: normalizeStringList(record['cities']),
    dedupeByEmail: record['dedupeByEmail'] !== false,
    limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.trunc(rawLimit) : null,
  };
};

const normalizeCampaignRecurringRule = (
  value: unknown
): FilemakerEmailCampaignRecurringRule | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const defaults = createDefaultCampaignRecurringRule();
  const frequency = normalizeString(record['frequency']).toLowerCase();
  const rawInterval = Number(record['interval']);
  const weekdays = normalizeStringList(record['weekdays'])
    .map((entry: string): number => Number(entry))
    .filter((entry: number): boolean => Number.isInteger(entry) && entry >= 0 && entry <= 6);
  const hourStartRaw = Number(record['hourStart']);
  const hourEndRaw = Number(record['hourEnd']);

  return {
    frequency:
      frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly'
        ? frequency
        : defaults.frequency,
    interval: Number.isFinite(rawInterval) && rawInterval > 0 ? Math.trunc(rawInterval) : 1,
    weekdays: weekdays.length > 0 ? weekdays : defaults.weekdays,
    hourStart:
      Number.isFinite(hourStartRaw) && hourStartRaw >= 0 && hourStartRaw <= 23
        ? Math.trunc(hourStartRaw)
        : null,
    hourEnd:
      Number.isFinite(hourEndRaw) && hourEndRaw >= 0 && hourEndRaw <= 23
        ? Math.trunc(hourEndRaw)
        : null,
  };
};

const normalizeCampaignLaunchRule = (value: unknown): FilemakerEmailCampaignLaunchRule => {
  const defaults = createDefaultCampaignLaunchRule();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const record = value as Record<string, unknown>;
  const mode = normalizeString(record['mode']).toLowerCase();
  const minAudienceSizeRaw = Number(record['minAudienceSize']);
  const allowedHourStartRaw = Number(record['allowedHourStart']);
  const allowedHourEndRaw = Number(record['allowedHourEnd']);
  const pauseOnBounceRatePercentRaw = Number(record['pauseOnBounceRatePercent']);

  return {
    mode:
      mode === 'manual' || mode === 'scheduled' || mode === 'recurring'
        ? (mode as FilemakerEmailCampaignLaunchMode)
        : defaults.mode,
    scheduledAt: normalizeString(record['scheduledAt']) || null,
    recurring: normalizeCampaignRecurringRule(record['recurring']),
    minAudienceSize:
      Number.isFinite(minAudienceSizeRaw) && minAudienceSizeRaw >= 0
        ? Math.trunc(minAudienceSizeRaw)
        : defaults.minAudienceSize,
    requireApproval: Boolean(record['requireApproval']),
    onlyWeekdays: Boolean(record['onlyWeekdays']),
    allowedHourStart:
      Number.isFinite(allowedHourStartRaw) &&
      allowedHourStartRaw >= 0 &&
      allowedHourStartRaw <= 23
        ? Math.trunc(allowedHourStartRaw)
        : null,
    allowedHourEnd:
      Number.isFinite(allowedHourEndRaw) && allowedHourEndRaw >= 0 && allowedHourEndRaw <= 23
        ? Math.trunc(allowedHourEndRaw)
        : null,
    pauseOnBounceRatePercent:
      Number.isFinite(pauseOnBounceRatePercentRaw) &&
      pauseOnBounceRatePercentRaw >= 0 &&
      pauseOnBounceRatePercentRaw <= 100
        ? pauseOnBounceRatePercentRaw
        : null,
    timezone: normalizeString(record['timezone']) || DEFAULT_TIMEZONE,
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
        ? (status as FilemakerEmailCampaignLifecycleStatus)
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
    updatedAt: input?.updatedAt ?? now,
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

const parseJsonRecord = (
  raw: string | null | undefined,
  invalidMessage: string
): Record<string, unknown> | null => {
  if (typeof raw !== 'string') return null;
  const trimmedRaw = raw.trim();
  if (!trimmedRaw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmedRaw);
  } catch (error) {
    logClientError(error);
    throw validationError(invalidMessage, { reason: 'invalid_json' });
  }

  if (parsed === null) return null;
  if (typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw validationError(invalidMessage, { reason: 'invalid_root_type' });
  }
  return parsed as Record<string, unknown>;
};

export const parseFilemakerEmailCampaignRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignRegistry => {
  const parsed = parseJsonRecord(raw, 'Invalid Filemaker email campaign JSON payload.');
  return normalizeFilemakerEmailCampaignRegistry(
    parsed as FilemakerEmailCampaignRegistry | null | undefined
  );
};

export const toPersistedFilemakerEmailCampaignRegistry = (
  value: FilemakerEmailCampaignRegistry
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
        ? (status as FilemakerEmailCampaignRunStatus)
        : 'pending',
    launchReason: normalizeString(input.launchReason) || null,
    startedAt: normalizeString(input.startedAt) || null,
    completedAt: normalizeString(input.completedAt) || null,
    recipientCount: Math.max(0, Math.trunc(Number(input.recipientCount) || 0)),
    deliveredCount: Math.max(0, Math.trunc(Number(input.deliveredCount) || 0)),
    failedCount: Math.max(0, Math.trunc(Number(input.failedCount) || 0)),
    skippedCount: Math.max(0, Math.trunc(Number(input.skippedCount) || 0)),
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignRunRegistry =
  (): FilemakerEmailCampaignRunRegistry => ({
    version: FILEMAKER_CAMPAIGN_RUN_VERSION,
    runs: [],
  });

export const createFilemakerEmailCampaignDelivery = (
  input: Partial<FilemakerEmailCampaignDelivery> &
    Pick<
      FilemakerEmailCampaignDelivery,
      'campaignId' | 'runId' | 'emailAddress' | 'partyKind' | 'partyId'
    >
): FilemakerEmailCampaignDelivery => {
  const now = new Date().toISOString();
  const normalizedStatus = normalizeString(input.status).toLowerCase();
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
        ? (normalizedStatus as FilemakerEmailCampaignDeliveryStatus)
        : 'queued',
    providerMessage: normalizeString(input.providerMessage) || null,
    lastError: normalizeString(input.lastError) || null,
    sentAt: normalizeString(input.sentAt) || null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
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
  const usedIds = new Set<string>();
  const deliveries = rawDeliveries.map(
    (entry: unknown, index: number): FilemakerEmailCampaignDelivery => {
      const delivery = createFilemakerEmailCampaignDelivery(
        entry && typeof entry === 'object'
          ? ({
              ...(entry as Partial<FilemakerEmailCampaignDelivery>),
              campaignId:
                normalizeString((entry as Record<string, unknown>)['campaignId']) ||
                `campaign-${index + 1}`,
              runId:
                normalizeString((entry as Record<string, unknown>)['runId']) || `run-${index + 1}`,
              emailAddress:
                normalizeString((entry as Record<string, unknown>)['emailAddress']) ||
                `recipient-${index + 1}@example.com`,
              partyKind:
                normalizeString((entry as Record<string, unknown>)['partyKind']) === 'organization'
                  ? 'organization'
                  : 'person',
              partyId:
                normalizeString((entry as Record<string, unknown>)['partyId']) || `party-${index + 1}`,
            } as Partial<FilemakerEmailCampaignDelivery> &
              Pick<
                FilemakerEmailCampaignDelivery,
                'campaignId' | 'runId' | 'emailAddress' | 'partyKind' | 'partyId'
              >)
          : {
              campaignId: `campaign-${index + 1}`,
              runId: `run-${index + 1}`,
              emailAddress: `recipient-${index + 1}@example.com`,
              partyKind: 'person',
              partyId: `party-${index + 1}`,
            }
      );
      const baseId = delivery.id;
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
        ...delivery,
        id: resolvedId,
      };
    }
  );

  return {
    version: FILEMAKER_CAMPAIGN_DELIVERY_VERSION,
    deliveries: deliveries.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt ?? '');
      const rightTime = Date.parse(right.createdAt ?? '');
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    }),
  };
};

export const normalizeFilemakerEmailCampaignRunRegistry = (
  value: FilemakerEmailCampaignRunRegistry | null | undefined
): FilemakerEmailCampaignRunRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignRunRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawRuns = Array.isArray(record['runs']) ? record['runs'] : [];
  const usedIds = new Set<string>();
  const runs = rawRuns.map((entry: unknown, index: number): FilemakerEmailCampaignRun => {
    const run = createFilemakerEmailCampaignRun(
      entry && typeof entry === 'object'
        ? ({
            ...(entry as Partial<FilemakerEmailCampaignRun>),
            campaignId: normalizeString((entry as Record<string, unknown>)['campaignId']) ||
              `campaign-${index + 1}`,
          } as Partial<FilemakerEmailCampaignRun> & Pick<FilemakerEmailCampaignRun, 'campaignId'>)
        : { campaignId: `campaign-${index + 1}` }
    );
    const baseId = run.id;
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
      ...run,
      id: resolvedId,
    };
  });

  return {
    version: FILEMAKER_CAMPAIGN_RUN_VERSION,
    runs: runs.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt ?? '');
      const rightTime = Date.parse(right.createdAt ?? '');
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    }),
  };
};

export const parseFilemakerEmailCampaignRunRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignRunRegistry => {
  const parsed = parseJsonRecord(raw, 'Invalid Filemaker email campaign run JSON payload.');
  return normalizeFilemakerEmailCampaignRunRegistry(
    parsed as FilemakerEmailCampaignRunRegistry | null | undefined
  );
};

export const toPersistedFilemakerEmailCampaignRunRegistry = (
  value: FilemakerEmailCampaignRunRegistry
): FilemakerEmailCampaignRunRegistry => normalizeFilemakerEmailCampaignRunRegistry(value);

export const parseFilemakerEmailCampaignDeliveryRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignDeliveryRegistry => {
  const parsed = parseJsonRecord(raw, 'Invalid Filemaker email campaign delivery JSON payload.');
  return normalizeFilemakerEmailCampaignDeliveryRegistry(
    parsed as FilemakerEmailCampaignDeliveryRegistry | null | undefined
  );
};

export const toPersistedFilemakerEmailCampaignDeliveryRegistry = (
  value: FilemakerEmailCampaignDeliveryRegistry
): FilemakerEmailCampaignDeliveryRegistry => normalizeFilemakerEmailCampaignDeliveryRegistry(value);

export const getFilemakerEmailCampaignDeliveriesForRun = (
  registry: FilemakerEmailCampaignDeliveryRegistry,
  runId: string
): FilemakerEmailCampaignDelivery[] => {
  const normalizedRunId = normalizeString(runId);
  if (!normalizedRunId) return [];
  return registry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.runId === normalizedRunId
  );
};

export const summarizeFilemakerEmailCampaignRunDeliveries = (
  deliveries: FilemakerEmailCampaignDelivery[]
): FilemakerEmailCampaignRunMetrics => ({
  recipientCount: deliveries.length,
  deliveredCount: deliveries.filter((delivery) => delivery.status === 'sent').length,
  failedCount: deliveries.filter(
    (delivery) => delivery.status === 'failed' || delivery.status === 'bounced'
  ).length,
  skippedCount: deliveries.filter((delivery) => delivery.status === 'skipped').length,
});

export const resolveFilemakerEmailCampaignRunStatusFromDeliveries = (input: {
  currentStatus: FilemakerEmailCampaignRunStatus;
  deliveries: FilemakerEmailCampaignDelivery[];
}): FilemakerEmailCampaignRunStatus => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(input.deliveries);
  const queuedCount =
    metrics.recipientCount - metrics.deliveredCount - metrics.failedCount - metrics.skippedCount;
  const processedCount = metrics.deliveredCount + metrics.failedCount + metrics.skippedCount;

  if (metrics.recipientCount === 0) {
    return input.currentStatus;
  }
  if (queuedCount > 0) {
    if (processedCount > 0) return 'running';
    if (input.currentStatus === 'pending') return 'pending';
    return 'queued';
  }
  if (metrics.deliveredCount === 0 && metrics.failedCount === 0 && metrics.skippedCount > 0) {
    return 'cancelled';
  }
  if (metrics.deliveredCount === 0 && metrics.failedCount > 0 && metrics.skippedCount === 0) {
    return 'failed';
  }
  return 'completed';
};

export const buildFilemakerEmailCampaignDeliveriesForPreview = (input: {
  campaignId: string;
  runId: string;
  preview: FilemakerEmailCampaignAudiencePreview;
  mode: FilemakerEmailCampaignRun['mode'];
}): FilemakerEmailCampaignDelivery[] => {
  const now = new Date().toISOString();
  return input.preview.recipients.map((recipient): FilemakerEmailCampaignDelivery =>
    createFilemakerEmailCampaignDelivery({
      campaignId: input.campaignId,
      runId: input.runId,
      emailId: recipient.emailId,
      emailAddress: recipient.email,
      partyKind: recipient.partyKind,
      partyId: recipient.partyId,
      status: input.mode === 'dry_run' ? 'skipped' : 'queued',
      providerMessage:
        input.mode === 'dry_run' ? 'Dry run recipient generated from audience preview.' : null,
      sentAt: input.mode === 'dry_run' ? now : null,
      createdAt: now,
      updatedAt: now,
    })
  );
};

const resolveDeliveryStatusForBulkRunStatus = (
  runStatus: FilemakerEmailCampaignRunStatus
): FilemakerEmailCampaignDeliveryStatus | null => {
  if (runStatus === 'completed') return 'sent';
  if (runStatus === 'failed') return 'failed';
  if (runStatus === 'cancelled') return 'skipped';
  return null;
};

export const applyFilemakerEmailCampaignRunStatusToDeliveries = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  runStatus: FilemakerEmailCampaignRunStatus;
}): FilemakerEmailCampaignDelivery[] => {
  const nextDeliveryStatus = resolveDeliveryStatusForBulkRunStatus(input.runStatus);
  if (!nextDeliveryStatus) return input.deliveries;
  const now = new Date().toISOString();
  return input.deliveries.map((delivery: FilemakerEmailCampaignDelivery): FilemakerEmailCampaignDelivery => {
    if (delivery.status !== 'queued') return delivery;
    return createFilemakerEmailCampaignDelivery({
      ...delivery,
      status: nextDeliveryStatus,
      lastError:
        nextDeliveryStatus === 'failed'
          ? delivery.lastError || 'Run marked as failed from the monitor.'
          : null,
      providerMessage:
        nextDeliveryStatus === 'skipped'
          ? 'Delivery skipped because the run was cancelled.'
          : delivery.providerMessage,
      sentAt: nextDeliveryStatus === 'sent' ? now : null,
      updatedAt: now,
      campaignId: delivery.campaignId,
      runId: delivery.runId,
      emailAddress: delivery.emailAddress,
      partyKind: delivery.partyKind,
      partyId: delivery.partyId,
    });
  });
};

export const syncFilemakerEmailCampaignRunWithDeliveries = (input: {
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
  status?: FilemakerEmailCampaignRunStatus;
}): FilemakerEmailCampaignRun => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(input.deliveries);
  const now = new Date().toISOString();
  const nextStatus =
    input.status ??
    resolveFilemakerEmailCampaignRunStatusFromDeliveries({
      currentStatus: input.run.status,
      deliveries: input.deliveries,
    });
  return createFilemakerEmailCampaignRun({
    ...input.run,
    campaignId: input.run.campaignId,
    status: nextStatus,
    recipientCount: metrics.recipientCount,
    deliveredCount: metrics.deliveredCount,
    failedCount: metrics.failedCount,
    skippedCount: metrics.skippedCount,
    startedAt:
      nextStatus === 'running'
        ? input.run.startedAt ?? now
        : input.run.startedAt ?? null,
    completedAt:
      nextStatus === 'completed' || nextStatus === 'failed' || nextStatus === 'cancelled'
        ? now
        : input.run.completedAt ?? null,
    updatedAt: now,
  });
};

const matchesPartyReferenceFilter = (
  references: FilemakerPartyReference[],
  partyKind: FilemakerPartyKind,
  partyId: string
): boolean =>
  references.some(
    (reference: FilemakerPartyReference): boolean =>
      reference.kind === partyKind && reference.id === partyId
  );

const matchesLocationFilter = (
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
  audience: FilemakerEmailCampaignAudienceRule
): FilemakerEmailCampaignAudiencePreview => {
  const normalizedAudience = normalizeCampaignAudienceRule(audience);
  const recipients: FilemakerEmailCampaignAudienceRecipient[] = [];
  let excludedCount = 0;
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
    dedupedCount: recipients.length - dedupedRecipients.length,
    totalLinkedEmailCount,
    sampleRecipients: limitedRecipients.slice(0, 8),
  };
};

const isWithinAllowedHours = (
  hour: number,
  start: number | null | undefined,
  end: number | null | undefined
): boolean => {
  if (start == null && end == null) return true;
  if (start != null && end != null) {
    if (start <= end) {
      return hour >= start && hour <= end;
    }
    return hour >= start || hour <= end;
  }
  if (start != null) return hour >= start;
  return hour <= (end ?? 23);
};

export const evaluateFilemakerEmailCampaignLaunch = (
  campaign: FilemakerEmailCampaign,
  preview: FilemakerEmailCampaignAudiencePreview,
  now: Date = new Date()
): FilemakerEmailCampaignLaunchEvaluation => {
  const blockers: string[] = [];
  let nextEligibleAt: string | null = null;
  const hour = now.getHours();
  const weekday = now.getDay();

  if (campaign.status !== 'active') {
    blockers.push('Campaign must be active before it can launch.');
  }
  if (preview.recipients.length < campaign.launch.minAudienceSize) {
    blockers.push(
      `Audience preview has ${preview.recipients.length} recipients, below the minimum of ${campaign.launch.minAudienceSize}.`
    );
  }
  if (campaign.launch.requireApproval && !campaign.approvalGrantedAt) {
    blockers.push('Campaign launch requires approval.');
  }
  if (campaign.launch.onlyWeekdays && (weekday === 0 || weekday === 6)) {
    blockers.push('Campaign can launch only on weekdays.');
  }
  if (
    !isWithinAllowedHours(hour, campaign.launch.allowedHourStart, campaign.launch.allowedHourEnd)
  ) {
    blockers.push('Campaign is outside of the allowed launch hours.');
  }

  if (campaign.launch.mode === 'scheduled') {
    const scheduledAt = normalizeString(campaign.launch.scheduledAt);
    const scheduledTime = Date.parse(scheduledAt);
    if (!scheduledAt || Number.isNaN(scheduledTime)) {
      blockers.push('Scheduled launch mode requires a valid scheduled time.');
    } else if (scheduledTime > now.getTime()) {
      blockers.push('Campaign is scheduled for a future time.');
      nextEligibleAt = new Date(scheduledTime).toISOString();
    }
  }

  if (campaign.launch.mode === 'recurring') {
    const recurring = campaign.launch.recurring;
    if (!recurring) {
      blockers.push('Recurring launch mode requires recurring settings.');
    } else {
      if (recurring.weekdays.length > 0 && !recurring.weekdays.includes(weekday)) {
        blockers.push('Campaign is outside of the recurring weekday window.');
      }
      if (!isWithinAllowedHours(hour, recurring.hourStart, recurring.hourEnd)) {
        blockers.push('Campaign is outside of the recurring hour window.');
      }
    }
  }

  return {
    isEligible: blockers.length === 0,
    blockers,
    nextEligibleAt,
  };
};
