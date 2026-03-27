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
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryAttemptStatus,
  FilemakerEmailCampaignDeliveryFailureCategory,
  FilemakerEmailCampaignDeliveryProvider,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignDeliveryStatus,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignEventType,
  FilemakerEmailCampaignLifecycleStatus,
  FilemakerEmailCampaignLaunchMode,
  FilemakerEmailCampaignLaunchRule,
  FilemakerEmailCampaignRecurringRule,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRunStatus,
  FilemakerEmailCampaignSuppressionEntry,
  FilemakerEmailCampaignSuppressionReason,
  FilemakerEmailCampaignSuppressionRegistry,
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
  suppressedCount: number;
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

export type FilemakerEmailCampaignAnalytics = {
  totalRuns: number;
  liveRunCount: number;
  dryRunCount: number;
  totalRecipients: number;
  processedCount: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  skippedCount: number;
  completionRatePercent: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  suppressionImpactCount: number;
  openCount: number;
  openRatePercent: number;
  uniqueOpenCount: number;
  uniqueOpenRatePercent: number;
  clickCount: number;
  clickRatePercent: number;
  uniqueClickCount: number;
  uniqueClickRatePercent: number;
  unsubscribeCount: number;
  unsubscribeRatePercent: number;
  resubscribeCount: number;
  resubscribeRatePercent: number;
  netUnsubscribeCount: number;
  netUnsubscribeRatePercent: number;
  latestRunStatus: FilemakerEmailCampaignRunStatus | null;
  latestRunAt: string | null;
  latestActivityAt: string | null;
  latestOpenAt: string | null;
  latestClickAt: string | null;
  latestUnsubscribeAt: string | null;
  latestResubscribeAt: string | null;
  topClickedLinks: FilemakerEmailCampaignLinkPerformance[];
  eventCount: number;
};

export type FilemakerEmailCampaignLinkPerformance = {
  targetUrl: string;
  clickCount: number;
  uniqueDeliveryCount: number;
  clickRatePercent: number;
  latestClickAt: string | null;
};

export type FilemakerEmailCampaignDeliverabilityHealthLevel =
  | 'healthy'
  | 'warning'
  | 'critical';

export type FilemakerEmailCampaignDeliverabilityAlert = {
  id: string;
  level: Exclude<FilemakerEmailCampaignDeliverabilityHealthLevel, 'healthy'>;
  code:
    | 'global_bounce_rate'
    | 'global_failure_rate'
    | 'queue_backlog'
    | 'suppression_pressure'
    | 'campaign_health'
    | 'domain_health';
  title: string;
  message: string;
  campaignId: string | null;
  campaignName: string | null;
  domain: string | null;
  value: number | null;
};

export type FilemakerEmailCampaignDomainDeliverability = {
  domain: string;
  totalDeliveries: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  queuedCount: number;
  skippedCount: number;
  pendingRetryCount: number;
  suppressionCount: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  latestDeliveryAt: string | null;
  nextScheduledRetryAt: string | null;
  alertLevel: FilemakerEmailCampaignDeliverabilityHealthLevel;
};

export type FilemakerEmailCampaignDeliverabilityCampaignHealth = {
  campaignId: string;
  campaignName: string;
  status: FilemakerEmailCampaignLifecycleStatus;
  latestRunStatus: FilemakerEmailCampaignRunStatus | null;
  latestRunAt: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  queuedCount: number;
  skippedCount: number;
  pendingRetryCount: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  suppressionImpactCount: number;
  nextScheduledRetryAt: string | null;
  alertLevel: FilemakerEmailCampaignDeliverabilityHealthLevel;
};

export type FilemakerEmailCampaignRecentDeliveryIssue = {
  deliveryId: string;
  campaignId: string;
  campaignName: string | null;
  runId: string | null;
  emailAddress: string;
  domain: string;
  status: Extract<FilemakerEmailCampaignDeliveryStatus, 'failed' | 'bounced'>;
  provider: FilemakerEmailCampaignDeliveryProvider | null;
  failureCategory: FilemakerEmailCampaignDeliveryFailureCategory | null;
  message: string;
  updatedAt: string | null;
};

export type FilemakerEmailCampaignRecentDeliveryAttempt = {
  attemptId: string;
  attemptNumber: number;
  deliveryId: string;
  campaignId: string;
  campaignName: string | null;
  runId: string;
  emailAddress: string;
  domain: string;
  status: FilemakerEmailCampaignDeliveryAttemptStatus;
  provider: FilemakerEmailCampaignDeliveryProvider | null;
  failureCategory: FilemakerEmailCampaignDeliveryFailureCategory | null;
  message: string;
  attemptedAt: string | null;
};

export type FilemakerEmailCampaignDeliveryFailureCategorySummary = {
  category: FilemakerEmailCampaignDeliveryFailureCategory;
  count: number;
};

export type FilemakerEmailCampaignDeliveryProviderSummary = {
  provider: FilemakerEmailCampaignDeliveryProvider;
  attemptCount: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
};

export type FilemakerEmailCampaignScheduledRetryItem = {
  deliveryId: string;
  campaignId: string;
  campaignName: string | null;
  runId: string;
  emailAddress: string;
  domain: string;
  status: Extract<FilemakerEmailCampaignDeliveryStatus, 'failed' | 'bounced'>;
  failureCategory: FilemakerEmailCampaignDeliveryFailureCategory | null;
  attemptCount: number;
  nextRetryAt: string;
};

export type FilemakerEmailCampaignDeliverabilityOverview = {
  campaignCount: number;
  liveRunCount: number;
  totalRecipients: number;
  totalAttempts: number;
  retryEligibleCount: number;
  retryExhaustedCount: number;
  pendingRetryCount: number;
  processedCount: number;
  acceptedCount: number;
  failedCount: number;
  bouncedCount: number;
  queuedCount: number;
  skippedCount: number;
  retriedDeliveryCount: number;
  recoveredAfterRetryCount: number;
  deliveryRatePercent: number;
  failureRatePercent: number;
  bounceRatePercent: number;
  suppressionCount: number;
  suppressionRatePercent: number;
  latestDeliveryAt: string | null;
  oldestQueuedAt: string | null;
  oldestQueuedAgeMinutes: number | null;
  nextScheduledRetryAt: string | null;
  nextScheduledRetryInMinutes: number | null;
  failureCategoryBreakdown: FilemakerEmailCampaignDeliveryFailureCategorySummary[];
  providerBreakdown: FilemakerEmailCampaignDeliveryProviderSummary[];
  alerts: FilemakerEmailCampaignDeliverabilityAlert[];
  domainHealth: FilemakerEmailCampaignDomainDeliverability[];
  campaignHealth: FilemakerEmailCampaignDeliverabilityCampaignHealth[];
  recentDeliveryIssues: FilemakerEmailCampaignRecentDeliveryIssue[];
  recentAttempts: FilemakerEmailCampaignRecentDeliveryAttempt[];
  scheduledRetries: FilemakerEmailCampaignScheduledRetryItem[];
};

export type FilemakerEmailCampaignRecipientActivityType =
  | 'delivery_sent'
  | 'delivery_failed'
  | 'delivery_bounced'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'resubscribed';

export type FilemakerEmailCampaignRecipientActivityItem = {
  id: string;
  type: FilemakerEmailCampaignRecipientActivityType;
  campaignId: string | null;
  campaignName: string | null;
  runId: string | null;
  deliveryId: string | null;
  createdAt: string | null;
  message: string;
  targetUrl: string | null;
};

export type FilemakerEmailCampaignRecipientActivitySummary = {
  emailAddress: string;
  campaignId: string | null;
  campaignName: string | null;
  deliveryCount: number;
  sentCount: number;
  failedCount: number;
  bouncedCount: number;
  skippedCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  resubscribeCount: number;
  latestSentAt: string | null;
  latestOpenAt: string | null;
  latestClickAt: string | null;
  latestUnsubscribeAt: string | null;
  latestResubscribeAt: string | null;
  recentActivity: FilemakerEmailCampaignRecipientActivityItem[];
};

const FILEMAKER_CAMPAIGN_VERSION = 1;
const FILEMAKER_CAMPAIGN_RUN_VERSION = 1;
const FILEMAKER_CAMPAIGN_DELIVERY_VERSION = 1;
const FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION = 1;
const FILEMAKER_CAMPAIGN_EVENT_VERSION = 1;
const FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION = 1;
export const FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS = 3;
export const FILEMAKER_EMAIL_CAMPAIGN_RETRY_BACKOFF_DELAYS_MS = [
  60_000,
  5 * 60_000,
] as const;
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

const parseOptionalBoundedInteger = (
  value: unknown,
  minimum: number,
  maximum: number
): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }
  return Math.trunc(parsed);
};

const parseOptionalBoundedNumber = (
  value: unknown,
  minimum: number,
  maximum: number
): number | null => {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    return null;
  }
  return parsed;
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

  return {
    frequency:
      frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly'
        ? frequency
        : defaults.frequency,
    interval: Number.isFinite(rawInterval) && rawInterval > 0 ? Math.trunc(rawInterval) : 1,
    weekdays: weekdays.length > 0 ? weekdays : defaults.weekdays,
    hourStart: parseOptionalBoundedInteger(record['hourStart'], 0, 23),
    hourEnd: parseOptionalBoundedInteger(record['hourEnd'], 0, 23),
  };
};

const normalizeCampaignLaunchRule = (value: unknown): FilemakerEmailCampaignLaunchRule => {
  const defaults = createDefaultCampaignLaunchRule();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const record = value as Record<string, unknown>;
  const mode = normalizeString(record['mode']).toLowerCase();
  const minAudienceSizeRaw = Number(record['minAudienceSize']);

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
    allowedHourStart: parseOptionalBoundedInteger(record['allowedHourStart'], 0, 23),
    allowedHourEnd: parseOptionalBoundedInteger(record['allowedHourEnd'], 0, 23),
    pauseOnBounceRatePercent: parseOptionalBoundedNumber(
      record['pauseOnBounceRatePercent'],
      0,
      100
    ),
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
        ? (normalizedStatus as FilemakerEmailCampaignDeliveryStatus)
        : 'queued',
    provider:
      normalizedProvider === 'webhook' || normalizedProvider === 'smtp'
        ? (normalizedProvider as FilemakerEmailCampaignDeliveryProvider)
        : null,
    failureCategory:
      normalizedFailureCategory === 'soft_bounce' ||
      normalizedFailureCategory === 'hard_bounce' ||
      normalizedFailureCategory === 'provider_rejected' ||
      normalizedFailureCategory === 'rate_limited' ||
      normalizedFailureCategory === 'timeout' ||
      normalizedFailureCategory === 'invalid_recipient' ||
      normalizedFailureCategory === 'unknown'
        ? (normalizedFailureCategory as FilemakerEmailCampaignDeliveryFailureCategory)
        : null,
    providerMessage: normalizeString(input.providerMessage) || null,
    lastError: normalizeString(input.lastError) || null,
    sentAt: normalizeString(input.sentAt) || null,
    nextRetryAt: normalizeString(input.nextRetryAt) || null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignDeliveryRegistry =
  (): FilemakerEmailCampaignDeliveryRegistry => ({
    version: FILEMAKER_CAMPAIGN_DELIVERY_VERSION,
    deliveries: [],
  });

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
        ? (normalizedStatus as FilemakerEmailCampaignDeliveryAttemptStatus)
        : 'failed',
    provider:
      normalizedProvider === 'webhook' || normalizedProvider === 'smtp'
        ? (normalizedProvider as FilemakerEmailCampaignDeliveryProvider)
        : null,
    failureCategory:
      normalizedFailureCategory === 'soft_bounce' ||
      normalizedFailureCategory === 'hard_bounce' ||
      normalizedFailureCategory === 'provider_rejected' ||
      normalizedFailureCategory === 'rate_limited' ||
      normalizedFailureCategory === 'timeout' ||
      normalizedFailureCategory === 'invalid_recipient' ||
      normalizedFailureCategory === 'unknown'
        ? (normalizedFailureCategory as FilemakerEmailCampaignDeliveryFailureCategory)
        : null,
    providerMessage: normalizeString(input.providerMessage) || null,
    errorMessage: normalizeString(input.errorMessage) || null,
    attemptedAt: normalizeString(input.attemptedAt) || null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignDeliveryAttemptRegistry =
  (): FilemakerEmailCampaignDeliveryAttemptRegistry => ({
    version: FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION,
    attempts: [],
  });

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
        }-${now}`
      ) || 'entry'}`,
    campaignId: normalizeString(input.campaignId),
    runId: normalizeString(input.runId) || null,
    deliveryId: normalizeString(input.deliveryId) || null,
    type:
      normalizedType === 'created' ||
      normalizedType === 'updated' ||
      normalizedType === 'unsubscribed' ||
      normalizedType === 'resubscribed' ||
      normalizedType === 'opened' ||
      normalizedType === 'clicked' ||
      normalizedType === 'launched' ||
      normalizedType === 'processing_started' ||
      normalizedType === 'delivery_sent' ||
      normalizedType === 'delivery_failed' ||
      normalizedType === 'delivery_bounced' ||
      normalizedType === 'status_changed' ||
      normalizedType === 'paused' ||
      normalizedType === 'completed' ||
      normalizedType === 'failed' ||
      normalizedType === 'cancelled'
        ? (normalizedType as FilemakerEmailCampaignEventType)
        : 'status_changed',
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
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignEventRegistry =
  (): FilemakerEmailCampaignEventRegistry => ({
    version: FILEMAKER_CAMPAIGN_EVENT_VERSION,
    events: [],
  });

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
    reason:
      normalizedReason === 'manual_block' ||
      normalizedReason === 'unsubscribed' ||
      normalizedReason === 'bounced'
        ? (normalizedReason as FilemakerEmailCampaignSuppressionReason)
        : 'manual_block',
    actor: normalizeString(input.actor) || null,
    notes: normalizeString(input.notes) || null,
    campaignId: normalizeString(input.campaignId) || null,
    runId: normalizeString(input.runId) || null,
    deliveryId: normalizeString(input.deliveryId) || null,
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  };
};

export const createDefaultFilemakerEmailCampaignSuppressionRegistry =
  (): FilemakerEmailCampaignSuppressionRegistry => ({
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: [],
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

export const normalizeFilemakerEmailCampaignDeliveryAttemptRegistry = (
  value: FilemakerEmailCampaignDeliveryAttemptRegistry | null | undefined
): FilemakerEmailCampaignDeliveryAttemptRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignDeliveryAttemptRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawAttempts = Array.isArray(record['attempts']) ? record['attempts'] : [];
  const usedIds = new Set<string>();
  const attempts = rawAttempts.map(
    (entry: unknown, index: number): FilemakerEmailCampaignDeliveryAttempt => {
      const attempt = createFilemakerEmailCampaignDeliveryAttempt(
        entry && typeof entry === 'object'
          ? ({
              ...(entry as Partial<FilemakerEmailCampaignDeliveryAttempt>),
              campaignId:
                normalizeString((entry as Record<string, unknown>)['campaignId']) ||
                `campaign-${index + 1}`,
              runId:
                normalizeString((entry as Record<string, unknown>)['runId']) || `run-${index + 1}`,
              deliveryId:
                normalizeString((entry as Record<string, unknown>)['deliveryId']) ||
                `delivery-${index + 1}`,
              emailAddress:
                normalizeString((entry as Record<string, unknown>)['emailAddress']) ||
                `recipient-${index + 1}@example.com`,
              partyKind:
                normalizeString((entry as Record<string, unknown>)['partyKind']) === 'organization'
                  ? 'organization'
                  : 'person',
              partyId:
                normalizeString((entry as Record<string, unknown>)['partyId']) ||
                `party-${index + 1}`,
              attemptNumber: Math.max(
                1,
                Math.trunc(Number((entry as Record<string, unknown>)['attemptNumber']) || 1)
              ),
              status:
                (normalizeString((entry as Record<string, unknown>)['status']).toLowerCase() as
                  | FilemakerEmailCampaignDeliveryAttemptStatus
                  | '') || 'failed',
            } as Partial<FilemakerEmailCampaignDeliveryAttempt> &
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
              campaignId: `campaign-${index + 1}`,
              runId: `run-${index + 1}`,
              deliveryId: `delivery-${index + 1}`,
              emailAddress: `recipient-${index + 1}@example.com`,
              partyKind: 'person',
              partyId: `party-${index + 1}`,
              attemptNumber: 1,
              status: 'failed',
            }
      );
      const baseId = attempt.id;
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
        ...attempt,
        id: resolvedId,
      };
    }
  );

  return {
    version: FILEMAKER_CAMPAIGN_DELIVERY_ATTEMPT_VERSION,
    attempts: attempts.sort((left, right) => {
      const leftTime = Date.parse(left.attemptedAt ?? left.createdAt ?? '');
      const rightTime = Date.parse(right.attemptedAt ?? right.createdAt ?? '');
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    }),
  };
};

export const normalizeFilemakerEmailCampaignEventRegistry = (
  value: FilemakerEmailCampaignEventRegistry | null | undefined
): FilemakerEmailCampaignEventRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignEventRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawEvents = Array.isArray(record['events']) ? record['events'] : [];
  const usedIds = new Set<string>();
  const events = rawEvents.map((entry: unknown, index: number): FilemakerEmailCampaignEvent => {
    const event = createFilemakerEmailCampaignEvent(
      entry && typeof entry === 'object'
        ? ({
            ...(entry as Partial<FilemakerEmailCampaignEvent>),
            campaignId:
              normalizeString((entry as Record<string, unknown>)['campaignId']) ||
              `campaign-${index + 1}`,
            type:
              (normalizeString((entry as Record<string, unknown>)['type']).toLowerCase() as
                | FilemakerEmailCampaignEventType
                | '') || 'status_changed',
            message:
              normalizeString((entry as Record<string, unknown>)['message']) ||
              `Campaign event ${index + 1}`,
          } as Partial<FilemakerEmailCampaignEvent> &
            Pick<FilemakerEmailCampaignEvent, 'campaignId' | 'type' | 'message'>)
        : {
            campaignId: `campaign-${index + 1}`,
            type: 'status_changed',
            message: `Campaign event ${index + 1}`,
          }
    );
    const baseId = event.id;
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
      ...event,
      id: resolvedId,
    };
  });

  return {
    version: FILEMAKER_CAMPAIGN_EVENT_VERSION,
    events: events.sort((left, right) => {
      const leftTime = Date.parse(left.createdAt ?? '');
      const rightTime = Date.parse(right.createdAt ?? '');
      return (Number.isNaN(rightTime) ? 0 : rightTime) - (Number.isNaN(leftTime) ? 0 : leftTime);
    }),
  };
};

export const normalizeFilemakerEmailCampaignSuppressionRegistry = (
  value: FilemakerEmailCampaignSuppressionRegistry | null | undefined
): FilemakerEmailCampaignSuppressionRegistry => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignSuppressionRegistry();
  }
  const record = value as Record<string, unknown>;
  const rawEntries = Array.isArray(record['entries']) ? record['entries'] : [];
  const entriesByEmail = new Map<string, FilemakerEmailCampaignSuppressionEntry>();

  rawEntries.forEach((entry: unknown, index: number): void => {
    const suppression = createFilemakerEmailCampaignSuppressionEntry(
      entry && typeof entry === 'object'
        ? ({
            ...(entry as Partial<FilemakerEmailCampaignSuppressionEntry>),
            emailAddress:
              normalizeString((entry as Record<string, unknown>)['emailAddress']) ||
              `recipient-${index + 1}@example.com`,
            reason:
              (normalizeString((entry as Record<string, unknown>)['reason']).toLowerCase() as
                | FilemakerEmailCampaignSuppressionReason
                | '') || 'manual_block',
          } as Partial<FilemakerEmailCampaignSuppressionEntry> &
            Pick<FilemakerEmailCampaignSuppressionEntry, 'emailAddress' | 'reason'>)
        : {
            emailAddress: `recipient-${index + 1}@example.com`,
            reason: 'manual_block',
          }
    );
    entriesByEmail.set(suppression.emailAddress, suppression);
  });

  return {
    version: FILEMAKER_CAMPAIGN_SUPPRESSION_VERSION,
    entries: Array.from(entriesByEmail.values()).sort((left, right) => {
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

export const parseFilemakerEmailCampaignDeliveryAttemptRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignDeliveryAttemptRegistry => {
  const parsed = parseJsonRecord(
    raw,
    'Invalid Filemaker email campaign delivery attempt JSON payload.'
  );
  return normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(
    parsed as FilemakerEmailCampaignDeliveryAttemptRegistry | null | undefined
  );
};

export const toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry = (
  value: FilemakerEmailCampaignDeliveryAttemptRegistry
): FilemakerEmailCampaignDeliveryAttemptRegistry =>
  normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(value);

export const parseFilemakerEmailCampaignEventRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignEventRegistry => {
  const parsed = parseJsonRecord(raw, 'Invalid Filemaker email campaign event JSON payload.');
  return normalizeFilemakerEmailCampaignEventRegistry(
    parsed as FilemakerEmailCampaignEventRegistry | null | undefined
  );
};

export const toPersistedFilemakerEmailCampaignEventRegistry = (
  value: FilemakerEmailCampaignEventRegistry
): FilemakerEmailCampaignEventRegistry => normalizeFilemakerEmailCampaignEventRegistry(value);

export const parseFilemakerEmailCampaignSuppressionRegistry = (
  raw: string | null | undefined
): FilemakerEmailCampaignSuppressionRegistry => {
  const parsed = parseJsonRecord(
    raw,
    'Invalid Filemaker email campaign suppression JSON payload.'
  );
  return normalizeFilemakerEmailCampaignSuppressionRegistry(
    parsed as FilemakerEmailCampaignSuppressionRegistry | null | undefined
  );
};

export const toPersistedFilemakerEmailCampaignSuppressionRegistry = (
  value: FilemakerEmailCampaignSuppressionRegistry
): FilemakerEmailCampaignSuppressionRegistry =>
  normalizeFilemakerEmailCampaignSuppressionRegistry(value);

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

export const getFilemakerEmailCampaignDeliveryAttemptsForRun = (
  registry: FilemakerEmailCampaignDeliveryAttemptRegistry,
  runId: string
): FilemakerEmailCampaignDeliveryAttempt[] => {
  const normalizedRunId = normalizeString(runId);
  if (!normalizedRunId) return [];
  return registry.attempts.filter(
    (attempt: FilemakerEmailCampaignDeliveryAttempt): boolean => attempt.runId === normalizedRunId
  );
};

export const getFilemakerEmailCampaignDeliveryAttemptsForDelivery = (
  registry: FilemakerEmailCampaignDeliveryAttemptRegistry,
  deliveryId: string
): FilemakerEmailCampaignDeliveryAttempt[] => {
  const normalizedDeliveryId = normalizeString(deliveryId);
  if (!normalizedDeliveryId) return [];
  return registry.attempts.filter(
    (attempt: FilemakerEmailCampaignDeliveryAttempt): boolean =>
      attempt.deliveryId === normalizedDeliveryId
  );
};

export const isFilemakerEmailCampaignRetryableFailureCategory = (
  category: FilemakerEmailCampaignDeliveryFailureCategory | null | undefined
): boolean =>
  category === 'soft_bounce' ||
  category === 'rate_limited' ||
  category === 'timeout' ||
  category === 'unknown';

export const resolveFilemakerEmailCampaignRetryableDeliveries = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  maxAttempts?: number;
}): {
  retryableDeliveries: FilemakerEmailCampaignDelivery[];
  exhaustedDeliveries: FilemakerEmailCampaignDelivery[];
} => {
  const maxAttempts =
    input.maxAttempts && Number.isFinite(input.maxAttempts)
      ? Math.max(1, Math.trunc(input.maxAttempts))
      : FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS;
  const attemptsByDeliveryId = input.attemptRegistry.attempts.reduce<Map<string, number>>(
    (map, attempt) => {
      map.set(attempt.deliveryId, (map.get(attempt.deliveryId) ?? 0) + 1);
      return map;
    },
    new Map()
  );

  const retryableDeliveries: FilemakerEmailCampaignDelivery[] = [];
  const exhaustedDeliveries: FilemakerEmailCampaignDelivery[] = [];

  input.deliveries.forEach((delivery) => {
    if (delivery.status !== 'failed' && delivery.status !== 'bounced') return;
    if (!isFilemakerEmailCampaignRetryableFailureCategory(delivery.failureCategory)) return;
    const attemptCount = attemptsByDeliveryId.get(delivery.id) ?? 0;
    if (attemptCount >= maxAttempts) {
      exhaustedDeliveries.push(delivery);
      return;
    }
    retryableDeliveries.push(delivery);
  });

  return {
    retryableDeliveries,
    exhaustedDeliveries,
  };
};

export function resolveFilemakerEmailCampaignRetryDelayForAttemptCount(
  attemptCount: number
): number | null {
  const normalizedAttemptCount = Math.max(0, Math.trunc(Number(attemptCount) || 0));
  if (normalizedAttemptCount <= 0) return FILEMAKER_EMAIL_CAMPAIGN_RETRY_BACKOFF_DELAYS_MS[0] ?? 60_000;
  const delayIndex = Math.max(
    0,
    Math.min(FILEMAKER_EMAIL_CAMPAIGN_RETRY_BACKOFF_DELAYS_MS.length - 1, normalizedAttemptCount - 1)
  );
  return FILEMAKER_EMAIL_CAMPAIGN_RETRY_BACKOFF_DELAYS_MS[delayIndex] ?? 60_000;
}

export const resolveFilemakerEmailCampaignRetryDelayMs = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  maxAttempts?: number;
}): number | null => {
  const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries(input);
  if (retrySummary.retryableDeliveries.length === 0) return null;

  const attemptsByDeliveryId = input.attemptRegistry.attempts.reduce<Map<string, number>>(
    (map, attempt) => {
      map.set(attempt.deliveryId, (map.get(attempt.deliveryId) ?? 0) + 1);
      return map;
    },
    new Map()
  );

  return retrySummary.retryableDeliveries.reduce<number>((maxDelayMs, delivery) => {
    const attemptCount = attemptsByDeliveryId.get(delivery.id) ?? 0;
    const delayMs = resolveFilemakerEmailCampaignRetryDelayForAttemptCount(attemptCount);
    if (delayMs == null) return maxDelayMs;
    return Math.max(maxDelayMs, delayMs);
  }, 0);
};

export const getFilemakerEmailCampaignEventsForRun = (
  registry: FilemakerEmailCampaignEventRegistry,
  runId: string
): FilemakerEmailCampaignEvent[] => {
  const normalizedRunId = normalizeString(runId);
  if (!normalizedRunId) return [];
  return registry.events.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.runId === normalizedRunId
  );
};

export const getFilemakerEmailCampaignSuppressionByAddress = (
  registry: FilemakerEmailCampaignSuppressionRegistry,
  emailAddress: string
): FilemakerEmailCampaignSuppressionEntry | null => {
  const normalizedEmailAddress = normalizeString(emailAddress).toLowerCase();
  if (!normalizedEmailAddress) return null;
  return (
    registry.entries.find(
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
    version: input.registry.version,
    entries: input.registry.entries
      .filter(
        (existing: FilemakerEmailCampaignSuppressionEntry): boolean =>
          existing.emailAddress !== input.entry.emailAddress
      )
      .concat(input.entry),
  });

export const removeFilemakerEmailCampaignSuppressionEntryByAddress = (input: {
  registry: FilemakerEmailCampaignSuppressionRegistry;
  emailAddress: string;
}): FilemakerEmailCampaignSuppressionRegistry => {
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  return normalizeFilemakerEmailCampaignSuppressionRegistry({
    version: input.registry.version,
    entries: input.registry.entries.filter(
      (entry: FilemakerEmailCampaignSuppressionEntry): boolean =>
        entry.emailAddress !== normalizedEmailAddress
    ),
  });
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
      provider: null,
      failureCategory: null,
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
      failureCategory:
        nextDeliveryStatus === 'failed' || nextDeliveryStatus === 'bounced'
          ? delivery.failureCategory || 'unknown'
          : null,
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

const roundPercentage = (numerator: number, denominator: number): number => {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0) {
    return 0;
  }
  return Math.round((numerator / denominator) * 1000) / 10;
};

export const summarizeUniqueDeliveryEventCount = (
  events: FilemakerEmailCampaignEvent[]
): number => {
  if (events.length === 0) return 0;
  const keys = new Set(
    events.map((event: FilemakerEmailCampaignEvent): string => {
      const deliveryId = normalizeString(event.deliveryId);
      if (deliveryId) return `delivery:${deliveryId}`;
      const runId = normalizeString(event.runId) || 'runless';
      const targetUrl = normalizeString(event.targetUrl) || 'targetless';
      return `event:${runId}:${targetUrl}:${event.id}`;
    })
  );
  return keys.size;
};

const toSortedLatestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter((value: string | null | undefined): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
  null;

const toSortedOldestTimestamp = (values: Array<string | null | undefined>): string | null =>
  values
    .filter((value: string | null | undefined): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(left) - Date.parse(right))[0] ??
  null;

const resolveEmailDomain = (emailAddress: string | null | undefined): string => {
  const normalized = normalizeString(emailAddress).toLowerCase();
  if (!normalized) return 'unknown';
  const atIndex = normalized.lastIndexOf('@');
  if (atIndex === -1 || atIndex === normalized.length - 1) return 'unknown';
  return normalized.slice(atIndex + 1);
};

const resolveDeliverabilityAlertLevel = (input: {
  bounceRatePercent: number;
  failureRatePercent: number;
  queuedCount?: number;
  oldestQueuedAgeMinutes?: number | null;
}): FilemakerEmailCampaignDeliverabilityHealthLevel => {
  if (input.bounceRatePercent >= 8 || input.failureRatePercent >= 12) {
    return 'critical';
  }
  if ((input.queuedCount ?? 0) > 0 && (input.oldestQueuedAgeMinutes ?? 0) >= 120) {
    return 'critical';
  }
  if (input.bounceRatePercent >= 3 || input.failureRatePercent >= 5) {
    return 'warning';
  }
  if ((input.queuedCount ?? 0) > 0 && (input.oldestQueuedAgeMinutes ?? 0) >= 30) {
    return 'warning';
  }
  return 'healthy';
};

const mapDeliveryStatusToActivityType = (
  status: FilemakerEmailCampaignDelivery['status']
): FilemakerEmailCampaignRecipientActivityType | null => {
  if (status === 'sent') return 'delivery_sent';
  if (status === 'failed') return 'delivery_failed';
  if (status === 'bounced') return 'delivery_bounced';
  return null;
};

const isRecipientActivityType = (
  type: FilemakerEmailCampaignEvent['type']
): type is
  | 'delivery_sent'
  | 'delivery_failed'
  | 'delivery_bounced'
  | 'opened'
  | 'clicked'
  | 'unsubscribed'
  | 'resubscribed' =>
  type === 'delivery_sent' ||
  type === 'delivery_failed' ||
  type === 'delivery_bounced' ||
  type === 'opened' ||
  type === 'clicked' ||
  type === 'unsubscribed' ||
  type === 'resubscribed';

export const summarizeFilemakerEmailCampaignRecipientActivity = (input: {
  emailAddress: string;
  campaignId?: string | null;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
}): FilemakerEmailCampaignRecipientActivitySummary => {
  const normalizedEmailAddress = normalizeString(input.emailAddress).toLowerCase();
  const normalizedCampaignId = normalizeString(input.campaignId) || null;
  const campaignName =
    normalizedCampaignId
      ? input.campaignRegistry.campaigns.find(
          (campaign: FilemakerEmailCampaign): boolean => campaign.id === normalizedCampaignId
        )?.name ?? null
      : null;

  const deliveries = normalizeFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry).deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean =>
      delivery.emailAddress === normalizedEmailAddress &&
      (!normalizedCampaignId || delivery.campaignId === normalizedCampaignId)
  );
  const deliveryIds = new Set(deliveries.map((delivery: FilemakerEmailCampaignDelivery) => delivery.id));
  const deliveryEventRegistry = normalizeFilemakerEmailCampaignEventRegistry(input.eventRegistry);
  const activityEvents = deliveryEventRegistry.events.filter(
    (
      event: FilemakerEmailCampaignEvent
    ): event is FilemakerEmailCampaignEvent & {
      type: FilemakerEmailCampaignRecipientActivityType;
    } => {
      if (!isRecipientActivityType(event.type)) return false;
      if (normalizedCampaignId && event.campaignId !== normalizedCampaignId) return false;
      if (event.deliveryId && deliveryIds.has(event.deliveryId)) return true;
      if (event.message.toLowerCase().includes(normalizedEmailAddress)) return true;
      return false;
    }
  );
  const campaignNameById = new Map(
    input.campaignRegistry.campaigns.map((campaign: FilemakerEmailCampaign) => [campaign.id, campaign.name])
  );

  const eventActivity = activityEvents.map(
    (
      event: FilemakerEmailCampaignEvent & {
        type: FilemakerEmailCampaignRecipientActivityType;
      }
    ): FilemakerEmailCampaignRecipientActivityItem => ({
      id: event.id,
      type: event.type,
      campaignId: event.campaignId ?? null,
      campaignName: campaignNameById.get(event.campaignId) ?? null,
      runId: event.runId ?? null,
      deliveryId: event.deliveryId ?? null,
      createdAt: event.createdAt ?? null,
      message: event.message,
      targetUrl: event.targetUrl ?? null,
    })
  );

  const fallbackDeliveryActivity = deliveries.flatMap(
    (delivery: FilemakerEmailCampaignDelivery): FilemakerEmailCampaignRecipientActivityItem[] => {
      const type = mapDeliveryStatusToActivityType(delivery.status);
      if (!type) return [];
      const alreadyTracked = activityEvents.some(
        (event: FilemakerEmailCampaignEvent): boolean =>
          event.deliveryId === delivery.id && event.type === type
      );
      if (alreadyTracked) return [];

      const message =
        type === 'delivery_sent'
          ? `${delivery.emailAddress} received a campaign delivery.`
          : type === 'delivery_bounced'
            ? delivery.lastError?.trim() || delivery.providerMessage?.trim() || `${delivery.emailAddress} delivery bounced.`
            : delivery.lastError?.trim() || delivery.providerMessage?.trim() || `${delivery.emailAddress} delivery failed.`;

      return [
        {
          id: `recipient-activity-${delivery.id}-${type}`,
          type,
          campaignId: delivery.campaignId,
          campaignName: campaignNameById.get(delivery.campaignId) ?? null,
          runId: delivery.runId,
          deliveryId: delivery.id,
          createdAt: delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? null,
          message,
          targetUrl: null,
        },
      ];
    }
  );

  return {
    emailAddress: normalizedEmailAddress,
    campaignId: normalizedCampaignId,
    campaignName,
    deliveryCount: deliveries.length,
    sentCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent')
      .length,
    failedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'failed')
      .length,
    bouncedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'bounced')
      .length,
    skippedCount: deliveries.filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'skipped')
      .length,
    openCount: activityEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened')
      .length,
    clickCount: activityEvents.filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked')
      .length,
    unsubscribeCount: activityEvents.filter(
      (event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed'
    ).length,
    resubscribeCount: activityEvents.filter(
      (event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed'
    ).length,
    latestSentAt: toSortedLatestTimestamp(
      deliveries
        .filter((delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent')
        .map((delivery: FilemakerEmailCampaignDelivery) => delivery.sentAt ?? delivery.updatedAt ?? null)
    ),
    latestOpenAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestClickAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestUnsubscribeAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    latestResubscribeAt: toSortedLatestTimestamp(
      activityEvents
        .filter((event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed')
        .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
    ),
    recentActivity: eventActivity
      .concat(fallbackDeliveryActivity)
      .sort(
        (
          left: FilemakerEmailCampaignRecipientActivityItem,
          right: FilemakerEmailCampaignRecipientActivityItem
        ): number => Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
      )
      .slice(0, 8),
  };
};

export const summarizeFilemakerEmailCampaignAnalytics = (input: {
  campaign: FilemakerEmailCampaign;
  database: FilemakerDatabase;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null;
}): FilemakerEmailCampaignAnalytics => {
  const runs = input.runRegistry.runs.filter(
    (run: FilemakerEmailCampaignRun): boolean => run.campaignId === input.campaign.id
  );
  const campaignEvents = normalizeFilemakerEmailCampaignEventRegistry(
    input.eventRegistry
  ).events.filter((event: FilemakerEmailCampaignEvent): boolean => event.campaignId === input.campaign.id);
  const preview = resolveFilemakerEmailCampaignAudiencePreview(
    input.database,
    input.campaign.audience,
    input.suppressionRegistry
  );
  const unsubscribeEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'unsubscribed'
  );
  const resubscribeEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'resubscribed'
  );
  const openEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'opened'
  );
  const clickEvents = campaignEvents.filter(
    (event: FilemakerEmailCampaignEvent): boolean => event.type === 'clicked'
  );
  const uniqueOpenCount = summarizeUniqueDeliveryEventCount(openEvents);
  const uniqueClickCount = summarizeUniqueDeliveryEventCount(clickEvents);
  const rawTopClickedLinks = Array.from(
    clickEvents.reduce<
      Map<
        string,
        {
          targetUrl: string;
          clickCount: number;
          deliveryIds: Set<string>;
          latestClickAt: string | null;
        }
      >
    >((map, event) => {
      const targetUrl = normalizeString(event.targetUrl);
      if (!targetUrl) return map;
      const existing = map.get(targetUrl) ?? {
        targetUrl,
        clickCount: 0,
        deliveryIds: new Set<string>(),
        latestClickAt: null,
      };
      existing.clickCount += 1;
      if (event.deliveryId) {
        existing.deliveryIds.add(event.deliveryId);
      }
      const eventAt = event.createdAt ?? null;
      if (
        eventAt &&
        (!existing.latestClickAt || Date.parse(eventAt) > Date.parse(existing.latestClickAt))
      ) {
        existing.latestClickAt = eventAt;
      }
      map.set(targetUrl, existing);
      return map;
    }, new Map())
  )
    .map(([, entry]) => ({
      targetUrl: entry.targetUrl,
      clickCount: entry.clickCount,
      uniqueDeliveryCount: entry.deliveryIds.size > 0 ? entry.deliveryIds.size : entry.clickCount,
      latestClickAt: entry.latestClickAt,
    }))
    .sort((left, right) => {
      if (right.clickCount !== left.clickCount) {
        return right.clickCount - left.clickCount;
      }
      return Date.parse(right.latestClickAt ?? '') - Date.parse(left.latestClickAt ?? '');
    })
    .slice(0, 5);

  const deliveryTotals = runs.reduce(
    (
      totals: {
        totalRecipients: number;
        sentCount: number;
        failedCount: number;
        bouncedCount: number;
        skippedCount: number;
        queuedCount: number;
      },
      run: FilemakerEmailCampaignRun
    ) => {
      const deliveries = getFilemakerEmailCampaignDeliveriesForRun(input.deliveryRegistry, run.id);
      if (deliveries.length === 0) {
        const queuedCount = Math.max(
          0,
          run.recipientCount - run.deliveredCount - run.failedCount - run.skippedCount
        );
        totals.totalRecipients += run.recipientCount;
        totals.sentCount += run.deliveredCount;
        totals.failedCount += run.failedCount;
        totals.skippedCount += run.skippedCount;
        totals.queuedCount += queuedCount;
        return totals;
      }

      totals.totalRecipients += deliveries.length;
      deliveries.forEach((delivery: FilemakerEmailCampaignDelivery): void => {
        if (delivery.status === 'sent') {
          totals.sentCount += 1;
          return;
        }
        if (delivery.status === 'failed') {
          totals.failedCount += 1;
          return;
        }
        if (delivery.status === 'bounced') {
          totals.bouncedCount += 1;
          return;
        }
        if (delivery.status === 'skipped') {
          totals.skippedCount += 1;
          return;
        }
        if (delivery.status === 'queued') {
          totals.queuedCount += 1;
        }
      });
      return totals;
    },
    {
      totalRecipients: 0,
      sentCount: 0,
      failedCount: 0,
      bouncedCount: 0,
      skippedCount: 0,
      queuedCount: 0,
    }
  );

  const processedCount =
    deliveryTotals.sentCount +
    deliveryTotals.failedCount +
    deliveryTotals.bouncedCount +
    deliveryTotals.skippedCount;
  const topClickedLinks = rawTopClickedLinks.map(
    (entry): FilemakerEmailCampaignLinkPerformance => ({
      ...entry,
      clickRatePercent: roundPercentage(entry.uniqueDeliveryCount, deliveryTotals.sentCount),
    })
  );

  const latestRun =
    [...runs].sort(
      (left: FilemakerEmailCampaignRun, right: FilemakerEmailCampaignRun): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    )[0] ?? null;

  const latestActivitySource = [
    latestRun?.updatedAt ?? latestRun?.createdAt ?? null,
    ...campaignEvents.map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null),
  ]
    .filter((value: string | null): value is string => Boolean(value))
    .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left));
  const latestUnsubscribeAt =
    unsubscribeEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestResubscribeAt =
    resubscribeEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestOpenAt =
    openEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;
  const latestClickAt =
    clickEvents
      .map((event: FilemakerEmailCampaignEvent) => event.createdAt ?? null)
      .filter((value: string | null): value is string => Boolean(value))
      .sort((left: string, right: string): number => Date.parse(right) - Date.parse(left))[0] ??
    null;

  const netUnsubscribeCount = Math.max(unsubscribeEvents.length - resubscribeEvents.length, 0);

  return {
    totalRuns: runs.length,
    liveRunCount: runs.filter((run: FilemakerEmailCampaignRun): boolean => run.mode === 'live')
      .length,
    dryRunCount: runs.filter((run: FilemakerEmailCampaignRun): boolean => run.mode === 'dry_run')
      .length,
    totalRecipients: deliveryTotals.totalRecipients,
    processedCount,
    queuedCount: deliveryTotals.queuedCount,
    sentCount: deliveryTotals.sentCount,
    failedCount: deliveryTotals.failedCount,
    bouncedCount: deliveryTotals.bouncedCount,
    skippedCount: deliveryTotals.skippedCount,
    completionRatePercent: roundPercentage(processedCount, deliveryTotals.totalRecipients),
    deliveryRatePercent: roundPercentage(deliveryTotals.sentCount, deliveryTotals.totalRecipients),
    failureRatePercent: roundPercentage(
      deliveryTotals.failedCount + deliveryTotals.bouncedCount,
      deliveryTotals.totalRecipients
    ),
    bounceRatePercent: roundPercentage(
      deliveryTotals.bouncedCount,
      deliveryTotals.totalRecipients
    ),
    suppressionImpactCount: preview.suppressedCount,
    openCount: openEvents.length,
    openRatePercent: roundPercentage(openEvents.length, deliveryTotals.sentCount),
    uniqueOpenCount,
    uniqueOpenRatePercent: roundPercentage(uniqueOpenCount, deliveryTotals.sentCount),
    clickCount: clickEvents.length,
    clickRatePercent: roundPercentage(clickEvents.length, deliveryTotals.sentCount),
    uniqueClickCount,
    uniqueClickRatePercent: roundPercentage(uniqueClickCount, deliveryTotals.sentCount),
    unsubscribeCount: unsubscribeEvents.length,
    unsubscribeRatePercent: roundPercentage(unsubscribeEvents.length, deliveryTotals.sentCount),
    resubscribeCount: resubscribeEvents.length,
    resubscribeRatePercent: roundPercentage(resubscribeEvents.length, deliveryTotals.sentCount),
    netUnsubscribeCount,
    netUnsubscribeRatePercent: roundPercentage(netUnsubscribeCount, deliveryTotals.sentCount),
    latestRunStatus: latestRun?.status ?? null,
    latestRunAt: latestRun?.createdAt ?? null,
    latestActivityAt: latestActivitySource[0] ?? null,
    latestOpenAt,
    latestClickAt,
    latestUnsubscribeAt,
    latestResubscribeAt,
    topClickedLinks,
    eventCount: campaignEvents.length,
  };
};

export const summarizeFilemakerEmailCampaignDeliverabilityOverview = (input: {
  database: FilemakerDatabase;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry?: FilemakerEmailCampaignDeliveryAttemptRegistry | null;
  eventRegistry?: FilemakerEmailCampaignEventRegistry | null;
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry | null;
  now?: Date;
}): FilemakerEmailCampaignDeliverabilityOverview => {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const deliveryRegistry = normalizeFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry);
  const attemptRegistry = normalizeFilemakerEmailCampaignDeliveryAttemptRegistry(
    input.attemptRegistry
  );
  const suppressionRegistry = normalizeFilemakerEmailCampaignSuppressionRegistry(
    input.suppressionRegistry
  );
  const campaignHealthBase = input.campaignRegistry.campaigns
    .map((campaign): FilemakerEmailCampaignDeliverabilityCampaignHealth => {
      const analytics = summarizeFilemakerEmailCampaignAnalytics({
        campaign,
        database: input.database,
        runRegistry: input.runRegistry,
        deliveryRegistry,
        eventRegistry: input.eventRegistry,
        suppressionRegistry,
      });
      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        status: campaign.status,
        latestRunStatus: analytics.latestRunStatus,
        latestRunAt: analytics.latestRunAt,
        totalRecipients: analytics.totalRecipients,
        sentCount: analytics.sentCount,
        failedCount: analytics.failedCount,
        bouncedCount: analytics.bouncedCount,
        queuedCount: analytics.queuedCount,
        skippedCount: analytics.skippedCount,
        pendingRetryCount: 0,
        deliveryRatePercent: analytics.deliveryRatePercent,
        failureRatePercent: analytics.failureRatePercent,
        bounceRatePercent: analytics.bounceRatePercent,
        suppressionImpactCount: analytics.suppressionImpactCount,
        nextScheduledRetryAt: null,
        alertLevel: resolveDeliverabilityAlertLevel({
          bounceRatePercent: analytics.bounceRatePercent,
          failureRatePercent: analytics.failureRatePercent,
          queuedCount: analytics.queuedCount,
        }),
      };
    })
    .sort((left, right) => {
      const score = (value: FilemakerEmailCampaignDeliverabilityHealthLevel): number =>
        value === 'critical' ? 2 : value === 'warning' ? 1 : 0;
      const levelDelta = score(right.alertLevel) - score(left.alertLevel);
      if (levelDelta !== 0) return levelDelta;
      if (right.bounceRatePercent !== left.bounceRatePercent) {
        return right.bounceRatePercent - left.bounceRatePercent;
      }
      if (right.failureRatePercent !== left.failureRatePercent) {
        return right.failureRatePercent - left.failureRatePercent;
      }
      return Date.parse(right.latestRunAt ?? '') - Date.parse(left.latestRunAt ?? '');
    });

  const suppressionCountByDomain = suppressionRegistry.entries.reduce<Map<string, number>>(
    (map, entry) => {
      const domain = resolveEmailDomain(entry.emailAddress);
      map.set(domain, (map.get(domain) ?? 0) + 1);
      return map;
    },
    new Map()
  );

  const domainHealthBase = Array.from(
    deliveryRegistry.deliveries.reduce<
      Map<
        string,
        {
          domain: string;
          totalDeliveries: number;
          sentCount: number;
          failedCount: number;
          bouncedCount: number;
          queuedCount: number;
          skippedCount: number;
          latestDeliveryAt: string | null;
        }
      >
    >((map, delivery) => {
      const domain = resolveEmailDomain(delivery.emailAddress);
      const existing = map.get(domain) ?? {
        domain,
        totalDeliveries: 0,
        sentCount: 0,
        failedCount: 0,
        bouncedCount: 0,
        queuedCount: 0,
        skippedCount: 0,
        latestDeliveryAt: null,
      };
      existing.totalDeliveries += 1;
      if (delivery.status === 'sent') existing.sentCount += 1;
      if (delivery.status === 'failed') existing.failedCount += 1;
      if (delivery.status === 'bounced') existing.bouncedCount += 1;
      if (delivery.status === 'queued') existing.queuedCount += 1;
      if (delivery.status === 'skipped') existing.skippedCount += 1;
      const deliveryTimestamp =
        delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? null;
      if (
        deliveryTimestamp &&
        (!existing.latestDeliveryAt ||
          Date.parse(deliveryTimestamp) > Date.parse(existing.latestDeliveryAt))
      ) {
        existing.latestDeliveryAt = deliveryTimestamp;
      }
      map.set(domain, existing);
      return map;
    }, new Map())
  )
    .map(([, entry]): FilemakerEmailCampaignDomainDeliverability => {
      const failureCount = entry.failedCount + entry.bouncedCount;
      const bounceRatePercent = roundPercentage(entry.bouncedCount, entry.totalDeliveries);
      const failureRatePercent = roundPercentage(failureCount, entry.totalDeliveries);
      const oldestQueuedAgeMinutes =
        entry.queuedCount > 0 && entry.latestDeliveryAt
          ? Math.max(0, Math.round((nowMs - Date.parse(entry.latestDeliveryAt)) / 60_000))
          : null;
      return {
        domain: entry.domain,
        totalDeliveries: entry.totalDeliveries,
        sentCount: entry.sentCount,
        failedCount: entry.failedCount,
        bouncedCount: entry.bouncedCount,
        queuedCount: entry.queuedCount,
        skippedCount: entry.skippedCount,
        pendingRetryCount: 0,
        suppressionCount: suppressionCountByDomain.get(entry.domain) ?? 0,
        deliveryRatePercent: roundPercentage(entry.sentCount, entry.totalDeliveries),
        failureRatePercent,
        bounceRatePercent,
        latestDeliveryAt: entry.latestDeliveryAt,
        nextScheduledRetryAt: null,
        alertLevel:
          entry.totalDeliveries >= 3
            ? resolveDeliverabilityAlertLevel({
                bounceRatePercent,
                failureRatePercent,
                queuedCount: entry.queuedCount,
                oldestQueuedAgeMinutes,
              })
            : 'healthy',
      };
    })
    .sort((left, right) => {
      const score = (value: FilemakerEmailCampaignDeliverabilityHealthLevel): number =>
        value === 'critical' ? 2 : value === 'warning' ? 1 : 0;
      const levelDelta = score(right.alertLevel) - score(left.alertLevel);
      if (levelDelta !== 0) return levelDelta;
      if (right.bounceRatePercent !== left.bounceRatePercent) {
        return right.bounceRatePercent - left.bounceRatePercent;
      }
      if (right.totalDeliveries !== left.totalDeliveries) {
        return right.totalDeliveries - left.totalDeliveries;
      }
      return left.domain.localeCompare(right.domain);
    });

  const totalRecipients = deliveryRegistry.deliveries.length;
  const acceptedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'sent'
  ).length;
  const failedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'failed'
  ).length;
  const bouncedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'bounced'
  ).length;
  const queuedDeliveries = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'queued'
  );
  const queuedCount = queuedDeliveries.length;
  const skippedCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'skipped'
  ).length;
  const processedCount = acceptedCount + failedCount + bouncedCount + skippedCount;
  const totalAttempts = attemptRegistry.attempts.length;
  const latestDeliveryAt = toSortedLatestTimestamp(
    deliveryRegistry.deliveries.map(
      (delivery: FilemakerEmailCampaignDelivery) =>
        delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? null
    )
  );
  const oldestQueuedAt = toSortedOldestTimestamp(
    queuedDeliveries.map(
      (delivery: FilemakerEmailCampaignDelivery) =>
        delivery.createdAt ?? delivery.updatedAt ?? delivery.sentAt ?? null
    )
  );
  const oldestQueuedAgeMinutes =
    oldestQueuedAt && Number.isFinite(Date.parse(oldestQueuedAt))
      ? Math.max(0, Math.round((nowMs - Date.parse(oldestQueuedAt)) / 60_000))
      : null;

  const campaignNameById = new Map(
    input.campaignRegistry.campaigns.map((campaign: FilemakerEmailCampaign) => [campaign.id, campaign.name])
  );
  const recentDeliveryIssues = [...deliveryRegistry.deliveries]
    .filter(
      (
        delivery: FilemakerEmailCampaignDelivery
      ): delivery is FilemakerEmailCampaignDelivery & {
        status: 'failed' | 'bounced';
      } => delivery.status === 'failed' || delivery.status === 'bounced'
    )
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? '');
      const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? '');
      return rightTime - leftTime;
    })
    .slice(0, 10)
    .map((delivery): FilemakerEmailCampaignRecentDeliveryIssue => ({
      deliveryId: delivery.id,
      campaignId: delivery.campaignId,
      campaignName: campaignNameById.get(delivery.campaignId) ?? null,
      runId: delivery.runId,
      emailAddress: delivery.emailAddress,
      domain: resolveEmailDomain(delivery.emailAddress),
      status: delivery.status,
      provider: delivery.provider ?? null,
      failureCategory: delivery.failureCategory ?? null,
      message:
        delivery.lastError?.trim() ||
        delivery.providerMessage?.trim() ||
        (delivery.status === 'bounced'
          ? `${delivery.emailAddress} bounced.`
          : `${delivery.emailAddress} failed.`),
      updatedAt: delivery.updatedAt ?? delivery.createdAt ?? null,
    }));

  const attemptCountsByDeliveryId = attemptRegistry.attempts.reduce<Map<string, number>>(
    (map, attempt) => {
      map.set(attempt.deliveryId, (map.get(attempt.deliveryId) ?? 0) + 1);
      return map;
    },
    new Map()
  );
  const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries({
    deliveries: deliveryRegistry.deliveries,
    attemptRegistry,
  });
  const scheduledRetries = deliveryRegistry.deliveries
    .filter(
      (
        delivery: FilemakerEmailCampaignDelivery
      ): delivery is FilemakerEmailCampaignDelivery & {
        status: 'failed' | 'bounced';
        nextRetryAt: string;
      } =>
        (delivery.status === 'failed' || delivery.status === 'bounced') &&
        typeof delivery.nextRetryAt === 'string' &&
        delivery.nextRetryAt.trim().length > 0
    )
    .sort((left, right) => Date.parse(left.nextRetryAt) - Date.parse(right.nextRetryAt))
    .map((delivery): FilemakerEmailCampaignScheduledRetryItem => ({
      deliveryId: delivery.id,
      campaignId: delivery.campaignId,
      campaignName: campaignNameById.get(delivery.campaignId) ?? null,
      runId: delivery.runId,
      emailAddress: delivery.emailAddress,
      domain: resolveEmailDomain(delivery.emailAddress),
      status: delivery.status,
      failureCategory: delivery.failureCategory ?? null,
      attemptCount: attemptCountsByDeliveryId.get(delivery.id) ?? 0,
      nextRetryAt: delivery.nextRetryAt,
    }));
  const scheduledRetryCountByCampaign = scheduledRetries.reduce<Map<string, number>>((map, retry) => {
    map.set(retry.campaignId, (map.get(retry.campaignId) ?? 0) + 1);
    return map;
  }, new Map());
  const scheduledRetryNextAtByCampaign = scheduledRetries.reduce<Map<string, string>>((map, retry) => {
    const existing = map.get(retry.campaignId);
    if (!existing || Date.parse(retry.nextRetryAt) < Date.parse(existing)) {
      map.set(retry.campaignId, retry.nextRetryAt);
    }
    return map;
  }, new Map());
  const scheduledRetryCountByDomain = scheduledRetries.reduce<Map<string, number>>((map, retry) => {
    map.set(retry.domain, (map.get(retry.domain) ?? 0) + 1);
    return map;
  }, new Map());
  const scheduledRetryNextAtByDomain = scheduledRetries.reduce<Map<string, string>>((map, retry) => {
    const existing = map.get(retry.domain);
    if (!existing || Date.parse(retry.nextRetryAt) < Date.parse(existing)) {
      map.set(retry.domain, retry.nextRetryAt);
    }
    return map;
  }, new Map());
  const campaignHealth = campaignHealthBase.map((campaign) => ({
    ...campaign,
    pendingRetryCount: scheduledRetryCountByCampaign.get(campaign.campaignId) ?? 0,
    nextScheduledRetryAt: scheduledRetryNextAtByCampaign.get(campaign.campaignId) ?? null,
  }));
  const domainHealth = domainHealthBase.map((domain) => ({
    ...domain,
    pendingRetryCount: scheduledRetryCountByDomain.get(domain.domain) ?? 0,
    nextScheduledRetryAt: scheduledRetryNextAtByDomain.get(domain.domain) ?? null,
  }));
  const nextScheduledRetryAt = scheduledRetries[0]?.nextRetryAt ?? null;
  const nextScheduledRetryInMinutes =
    nextScheduledRetryAt && Number.isFinite(Date.parse(nextScheduledRetryAt))
      ? Math.max(0, Math.round((Date.parse(nextScheduledRetryAt) - nowMs) / 60_000))
      : null;
  const retriedDeliveryCount = Array.from(attemptCountsByDeliveryId.values()).filter(
    (count) => count > 1
  ).length;
  const recoveredAfterRetryCount = deliveryRegistry.deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean =>
      delivery.status === 'sent' && (attemptCountsByDeliveryId.get(delivery.id) ?? 0) > 1
  ).length;

  const fallbackFailureCategoryBreakdown = Array.from(
    deliveryRegistry.deliveries.reduce<
      Map<FilemakerEmailCampaignDeliveryFailureCategory, number>
    >((map, delivery) => {
      const category = delivery.failureCategory;
      if (!category) return map;
      map.set(category, (map.get(category) ?? 0) + 1);
      return map;
    }, new Map())
  )
    .map(([category, count]): FilemakerEmailCampaignDeliveryFailureCategorySummary => ({
      category,
      count,
    }))
    .sort((left, right) => right.count - left.count);
  const failureCategoryBreakdownFromAttempts = Array.from(
    attemptRegistry.attempts.reduce<Map<FilemakerEmailCampaignDeliveryFailureCategory, number>>(
      (map, attempt) => {
        const category = attempt.failureCategory;
        if (!category) return map;
        map.set(category, (map.get(category) ?? 0) + 1);
        return map;
      },
      new Map()
    )
  )
    .map(([category, count]): FilemakerEmailCampaignDeliveryFailureCategorySummary => ({
      category,
      count,
    }))
    .sort((left, right) => right.count - left.count);
  const failureCategoryBreakdown =
    failureCategoryBreakdownFromAttempts.length > 0
      ? failureCategoryBreakdownFromAttempts
      : fallbackFailureCategoryBreakdown;

  const providerBreakdown = Array.from(
    attemptRegistry.attempts.reduce<
      Map<
        FilemakerEmailCampaignDeliveryProvider,
        FilemakerEmailCampaignDeliveryProviderSummary
      >
    >((map, attempt) => {
      if (!attempt.provider) return map;
      const existing = map.get(attempt.provider) ?? {
        provider: attempt.provider,
        attemptCount: 0,
        sentCount: 0,
        failedCount: 0,
        bouncedCount: 0,
      };
      existing.attemptCount += 1;
      if (attempt.status === 'sent') existing.sentCount += 1;
      if (attempt.status === 'failed') existing.failedCount += 1;
      if (attempt.status === 'bounced') existing.bouncedCount += 1;
      map.set(attempt.provider, existing);
      return map;
    }, new Map())
  )
    .map(([, entry]) => entry)
    .sort((left, right) => right.attemptCount - left.attemptCount);

  const recentAttempts = [...attemptRegistry.attempts]
    .sort((left, right) => {
      const leftTime = Date.parse(left.attemptedAt ?? left.createdAt ?? '');
      const rightTime = Date.parse(right.attemptedAt ?? right.createdAt ?? '');
      return rightTime - leftTime;
    })
    .slice(0, 10)
    .map((attempt): FilemakerEmailCampaignRecentDeliveryAttempt => ({
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      deliveryId: attempt.deliveryId,
      campaignId: attempt.campaignId,
      campaignName: campaignNameById.get(attempt.campaignId) ?? null,
      runId: attempt.runId,
      emailAddress: attempt.emailAddress,
      domain: resolveEmailDomain(attempt.emailAddress),
      status: attempt.status,
      provider: attempt.provider ?? null,
      failureCategory: attempt.failureCategory ?? null,
      message:
        attempt.errorMessage?.trim() ||
        attempt.providerMessage?.trim() ||
        (attempt.status === 'sent'
          ? `${attempt.emailAddress} accepted by the provider.`
          : attempt.status === 'bounced'
            ? `${attempt.emailAddress} bounced during delivery attempt ${attempt.attemptNumber}.`
            : `${attempt.emailAddress} failed during delivery attempt ${attempt.attemptNumber}.`),
      attemptedAt: attempt.attemptedAt ?? attempt.createdAt ?? null,
    }));

  const alerts: FilemakerEmailCampaignDeliverabilityAlert[] = [];
  const pushAlert = (
    alert: FilemakerEmailCampaignDeliverabilityAlert | null | undefined
  ): void => {
    if (!alert) return;
    alerts.push(alert);
  };

  const globalBounceRatePercent = roundPercentage(bouncedCount, totalRecipients);
  const globalFailureRatePercent = roundPercentage(failedCount + bouncedCount, totalRecipients);
  const suppressionCount = suppressionRegistry.entries.length;
  const suppressionRatePercent = roundPercentage(suppressionCount, input.database.emails.length);

  if (globalBounceRatePercent >= 3) {
    pushAlert({
      id: 'deliverability-alert-global-bounce-rate',
      level: globalBounceRatePercent >= 8 ? 'critical' : 'warning',
      code: 'global_bounce_rate',
      title: 'Bounce rate is elevated',
      message: `Global bounce rate is ${globalBounceRatePercent}% across ${totalRecipients} deliveries.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: globalBounceRatePercent,
    });
  }

  if (globalFailureRatePercent >= 5) {
    pushAlert({
      id: 'deliverability-alert-global-failure-rate',
      level: globalFailureRatePercent >= 12 ? 'critical' : 'warning',
      code: 'global_failure_rate',
      title: 'Delivery failures are elevated',
      message: `Failed or bounced deliveries reached ${globalFailureRatePercent}% across recent campaign traffic.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: globalFailureRatePercent,
    });
  }

  if (queuedCount > 0 && oldestQueuedAgeMinutes != null && oldestQueuedAgeMinutes >= 30) {
    pushAlert({
      id: 'deliverability-alert-queue-backlog',
      level: oldestQueuedAgeMinutes >= 120 ? 'critical' : 'warning',
      code: 'queue_backlog',
      title: 'Queued deliveries are aging',
      message: `${queuedCount} deliveries are still queued. Oldest queued item is ${oldestQueuedAgeMinutes} minutes old.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: oldestQueuedAgeMinutes,
    });
  }

  if (suppressionRatePercent >= 10) {
    pushAlert({
      id: 'deliverability-alert-suppression-pressure',
      level: suppressionRatePercent >= 25 ? 'critical' : 'warning',
      code: 'suppression_pressure',
      title: 'Suppression pressure is growing',
      message: `${suppressionCount} addresses are suppressed, or ${suppressionRatePercent}% of known Filemaker email addresses.`,
      campaignId: null,
      campaignName: null,
      domain: null,
      value: suppressionRatePercent,
    });
  }

  campaignHealth
    .filter((campaign) => campaign.alertLevel !== 'healthy')
    .slice(0, 5)
    .forEach((campaign) => {
      pushAlert({
        id: `deliverability-alert-campaign-${campaign.campaignId}`,
        level: campaign.alertLevel === 'critical' ? 'critical' : 'warning',
        code: 'campaign_health',
        title: `${campaign.campaignName} needs attention`,
        message: `Bounce rate ${campaign.bounceRatePercent}%, failure rate ${campaign.failureRatePercent}%, queued ${campaign.queuedCount}.`,
        campaignId: campaign.campaignId,
        campaignName: campaign.campaignName,
        domain: null,
        value: Math.max(campaign.bounceRatePercent, campaign.failureRatePercent),
      });
    });

  domainHealth
    .filter((domain) => domain.alertLevel !== 'healthy')
    .slice(0, 5)
    .forEach((domain) => {
      pushAlert({
        id: `deliverability-alert-domain-${domain.domain}`,
        level: domain.alertLevel === 'critical' ? 'critical' : 'warning',
        code: 'domain_health',
        title: `${domain.domain} is unstable`,
        message: `Bounce rate ${domain.bounceRatePercent}% and failure rate ${domain.failureRatePercent}% across ${domain.totalDeliveries} deliveries.`,
        campaignId: null,
        campaignName: null,
        domain: domain.domain,
        value: Math.max(domain.bounceRatePercent, domain.failureRatePercent),
      });
    });

  return {
    campaignCount: input.campaignRegistry.campaigns.length,
    liveRunCount: input.runRegistry.runs.filter(
      (run: FilemakerEmailCampaignRun): boolean => run.mode === 'live'
    ).length,
    totalRecipients,
    totalAttempts,
    retryEligibleCount: retrySummary.retryableDeliveries.length,
    retryExhaustedCount: retrySummary.exhaustedDeliveries.length,
    pendingRetryCount: scheduledRetries.length,
    processedCount,
    acceptedCount,
    failedCount,
    bouncedCount,
    queuedCount,
    skippedCount,
    retriedDeliveryCount,
    recoveredAfterRetryCount,
    deliveryRatePercent: roundPercentage(acceptedCount, totalRecipients),
    failureRatePercent: roundPercentage(failedCount + bouncedCount, totalRecipients),
    bounceRatePercent: globalBounceRatePercent,
    suppressionCount,
    suppressionRatePercent,
    latestDeliveryAt,
    oldestQueuedAt,
    oldestQueuedAgeMinutes,
    nextScheduledRetryAt,
    nextScheduledRetryInMinutes,
    failureCategoryBreakdown,
    providerBreakdown,
    alerts,
    domainHealth,
    campaignHealth,
    recentDeliveryIssues,
    recentAttempts,
    scheduledRetries,
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
