import {
  createFilemakerEmailCampaignEvent,
  FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
  getFilemakerEmailCampaignDeliveriesForRun,
  resolveFilemakerEmailCampaignRetryableDeliveries,
  resolveFilemakerEmailCampaignRetryDelayMs,
  syncFilemakerEmailCampaignRunWithDeliveries,
} from '../../settings';
import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEventRegistry,
} from '../../types';
import {
  appendEventsToRegistry,
  buildProgressSummary,
} from '../campaign-runtime.helpers';
import { findCampaignOrThrow, findRunOrThrow } from './runtime-lookup';
import { finalizeProcessedRun } from './runtime-process-finalize';
import { processCampaignDelivery, replaceDeliveryInCollection } from './runtime-process-delivery';
import type {
  RuntimeDeliveryContext,
  RuntimeProcessClock,
  RuntimeProcessState,
} from './runtime-process-types';
import type {
  FilemakerCampaignProcessReason,
  FilemakerCampaignRunProcessInput,
  FilemakerCampaignRunProcessResult,
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimePersistence,
  FilemakerCampaignRuntimeState,
} from './runtime-types';

type ProcessRunFactoryInput = {
  deps: FilemakerCampaignRuntimeDeps;
  persistence: FilemakerCampaignRuntimePersistence;
};

type RetrySummary = ReturnType<typeof resolveFilemakerEmailCampaignRetryableDeliveries>;

type PreparedProcessRun = {
  campaign: FilemakerCampaignRunProcessResult['campaign'];
  clock: RuntimeProcessClock;
  context: RuntimeDeliveryContext;
  deliveries: FilemakerEmailCampaignDelivery[];
  deliveriesToProcess: FilemakerEmailCampaignDelivery[];
  pendingRetrySummary: RetrySummary | null;
  reason: FilemakerCampaignProcessReason;
  run: FilemakerCampaignRunProcessResult['run'];
  runtimeState: FilemakerCampaignRuntimeState;
};

const buildProcessClock = (now: Date): RuntimeProcessClock => ({
  nowIso: now.toISOString(),
  nowMs: now.getTime(),
});

const resolveRetrySummary = (input: {
  attemptRegistry: RuntimeProcessState['attemptRegistry'];
  deliveries: FilemakerEmailCampaignDelivery[];
  nowMs?: number;
  reason: FilemakerCampaignProcessReason;
}): RetrySummary | null => {
  if (input.reason !== 'retry') return null;
  return resolveFilemakerEmailCampaignRetryableDeliveries({
    deliveries: input.deliveries,
    attemptRegistry: input.attemptRegistry,
    maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
    nowMs: input.nowMs,
  });
};

const queueRetryableDeliveries = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  nowIso: string;
  retrySummary: RetrySummary | null;
}): FilemakerEmailCampaignDelivery[] => {
  if (input.retrySummary === null) return input.deliveries;
  return input.retrySummary.retryableDeliveries.reduce(
    (deliveries, delivery) =>
      replaceDeliveryInCollection(deliveries, {
        ...delivery,
        status: 'queued',
        nextRetryAt: null,
        updatedAt: input.nowIso,
      }),
    input.deliveries
  );
};

const resolveDeliveriesToProcess = (input: {
  deliveries: FilemakerEmailCampaignDelivery[];
  retrySummary: RetrySummary | null;
}): FilemakerEmailCampaignDelivery[] => {
  if (input.retrySummary !== null) return input.retrySummary.retryableDeliveries;
  return input.deliveries.filter((delivery) => delivery.status === 'queued');
};

const buildNoDeliveryProcessResult = (input: {
  campaign: FilemakerCampaignRunProcessResult['campaign'];
  deliveries: FilemakerEmailCampaignDelivery[];
  pendingRetrySummary: RetrySummary | null;
  run: FilemakerCampaignRunProcessResult['run'];
  state: FilemakerCampaignRuntimeState;
  nowMs: number;
}): FilemakerCampaignRunProcessResult => ({
  campaign: input.campaign,
  run: syncFilemakerEmailCampaignRunWithDeliveries({
    run: input.run,
    deliveries: input.deliveries,
  }),
  deliveries: input.deliveries,
  progress: buildProgressSummary(input.deliveries),
  retryableDeliveryCount: input.pendingRetrySummary?.retryableDeliveries.length ?? 0,
  retryExhaustedCount: input.pendingRetrySummary?.exhaustedDeliveries.length ?? 0,
  suggestedRetryDelayMs: resolveFilemakerEmailCampaignRetryDelayMs({
    deliveries: input.deliveries,
    attemptRegistry: input.state.attemptRegistry,
    maxAttempts: FILEMAKER_EMAIL_CAMPAIGN_MAX_DELIVERY_ATTEMPTS,
    nowMs: input.nowMs,
  }),
});

const appendProcessingStartedEvent = (
  context: RuntimeDeliveryContext,
  reason: FilemakerCampaignProcessReason
): FilemakerEmailCampaignEventRegistry =>
  appendEventsToRegistry(context.runtimeState.eventRegistry, [
    createFilemakerEmailCampaignEvent({
      campaignId: context.campaign.id,
      runId: context.run.id,
      type: 'processing_started',
      message: reason === 'retry' ? 'Retry delivery processing started.' : 'Delivery processing started.',
      runStatus: 'running',
      createdAt: context.clock.nowIso,
      updatedAt: context.clock.nowIso,
    }),
  ]);

const processDeliveryQueue = async (input: {
  context: RuntimeDeliveryContext;
  deliveriesToProcess: FilemakerEmailCampaignDelivery[];
  initialState: RuntimeProcessState;
}): Promise<RuntimeProcessState> =>
  input.deliveriesToProcess.reduce<Promise<RuntimeProcessState>>(async (statePromise, delivery) => {
    const state = await statePromise;
    if (state.stopped) return state;
    return processCampaignDelivery({ context: input.context, delivery, state });
  }, Promise.resolve(input.initialState));

const prepareProcessRun = async (input: {
  deps: FilemakerCampaignRuntimeDeps;
  persistence: FilemakerCampaignRuntimePersistence;
  runInput: FilemakerCampaignRunProcessInput;
}): Promise<PreparedProcessRun> => {
  const runtimeState = await input.persistence.readRuntimeState();
  const reason = input.runInput.reason ?? 'manual';
  const run = findRunOrThrow(runtimeState, input.runInput.runId);
  const campaign = findCampaignOrThrow(runtimeState, run.campaignId);
  const clock = buildProcessClock(input.deps.now());
  const initialDeliveries = getFilemakerEmailCampaignDeliveriesForRun(runtimeState.deliveryRegistry, run.id);
  const retrySummary = resolveRetrySummary({
    deliveries: initialDeliveries,
    attemptRegistry: runtimeState.attemptRegistry,
    reason,
    nowMs: clock.nowMs,
  });
  const pendingRetrySummary = resolveRetrySummary({
    deliveries: initialDeliveries,
    attemptRegistry: runtimeState.attemptRegistry,
    reason,
  });
  const deliveries = queueRetryableDeliveries({
    deliveries: initialDeliveries,
    retrySummary,
    nowIso: clock.nowIso,
  });
  const deliveriesToProcess = resolveDeliveriesToProcess({ deliveries, retrySummary });
  const context = { campaign, clock, deps: input.deps, run, runtimeState } satisfies RuntimeDeliveryContext;
  return {
    campaign,
    clock,
    context,
    deliveries,
    deliveriesToProcess,
    pendingRetrySummary,
    reason,
    run,
    runtimeState,
  };
};

const processPreparedRun = async (input: {
  persistence: FilemakerCampaignRuntimePersistence;
  prepared: PreparedProcessRun;
}): Promise<FilemakerCampaignRunProcessResult> => {
  const { prepared } = input;
  if (prepared.deliveriesToProcess.length === 0) {
    return buildNoDeliveryProcessResult({
      campaign: prepared.campaign,
      deliveries: prepared.deliveries,
      pendingRetrySummary: prepared.pendingRetrySummary,
      run: prepared.run,
      state: prepared.runtimeState,
      nowMs: prepared.clock.nowMs,
    });
  }
  const eventRegistry = appendProcessingStartedEvent(prepared.context, prepared.reason);
  const runningRun = syncFilemakerEmailCampaignRunWithDeliveries({
    run: prepared.run,
    deliveries: prepared.deliveries,
    status: 'running',
  });
  const processedState = await processDeliveryQueue({
    context: prepared.context,
    deliveriesToProcess: prepared.deliveriesToProcess,
    initialState: {
      attemptRegistry: prepared.runtimeState.attemptRegistry,
      deliveries: prepared.deliveries,
      eventRegistry,
      stopped: false,
      suppressionRegistry: prepared.runtimeState.suppressionRegistry,
    },
  });
  return finalizeProcessedRun({
    context: prepared.context,
    persistence: input.persistence,
    processedState,
    runningRun,
    runtimeState: prepared.runtimeState,
  });
};

const runProcess = async (input: {
  deps: FilemakerCampaignRuntimeDeps;
  persistence: FilemakerCampaignRuntimePersistence;
  runInput: FilemakerCampaignRunProcessInput;
}): Promise<FilemakerCampaignRunProcessResult> => {
  const prepared = await prepareProcessRun(input);
  return processPreparedRun({ persistence: input.persistence, prepared });
};

export const createProcessRun = ({
  deps,
  persistence,
}: ProcessRunFactoryInput): ((input: FilemakerCampaignRunProcessInput) => Promise<FilemakerCampaignRunProcessResult>) =>
  async (input): Promise<FilemakerCampaignRunProcessResult> => {
    return runProcess({ deps, persistence, runInput: input });
  };
