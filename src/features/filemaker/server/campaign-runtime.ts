import 'server-only';

import { badRequestError, notFoundError } from '@/shared/errors/app-error';

import {
  buildFilemakerEmailCampaignDeliveriesForPreview,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignRun,
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  createFilemakerEmailCampaignDeliveryAttempt,
  createFilemakerEmailCampaignSuppressionEntry,
  getFilemakerEmailCampaignDeliveriesForRun,
  getFilemakerEmailCampaignDeliveryAttemptsForDelivery,
  getFilemakerEmailCampaignSuppressionByAddress,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  isFilemakerEmailCampaignRetryableFailureCategory,
  resolveFilemakerEmailCampaignRetryDelayMs,
  resolveFilemakerEmailCampaignRetryDelayForAttemptCount,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  resolveFilemakerEmailCampaignAudiencePreview,
  summarizeFilemakerEmailCampaignRunDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../settings';
import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import { buildFilemakerMailPlainText } from '../mail-utils';
import {
  resolveFilemakerCampaignEmailFailureMetadata,
  sendFilemakerCampaignEmail,
  type FilemakerCampaignEmailSendResult,
} from './campaign-email-delivery';
import {
  buildFilemakerCampaignClickTrackingUrl,
  buildFilemakerCampaignManageAllPreferencesUrl,
  buildFilemakerCampaignOpenTrackingUrl,
  buildFilemakerCampaignPreferencesUrl,
  buildFilemakerCampaignUnsubscribeUrl,
} from './campaign-unsubscribe-token';

import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';

type FilemakerCampaignRuntimeState = {
  database: FilemakerDatabase;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
};

type FilemakerCampaignRuntimeDeps = {
  readSettingValue: (key: string) => Promise<string | null>;
  upsertSettingValue: (key: string, value: string) => Promise<boolean>;
  sendCampaignEmail: (input: {
    to: string;
    subject: string;
    text: string;
    html?: string | null;
    campaignId: string;
    runId: string;
    deliveryId: string;
    replyToEmail?: string | null;
    fromName?: string | null;
  }) => Promise<FilemakerCampaignEmailSendResult>;
  now: () => Date;
};

export type FilemakerCampaignRunLaunchResult = {
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
  queuedDeliveryCount: number;
};

export type FilemakerCampaignRunProcessProgress = {
  totalCount: number;
  processedCount: number;
  queuedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  bouncedCount: number;
};

export type FilemakerCampaignRunProcessResult = {
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
  progress: FilemakerCampaignRunProcessProgress;
  retryableDeliveryCount: number;
  retryExhaustedCount: number;
  suggestedRetryDelayMs: number | null;
};

const replaceCampaignInRegistry = (
  registry: FilemakerEmailCampaignRegistry,
  campaign: FilemakerEmailCampaign
): FilemakerEmailCampaignRegistry => ({
  version: registry.version,
  campaigns: registry.campaigns
    .filter((entry: FilemakerEmailCampaign): boolean => entry.id !== campaign.id)
    .concat(campaign)
    .sort((left: FilemakerEmailCampaign, right: FilemakerEmailCampaign) =>
      left.name.localeCompare(right.name)
    ),
});

const replaceRunInRegistry = (
  registry: FilemakerEmailCampaignRunRegistry,
  run: FilemakerEmailCampaignRun
): FilemakerEmailCampaignRunRegistry => ({
  version: registry.version,
  runs: registry.runs
    .filter((entry: FilemakerEmailCampaignRun): boolean => entry.id !== run.id)
    .concat(run)
    .sort(
      (left: FilemakerEmailCampaignRun, right: FilemakerEmailCampaignRun): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    ),
});

const replaceRunDeliveriesInRegistry = (
  registry: FilemakerEmailCampaignDeliveryRegistry,
  runId: string,
  deliveries: FilemakerEmailCampaignDelivery[]
): FilemakerEmailCampaignDeliveryRegistry => ({
  version: registry.version,
  deliveries: registry.deliveries
    .filter((entry: FilemakerEmailCampaignDelivery): boolean => entry.runId !== runId)
    .concat(deliveries)
    .sort(
      (left: FilemakerEmailCampaignDelivery, right: FilemakerEmailCampaignDelivery): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    ),
});

const appendAttemptsToRegistry = (
  registry: FilemakerEmailCampaignDeliveryAttemptRegistry,
  attempts: FilemakerEmailCampaignDeliveryAttempt[]
): FilemakerEmailCampaignDeliveryAttemptRegistry => ({
  version: registry.version,
  attempts: registry.attempts
    .concat(attempts)
    .sort(
      (left: FilemakerEmailCampaignDeliveryAttempt, right: FilemakerEmailCampaignDeliveryAttempt): number =>
        Date.parse(right.attemptedAt ?? right.createdAt ?? '') -
        Date.parse(left.attemptedAt ?? left.createdAt ?? '')
    ),
});

const appendEventsToRegistry = (
  registry: FilemakerEmailCampaignEventRegistry,
  events: FilemakerEmailCampaignEvent[]
): FilemakerEmailCampaignEventRegistry => ({
  version: registry.version,
  events: registry.events
    .concat(events)
    .sort(
      (left: FilemakerEmailCampaignEvent, right: FilemakerEmailCampaignEvent): number =>
        Date.parse(right.createdAt ?? '') - Date.parse(left.createdAt ?? '')
    ),
});

const buildProgressSummary = (
  deliveries: FilemakerEmailCampaignDelivery[]
): FilemakerCampaignRunProcessProgress => {
  const metrics = summarizeFilemakerEmailCampaignRunDeliveries(deliveries);
  const bouncedCount = deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'bounced'
  ).length;
  const queuedCount = deliveries.filter(
    (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'queued'
  ).length;
  return {
    totalCount: metrics.recipientCount,
    processedCount:
      metrics.deliveredCount + metrics.failedCount + metrics.skippedCount,
    queuedCount,
    sentCount: metrics.deliveredCount,
    failedCount: deliveries.filter(
      (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'failed'
    ).length,
    skippedCount: metrics.skippedCount,
    bouncedCount,
  };
};

const resolveFailureStatus = (
  failureCategory: 'soft_bounce' | 'hard_bounce' | 'invalid_recipient' | 'provider_rejected' | 'rate_limited' | 'timeout' | 'unknown'
): FilemakerEmailCampaignDeliveryAttempt['status'] =>
  failureCategory === 'soft_bounce' ||
  failureCategory === 'hard_bounce' ||
  failureCategory === 'invalid_recipient'
    ? 'bounced'
    : 'failed';

const resolveCampaignBodyText = (campaign: FilemakerEmailCampaign): string => {
  const text = campaign.bodyText?.trim() ?? '';
  if (text.length > 0) return text;
  const html = campaign.bodyHtml?.trim() ?? '';
  if (html.length > 0) return buildFilemakerMailPlainText(html);
  return '';
};

const applyCampaignRecipientTemplateTokens = (
  value: string | null | undefined,
  input: {
    emailAddress: string;
    unsubscribeUrl: string;
    preferencesUrl: string;
    manageAllPreferencesUrl: string;
    openTrackingUrl: string;
    campaignId: string;
    runId: string;
    deliveryId: string;
    nowMs: number;
    htmlMode: boolean;
  }
): string | null => {
  if (!value) return null;
  const openTrackingPixel = input.htmlMode
    ? `<img src="${input.openTrackingUrl}" alt="" width="1" height="1" style="display:none" />`
    : '';
  return value
    .split('{{unsubscribe_url}}')
    .join(input.unsubscribeUrl)
    .split('{{preferences_url}}')
    .join(input.preferencesUrl)
    .split('{{manage_all_preferences_url}}')
    .join(input.manageAllPreferencesUrl)
    .split('{{open_tracking_url}}')
    .join(input.openTrackingUrl)
    .split('{{open_tracking_pixel}}')
    .join(openTrackingPixel)
    .split('{{email}}')
    .join(input.emailAddress)
    .replace(/\{\{click_tracking_url:([^}]+)\}\}/g, (_match: string, destination: string): string => {
      const normalizedDestination = destination.trim();
      if (!normalizedDestination) return '';
      return buildFilemakerCampaignClickTrackingUrl({
        emailAddress: input.emailAddress,
        campaignId: input.campaignId,
        runId: input.runId,
        deliveryId: input.deliveryId,
        redirectTo: normalizedDestination,
        now: input.nowMs,
      });
    });
};

const assertCampaignReadyForDelivery = (
  campaign: FilemakerEmailCampaign,
  mode: FilemakerEmailCampaignRunMode
): void => {
  if (mode !== 'live') return;
  if (!campaign.subject.trim()) {
    throw badRequestError('Campaign subject is required before launching a live send.');
  }
  if (!resolveCampaignBodyText(campaign)) {
    throw badRequestError('Campaign body text or HTML is required before launching a live send.');
  }
};

const applyBounceThresholdToCampaign = (input: {
  campaign: FilemakerEmailCampaign;
  deliveries: FilemakerEmailCampaignDelivery[];
  nowIso: string;
}): FilemakerEmailCampaign => {
  const threshold = input.campaign.launch.pauseOnBounceRatePercent;
  if (threshold == null || threshold < 0) {
    return input.campaign;
  }
  const progress = buildProgressSummary(input.deliveries);
  if (progress.totalCount === 0) return input.campaign;
  const bounceRate = (progress.bouncedCount / progress.totalCount) * 100;
  if (bounceRate < threshold) {
    return input.campaign;
  }
  return {
    ...input.campaign,
    status: 'paused',
    lastEvaluatedAt: input.nowIso,
    updatedAt: input.nowIso,
  };
};

const defaultDeps: FilemakerCampaignRuntimeDeps = {
  readSettingValue: readFilemakerCampaignSettingValue,
  upsertSettingValue: upsertFilemakerCampaignSettingValue,
  sendCampaignEmail: sendFilemakerCampaignEmail,
  now: () => new Date(),
};

export const createFilemakerCampaignRuntimeService = (
  overrides?: Partial<FilemakerCampaignRuntimeDeps>
) => {
  const deps: FilemakerCampaignRuntimeDeps = {
    ...defaultDeps,
    ...overrides,
  };

  const readRuntimeState = async (): Promise<FilemakerCampaignRuntimeState> => {
    const [
      eventsRaw,
      suppressionsRaw,
      databaseRaw,
      campaignsRaw,
      runsRaw,
      deliveriesRaw,
      attemptsRaw,
    ] =
      await Promise.all([
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY),
        deps.readSettingValue(FILEMAKER_DATABASE_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
        deps.readSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY),
      ]);
    return {
      eventRegistry: parseFilemakerEmailCampaignEventRegistry(eventsRaw),
      suppressionRegistry: parseFilemakerEmailCampaignSuppressionRegistry(suppressionsRaw),
      database: parseFilemakerDatabase(databaseRaw),
      campaignRegistry: parseFilemakerEmailCampaignRegistry(campaignsRaw),
      runRegistry: parseFilemakerEmailCampaignRunRegistry(runsRaw),
      deliveryRegistry: parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw),
      attemptRegistry: parseFilemakerEmailCampaignDeliveryAttemptRegistry(attemptsRaw),
    };
  };

  const persistRuntimeState = async (input: {
    campaignRegistry?: FilemakerEmailCampaignRegistry;
    runRegistry?: FilemakerEmailCampaignRunRegistry;
    deliveryRegistry?: FilemakerEmailCampaignDeliveryRegistry;
    attemptRegistry?: FilemakerEmailCampaignDeliveryAttemptRegistry;
    eventRegistry?: FilemakerEmailCampaignEventRegistry;
    suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry;
  }): Promise<void> => {
    const writes: Array<Promise<boolean>> = [];
    if (input.eventRegistry) {
      writes.push(
        deps.upsertSettingValue(
          FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
          JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(input.eventRegistry))
        )
      );
    }
    if (input.suppressionRegistry) {
      writes.push(
        deps.upsertSettingValue(
          FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
          JSON.stringify(
            toPersistedFilemakerEmailCampaignSuppressionRegistry(input.suppressionRegistry)
          )
        )
      );
    }
    if (input.campaignRegistry) {
      writes.push(
        deps.upsertSettingValue(
          FILEMAKER_EMAIL_CAMPAIGNS_KEY,
          JSON.stringify(toPersistedFilemakerEmailCampaignRegistry(input.campaignRegistry))
        )
      );
    }
    if (input.runRegistry) {
      writes.push(
        deps.upsertSettingValue(
          FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
          JSON.stringify(toPersistedFilemakerEmailCampaignRunRegistry(input.runRegistry))
        )
      );
    }
    if (input.deliveryRegistry) {
      writes.push(
        deps.upsertSettingValue(
          FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
          JSON.stringify(
            toPersistedFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry)
          )
        )
      );
    }
    if (input.attemptRegistry) {
      writes.push(
        deps.upsertSettingValue(
          FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
          JSON.stringify(
            toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry(input.attemptRegistry)
          )
        )
      );
    }
    const results = await Promise.all(writes);
    if (results.some((result: boolean): boolean => !result)) {
      throw new Error('Failed to persist the Filemaker campaign runtime state.');
    }
  };

  const launchRun = async (input: {
    campaignId: string;
    mode: FilemakerEmailCampaignRunMode;
    launchReason?: string | null;
  }): Promise<FilemakerCampaignRunLaunchResult> => {
    const state = await readRuntimeState();
    const campaign =
      state.campaignRegistry.campaigns.find(
        (entry: FilemakerEmailCampaign): boolean => entry.id === input.campaignId
      ) ?? null;
    if (!campaign) {
      throw notFoundError('Filemaker campaign not found.');
    }

    assertCampaignReadyForDelivery(campaign, input.mode);

    const preview = resolveFilemakerEmailCampaignAudiencePreview(
      state.database,
      campaign.audience,
      state.suppressionRegistry
    );
    const evaluation = evaluateFilemakerEmailCampaignLaunch(campaign, preview);
    if (input.mode === 'live' && !evaluation.isEligible) {
      throw badRequestError(evaluation.blockers[0] ?? 'Campaign is not eligible to launch.');
    }

    const nowIso = deps.now().toISOString();
    const run = createFilemakerEmailCampaignRun({
      campaignId: campaign.id,
      mode: input.mode,
      status: input.mode === 'dry_run' ? 'completed' : 'queued',
      launchReason:
        input.launchReason?.trim() ||
        (input.mode === 'dry_run'
          ? 'Dry run created from the Filemaker campaign API.'
          : 'Live run created from the Filemaker campaign API.'),
      recipientCount: preview.recipients.length,
      deliveredCount: 0,
      failedCount: 0,
      skippedCount: input.mode === 'dry_run' ? preview.recipients.length : 0,
      startedAt: input.mode === 'dry_run' ? nowIso : null,
      completedAt: input.mode === 'dry_run' ? nowIso : null,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    const deliveries = buildFilemakerEmailCampaignDeliveriesForPreview({
      campaignId: campaign.id,
      runId: run.id,
      preview,
      mode: input.mode,
    });
    const syncedRun = syncFilemakerEmailCampaignRunWithDeliveries({
      run,
      deliveries,
    });
    const nextCampaign: FilemakerEmailCampaign = {
      ...campaign,
      lastEvaluatedAt: nowIso,
      updatedAt: nowIso,
      ...(input.mode === 'live' ? { lastLaunchedAt: nowIso } : {}),
    };
    const nextCampaignRegistry = replaceCampaignInRegistry(state.campaignRegistry, nextCampaign);
    const nextRunRegistry = replaceRunInRegistry(state.runRegistry, syncedRun);
    const nextDeliveryRegistry = replaceRunDeliveriesInRegistry(
      state.deliveryRegistry,
      run.id,
      deliveries
    );
    const nextEventRegistry = appendEventsToRegistry(state.eventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: campaign.id,
        runId: run.id,
        type: 'launched',
        message:
          input.mode === 'dry_run'
            ? `Dry run launched for ${preview.recipients.length} recipients.`
            : `Live campaign launched for ${preview.recipients.length} recipients.`,
        actor: 'system',
        runStatus: syncedRun.status,
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
      ...(input.mode === 'dry_run'
        ? [
            createFilemakerEmailCampaignEvent({
              campaignId: campaign.id,
              runId: run.id,
              type: 'completed',
              message: `Dry run completed with ${preview.recipients.length} preview recipients.`,
              actor: 'system',
              runStatus: syncedRun.status,
              createdAt: nowIso,
              updatedAt: nowIso,
            }),
          ]
        : []),
    ]);

    await persistRuntimeState({
      eventRegistry: nextEventRegistry,
      campaignRegistry: nextCampaignRegistry,
      runRegistry: nextRunRegistry,
      deliveryRegistry: nextDeliveryRegistry,
    });

    return {
      campaign: nextCampaign,
      run: syncedRun,
      deliveries,
      queuedDeliveryCount: deliveries.filter(
        (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'queued'
      ).length,
    };
  };

  const processRun = async (input: {
    runId: string;
    reason?: 'manual' | 'retry' | 'launch';
    onProgress?: (progress: FilemakerCampaignRunProcessProgress) => Promise<void> | void;
  }): Promise<FilemakerCampaignRunProcessResult> => {
    const state = await readRuntimeState();
    const run =
      state.runRegistry.runs.find(
        (entry: FilemakerEmailCampaignRun): boolean => entry.id === input.runId
      ) ?? null;
    if (!run) {
      throw notFoundError('Filemaker campaign run not found.');
    }
    const campaign =
      state.campaignRegistry.campaigns.find(
        (entry: FilemakerEmailCampaign): boolean => entry.id === run.campaignId
      ) ?? null;
    if (!campaign) {
      throw notFoundError('Filemaker campaign for the requested run was not found.');
    }

    let deliveries = getFilemakerEmailCampaignDeliveriesForRun(state.deliveryRegistry, run.id);
    let currentAttemptRegistry = state.attemptRegistry;
    let currentEventRegistry = state.eventRegistry;
    let currentSuppressionRegistry = state.suppressionRegistry;
    if (run.mode === 'dry_run') {
      const syncedDryRun = syncFilemakerEmailCampaignRunWithDeliveries({
        run,
        deliveries,
        status: 'completed',
      });
      const nextRunRegistry = replaceRunInRegistry(state.runRegistry, syncedDryRun);
      await persistRuntimeState({ runRegistry: nextRunRegistry });
      const progress = buildProgressSummary(deliveries);
      return {
        campaign,
        run: syncedDryRun,
        deliveries,
        progress,
        retryableDeliveryCount: 0,
        retryExhaustedCount: 0,
        suggestedRetryDelayMs: null,
      };
    }

    assertCampaignReadyForDelivery(campaign, 'live');
    if (input.reason === 'retry') {
      const retrySummary = resolveFilemakerEmailCampaignRetryableDeliveries({
        deliveries,
        attemptRegistry: currentAttemptRegistry,
        maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
      });
      if (retrySummary.retryableDeliveries.length > 0) {
        const retryableIds = new Set(
          retrySummary.retryableDeliveries.map((delivery: FilemakerEmailCampaignDelivery) => delivery.id)
        );
        const nowIso = deps.now().toISOString();
        deliveries = deliveries.map((delivery: FilemakerEmailCampaignDelivery) =>
          retryableIds.has(delivery.id)
            ? {
                ...delivery,
                status: 'queued',
                provider: null,
                failureCategory: null,
                providerMessage: null,
                lastError: null,
                sentAt: null,
                nextRetryAt: null,
                updatedAt: nowIso,
              }
            : delivery
        );
        currentEventRegistry = appendEventsToRegistry(currentEventRegistry, [
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: run.id,
            type: 'status_changed',
            message: `Queued ${retrySummary.retryableDeliveries.length} retryable deliveries for another attempt.`,
            actor: 'system',
            runStatus: run.status,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
      }
    }

    const queuedDeliveries = deliveries.filter(
      (delivery: FilemakerEmailCampaignDelivery): boolean => delivery.status === 'queued'
    );
    if (queuedDeliveries.length === 0) {
      const syncedRun = syncFilemakerEmailCampaignRunWithDeliveries({
        run,
        deliveries,
      });
      const nextRunRegistry = replaceRunInRegistry(state.runRegistry, syncedRun);
      await persistRuntimeState({ runRegistry: nextRunRegistry });
      const progress = buildProgressSummary(deliveries);
      return {
        campaign,
        run: syncedRun,
        deliveries,
        progress,
        retryableDeliveryCount: 0,
        retryExhaustedCount: 0,
        suggestedRetryDelayMs: null,
      };
    }

    let currentRun = syncFilemakerEmailCampaignRunWithDeliveries({
      run,
      deliveries,
      status: 'running',
    });
    let currentRunRegistry = replaceRunInRegistry(state.runRegistry, currentRun);
    currentEventRegistry = appendEventsToRegistry(currentEventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: campaign.id,
        runId: run.id,
        type: 'processing_started',
        message:
          input.reason === 'retry'
            ? 'Retry delivery processing started.'
            : 'Queued delivery processing started.',
        actor: 'system',
        runStatus: currentRun.status,
        createdAt: currentRun.updatedAt ?? undefined,
        updatedAt: currentRun.updatedAt ?? undefined,
      }),
    ]);
    await persistRuntimeState({
      runRegistry: currentRunRegistry,
      eventRegistry: currentEventRegistry,
    });

    const campaignBodyTextTemplate = resolveCampaignBodyText(campaign);
    const campaignBodyHtmlTemplate = campaign.bodyHtml?.trim() || null;

    for (const queuedDelivery of queuedDeliveries) {
      const now = deps.now();
      const nowIso = now.toISOString();
      const unsubscribeUrl = buildFilemakerCampaignUnsubscribeUrl({
        emailAddress: queuedDelivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: queuedDelivery.id,
        now: now.getTime(),
      });
      const preferencesUrl = buildFilemakerCampaignPreferencesUrl({
        emailAddress: queuedDelivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: queuedDelivery.id,
        now: now.getTime(),
      });
      const manageAllPreferencesUrl = buildFilemakerCampaignManageAllPreferencesUrl({
        emailAddress: queuedDelivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: queuedDelivery.id,
        now: now.getTime(),
      });
      const openTrackingUrl = buildFilemakerCampaignOpenTrackingUrl({
        emailAddress: queuedDelivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: queuedDelivery.id,
        now: now.getTime(),
      });
      const campaignBodyText =
        applyCampaignRecipientTemplateTokens(campaignBodyTextTemplate, {
          emailAddress: queuedDelivery.emailAddress,
          unsubscribeUrl,
          preferencesUrl,
          manageAllPreferencesUrl,
          openTrackingUrl,
          campaignId: campaign.id,
          runId: run.id,
          deliveryId: queuedDelivery.id,
          nowMs: now.getTime(),
          htmlMode: false,
        }) ?? '';
      const campaignBodyHtml = applyCampaignRecipientTemplateTokens(campaignBodyHtmlTemplate, {
        emailAddress: queuedDelivery.emailAddress,
        unsubscribeUrl,
        preferencesUrl,
        manageAllPreferencesUrl,
        openTrackingUrl,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: queuedDelivery.id,
        nowMs: now.getTime(),
        htmlMode: true,
      });
      const attemptNumber =
        getFilemakerEmailCampaignDeliveryAttemptsForDelivery(currentAttemptRegistry, queuedDelivery.id)
          .length + 1;
      try {
        const result = await deps.sendCampaignEmail({
          to: queuedDelivery.emailAddress,
          subject: campaign.subject,
          text: campaignBodyText,
          html: campaignBodyHtml,
          campaignId: campaign.id,
          runId: run.id,
          deliveryId: queuedDelivery.id,
          replyToEmail: campaign.replyToEmail,
          fromName: campaign.fromName,
        });
        currentAttemptRegistry = appendAttemptsToRegistry(currentAttemptRegistry, [
          createFilemakerEmailCampaignDeliveryAttempt({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: queuedDelivery.id,
            emailAddress: queuedDelivery.emailAddress,
            partyKind: queuedDelivery.partyKind,
            partyId: queuedDelivery.partyId,
            attemptNumber,
            status: 'sent',
            provider: result.provider,
            failureCategory: null,
            providerMessage: result.providerMessage,
            errorMessage: null,
            attemptedAt: result.sentAt ?? nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
        deliveries = deliveries.map((delivery: FilemakerEmailCampaignDelivery) =>
          delivery.id === queuedDelivery.id
            ? {
                ...delivery,
                status: 'sent',
                provider: result.provider,
                failureCategory: null,
                providerMessage: result.providerMessage,
                lastError: null,
                sentAt: result.sentAt,
                nextRetryAt: null,
                updatedAt: nowIso,
              }
            : delivery
        );
        currentEventRegistry = appendEventsToRegistry(currentEventRegistry, [
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: queuedDelivery.id,
            type: 'delivery_sent',
            message: `Delivery sent to ${queuedDelivery.emailAddress}.`,
            actor: 'system',
            deliveryStatus: 'sent',
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
      } catch (error) {
        const failure = resolveFilemakerCampaignEmailFailureMetadata(error);
        const message = failure.message;
        const failureStatus = resolveFailureStatus(failure.failureCategory);
        const nextRetryDelayMs =
          isFilemakerEmailCampaignRetryableFailureCategory(failure.failureCategory) &&
          attemptNumber < FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS
            ? resolveFilemakerEmailCampaignRetryDelayForAttemptCount(attemptNumber)
            : null;
        const nextRetryAt =
          nextRetryDelayMs != null
            ? new Date(Date.parse(nowIso) + nextRetryDelayMs).toISOString()
            : null;
        currentAttemptRegistry = appendAttemptsToRegistry(currentAttemptRegistry, [
          createFilemakerEmailCampaignDeliveryAttempt({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: queuedDelivery.id,
            emailAddress: queuedDelivery.emailAddress,
            partyKind: queuedDelivery.partyKind,
            partyId: queuedDelivery.partyId,
            attemptNumber,
            status: failureStatus,
            provider: failure.provider,
            failureCategory: failure.failureCategory,
            providerMessage: null,
            errorMessage: message,
            attemptedAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
        deliveries = deliveries.map((delivery: FilemakerEmailCampaignDelivery) =>
          delivery.id === queuedDelivery.id
            ? {
                ...delivery,
                status: failureStatus,
                provider: failure.provider,
                failureCategory: failure.failureCategory,
                providerMessage: null,
                lastError: message,
                sentAt: null,
                nextRetryAt,
                updatedAt: nowIso,
              }
            : delivery
        );
        currentEventRegistry = appendEventsToRegistry(currentEventRegistry, [
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: queuedDelivery.id,
            type: failureStatus === 'bounced' ? 'delivery_bounced' : 'delivery_failed',
            message:
              failureStatus === 'bounced'
                ? `Delivery bounced for ${queuedDelivery.emailAddress} (${failure.failureCategory}${failure.provider ? ` via ${failure.provider}` : ''}): ${message}`
                : `Delivery failed for ${queuedDelivery.emailAddress} (${failure.failureCategory}${failure.provider ? ` via ${failure.provider}` : ''}): ${message}`,
            actor: 'system',
            deliveryStatus: failureStatus,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
        if (failureStatus === 'bounced') {
          const nextSuppressionEntry = createFilemakerEmailCampaignSuppressionEntry({
            emailAddress: queuedDelivery.emailAddress,
            reason: 'bounced',
            actor: 'system',
            notes: 'Automatically suppressed after a campaign bounce.',
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: queuedDelivery.id,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
          const existingSuppression = getFilemakerEmailCampaignSuppressionByAddress(
            currentSuppressionRegistry,
            queuedDelivery.emailAddress
          );
          if (!existingSuppression) {
            currentSuppressionRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
              registry: currentSuppressionRegistry,
              entry: nextSuppressionEntry,
            });
            currentEventRegistry = appendEventsToRegistry(currentEventRegistry, [
              createFilemakerEmailCampaignEvent({
                campaignId: campaign.id,
                runId: run.id,
                deliveryId: queuedDelivery.id,
                type: 'updated',
                message: `${queuedDelivery.emailAddress} was added to the suppression list after a bounce.`,
                actor: 'system',
                deliveryStatus: failureStatus,
                createdAt: nowIso,
                updatedAt: nowIso,
              }),
            ]);
          }
        }
      }

      currentRun = syncFilemakerEmailCampaignRunWithDeliveries({
        run: currentRun,
        deliveries,
      });
      currentRunRegistry = replaceRunInRegistry(currentRunRegistry, currentRun);
      const nextDeliveryRegistry = replaceRunDeliveriesInRegistry(
        state.deliveryRegistry,
        run.id,
        deliveries
      );
      await persistRuntimeState({
        runRegistry: currentRunRegistry,
        deliveryRegistry: nextDeliveryRegistry,
        attemptRegistry: currentAttemptRegistry,
        eventRegistry: currentEventRegistry,
        suppressionRegistry: currentSuppressionRegistry,
      });

      const progress = buildProgressSummary(deliveries);
      await input.onProgress?.(progress);
    }

    const nowIso = deps.now().toISOString();
    const nextCampaign = applyBounceThresholdToCampaign({
      campaign,
      deliveries,
      nowIso,
    });
    if (nextCampaign.status === 'paused') {
      deliveries = deliveries.map((delivery: FilemakerEmailCampaignDelivery) =>
        delivery.nextRetryAt
          ? {
              ...delivery,
              nextRetryAt: null,
              updatedAt: nowIso,
            }
          : delivery
      );
    }
    const finalRetrySummary =
      nextCampaign.status === 'paused'
        ? {
            retryableDeliveries: [],
            exhaustedDeliveries: [],
          }
        : resolveFilemakerEmailCampaignRetryableDeliveries({
            deliveries,
            attemptRegistry: currentAttemptRegistry,
            maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
          });
    const suggestedRetryDelayMs =
      finalRetrySummary.retryableDeliveries.length > 0
        ? resolveFilemakerEmailCampaignRetryDelayMs({
            deliveries,
            attemptRegistry: currentAttemptRegistry,
            maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
          })
        : null;
    currentRun = syncFilemakerEmailCampaignRunWithDeliveries({
      run: currentRun,
      deliveries,
      status:
        finalRetrySummary.retryableDeliveries.length > 0 && nextCampaign.status !== 'paused'
          ? 'queued'
          : undefined,
    });
    currentRunRegistry = replaceRunInRegistry(currentRunRegistry, currentRun);
    const nextCampaignRegistry = replaceCampaignInRegistry(
      state.campaignRegistry,
      nextCampaign
    );
    const nextDeliveryRegistry = replaceRunDeliveriesInRegistry(
      state.deliveryRegistry,
      run.id,
      deliveries
    );
    const finalEvents: FilemakerEmailCampaignEvent[] = [];
    if (nextCampaign.status === 'paused' && campaign.status !== 'paused') {
      const progress = buildProgressSummary(deliveries);
      const bounceRate =
        progress.totalCount > 0 ? (progress.bouncedCount / progress.totalCount) * 100 : 0;
      finalEvents.push(
        createFilemakerEmailCampaignEvent({
          campaignId: campaign.id,
          runId: run.id,
          type: 'paused',
          message: `Campaign paused automatically after bounce rate reached ${bounceRate.toFixed(
            1
          )}%.`,
          actor: 'system',
          runStatus: currentRun.status,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
      );
    }
    if (
      currentRun.status === 'completed' ||
      currentRun.status === 'failed' ||
      currentRun.status === 'cancelled'
    ) {
      const completionType =
        currentRun.status === 'completed'
          ? 'completed'
          : currentRun.status === 'failed'
            ? 'failed'
            : 'cancelled';
      finalEvents.push(
        createFilemakerEmailCampaignEvent({
          campaignId: campaign.id,
          runId: run.id,
          type: completionType,
          message:
            completionType === 'completed'
              ? `Run completed. Sent ${currentRun.deliveredCount} of ${currentRun.recipientCount} deliveries.`
              : completionType === 'failed'
                ? `Run failed after ${currentRun.failedCount} failed or bounced deliveries.`
                : 'Run was cancelled.',
          actor: 'system',
          runStatus: currentRun.status,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
      );
    }
    if (finalRetrySummary.retryableDeliveries.length > 0 && nextCampaign.status !== 'paused') {
      finalEvents.push(
        createFilemakerEmailCampaignEvent({
          campaignId: campaign.id,
          runId: run.id,
          type: 'status_changed',
          message: `Run has ${finalRetrySummary.retryableDeliveries.length} retryable deliveries pending another attempt.`,
          actor: 'system',
          runStatus: currentRun.status,
          createdAt: nowIso,
          updatedAt: nowIso,
        })
      );
    }
    currentEventRegistry = appendEventsToRegistry(currentEventRegistry, finalEvents);

    await persistRuntimeState({
      campaignRegistry: nextCampaignRegistry,
      runRegistry: currentRunRegistry,
      deliveryRegistry: nextDeliveryRegistry,
      attemptRegistry: currentAttemptRegistry,
      eventRegistry: currentEventRegistry,
      suppressionRegistry: currentSuppressionRegistry,
    });

    return {
      campaign: nextCampaign,
      run: currentRun,
      deliveries,
      progress: buildProgressSummary(deliveries),
      retryableDeliveryCount: finalRetrySummary.retryableDeliveries.length,
      retryExhaustedCount: finalRetrySummary.exhaustedDeliveries.length,
      suggestedRetryDelayMs,
    };
  };

  return {
    launchRun,
    processRun,
  };
};

const defaultRuntimeService = createFilemakerCampaignRuntimeService();

export const launchFilemakerEmailCampaignRun = defaultRuntimeService.launchRun;
export const processFilemakerEmailCampaignRun = defaultRuntimeService.processRun;
