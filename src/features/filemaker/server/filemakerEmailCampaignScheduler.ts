import 'server-only';

import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignContentGroupRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
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
  resolveDueFilemakerEmailCampaigns,
  type FilemakerEmailCampaignSchedulerDueCampaign,
  type FilemakerEmailCampaignDueResolution,
} from './filemakerEmailCampaignScheduler.due';
import {
  type FilemakerEmailCampaignSchedulerLaunchFailure,
  type FilemakerEmailCampaignSchedulerSkipReason,
} from '@/shared/contracts/filemaker';

import type {
  FilemakerCampaignRunLaunchResult,
} from './campaign-runtime';
import type {
  FilemakerEmailCampaignRegistry,
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

export type FilemakerEmailCampaignSchedulerService = {
  runTick: () => Promise<FilemakerEmailCampaignSchedulerTickResult>;
};

type SchedulerRawSettings = {
  databaseRaw: string | null;
  contentGroupsRaw: string | null;
  campaignsRaw: string | null;
  runsRaw: string | null;
  suppressionsRaw: string | null;
  deliveriesRaw: string | null;
  attemptsRaw: string | null;
};

type LaunchRunResult = FilemakerEmailCampaignSchedulerTickResult['launchedRuns'][number];

type LaunchOutcome = {
  launchedRun: LaunchRunResult | null;
  launchFailure: FilemakerEmailCampaignSchedulerLaunchFailure | null;
};

type LaunchCollection = {
  launchedRuns: FilemakerEmailCampaignSchedulerTickResult['launchedRuns'];
  launchFailures: FilemakerEmailCampaignSchedulerTickResult['launchFailures'];
};

const defaultDeps = (): FilemakerEmailCampaignSchedulerDeps => {
  const now = (): Date => new Date();
  return {
    now,
    readSettingValue: readFilemakerCampaignSettingValue,
    upsertSettingValue: upsertFilemakerCampaignSettingValue,
    launchRun: () =>
      Promise.reject(new Error('Default launchRun placeholder should be replaced during scheduler init.')),
  };
};

const readSchedulerRawSettings = async (
  deps: FilemakerEmailCampaignSchedulerDeps
): Promise<SchedulerRawSettings> => {
  const [
    databaseRaw,
    contentGroupsRaw,
    campaignsRaw,
    runsRaw,
    suppressionsRaw,
    deliveriesRaw,
    attemptsRaw,
  ] = await Promise.all([
    deps.readSettingValue(FILEMAKER_DATABASE_KEY),
    deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_CONTENT_GROUPS_KEY),
    deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
    deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
    deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
    deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
    deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY),
  ]);
  return {
    databaseRaw,
    contentGroupsRaw,
    campaignsRaw,
    runsRaw,
    suppressionsRaw,
    deliveriesRaw,
    attemptsRaw,
  };
};

const persistEvaluatedCampaigns = async (
  deps: FilemakerEmailCampaignSchedulerDeps,
  campaignRegistry: FilemakerEmailCampaignRegistry,
  evaluatedCampaignIds: string[],
  nowIso: string
): Promise<void> => {
  if (evaluatedCampaignIds.length === 0) return;
  const evaluatedIdSet = new Set(evaluatedCampaignIds);
  await deps.upsertSettingValue(
    FILEMAKER_EMAIL_CAMPAIGNS_KEY,
    JSON.stringify(
      toPersistedFilemakerEmailCampaignRegistry({
        version: campaignRegistry.version,
        campaigns: campaignRegistry.campaigns.map((campaign) =>
          evaluatedIdSet.has(campaign.id) ? { ...campaign, lastEvaluatedAt: nowIso } : campaign
        ),
      })
    )
  );
};

const resolveSchedulerDueCampaigns = (
  rawSettings: SchedulerRawSettings,
  now: Date
): {
  campaignRegistry: FilemakerEmailCampaignRegistry;
  resolution: FilemakerEmailCampaignDueResolution;
} => {
  const campaignRegistry = parseFilemakerEmailCampaignRegistry(rawSettings.campaignsRaw);
  const contentGroupRegistry = parseFilemakerEmailCampaignContentGroupRegistry(
    rawSettings.contentGroupsRaw
  );
  return {
    campaignRegistry,
    resolution: resolveDueFilemakerEmailCampaigns({
      database: parseFilemakerDatabase(rawSettings.databaseRaw),
      contentGroupRegistry,
      campaignRegistry,
      runRegistry: parseFilemakerEmailCampaignRunRegistry(rawSettings.runsRaw),
      suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(rawSettings.suppressionsRaw),
      now,
    }),
  };
};

const resolveDueRetryRuns = (
  rawSettings: SchedulerRawSettings,
  now: Date
): FilemakerEmailCampaignSchedulerDueRetryRun[] =>
  resolveDueFilemakerEmailCampaignRetryRuns({
    deliveriesRaw: rawSettings.deliveriesRaw,
    attemptsRaw: rawSettings.attemptsRaw,
    runsRaw: rawSettings.runsRaw,
    now,
  });

const normalizeLaunchErrorMessage = (error: unknown): string => {
  if (!(error instanceof Error)) return 'Unknown launch error';
  const message = error.message.trim();
  return message.length > 0 ? message : 'Unknown launch error';
};

const launchDueCampaign = async (
  deps: FilemakerEmailCampaignSchedulerDeps,
  dueCampaign: FilemakerEmailCampaignSchedulerDueCampaign
): Promise<LaunchOutcome> => {
  try {
    const launch = await deps.launchRun({
      campaignId: dueCampaign.campaignId,
      mode: 'live',
      launchReason: dueCampaign.launchReason,
    });
    return {
      launchedRun: {
        campaignId: launch.campaign.id,
        runId: launch.run.id,
        queuedDeliveryCount: launch.queuedDeliveryCount,
        launchMode: dueCampaign.launchMode,
      },
      launchFailure: null,
    };
  } catch (error: unknown) {
    return {
      launchedRun: null,
      launchFailure: {
        campaignId: dueCampaign.campaignId,
        message: normalizeLaunchErrorMessage(error),
      },
    };
  }
};

const appendLaunchOutcome = (
  collection: LaunchCollection,
  outcome: LaunchOutcome
): LaunchCollection => ({
  launchedRuns: outcome.launchedRun !== null
    ? collection.launchedRuns.concat(outcome.launchedRun)
    : collection.launchedRuns,
  launchFailures: outcome.launchFailure !== null
    ? collection.launchFailures.concat(outcome.launchFailure)
    : collection.launchFailures,
});

const launchDueCampaignsSequentially = (
  deps: FilemakerEmailCampaignSchedulerDeps,
  dueCampaigns: FilemakerEmailCampaignSchedulerDueCampaign[]
): Promise<LaunchCollection> =>
  dueCampaigns.reduce<Promise<LaunchCollection>>(async (previous, dueCampaign) => {
    const collection = await previous;
    const outcome = await launchDueCampaign(deps, dueCampaign);
    return appendLaunchOutcome(collection, outcome);
  }, Promise.resolve({ launchedRuns: [], launchFailures: [] }));

const buildSchedulerTickResult = (
  resolution: FilemakerEmailCampaignDueResolution,
  dueRetryRuns: FilemakerEmailCampaignSchedulerDueRetryRun[],
  launches: LaunchCollection
): FilemakerEmailCampaignSchedulerTickResult => ({
  evaluatedCampaignCount: resolution.evaluatedCampaignCount,
  dueCampaignCount: resolution.dueCampaigns.length,
  launchedRuns: launches.launchedRuns,
  dueRetryRuns,
  skippedByReason: resolution.skippedByReason,
  launchFailures: launches.launchFailures,
});

export const createFilemakerEmailCampaignSchedulerService = (
  overrides?: Partial<FilemakerEmailCampaignSchedulerDeps>
): FilemakerEmailCampaignSchedulerService => {
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
      const rawSettings = await readSchedulerRawSettings(deps);
      const { campaignRegistry, resolution } = resolveSchedulerDueCampaigns(rawSettings, now);
      await persistEvaluatedCampaigns(
        deps,
        campaignRegistry,
        resolution.evaluatedCampaignIds,
        now.toISOString()
      );
      const dueRetryRuns = resolveDueRetryRuns(rawSettings, now);
      const launches = await launchDueCampaignsSequentially(deps, resolution.dueCampaigns);
      return buildSchedulerTickResult(resolution, dueRetryRuns, launches);
    },
  };
};

export const runFilemakerEmailCampaignSchedulerTick =
  async (): Promise<FilemakerEmailCampaignSchedulerTickResult> =>
    createFilemakerEmailCampaignSchedulerService().runTick();

export { resolveDueFilemakerEmailCampaigns };
export type { FilemakerEmailCampaignSchedulerDueCampaign };
