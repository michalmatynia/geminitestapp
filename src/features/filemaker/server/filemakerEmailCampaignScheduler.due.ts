import 'server-only';

import {
  evaluateFilemakerEmailCampaignLaunch,
  resolveFilemakerEmailCampaignAudiencePreview,
  resolveFilemakerEmailCampaignRecurringWindowKey,
} from '../settings';

import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';
import type { FilemakerEmailCampaignSchedulerSkipReason } from '@/shared/contracts/filemaker';

export type FilemakerEmailCampaignSchedulerDueCampaign = {
  campaignId: string;
  launchMode: Extract<FilemakerEmailCampaign['launch']['mode'], 'scheduled' | 'recurring'>;
  launchReason: string;
  scheduleWindowKey: string;
};

export type FilemakerEmailCampaignDueResolution = {
  evaluatedCampaignCount: number;
  dueCampaigns: FilemakerEmailCampaignSchedulerDueCampaign[];
  skippedByReason: FilemakerEmailCampaignSchedulerSkipReason[];
  evaluatedCampaignIds: string[];
};

type ResolveDueCampaignsInput = {
  campaignRegistry: FilemakerEmailCampaignRegistry;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry | null;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  database: FilemakerDatabase;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  now?: Date;
};

type DueCampaignEvaluationContext = ResolveDueCampaignsInput & {
  now: Date;
  nowMs: number;
};

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value.trim().length === 0) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const hasActiveLiveRun = (
  campaignId: string,
  runRegistry: FilemakerEmailCampaignRunRegistry
): boolean =>
  runRegistry.runs.some(
    (run) =>
      run.campaignId === campaignId &&
      run.mode === 'live' &&
      (run.status === 'pending' || run.status === 'queued' || run.status === 'running')
  );

const resolveScheduledWindowKey = (campaign: FilemakerEmailCampaign): string | null => {
  const scheduledAtMs = parseTimestamp(campaign.launch.scheduledAt);
  if (scheduledAtMs === null) return null;
  return `scheduled:${scheduledAtMs}`;
};

const isScheduledCampaignDue = (campaign: FilemakerEmailCampaign, nowMs: number): boolean => {
  const scheduledAtMs = parseTimestamp(campaign.launch.scheduledAt);
  if (scheduledAtMs === null || scheduledAtMs > nowMs) return false;
  const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
  return lastLaunchedAtMs === null || lastLaunchedAtMs < scheduledAtMs;
};

const isRecurringCampaignDue = (campaign: FilemakerEmailCampaign, now: Date): boolean => {
  const currentWindowKey = resolveFilemakerEmailCampaignRecurringWindowKey(campaign, now);
  if (currentWindowKey === null) return false;

  const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
  if (lastLaunchedAtMs === null) return true;

  const lastWindowKey = resolveFilemakerEmailCampaignRecurringWindowKey(
    campaign,
    new Date(lastLaunchedAtMs)
  );
  return lastWindowKey !== currentWindowKey;
};

const incrementReason = (reasons: Map<string, number>, reason: string): void => {
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
};

const isCampaignSchedulerManaged = (campaign: FilemakerEmailCampaign): boolean =>
  campaign.launch.mode === 'scheduled' || campaign.launch.mode === 'recurring';

const resolveCampaignLaunchBlocker = (
  campaign: FilemakerEmailCampaign,
  context: DueCampaignEvaluationContext
): string | null => {
  if (campaign.status !== 'active') return 'inactive-campaign';
  if (hasActiveLiveRun(campaign.id, context.runRegistry)) return 'live-run-in-progress';
  const preview = resolveFilemakerEmailCampaignAudiencePreview(
    context.database,
    campaign.audience,
    context.suppressionRegistry
  );
  const evaluation = evaluateFilemakerEmailCampaignLaunch(
    campaign,
    preview,
    context.now,
    context.contentGroupRegistry
  );
  return evaluation.isEligible ? null : evaluation.blockers[0] ?? 'launch-blocked';
};

const resolveScheduledDueCampaign = (
  campaign: FilemakerEmailCampaign,
  nowMs: number
): FilemakerEmailCampaignSchedulerDueCampaign | string => {
  const scheduleWindowKey = resolveScheduledWindowKey(campaign);
  if (scheduleWindowKey === null) return 'scheduled-time-missing';
  if (!isScheduledCampaignDue(campaign, nowMs)) return 'scheduled-not-due';
  return {
    campaignId: campaign.id,
    launchMode: 'scheduled',
    launchReason: 'Automatically launched when the scheduled send window was reached.',
    scheduleWindowKey,
  };
};

const resolveRecurringDueCampaign = (
  campaign: FilemakerEmailCampaign,
  now: Date
): FilemakerEmailCampaignSchedulerDueCampaign | string => {
  const scheduleWindowKey = resolveFilemakerEmailCampaignRecurringWindowKey(campaign, now);
  if (scheduleWindowKey === null) return 'recurring-window-not-ready';
  if (!isRecurringCampaignDue(campaign, now)) return 'recurring-window-already-launched';
  return {
    campaignId: campaign.id,
    launchMode: 'recurring',
    launchReason: 'Automatically launched from the recurring campaign window.',
    scheduleWindowKey,
  };
};

const resolveDueCampaign = (
  campaign: FilemakerEmailCampaign,
  context: DueCampaignEvaluationContext
): FilemakerEmailCampaignSchedulerDueCampaign | string => {
  const blocker = resolveCampaignLaunchBlocker(campaign, context);
  if (blocker !== null) return blocker;
  if (campaign.launch.mode === 'scheduled') return resolveScheduledDueCampaign(campaign, context.nowMs);
  return resolveRecurringDueCampaign(campaign, context.now);
};

const isDueCampaign = (
  value: FilemakerEmailCampaignSchedulerDueCampaign | string
): value is FilemakerEmailCampaignSchedulerDueCampaign => typeof value !== 'string';

const toSkippedReasons = (
  skippedReasons: Map<string, number>
): FilemakerEmailCampaignSchedulerSkipReason[] =>
  Array.from(skippedReasons.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([reason, count]) => ({ reason, count }));

export const resolveDueFilemakerEmailCampaigns = (
  input: ResolveDueCampaignsInput
): FilemakerEmailCampaignDueResolution => {
  const now = input.now ?? new Date();
  const context: DueCampaignEvaluationContext = { ...input, now, nowMs: now.getTime() };
  const dueCampaigns: FilemakerEmailCampaignSchedulerDueCampaign[] = [];
  const skippedReasons = new Map<string, number>();
  const evaluatedCampaignIds: string[] = [];

  input.campaignRegistry.campaigns.forEach((campaign: FilemakerEmailCampaign): void => {
    if (!isCampaignSchedulerManaged(campaign)) return;
    evaluatedCampaignIds.push(campaign.id);
    const result = resolveDueCampaign(campaign, context);
    if (isDueCampaign(result)) {
      dueCampaigns.push(result);
      return;
    }
    incrementReason(skippedReasons, result);
  });

  return {
    evaluatedCampaignCount: evaluatedCampaignIds.length,
    dueCampaigns,
    evaluatedCampaignIds,
    skippedByReason: toSkippedReasons(skippedReasons),
  };
};
