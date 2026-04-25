import 'server-only';

import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  evaluateFilemakerEmailCampaignLaunch,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  resolveFilemakerEmailCampaignAudiencePreview,
  resolveFilemakerEmailCampaignRecurringWindowKey,
  toPersistedFilemakerEmailCampaignRegistry,
} from '../settings';
import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import { createFilemakerCampaignRuntimeService } from './campaign-runtime';
import {
  resolveDueFilemakerEmailCampaignRetryRuns,
  type FilemakerEmailCampaignSchedulerDueRetryRun,
} from './campaign-retry-scheduler';
import {
  type FilemakerEmailCampaignSchedulerLaunchFailure,
  type FilemakerEmailCampaignSchedulerSkipReason,
} from '@/shared/contracts/filemaker';

import type {
  FilemakerCampaignRunLaunchResult,
} from './campaign-runtime';
import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';

type FilemakerEmailCampaignSchedulerDeps = {
  now: () => Date;
  readSettingValue: (key: string) => Promise<string | null>;
  upsertSettingValue: (key: string, value: string) => Promise<boolean>;
  launchRun: (input: {
    campaignId: string;
    mode: 'live';
    launchReason?: string | null;
  }) => Promise<FilemakerCampaignRunLaunchResult>;
};

export type FilemakerEmailCampaignSchedulerDueCampaign = {
  campaignId: string;
  launchMode: Extract<FilemakerEmailCampaign['launch']['mode'], 'scheduled' | 'recurring'>;
  launchReason: string;
  scheduleWindowKey: string;
};

export type FilemakerEmailCampaignSchedulerTickResult = {
  evaluatedCampaignCount: number;
  dueCampaignCount: number;
  launchedRuns: Array<{
    campaignId: string;
    runId: string;
    queuedDeliveryCount: number;
    launchMode: FilemakerEmailCampaignSchedulerDueCampaign['launchMode'];
  }>;
  dueRetryRuns: FilemakerEmailCampaignSchedulerDueRetryRun[];
  skippedByReason: FilemakerEmailCampaignSchedulerSkipReason[];
  launchFailures: FilemakerEmailCampaignSchedulerLaunchFailure[];
};

const defaultDeps = (): FilemakerEmailCampaignSchedulerDeps => {
  const now = (): Date => new Date();
  return {
    now,
    readSettingValue: readFilemakerCampaignSettingValue,
    upsertSettingValue: upsertFilemakerCampaignSettingValue,
    launchRun: async () => {
      throw new Error('Default launchRun placeholder should be replaced during scheduler init.');
    },
  };
};

const parseTimestamp = (value: string | null | undefined): number | null => {
  if (!value) return null;
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

const resolveScheduledWindowKey = (
  campaign: FilemakerEmailCampaign
): string | null => {
  const scheduledAtMs = parseTimestamp(campaign.launch.scheduledAt);
  if (scheduledAtMs == null) return null;
  return `scheduled:${scheduledAtMs}`;
};

const isScheduledCampaignDue = (
  campaign: FilemakerEmailCampaign,
  nowMs: number
): boolean => {
  const scheduledAtMs = parseTimestamp(campaign.launch.scheduledAt);
  if (scheduledAtMs == null || scheduledAtMs > nowMs) return false;
  const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
  if (lastLaunchedAtMs != null && lastLaunchedAtMs >= scheduledAtMs) {
    return false;
  }
  return true;
};

const isRecurringCampaignDue = (
  campaign: FilemakerEmailCampaign,
  now: Date
): boolean => {
  const currentWindowKey = resolveFilemakerEmailCampaignRecurringWindowKey(campaign, now);
  if (!currentWindowKey) return false;

  const lastLaunchedAtMs = parseTimestamp(campaign.lastLaunchedAt);
  if (lastLaunchedAtMs == null) return true;

  const lastWindowKey = resolveFilemakerEmailCampaignRecurringWindowKey(
    campaign,
    new Date(lastLaunchedAtMs)
  );
  return lastWindowKey !== currentWindowKey;
};

const incrementReason = (reasons: Map<string, number>, reason: string): void => {
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
};

export const resolveDueFilemakerEmailCampaigns = (input: {
  campaignRegistry: FilemakerEmailCampaignRegistry;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  database: FilemakerDatabase;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  now?: Date;
}): {
  evaluatedCampaignCount: number;
  dueCampaigns: FilemakerEmailCampaignSchedulerDueCampaign[];
  skippedByReason: FilemakerEmailCampaignSchedulerSkipReason[];
  evaluatedCampaignIds: string[];
} => {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const dueCampaigns: FilemakerEmailCampaignSchedulerDueCampaign[] = [];
  const skippedReasons = new Map<string, number>();
  const evaluatedCampaignIds: string[] = [];
  let evaluatedCampaignCount = 0;

  input.campaignRegistry.campaigns.forEach((campaign) => {
    if (campaign.launch.mode !== 'scheduled' && campaign.launch.mode !== 'recurring') {
      return;
    }

    evaluatedCampaignCount += 1;
    evaluatedCampaignIds.push(campaign.id);

    if (campaign.status !== 'active') {
      incrementReason(skippedReasons, 'inactive-campaign');
      return;
    }

    if (hasActiveLiveRun(campaign.id, input.runRegistry)) {
      incrementReason(skippedReasons, 'live-run-in-progress');
      return;
    }

    const preview = resolveFilemakerEmailCampaignAudiencePreview(
      input.database,
      campaign.audience,
      input.suppressionRegistry
    );
    const evaluation = evaluateFilemakerEmailCampaignLaunch(campaign, preview, now);

    if (!evaluation.isEligible) {
      incrementReason(skippedReasons, evaluation.blockers[0] ?? 'launch-blocked');
      return;
    }

    if (campaign.launch.mode === 'scheduled') {
      const scheduleWindowKey = resolveScheduledWindowKey(campaign);
      if (!scheduleWindowKey) {
        incrementReason(skippedReasons, 'scheduled-time-missing');
        return;
      }
      if (!isScheduledCampaignDue(campaign, nowMs)) {
        incrementReason(skippedReasons, 'scheduled-not-due');
        return;
      }

      dueCampaigns.push({
        campaignId: campaign.id,
        launchMode: 'scheduled',
        launchReason: 'Automatically launched when the scheduled send window was reached.',
        scheduleWindowKey,
      });
      return;
    }

    const scheduleWindowKey = resolveFilemakerEmailCampaignRecurringWindowKey(campaign, now);
    if (!scheduleWindowKey) {
      incrementReason(skippedReasons, 'recurring-window-not-ready');
      return;
    }
    if (!isRecurringCampaignDue(campaign, now)) {
      incrementReason(skippedReasons, 'recurring-window-already-launched');
      return;
    }

    dueCampaigns.push({
      campaignId: campaign.id,
      launchMode: 'recurring',
      launchReason: 'Automatically launched from the recurring campaign window.',
      scheduleWindowKey,
    });
  });

  return {
    evaluatedCampaignCount,
    dueCampaigns,
    evaluatedCampaignIds,
    skippedByReason: Array.from(skippedReasons.entries())
      .sort((left, right) => right[1] - left[1])
      .map(([reason, count]) => ({ reason, count })),
  };
};

export const createFilemakerEmailCampaignSchedulerService = (
  overrides?: Partial<FilemakerEmailCampaignSchedulerDeps>
) => {
  const baseDeps = defaultDeps();
  const mergedDeps: FilemakerEmailCampaignSchedulerDeps = {
    ...baseDeps,
    ...overrides,
  };
  const launchRun =
    overrides?.launchRun ??
    ((input: {
      campaignId: string;
      mode: 'live';
      launchReason?: string | null;
    }) =>
      createFilemakerCampaignRuntimeService({
        now: mergedDeps.now,
        readSettingValue: mergedDeps.readSettingValue,
        upsertSettingValue: mergedDeps.upsertSettingValue,
      }).launchRun(input));
  const deps: FilemakerEmailCampaignSchedulerDeps = {
    ...mergedDeps,
    launchRun,
  };

  return {
    runTick: async (): Promise<FilemakerEmailCampaignSchedulerTickResult> => {
      const now = deps.now();
      const nowIso = now.toISOString();
      const [
        databaseRaw,
        campaignsRaw,
        runsRaw,
        suppressionsRaw,
        deliveriesRaw,
        attemptsRaw,
      ] = await Promise.all([
        deps.readSettingValue(FILEMAKER_DATABASE_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY),
      ]);
      const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);

      const resolution = resolveDueFilemakerEmailCampaigns({
        database: parseFilemakerDatabase(databaseRaw),
        campaignRegistry,
        runRegistry: parseFilemakerEmailCampaignRunRegistry(runsRaw),
        suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw),
        now,
      });

      if (resolution.evaluatedCampaignIds.length > 0) {
        const evaluatedIdSet = new Set(resolution.evaluatedCampaignIds);
        await deps.upsertSettingValue(
          FILEMAKER_EMAIL_CAMPAIGNS_KEY,
          JSON.stringify(
            toPersistedFilemakerEmailCampaignRegistry({
              version: campaignRegistry.version,
              campaigns: campaignRegistry.campaigns.map((campaign) =>
                evaluatedIdSet.has(campaign.id)
                  ? {
                      ...campaign,
                      lastEvaluatedAt: nowIso,
                    }
                  : campaign
              ),
            })
          )
        );
      }

      const launchedRuns: FilemakerEmailCampaignSchedulerTickResult['launchedRuns'] = [];
      const launchFailures: FilemakerEmailCampaignSchedulerTickResult['launchFailures'] = [];
      const dueRetryRuns = resolveDueFilemakerEmailCampaignRetryRuns({
        deliveriesRaw,
        attemptsRaw,
        runsRaw,
        now,
      });

      for (const dueCampaign of resolution.dueCampaigns) {
        try {
          const launch = await deps.launchRun({
            campaignId: dueCampaign.campaignId,
            mode: 'live',
            launchReason: dueCampaign.launchReason,
          });
          launchedRuns.push({
            campaignId: launch.campaign.id,
            runId: launch.run.id,
            queuedDeliveryCount: launch.queuedDeliveryCount,
            launchMode: dueCampaign.launchMode,
          });
        } catch (error) {
          const message =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : 'Unknown launch error';
          launchFailures.push({
            campaignId: dueCampaign.campaignId,
            message,
          });
        }
      }

      return {
        evaluatedCampaignCount: resolution.evaluatedCampaignCount,
        dueCampaignCount: resolution.dueCampaigns.length,
        launchedRuns,
        dueRetryRuns,
        skippedByReason: resolution.skippedByReason,
        launchFailures,
      };
    },
  };
};

export const runFilemakerEmailCampaignSchedulerTick =
  async (): Promise<FilemakerEmailCampaignSchedulerTickResult> =>
    createFilemakerEmailCampaignSchedulerService().runTick();
