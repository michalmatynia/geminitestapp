import { logClientError } from '@/shared/utils/observability/client-error-logger';

import type { FilemakerEmailCampaign } from '../types';

const FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_VERSION = 1;
const DAY_MS = 24 * 60 * 60 * 1_000;

export type FilemakerEmailCampaignSchedulerSkipReason = {
  reason: string;
  count: number;
};

export type FilemakerEmailCampaignSchedulerLaunchFailure = {
  campaignId: string;
  message: string;
};

export type FilemakerEmailCampaignSchedulerLaunchedRun = {
  campaignId: string;
  runId: string;
  queuedDeliveryCount: number;
  launchMode: 'scheduled' | 'recurring';
};

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

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toUtcDayStart = (value: Date): number =>
  Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate());

const toUtcWeekStart = (value: Date): number => {
  const dayStart = toUtcDayStart(value);
  return dayStart - value.getUTCDay() * DAY_MS;
};

const toUtcMonthStartIndex = (value: Date): number => value.getUTCFullYear() * 12 + value.getUTCMonth();

const resolveCadenceAnchor = (campaign: FilemakerEmailCampaign): number =>
  parseTimestamp(campaign.approvalGrantedAt) ??
  parseTimestamp(campaign.createdAt) ??
  Date.now();

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

const buildAllowedHours = (campaign: FilemakerEmailCampaign): number[] => {
  const recurring = campaign.launch.recurring;
  return Array.from({ length: 24 }, (_, hour) => hour).filter((hour) => {
    const launchAllowed = isWithinAllowedHours(
      hour,
      campaign.launch.allowedHourStart,
      campaign.launch.allowedHourEnd
    );
    const recurringAllowed = recurring
      ? isWithinAllowedHours(hour, recurring.hourStart, recurring.hourEnd)
      : true;
    return launchAllowed && recurringAllowed;
  });
};

const resolveRecurringWindowKeyAt = (
  campaign: FilemakerEmailCampaign,
  value: Date
): string | null => {
  const recurring = campaign.launch.recurring;
  if (!recurring) return null;

  const interval = Math.max(1, recurring.interval || 1);
  const anchorDate = new Date(resolveCadenceAnchor(campaign));

  if (recurring.frequency === 'daily') {
    const distance = Math.floor((toUtcDayStart(value) - toUtcDayStart(anchorDate)) / DAY_MS);
    if (distance < 0) return null;
    return `recurring:daily:${Math.floor(distance / interval)}`;
  }

  if (recurring.frequency === 'weekly') {
    const distance = Math.floor((toUtcWeekStart(value) - toUtcWeekStart(anchorDate)) / (7 * DAY_MS));
    if (distance < 0) return null;
    return `recurring:weekly:${Math.floor(distance / interval)}`;
  }

  const distance = toUtcMonthStartIndex(value) - toUtcMonthStartIndex(anchorDate);
  if (distance < 0) return null;
  return `recurring:monthly:${Math.floor(distance / interval)}`;
};

const isRecurringDayEligible = (
  campaign: FilemakerEmailCampaign,
  value: Date
): boolean => {
  if (campaign.launch.onlyWeekdays && (value.getDay() === 0 || value.getDay() === 6)) {
    return false;
  }

  const recurring = campaign.launch.recurring;
  if (!recurring) return false;

  if (recurring.weekdays.length > 0 && !recurring.weekdays.includes(value.getDay())) {
    return false;
  }

  return resolveRecurringWindowKeyAt(campaign, value) !== null;
};

const atLocalStartOfDay = (value: Date): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0);

const addLocalDays = (value: Date, days: number): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate() + days, 0, 0, 0, 0);

const resolveFirstEligibleHourCandidate = (value: Date, hour: number): Date =>
  new Date(value.getFullYear(), value.getMonth(), value.getDate(), hour, 0, 0, 0);

const normalizeSchedulerSkipReasons = (
  input: unknown
): FilemakerEmailCampaignSchedulerSkipReason[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown): FilemakerEmailCampaignSchedulerSkipReason | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const reason = typeof record['reason'] === 'string' ? record['reason'].trim() : '';
      const count = Math.max(0, Math.trunc(Number(record['count']) || 0));
      return reason ? { reason, count } : null;
    })
    .filter((entry): entry is FilemakerEmailCampaignSchedulerSkipReason => entry != null);
};

const normalizeSchedulerLaunchFailures = (
  input: unknown
): FilemakerEmailCampaignSchedulerLaunchFailure[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown): FilemakerEmailCampaignSchedulerLaunchFailure | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const campaignId =
        typeof record['campaignId'] === 'string' ? record['campaignId'].trim() : '';
      const message = typeof record['message'] === 'string' ? record['message'].trim() : '';
      return campaignId && message ? { campaignId, message } : null;
    })
    .filter((entry): entry is FilemakerEmailCampaignSchedulerLaunchFailure => entry != null);
};

const normalizeSchedulerLaunchedRuns = (
  input: unknown
): FilemakerEmailCampaignSchedulerLaunchedRun[] => {
  if (!Array.isArray(input)) return [];
  return input
    .map((entry: unknown): FilemakerEmailCampaignSchedulerLaunchedRun | null => {
      if (!entry || typeof entry !== 'object') return null;
      const record = entry as Record<string, unknown>;
      const campaignId =
        typeof record['campaignId'] === 'string' ? record['campaignId'].trim() : '';
      const runId = typeof record['runId'] === 'string' ? record['runId'].trim() : '';
      const queuedDeliveryCount = Math.max(
        0,
        Math.trunc(Number(record['queuedDeliveryCount']) || 0)
      );
      const launchMode =
        record['launchMode'] === 'recurring' ? 'recurring' : record['launchMode'] === 'scheduled'
          ? 'scheduled'
          : null;
      return campaignId && runId && launchMode
        ? {
            campaignId,
            runId,
            queuedDeliveryCount,
            launchMode,
          }
        : null;
    })
    .filter((entry): entry is FilemakerEmailCampaignSchedulerLaunchedRun => entry != null);
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
  value: unknown | null | undefined
): FilemakerEmailCampaignSchedulerStatus => {
  if (!value || typeof value !== 'object') {
    return createDefaultFilemakerEmailCampaignSchedulerStatus();
  }

  const record = value as Record<string, unknown>;
  const normalizeNullableString = (entry: unknown): string | null =>
    typeof entry === 'string' && entry.trim() ? entry.trim() : null;

  return {
    version: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_VERSION,
    lastStartedAt: normalizeNullableString(record['lastStartedAt']),
    lastCompletedAt: normalizeNullableString(record['lastCompletedAt']),
    lastSuccessfulAt: normalizeNullableString(record['lastSuccessfulAt']),
    evaluatedCampaignCount: Math.max(0, Math.trunc(Number(record['evaluatedCampaignCount']) || 0)),
    dueCampaignCount: Math.max(0, Math.trunc(Number(record['dueCampaignCount']) || 0)),
    launchedRuns: normalizeSchedulerLaunchedRuns(record['launchedRuns']),
    queuedDispatchCount: Math.max(0, Math.trunc(Number(record['queuedDispatchCount']) || 0)),
    inlineDispatchCount: Math.max(0, Math.trunc(Number(record['inlineDispatchCount']) || 0)),
    skippedByReason: normalizeSchedulerSkipReasons(record['skippedByReason']),
    launchFailures: normalizeSchedulerLaunchFailures(record['launchFailures']),
  };
};

export const parseFilemakerEmailCampaignSchedulerStatus = (
  raw: string | null | undefined
): FilemakerEmailCampaignSchedulerStatus => {
  if (typeof raw !== 'string' || !raw.trim()) {
    return createDefaultFilemakerEmailCampaignSchedulerStatus();
  }

  try {
    return normalizeFilemakerEmailCampaignSchedulerStatus(JSON.parse(raw) as unknown);
  } catch (error) {
    logClientError(error);
    return createDefaultFilemakerEmailCampaignSchedulerStatus();
  }
};

export const toPersistedFilemakerEmailCampaignSchedulerStatus = (
  value: FilemakerEmailCampaignSchedulerStatus | null | undefined
): FilemakerEmailCampaignSchedulerStatus =>
  normalizeFilemakerEmailCampaignSchedulerStatus(value);

export const resolveFilemakerEmailCampaignRecurringWindowKey = (
  campaign: FilemakerEmailCampaign,
  value: Date
): string | null =>
  campaign.launch.mode === 'recurring' ? resolveRecurringWindowKeyAt(campaign, value) : null;

export const resolveFilemakerEmailCampaignNextAutomationAt = (
  campaign: FilemakerEmailCampaign,
  now: Date = new Date()
): string | null => {
  if (campaign.launch.mode === 'manual') return null;

  if (campaign.launch.mode === 'scheduled') {
    const scheduledAtMs = parseTimestamp(campaign.launch.scheduledAt);
    if (scheduledAtMs == null) return null;
    const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
    if (lastLaunchedAtMs != null && lastLaunchedAtMs >= scheduledAtMs) {
      return null;
    }
    return new Date(scheduledAtMs).toISOString();
  }

  const recurring = campaign.launch.recurring;
  if (!recurring) return null;

  const allowedHours = buildAllowedHours(campaign);
  if (allowedHours.length === 0) return null;

  const currentWindowKey = resolveRecurringWindowKeyAt(campaign, now);
  const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
  const lastWindowKey =
    lastLaunchedAtMs == null
      ? null
      : resolveRecurringWindowKeyAt(campaign, new Date(lastLaunchedAtMs));

  if (
    currentWindowKey &&
    currentWindowKey !== lastWindowKey &&
    isRecurringDayEligible(campaign, now) &&
    allowedHours.includes(now.getHours())
  ) {
    return now.toISOString();
  }

  const today = atLocalStartOfDay(now);

  for (let dayOffset = 0; dayOffset <= 370; dayOffset += 1) {
    const day = addLocalDays(today, dayOffset);
    if (!isRecurringDayEligible(campaign, day)) continue;

    for (const hour of allowedHours) {
      const candidate = resolveFirstEligibleHourCandidate(day, hour);
      if (candidate.getTime() < now.getTime()) continue;

      const candidateWindowKey = resolveRecurringWindowKeyAt(campaign, candidate);
      if (!candidateWindowKey) continue;
      if (candidateWindowKey === lastWindowKey) continue;

      return candidate.toISOString();
    }
  }

  return null;
};
