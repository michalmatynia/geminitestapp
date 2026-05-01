import { badRequestError } from '@/shared/errors/app-error';

import {
  applyFilemakerEmailCampaignRunStatusToDeliveries,
  createFilemakerEmailCampaignEvent,
  getFilemakerEmailCampaignDeliveriesForRun,
  syncFilemakerEmailCampaignRunWithDeliveries,
} from '../../settings';
import {
  appendEventsToRegistry,
  replaceRunDeliveriesInRegistry,
  replaceRunInRegistry,
} from '../campaign-runtime.helpers';
import { findCampaignOrThrow, findRunOrThrow } from './runtime-lookup';
import type {
  FilemakerCampaignRunCancelInput,
  FilemakerCampaignRunCancelResult,
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimePersistence,
} from './runtime-types';

type CancelRunFactoryInput = {
  deps: FilemakerCampaignRuntimeDeps;
  persistence: FilemakerCampaignRuntimePersistence;
};

const assertRunCanBeCancelled = (status: FilemakerCampaignRunCancelResult['run']['status']): void => {
  if (status === 'completed' || status === 'failed') {
    throw badRequestError('Only pending, queued, or running runs can be cancelled.');
  }
};

const resolveCancelMessage = (message: string | null | undefined): string => {
  const trimmedMessage = message?.trim() ?? '';
  if (trimmedMessage !== '') return trimmedMessage;
  return 'Run cancelled by admin.';
};

export const createCancelRun = ({
  deps,
  persistence,
}: CancelRunFactoryInput): ((input: FilemakerCampaignRunCancelInput) => Promise<FilemakerCampaignRunCancelResult>) =>
  async (input): Promise<FilemakerCampaignRunCancelResult> => {
    const state = await persistence.readRuntimeState();
    const run = findRunOrThrow(state, input.runId);
    const campaign = findCampaignOrThrow(state, run.campaignId);
    const deliveries = getFilemakerEmailCampaignDeliveriesForRun(state.deliveryRegistry, run.id);
    if (run.status === 'cancelled') return { campaign, deliveries, run };
    assertRunCanBeCancelled(run.status);
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
        message: resolveCancelMessage(input.message),
        runStatus: 'cancelled',
        createdAt: nowIso,
        updatedAt: nowIso,
      }),
    ]);
    await persistence.persistRuntimeState({
      runRegistry: replaceRunInRegistry(state.runRegistry, cancelledRun),
      deliveryRegistry: replaceRunDeliveriesInRegistry(state.deliveryRegistry, run.id, cancelledDeliveries),
      eventRegistry,
    });
    return { campaign, deliveries: cancelledDeliveries, run: cancelledRun };
  };
