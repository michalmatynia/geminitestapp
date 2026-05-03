import { logClientError } from '@/shared/utils/observability/client-error-logger';
import {
  type FilemakerEmailCampaignSchedulerLaunchFailure,
  type FilemakerEmailCampaignSchedulerSkipReason,
} from '@/shared/contracts/filemaker';

import type { FilemakerEmailCampaign } from '../types';

const FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_VERSION = 1;

type FilemakerEmailCampaignSchedulerLaunchedRun = {
  campaignId: string;
  runId: string;
  queuedDeliveryCount: number;
  launchMode: Extract<FilemakerEmailCampaign['launch']['mode'], 'scheduled' | 'recurring'>;
};

type FilemakerEmailCampaignSchedulerLaunchMode =
  FilemakerEmailCampaignSchedulerLaunchedRun['launchMode'];

export type FilemakerEmailCampaignSchedulerStatus = {
  version: number;
  lastStartedAt: string | null;
  lastCompletedAt: string | null;
  lastSuccessfulAt: string | null;
  evaluatedCampaignCount: number;
  dueCampaignCount: number;
  launchedRuns: FilemakerEmailCampaignSchedulerLaunchedRun[];
  queuedDispatchCount: number;
  inlineDispatchCount: number;
  skippedByReason: FilemakerEmailCampaignSchedulerSkipReason[];
  launchFailures: FilemakerEmailCampaignSchedulerLaunchFailure[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object';

const toTrimmedString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeNullableString = (entry: unknown): string | null => {
  const trimmed = toTrimmedString(entry);
  return trimmed.length > 0 ? trimmed : null;
};

const toNonNegativeInteger = (value: unknown): number => {
  const parsed = Math.trunc(Number(value));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const normalizeSchedulerLaunchMode = (
  value: unknown
): FilemakerEmailCampaignSchedulerLaunchMode | null => {
  if (value === 'recurring') return 'recurring';
  if (value === 'scheduled') return 'scheduled';
  return null;
};

const normalizeSchedulerSkipReasons = (
  input: unknown
): FilemakerEmailCampaignSchedulerSkipReason[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown): FilemakerEmailCampaignSchedulerSkipReason | null => {
      if (!isRecord(entry)) return null;
      const reason = toTrimmedString(entry['reason']);
      const count = toNonNegativeInteger(entry['count']);
      return reason.length > 0 ? { reason, count } : null;
    })
    .filter((entry): entry is FilemakerEmailCampaignSchedulerSkipReason => entry !== null);
};

const normalizeSchedulerLaunchFailures = (
  input: unknown
): FilemakerEmailCampaignSchedulerLaunchFailure[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown): FilemakerEmailCampaignSchedulerLaunchFailure | null => {
      if (!isRecord(entry)) return null;
      const campaignId = toTrimmedString(entry['campaignId']);
      const message = toTrimmedString(entry['message']);
      return campaignId.length > 0 && message.length > 0 ? { campaignId, message } : null;
    })
    .filter((entry): entry is FilemakerEmailCampaignSchedulerLaunchFailure => entry !== null);
};

const normalizeSchedulerLaunchedRuns = (
  input: unknown
): FilemakerEmailCampaignSchedulerLaunchedRun[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown): FilemakerEmailCampaignSchedulerLaunchedRun | null => {
      if (!isRecord(entry)) return null;
      const campaignId = toTrimmedString(entry['campaignId']);
      const runId = toTrimmedString(entry['runId']);
      const queuedDeliveryCount = toNonNegativeInteger(entry['queuedDeliveryCount']);
      const launchMode = normalizeSchedulerLaunchMode(entry['launchMode']);
      return campaignId.length > 0 && runId.length > 0 && launchMode !== null
        ? { campaignId, runId, queuedDeliveryCount, launchMode }
        : null;
    })
    .filter((entry): entry is FilemakerEmailCampaignSchedulerLaunchedRun => entry !== null);
};

export const createDefaultFilemakerEmailCampaignSchedulerStatus =
  (): FilemakerEmailCampaignSchedulerStatus => ({
    version: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_VERSION,
    lastStartedAt: null,
    lastCompletedAt: null,
    lastSuccessfulAt: null,
    evaluatedCampaignCount: 0,
    dueCampaignCount: 0,
    launchedRuns: [],
    queuedDispatchCount: 0,
    inlineDispatchCount: 0,
    skippedByReason: [],
    launchFailures: [],
  });

export const normalizeFilemakerEmailCampaignSchedulerStatus = (
  value: unknown
): FilemakerEmailCampaignSchedulerStatus => {
  if (!isRecord(value)) {
    return createDefaultFilemakerEmailCampaignSchedulerStatus();
  }

  return {
    version: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_VERSION,
    lastStartedAt: normalizeNullableString(value['lastStartedAt']),
    lastCompletedAt: normalizeNullableString(value['lastCompletedAt']),
    lastSuccessfulAt: normalizeNullableString(value['lastSuccessfulAt']),
    evaluatedCampaignCount: toNonNegativeInteger(value['evaluatedCampaignCount']),
    dueCampaignCount: toNonNegativeInteger(value['dueCampaignCount']),
    launchedRuns: normalizeSchedulerLaunchedRuns(value['launchedRuns']),
    queuedDispatchCount: toNonNegativeInteger(value['queuedDispatchCount']),
    inlineDispatchCount: toNonNegativeInteger(value['inlineDispatchCount']),
    skippedByReason: normalizeSchedulerSkipReasons(value['skippedByReason']),
    launchFailures: normalizeSchedulerLaunchFailures(value['launchFailures']),
  };
};

export const parseFilemakerEmailCampaignSchedulerStatus = (
  raw: string | null | undefined
): FilemakerEmailCampaignSchedulerStatus => {
  const trimmedRaw = toTrimmedString(raw);
  if (trimmedRaw.length === 0) {
    return createDefaultFilemakerEmailCampaignSchedulerStatus();
  }

  try {
    return normalizeFilemakerEmailCampaignSchedulerStatus(JSON.parse(trimmedRaw) as unknown);
  } catch (error) {
    logClientError(error);
    return createDefaultFilemakerEmailCampaignSchedulerStatus();
  }
};

export const toPersistedFilemakerEmailCampaignSchedulerStatus = (
  value: FilemakerEmailCampaignSchedulerStatus | null | undefined
): FilemakerEmailCampaignSchedulerStatus =>
  normalizeFilemakerEmailCampaignSchedulerStatus(value);
