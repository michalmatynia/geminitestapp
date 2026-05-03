import type { FilemakerEmailCampaign } from '../types';
export {
  createDefaultFilemakerEmailCampaignSchedulerStatus,
  normalizeFilemakerEmailCampaignSchedulerStatus,
  parseFilemakerEmailCampaignSchedulerStatus,
  toPersistedFilemakerEmailCampaignSchedulerStatus,
} from './campaign-scheduler-status';
export type { FilemakerEmailCampaignSchedulerStatus } from './campaign-scheduler-status';

const DAY_MS = 24 * 60 * 60 * 1_000;

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value.length === 0) return null;
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

const hasHourBound = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const isWithinBoundedAllowedHours = (
  hour: number,
  start: number,
  end: number
): boolean => {
  if (start <= end) {
    return hour >= start && hour <= end;
  }
  return hour >= start || hour <= end;
};

const isWithinAllowedHours = (
  hour: number,
  start: number | null | undefined,
  end: number | null | undefined
): boolean => {
  if (!hasHourBound(start)) {
    if (!hasHourBound(end)) return true;
    return hour <= end;
  }
  if (!hasHourBound(end)) return hour >= start;
  return isWithinBoundedAllowedHours(hour, start, end);
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
  if (recurring === null || recurring === undefined) return null;

  const interval = Math.max(1, recurring.interval);
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
  if (recurring === null || recurring === undefined) return false;

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

export const resolveFilemakerEmailCampaignRecurringWindowKey = (
  campaign: FilemakerEmailCampaign,
  value: Date
): string | null =>
  campaign.launch.mode === 'recurring' ? resolveRecurringWindowKeyAt(campaign, value) : null;

const resolveScheduledAutomationAt = (campaign: FilemakerEmailCampaign): string | null => {
  const scheduledAtMs = parseTimestamp(campaign.launch.scheduledAt);
  if (scheduledAtMs === null) return null;
  const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
  if (lastLaunchedAtMs !== null && lastLaunchedAtMs >= scheduledAtMs) {
    return null;
  }
  return new Date(scheduledAtMs).toISOString();
};

const shouldLaunchCurrentRecurringWindow = (input: {
  campaign: FilemakerEmailCampaign;
  now: Date;
  allowedHours: number[];
  currentWindowKey: string | null;
  lastWindowKey: string | null;
}): boolean =>
  input.currentWindowKey !== null &&
  input.currentWindowKey !== input.lastWindowKey &&
  isRecurringDayEligible(input.campaign, input.now) &&
  input.allowedHours.includes(input.now.getHours());

const resolveFutureRecurringAutomationAt = (input: {
  campaign: FilemakerEmailCampaign;
  now: Date;
  allowedHours: number[];
  lastWindowKey: string | null;
}): string | null => {
  const today = atLocalStartOfDay(input.now);

  for (let dayOffset = 0; dayOffset <= 370; dayOffset += 1) {
    const day = addLocalDays(today, dayOffset);
    if (!isRecurringDayEligible(input.campaign, day)) continue;

    for (const hour of input.allowedHours) {
      const candidate = resolveFirstEligibleHourCandidate(day, hour);
      if (candidate.getTime() < input.now.getTime()) continue;

      const candidateWindowKey = resolveRecurringWindowKeyAt(input.campaign, candidate);
      if (candidateWindowKey === null) continue;
      if (candidateWindowKey === input.lastWindowKey) continue;

      return candidate.toISOString();
    }
  }

  return null;
};

const resolveRecurringAutomationAt = (
  campaign: FilemakerEmailCampaign,
  now: Date
): string | null => {
  const recurring = campaign.launch.recurring;
  if (recurring === null || recurring === undefined) return null;

  const allowedHours = buildAllowedHours(campaign);
  if (allowedHours.length === 0) return null;

  const currentWindowKey = resolveRecurringWindowKeyAt(campaign, now);
  const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
  const lastWindowKey =
    lastLaunchedAtMs === null
      ? null
      : resolveRecurringWindowKeyAt(campaign, new Date(lastLaunchedAtMs));

  if (shouldLaunchCurrentRecurringWindow({ campaign, now, allowedHours, currentWindowKey, lastWindowKey })) {
    return now.toISOString();
  }

  return resolveFutureRecurringAutomationAt({ campaign, now, allowedHours, lastWindowKey });
};

export const resolveFilemakerEmailCampaignNextAutomationAt = (
  campaign: FilemakerEmailCampaign,
  now: Date = new Date()
): string | null => {
  if (campaign.launch.mode === 'manual') return null;
  if (campaign.launch.mode === 'scheduled') return resolveScheduledAutomationAt(campaign);
  return resolveRecurringAutomationAt(campaign, now);
};
