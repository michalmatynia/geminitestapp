import 'server-only';

import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import {
  buildFilemakerEmailCampaignDeliveriesForPreview,
  createFilemakerEmailCampaignDeliveryAttempt,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignRun,
  createFilemakerEmailCampaignSuppressionEntry,
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  getFilemakerEmailCampaignDeliveryAttemptsForDelivery,
  getFilemakerEmailCampaignSuppressionByAddress,
  isFilemakerEmailCampaignRetryableFailureCategory,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  resolveFilemakerEmailCampaignAudiencePreview,
  resolveFilemakerEmailCampaignRetryDelayMs,
  resolveFilemakerEmailCampaignRetryDelayForAttemptCount,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  syncFilemakerEmailCampaignRunWithDeliveries,
  applyFilemakerEmailCampaignRunStatusToDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSuppressionRegistry,
  upsertFilemakerEmailCampaignSuppressionEntry,
} from '../../settings';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRunMode,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerEmailCampaignRegistry,
} from '../../types';
import { resolveFilemakerCampaignEmailFailureMetadata } from '../campaign-email-delivery';
import {
  appendAttemptsToRegistry,
  appendEventsToRegistry,
  buildProgressSummary,
  replaceCampaignInRegistry,
  replaceRunDeliveriesInRegistry,
  replaceRunInRegistry,
} from '../campaign-runtime.helpers';
import {
  buildFilemakerCampaignManageAllPreferencesUrl,
  buildFilemakerCampaignOpenTrackingUrl,
  buildFilemakerCampaignPreferencesUrl,
  buildFilemakerCampaignUnsubscribeUrl,
} from '../campaign-unsubscribe-token';
import type {
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimeState,
  FilemakerCampaignRunLaunchResult,
  FilemakerCampaignRunCancelResult,
  FilemakerCampaignRunProcessResult,
} from './runtime-types';
import {
  FILEMAKER_CAMPAIGN_DOMAIN_GUARD_RETRY_DELAY_MS,
  applyBounceThresholdToCampaign,
  applyCampaignRecipientTemplateTokens,
  assertCampaignReadyForDelivery,
  resolveCampaignBodyText,
  isFilemakerEmailCampaignPermanentFailureCategory,
  resolveFailureStatus,
  shouldDeferDeliveryForDomainHealth,
  shouldPauseRunForBounceRate,
} from './runtime-utils';

type FilemakerCampaignProcessReason = 'manual' | 'retry';

const replaceDeliveryInCollection = (
  deliveries: FilemakerEmailCampaignDelivery[],
  nextDelivery: FilemakerEmailCampaignDelivery
): FilemakerEmailCampaignDelivery[] =>
  deliveries.map((delivery) => (delivery.id === nextDelivery.id ? nextDelivery : delivery));

export const createCampaignRuntimeService = (deps: FilemakerCampaignRuntimeDeps) => {
  const readRuntimeState = async (): Promise<FilemakerCampaignRuntimeState> => {
    const [eventsRaw, suppressionsRaw, databaseRaw, campaignsRaw, runsRaw, deliveriesRaw, attemptsRaw] =
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
          JSON.stringify(toPersistedFilemakerEmailCampaignDeliveryRegistry(input.deliveryRegistry))
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

    await Promise.all(writes);
  };

  const launchRun = async (input: {
    campaignId: string;
    mode: FilemakerEmailCampaignRunMode;
    launchReason?: string | null;
  }): Promise<FilemakerCampaignRunLaunchResult> => {
    const state = await readRuntimeState();
    const campaign = state.campaignRegistry.campaigns.find((entry) => entry.id === input.campaignId);
    if (!campaign) {
      throw notFoundError(`Campaign ${input.campaignId} not found.`);
    }

    assertCampaignReadyForDelivery(campaign, input.mode);
    const now = deps.now();
    const nowIso = now.toISOString();
    const preview = resolveFilemakerEmailCampaignAudiencePreview(
      state.database,
      campaign.audience,
      state.suppressionRegistry
    );
    const evaluation = evaluateFilemakerEmailCampaignLaunch(campaign, preview, now);

    if (input.mode === 'live' && !evaluation.isEligible) {
      throw badRequestError(evaluation.blockers[0] ?? 'Campaign launch is blocked.');
    }

    const baseRun = createFilemakerEmailCampaignRun({
      campaignId: campaign.id,
      mode: input.mode,
      launchReason: input.launchReason ?? null,
      status: input.mode === 'dry_run' ? 'completed' : 'queued',
      recipientCount: preview.recipients.length,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: input.mode === 'dry_run' ? nowIso : null,
    });
    const deliveries = buildFilemakerEmailCampaignDeliveriesForPreview({
      campaignId: campaign.id,
      runId: baseRun.id,
      preview,
      mode: input.mode,
    });
    const queuedDeliveryCount = deliveries.filter((delivery) => delivery.status === 'queued').length;
    const run = syncFilemakerEmailCampaignRunWithDeliveries({
      run: baseRun,
      deliveries,
      status: queuedDeliveryCount > 0 ? 'queued' : 'completed',
    });
    const updatedCampaign: FilemakerEmailCampaign = {
      ...campaign,
      lastLaunchedAt: nowIso,
      lastEvaluatedAt: nowIso,
      updatedAt: nowIso,
    };

    await persistRuntimeState({
      campaignRegistry: replaceCampaignInRegistry(state.campaignRegistry, updatedCampaign),
      runRegistry: replaceRunInRegistry(state.runRegistry, run),
      deliveryRegistry: replaceRunDeliveriesInRegistry(
        state.deliveryRegistry,
        run.id,
        deliveries
      ),
      eventRegistry: appendEventsToRegistry(state.eventRegistry, [
        createFilemakerEmailCampaignEvent({
          campaignId: updatedCampaign.id,
          runId: run.id,
          type: 'launched',
          message: `Launched ${input.mode} run with ${deliveries.length} recipients.`,
          runStatus: run.status,
          createdAt: nowIso,
          updatedAt: nowIso,
        }),
      ]),
    });

    return {
      campaign: updatedCampaign,
      run,
      deliveries,
      queuedDeliveryCount,
    };
  };

  const processRun = async (input: {
    runId: string;
    reason?: FilemakerCampaignProcessReason;
  }): Promise<FilemakerCampaignRunProcessResult> => {
    const state = await readRuntimeState();
    const reason = input.reason ?? 'manual';
    const run = state.runRegistry.runs.find((entry) => entry.id === input.runId);
    if (!run) {
      throw notFoundError(`Campaign run ${input.runId} not found.`);
    }

    const campaign = state.campaignRegistry.campaigns.find((entry) => entry.id === run.campaignId);
    if (!campaign) {
      throw notFoundError(`Campaign ${run.campaignId} not found.`);
    }

    const now = deps.now();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();

    let deliveries = getFilemakerEmailCampaignDeliveriesForRun(state.deliveryRegistry, run.id);
    let attemptRegistry = state.attemptRegistry;
    let eventRegistry = state.eventRegistry;
    let suppressionRegistry = state.suppressionRegistry;

    const retrySummaryBeforeRun =
      reason === 'retry'
        ? resolveFilemakerEmailCampaignRetryableDeliveries({
            deliveries,
            attemptRegistry,
            maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
          })
        : null;
    const deliveriesToProcess =
      retrySummaryBeforeRun?.retryableDeliveries ??
      deliveries.filter((delivery) => delivery.status === 'queued');

    if (reason === 'retry' && retrySummaryBeforeRun) {
      retrySummaryBeforeRun.retryableDeliveries.forEach((delivery) => {
        deliveries = replaceDeliveryInCollection(deliveries, {
          ...delivery,
          status: 'queued',
          nextRetryAt: null,
          updatedAt: nowIso,
        });
      });
    }

    if (deliveriesToProcess.length === 0) {
      const syncedRun = syncFilemakerEmailCampaignRunWithDeliveries({
        run,
        deliveries,
      });
      return {
        campaign,
        run: syncedRun,
        deliveries,
        progress: buildProgressSummary(deliveries),
        retryableDeliveryCount: 0,
        retryExhaustedCount: 0,
        suggestedRetryDelayMs: null,
      };
    }

    eventRegistry = appendEventsToRegistry(eventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: campaign.id,
        runId: run.id,
        type: 'processing_started',
        message:
          reason === 'retry' ? 'Retry delivery processing started.' : 'Delivery processing started.',
        runStatus: 'running',
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
    ]);

    const runningRun = syncFilemakerEmailCampaignRunWithDeliveries({
      run,
      deliveries,
      status: 'running',
    });

    for (const delivery of deliveriesToProcess) {
      const attemptNumber =
        getFilemakerEmailCampaignDeliveryAttemptsForDelivery(attemptRegistry, delivery.id).length + 1;
      const unsubscribeUrl = buildFilemakerCampaignUnsubscribeUrl({
        emailAddress: delivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: delivery.id,
        now: nowMs,
      });
      const preferencesUrl = buildFilemakerCampaignPreferencesUrl({
        emailAddress: delivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: delivery.id,
        now: nowMs,
      });
      const manageAllPreferencesUrl = buildFilemakerCampaignManageAllPreferencesUrl({
        emailAddress: delivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: delivery.id,
        now: nowMs,
      });
      const openTrackingUrl = buildFilemakerCampaignOpenTrackingUrl({
        emailAddress: delivery.emailAddress,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: delivery.id,
        now: nowMs,
      });
      const text =
        applyCampaignRecipientTemplateTokens(resolveCampaignBodyText(campaign), {
          emailAddress: delivery.emailAddress,
          unsubscribeUrl,
          preferencesUrl,
          manageAllPreferencesUrl,
          openTrackingUrl,
          campaignId: campaign.id,
          runId: run.id,
          deliveryId: delivery.id,
          nowMs,
          htmlMode: false,
        }) ?? '';
      const html = applyCampaignRecipientTemplateTokens(campaign.bodyHtml ?? null, {
        emailAddress: delivery.emailAddress,
        unsubscribeUrl,
        preferencesUrl,
        manageAllPreferencesUrl,
        openTrackingUrl,
        campaignId: campaign.id,
        runId: run.id,
        deliveryId: delivery.id,
        nowMs,
        htmlMode: true,
      });

      const currentSuppression = getFilemakerEmailCampaignSuppressionByAddress(
        suppressionRegistry,
        delivery.emailAddress
      );
      if (currentSuppression) {
        deliveries = replaceDeliveryInCollection(deliveries, {
          ...delivery,
          status: 'skipped',
          providerMessage: `Recipient is on the suppression list (${currentSuppression.reason}).`,
          lastError: null,
          nextRetryAt: null,
          updatedAt: nowIso,
        });
        eventRegistry = appendEventsToRegistry(eventRegistry, [
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: delivery.id,
            type: 'status_changed',
            message: `Skipped ${delivery.emailAddress}: on suppression list (${currentSuppression.reason}).`,
            deliveryStatus: 'skipped',
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
        continue;
      }

      if (
        shouldDeferDeliveryForDomainHealth({
          delivery,
          deliveries,
          attempts: attemptRegistry.attempts,
          nowMs,
        })
      ) {
        const nextRetryAt = new Date(
          nowMs + FILEMAKER_CAMPAIGN_DOMAIN_GUARD_RETRY_DELAY_MS
        ).toISOString();
        const domain = delivery.emailAddress.split('@').at(-1)?.toLowerCase() ?? 'unknown';
        const message = `Deferred ${delivery.emailAddress}: recipient domain ${domain} is already failing in this run.`;
        deliveries = replaceDeliveryInCollection(deliveries, {
          ...delivery,
          status: 'failed',
          failureCategory: 'rate_limited',
          providerMessage: message,
          lastError: message,
          nextRetryAt,
          updatedAt: nowIso,
        });
        eventRegistry = appendEventsToRegistry(eventRegistry, [
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: delivery.id,
            type: 'status_changed',
            message,
            deliveryStatus: 'failed',
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
        continue;
      }

      try {
        if (deps.reserveWarmupSlot) {
          const senderAccountId = campaign.mailAccountId?.trim() ?? '';
          const senderKey = senderAccountId.length > 0 ? senderAccountId : 'shared-smtp';
          const warmup = await deps.reserveWarmupSlot(senderKey);
          if (!warmup.ok) {
            deliveries = replaceDeliveryInCollection(deliveries, {
              ...delivery,
              nextRetryAt: warmup.nextAvailableAt,
              updatedAt: nowIso,
            });
            eventRegistry = appendEventsToRegistry(eventRegistry, [
              createFilemakerEmailCampaignEvent({
                campaignId: campaign.id,
                runId: run.id,
                deliveryId: delivery.id,
                type: 'status_changed',
                message: `Warm-up daily cap reached for sender ${senderKey} (${warmup.used}/${warmup.dailyCap}). Deferred to ${warmup.nextAvailableAt}.`,
                deliveryStatus: delivery.status,
                createdAt: nowIso,
                updatedAt: nowIso,
              }),
            ]);
            continue;
          }
        }
        if (deps.throttleBeforeSend) {
          await deps.throttleBeforeSend(delivery.emailAddress);
        }
        const sendResult = await deps.sendCampaignEmail({
          to: delivery.emailAddress,
          subject: campaign.subject,
          text,
          html,
          campaignId: campaign.id,
          runId: run.id,
          deliveryId: delivery.id,
          mailAccountId: campaign.mailAccountId ?? null,
          replyToEmail: campaign.replyToEmail ?? null,
          fromName: campaign.fromName ?? null,
        });

        deliveries = replaceDeliveryInCollection(deliveries, {
          ...delivery,
          status: 'sent',
          provider: sendResult.provider,
          failureCategory: null,
          providerMessage: sendResult.providerMessage,
          lastError: null,
          sentAt: sendResult.sentAt,
          nextRetryAt: null,
          updatedAt: nowIso,
        });
        attemptRegistry = appendAttemptsToRegistry(attemptRegistry, [
          createFilemakerEmailCampaignDeliveryAttempt({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: delivery.id,
            emailAddress: delivery.emailAddress,
            partyKind: delivery.partyKind,
            partyId: delivery.partyId,
            attemptNumber,
            status: 'sent',
            provider: sendResult.provider,
            failureCategory: null,
            providerMessage: sendResult.providerMessage,
            attemptedAt: sendResult.sentAt,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
        const deliveryEvents = [
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: delivery.id,
            type: 'delivery_sent',
            message: `Delivered to ${delivery.emailAddress}.`,
            deliveryStatus: 'sent',
            mailThreadId: sendResult.mailThreadId ?? null,
            mailMessageId: sendResult.mailMessageId ?? null,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ];
        if (sendResult.mailFilingStatus === 'failed') {
          deliveryEvents.push(
            createFilemakerEmailCampaignEvent({
              campaignId: campaign.id,
              runId: run.id,
              deliveryId: delivery.id,
              type: 'status_changed',
              message: `Delivered to ${delivery.emailAddress}, but filing into the mail client failed: ${
                sendResult.mailFilingError ?? 'unknown error'
              }`,
              deliveryStatus: 'sent',
              createdAt: nowIso,
              updatedAt: nowIso,
            })
          );
        }
        eventRegistry = appendEventsToRegistry(eventRegistry, deliveryEvents);
      } catch (error) {
        const failure = resolveFilemakerCampaignEmailFailureMetadata(error);
        const status = resolveFailureStatus(failure.failureCategory);
        const isRetryable =
          isFilemakerEmailCampaignRetryableFailureCategory(failure.failureCategory) &&
          attemptNumber < FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS;
        const nextRetryAt = isRetryable
          ? new Date(
              nowMs + resolveFilemakerEmailCampaignRetryDelayForAttemptCount(attemptNumber)
            ).toISOString()
          : null;

        deliveries = replaceDeliveryInCollection(deliveries, {
          ...delivery,
          status,
          provider: failure.provider,
          failureCategory: failure.failureCategory,
          providerMessage: failure.message,
          lastError: failure.message,
          nextRetryAt,
          updatedAt: nowIso,
        });
        attemptRegistry = appendAttemptsToRegistry(attemptRegistry, [
          createFilemakerEmailCampaignDeliveryAttempt({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: delivery.id,
            emailAddress: delivery.emailAddress,
            partyKind: delivery.partyKind,
            partyId: delivery.partyId,
            attemptNumber,
            status,
            provider: failure.provider,
            failureCategory: failure.failureCategory,
            providerMessage: failure.message,
            errorMessage: failure.message,
            attemptedAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);
        eventRegistry = appendEventsToRegistry(eventRegistry, [
          createFilemakerEmailCampaignEvent({
            campaignId: campaign.id,
            runId: run.id,
            deliveryId: delivery.id,
            type: status === 'bounced' ? 'delivery_bounced' : 'delivery_failed',
            message: failure.message,
            deliveryStatus: status,
            createdAt: nowIso,
            updatedAt: nowIso,
          }),
        ]);

        if (
          status === 'bounced' &&
          isFilemakerEmailCampaignPermanentFailureCategory(failure.failureCategory)
        ) {
          suppressionRegistry = upsertFilemakerEmailCampaignSuppressionEntry({
            registry: suppressionRegistry,
            entry: createFilemakerEmailCampaignSuppressionEntry({
              emailAddress: delivery.emailAddress,
              reason: 'bounced',
              campaignId: campaign.id,
              runId: run.id,
              deliveryId: delivery.id,
              notes: `Auto-suppressed after ${failure.failureCategory} from ${delivery.emailAddress}: ${failure.message}`,
              createdAt: nowIso,
              updatedAt: nowIso,
            }),
          });
        }

        if (shouldPauseRunForBounceRate({ campaign, deliveries })) {
          eventRegistry = appendEventsToRegistry(eventRegistry, [
            createFilemakerEmailCampaignEvent({
              campaignId: campaign.id,
              runId: run.id,
              type: 'paused',
              message: `Run halted mid-flight: bounce rate exceeded ${campaign.launch.pauseOnBounceRatePercent}% threshold to protect sender reputation.`,
              runStatus: 'queued',
              createdAt: nowIso,
              updatedAt: nowIso,
            }),
          ]);
          break;
        }
      }
    }

    const retrySummaryAfterRun = resolveFilemakerEmailCampaignRetryableDeliveries({
      deliveries,
      attemptRegistry,
      maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
    });
    const retryableDeliveryCount = retrySummaryAfterRun.retryableDeliveries.length;
    const retryExhaustedCount = retrySummaryAfterRun.exhaustedDeliveries.length;
    const suggestedRetryDelayMs = resolveFilemakerEmailCampaignRetryDelayMs({
      deliveries,
      attemptRegistry,
      maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
    });
    const nextRun = syncFilemakerEmailCampaignRunWithDeliveries({
      run: runningRun,
      deliveries,
      status: retryableDeliveryCount > 0 ? 'queued' : undefined,
    });

    if (retryableDeliveryCount > 0) {
      eventRegistry = appendEventsToRegistry(eventRegistry, [
        createFilemakerEmailCampaignEvent({
          campaignId: campaign.id,
          runId: run.id,
          type: 'status_changed',
          message: `Queued ${retryableDeliveryCount} retryable deliveries for another attempt.`,
          runStatus: 'queued',
          createdAt: nowIso,
          updatedAt: nowIso,
        }),
        createFilemakerEmailCampaignEvent({
          campaignId: campaign.id,
          runId: run.id,
          type: 'status_changed',
          message: `Run has ${retryableDeliveryCount} retryable deliveries pending another attempt.`,
          runStatus: 'queued',
          createdAt: nowIso,
          updatedAt: nowIso,
        }),
      ]);
    }

    if (nextRun.status === 'completed') {
      eventRegistry = appendEventsToRegistry(eventRegistry, [
        createFilemakerEmailCampaignEvent({
          campaignId: campaign.id,
          runId: run.id,
          type: 'completed',
          message: 'Run completed.',
          runStatus: 'completed',
          createdAt: nowIso,
          updatedAt: nowIso,
        }),
      ]);
    }

    const updatedCampaign = applyBounceThresholdToCampaign({
      campaign,
      deliveries,
      nowIso,
    });
    if (updatedCampaign.status === 'paused' && campaign.status !== 'paused') {
      eventRegistry = appendEventsToRegistry(eventRegistry, [
        createFilemakerEmailCampaignEvent({
          campaignId: updatedCampaign.id,
          runId: run.id,
          type: 'paused',
          message: 'Campaign paused because the bounce threshold was exceeded.',
          runStatus: nextRun.status,
          createdAt: nowIso,
          updatedAt: nowIso,
        }),
      ]);
    }

    await persistRuntimeState({
      campaignRegistry: replaceCampaignInRegistry(state.campaignRegistry, updatedCampaign),
      runRegistry: replaceRunInRegistry(state.runRegistry, nextRun),
      deliveryRegistry: replaceRunDeliveriesInRegistry(
        state.deliveryRegistry,
        run.id,
        deliveries
      ),
      attemptRegistry,
      eventRegistry,
      suppressionRegistry,
    });

    return {
      campaign: updatedCampaign,
      run: nextRun,
      deliveries,
      progress: buildProgressSummary(deliveries),
      retryableDeliveryCount,
      retryExhaustedCount,
      suggestedRetryDelayMs,
    };
  };

  const cancelRun = async (input: {
    runId: string;
    actor?: string | null;
    message?: string | null;
  }): Promise<FilemakerCampaignRunCancelResult> => {
    const state = await readRuntimeState();
    const run = state.runRegistry.runs.find((entry) => entry.id === input.runId);
    if (!run) {
      throw notFoundError(`Campaign run ${input.runId} not found.`);
    }

    const campaign = state.campaignRegistry.campaigns.find((entry) => entry.id === run.campaignId);
    if (!campaign) {
      throw notFoundError(`Campaign ${run.campaignId} not found.`);
    }

    const deliveries = getFilemakerEmailCampaignDeliveriesForRun(state.deliveryRegistry, run.id);
    if (run.status === 'cancelled') {
      return {
        campaign,
        run,
        deliveries,
      };
    }

    if (run.status === 'completed' || run.status === 'failed') {
      throw badRequestError('Only pending, queued, or running runs can be cancelled.');
    }

    const nowIso = deps.now().toISOString();
    const cancelledDeliveries = applyFilemakerEmailCampaignRunStatusToDeliveries({
      deliveries,
      runStatus: 'cancelled',
    });
    const cancelledRun = syncFilemakerEmailCampaignRunWithDeliveries({
      run,
      deliveries: cancelledDeliveries,
      status: 'cancelled',
    });
    const eventRegistry = appendEventsToRegistry(state.eventRegistry, [
      createFilemakerEmailCampaignEvent({
        campaignId: campaign.id,
        runId: run.id,
        type: 'cancelled',
        actor: input.actor ?? null,
        message: input.message?.trim() || 'Run cancelled by admin.',
        runStatus: 'cancelled',
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
    ]);

    await persistRuntimeState({
      runRegistry: replaceRunInRegistry(state.runRegistry, cancelledRun),
      deliveryRegistry: replaceRunDeliveriesInRegistry(
        state.deliveryRegistry,
        run.id,
        cancelledDeliveries
      ),
      eventRegistry,
    });

    return {
      campaign,
      run: cancelledRun,
      deliveries: cancelledDeliveries,
    };
  };

  return {
    readRuntimeState,
    persistRuntimeState,
    launchRun,
    processRun,
    cancelRun,
    launchCampaignRun: launchRun,
  };
};
