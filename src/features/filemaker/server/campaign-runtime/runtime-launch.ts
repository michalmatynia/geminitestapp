import { badRequestError } from '@/shared/errors/app-error';

import {
  assertFilemakerCampaignContentReadyForDelivery,
  buildFilemakerEmailCampaignDeliveriesForPreview,
  createFilemakerEmailCampaignEvent,
  createFilemakerEmailCampaignRun,
  evaluateFilemakerEmailCampaignLaunch,
  resolveFilemakerCampaignContentForRecipient,
  resolveFilemakerEmailCampaignAudiencePreview,
  syncFilemakerEmailCampaignRunWithDeliveries,
  toFilemakerCampaignContentDeliveryMetadata,
} from '../../settings';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignRunMode,
  FilemakerMailAccount,
} from '../../types';
import {
  replaceCampaignInRegistry,
  replaceRunDeliveriesInRegistry,
  replaceRunInRegistry,
} from '../campaign-runtime.helpers';
import { findCampaignOrThrow } from './runtime-lookup';
import type {
  FilemakerCampaignRunLaunchInput,
  FilemakerCampaignRunLaunchResult,
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimePersistence,
  FilemakerCampaignRuntimeState,
} from './runtime-types';
import { assertCampaignReadyForDelivery } from './runtime-utils';

type LaunchRunFactoryInput = {
  deps: FilemakerCampaignRuntimeDeps;
  persistence: FilemakerCampaignRuntimePersistence;
};

const resolveSenderAccounts = async (
  deps: FilemakerCampaignRuntimeDeps,
  mode: FilemakerEmailCampaignRunMode
): Promise<FilemakerMailAccount[] | null> => {
  if (mode !== 'live') return null;
  if (deps.listMailAccounts === undefined) return null;
  return deps.listMailAccounts();
};

const assertCampaignLaunchContentReady = (
  campaign: FilemakerEmailCampaign,
  mode: FilemakerEmailCampaignRunMode,
  state: FilemakerCampaignRuntimeState
): void => {
  if (mode !== 'live') {
    assertCampaignReadyForDelivery(campaign, mode);
    return;
  }
  assertFilemakerCampaignContentReadyForDelivery({
    campaign,
    contentGroupRegistry: state.contentGroupRegistry,
  });
};

const assertLaunchEligible = (input: {
  campaign: FilemakerEmailCampaign;
  mode: FilemakerEmailCampaignRunMode;
  senderAccounts: FilemakerMailAccount[] | null;
  state: FilemakerCampaignRuntimeState;
  now: Date;
}): void => {
  const preview = resolveFilemakerEmailCampaignAudiencePreview(
    input.state.database,
    input.campaign.audience,
    input.state.suppressionRegistry
  );
  const evaluation = evaluateFilemakerEmailCampaignLaunch(input.campaign, preview, {
    now: input.now,
    contentGroupRegistry: input.state.contentGroupRegistry,
    senderAssignment:
      input.mode === 'live'
        ? { mailAccounts: input.senderAccounts, requireAssignedMailAccount: true }
        : null,
  });
  if (input.mode === 'live' && !evaluation.isEligible) {
    throw badRequestError(evaluation.blockers[0] ?? 'Campaign launch is blocked.');
  }
};

const buildLaunchDeliveries = (input: {
  baseRunId: string;
  campaign: FilemakerEmailCampaign;
  mode: FilemakerEmailCampaignRunMode;
  state: FilemakerCampaignRuntimeState;
}): FilemakerEmailCampaignDelivery[] => {
  const preview = resolveFilemakerEmailCampaignAudiencePreview(
    input.state.database,
    input.campaign.audience,
    input.state.suppressionRegistry
  );
  return buildFilemakerEmailCampaignDeliveriesForPreview({
    campaignId: input.campaign.id,
    runId: input.baseRunId,
    preview,
    mode: input.mode,
  }).map((delivery) => {
    const content = resolveFilemakerCampaignContentForRecipient({
      campaign: input.campaign,
      contentGroupRegistry: input.state.contentGroupRegistry,
      database: input.state.database,
      partyKind: delivery.partyKind,
      partyId: delivery.partyId,
    });
    return {
      ...delivery,
      ...toFilemakerCampaignContentDeliveryMetadata(content),
    };
  });
};

const buildUpdatedCampaign = (
  campaign: FilemakerEmailCampaign,
  nowIso: string
): FilemakerEmailCampaign => ({
  ...campaign,
  lastLaunchedAt: nowIso,
  lastEvaluatedAt: nowIso,
  updatedAt: nowIso,
});

export const createLaunchRun = ({
  deps,
  persistence,
}: LaunchRunFactoryInput): ((input: FilemakerCampaignRunLaunchInput) => Promise<FilemakerCampaignRunLaunchResult>) =>
  async (input): Promise<FilemakerCampaignRunLaunchResult> => {
    const state = await persistence.readRuntimeState();
    const campaign = findCampaignOrThrow(state, input.campaignId);
    assertCampaignLaunchContentReady(campaign, input.mode, state);
    const now = deps.now();
    const senderAccounts = await resolveSenderAccounts(deps, input.mode);
    assertLaunchEligible({ campaign, mode: input.mode, now, senderAccounts, state });
    const nowIso = now.toISOString();
    const baseRun = createFilemakerEmailCampaignRun({
      campaignId: campaign.id,
      mode: input.mode,
      launchReason: input.launchReason ?? null,
      status: input.mode === 'dry_run' ? 'completed' : 'queued',
      recipientCount: resolveFilemakerEmailCampaignAudiencePreview(
        state.database,
        campaign.audience,
        state.suppressionRegistry
      ).recipients.length,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: input.mode === 'dry_run' ? nowIso : null,
    });
    const deliveries = buildLaunchDeliveries({ baseRunId: baseRun.id, campaign, mode: input.mode, state });
    const queuedDeliveryCount = deliveries.filter((delivery) => delivery.status === 'queued').length;
    const run = syncFilemakerEmailCampaignRunWithDeliveries({
      run: baseRun,
      deliveries,
      status: queuedDeliveryCount > 0 ? 'queued' : 'completed',
    });
    const updatedCampaign = buildUpdatedCampaign(campaign, nowIso);
    await persistence.persistRuntimeState({
      campaignRegistry: replaceCampaignInRegistry(state.campaignRegistry, updatedCampaign),
      runRegistry: replaceRunInRegistry(state.runRegistry, run),
      deliveryRegistry: replaceRunDeliveriesInRegistry(state.deliveryRegistry, run.id, deliveries),
      eventRegistry: {
        version: state.eventRegistry.version,
        events: state.eventRegistry.events.concat(
          createFilemakerEmailCampaignEvent({
            campaignId: updatedCampaign.id,
            runId: run.id,
            type: 'launched',
            message: `Launched ${input.mode} run with ${deliveries.length} recipients.`,
            runStatus: run.status,
            createdAt: nowIso,
            updatedAt: nowIso,
          })
        ),
      },
    });
    return { campaign: updatedCampaign, deliveries, queuedDeliveryCount, run };
  };
