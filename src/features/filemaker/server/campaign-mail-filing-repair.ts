import 'server-only';

import { badRequestError, notFoundError } from '@/shared/errors/app-error';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  createFilemakerEmailCampaignEvent,
  getFilemakerEmailCampaignDeliveriesForRun,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
} from '../settings';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
} from '../types';
import type {
  FilemakerCampaignMailFilingRepairDeliveryResult,
  FilemakerCampaignMailFilingRepairResult,
  FilemakerCampaignMailFilingRepairStatus,
  RepairDeliveryInput,
  RepairState,
} from './campaign-mail-filing-repair.types';
import {
  fileFilemakerCampaignEmailRecordAsMailMessage,
} from './campaign-email-delivery';
import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import {
  getFilemakerMailAccount,
  getFilemakerMailThreadForCampaignDelivery,
} from './filemaker-mail-service';
import { appendEventsToRegistry } from './campaign-runtime.helpers';

export type {
  FilemakerCampaignMailFilingRepairDeliveryResult,
  FilemakerCampaignMailFilingRepairResult,
  FilemakerCampaignMailFilingRepairStatus,
} from './campaign-mail-filing-repair.types';
import { buildRepairDeliveryRecord } from './campaign-mail-filing-repair-record';

const appendRepairEvent = (input: {
  registry: FilemakerEmailCampaignEventRegistry;
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  delivery: FilemakerEmailCampaignDelivery;
  status: Extract<FilemakerCampaignMailFilingRepairStatus, 'filed' | 'failed'>;
  message: string;
  mailThreadId?: string | null;
  mailMessageId?: string | null;
}): FilemakerEmailCampaignEventRegistry => {
  const nowIso = new Date().toISOString();
  return appendEventsToRegistry(input.registry, [
    createFilemakerEmailCampaignEvent({
      campaignId: input.campaign.id,
      runId: input.run.id,
      deliveryId: input.delivery.id,
      type: 'status_changed',
      message: input.message,
      deliveryStatus: 'sent',
      mailThreadId: input.mailThreadId ?? null,
      mailMessageId: input.mailMessageId ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    }),
  ]);
};

const appendDeliveryRepairEvent = (input: {
  repair: RepairDeliveryInput;
  status: Extract<FilemakerCampaignMailFilingRepairStatus, 'filed' | 'failed'>;
  message: string;
  mailThreadId?: string | null;
  mailMessageId?: string | null;
}): FilemakerEmailCampaignEventRegistry =>
  appendRepairEvent({
    registry: input.repair.eventRegistry,
    campaign: input.repair.campaign,
    run: input.repair.run,
    delivery: input.repair.delivery,
    status: input.status,
    message: input.message,
    mailThreadId: input.mailThreadId ?? null,
    mailMessageId: input.mailMessageId ?? null,
  });

const buildRepairDeliveryResult = (input: {
  delivery: FilemakerEmailCampaignDelivery;
  status: FilemakerCampaignMailFilingRepairStatus;
  message: string;
  mailThreadId?: string | null;
  mailMessageId?: string | null;
}): FilemakerCampaignMailFilingRepairDeliveryResult => ({
  deliveryId: input.delivery.id,
  emailAddress: input.delivery.emailAddress,
  status: input.status,
  mailThreadId: input.mailThreadId ?? null,
  mailMessageId: input.mailMessageId ?? null,
  message: input.message,
});

const repairDelivery = async (input: RepairDeliveryInput): Promise<{
  result: FilemakerCampaignMailFilingRepairDeliveryResult;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
}> => {
  const existingThread = await getFilemakerMailThreadForCampaignDelivery({
    campaignId: input.campaign.id,
    runId: input.run.id,
    deliveryId: input.delivery.id,
  });
  if (existingThread !== null) {
    return {
      result: buildRepairDeliveryResult({
        delivery: input.delivery,
        status: 'already_filed',
        mailThreadId: existingThread.id,
        message: 'Delivery is already linked to a mail thread.',
      }),
      eventRegistry: input.eventRegistry,
    };
  }

  try {
    const filing = await fileFilemakerCampaignEmailRecordAsMailMessage({
      account: input.account,
      record: buildRepairDeliveryRecord(input),
      providerMessageId: null,
    });
    return {
      result: buildRepairDeliveryResult({
        delivery: input.delivery,
        status: 'filed',
        mailThreadId: filing.threadId,
        mailMessageId: filing.messageId,
        message: 'Delivery filed into the FileMaker mail client.',
      }),
      eventRegistry: appendDeliveryRepairEvent({
        repair: input,
        status: 'filed',
        message: `Repaired mail filing for ${input.delivery.emailAddress}.`,
        mailThreadId: filing.threadId,
        mailMessageId: filing.messageId,
      }),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Mail filing repair failed.';
    return {
      result: buildRepairDeliveryResult({
        delivery: input.delivery,
        status: 'failed',
        message,
      }),
      eventRegistry: appendDeliveryRepairEvent({
        repair: input,
        status: 'failed',
        message: `Mail filing repair failed for ${input.delivery.emailAddress}: ${message}`,
      }),
    };
  }
};

const loadRepairState = async (runId: string): Promise<RepairState> => {
  const [campaignsRaw, runsRaw, deliveriesRaw, eventsRaw] = await Promise.all([
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY),
    readFilemakerCampaignSettingValue(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY),
  ]);
  const campaignRegistry = parseFilemakerEmailCampaignRegistry(campaignsRaw);
  const runRegistry = parseFilemakerEmailCampaignRunRegistry(runsRaw);
  const deliveryRegistry = parseFilemakerEmailCampaignDeliveryRegistry(deliveriesRaw);
  const eventRegistry = parseFilemakerEmailCampaignEventRegistry(eventsRaw);
  const run = runRegistry.runs.find((entry) => entry.id === runId) ?? null;
  if (run === null) {
    throw notFoundError('Filemaker campaign run not found.');
  }
  const campaign =
    campaignRegistry.campaigns.find((entry) => entry.id === run.campaignId) ?? null;
  if (campaign === null) {
    throw notFoundError('Filemaker campaign not found.');
  }
  if (campaign.mailAccountId === null || campaign.mailAccountId.length === 0) {
    throw badRequestError('Campaign does not use a FileMaker mail account.');
  }
  return { campaign, run, deliveryRegistry, eventRegistry };
};

const repairDeliveries = async (input: {
  account: FilemakerMailAccount;
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  deliveries: FilemakerEmailCampaignDelivery[];
}): Promise<{
  deliveryResults: FilemakerCampaignMailFilingRepairDeliveryResult[];
  eventRegistry: FilemakerEmailCampaignEventRegistry;
}> =>
  input.deliveries.reduce(
    async (previous, delivery) => {
      const state = await previous;
      const repaired = await repairDelivery({ ...input, delivery, eventRegistry: state.eventRegistry });
      return {
        deliveryResults: state.deliveryResults.concat(repaired.result),
        eventRegistry: repaired.eventRegistry,
      };
    },
    Promise.resolve({
      deliveryResults: [] as FilemakerCampaignMailFilingRepairDeliveryResult[],
      eventRegistry: input.eventRegistry,
    })
  );

export const repairFilemakerCampaignRunMailFiling = async (
  runId: string
): Promise<FilemakerCampaignMailFilingRepairResult> => {
  const state = await loadRepairState(runId);
  const account = await getFilemakerMailAccount(state.campaign.mailAccountId ?? '');
  const sentDeliveries = getFilemakerEmailCampaignDeliveriesForRun(
    state.deliveryRegistry,
    state.run.id
  ).filter((delivery) => delivery.status === 'sent');
  const { deliveryResults, eventRegistry } = await repairDeliveries({
    account,
    campaign: state.campaign,
    run: state.run,
    eventRegistry: state.eventRegistry,
    deliveries: sentDeliveries,
  });

  const repairedCount = deliveryResults.filter((entry) => entry.status === 'filed').length;
  const failedCount = deliveryResults.filter((entry) => entry.status === 'failed').length;
  const skippedCount = deliveryResults.length - repairedCount - failedCount;
  if (repairedCount > 0 || failedCount > 0) {
    await upsertFilemakerCampaignSettingValue(
      FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
      JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(eventRegistry))
    );
  }

  return {
    campaignId: state.campaign.id,
    runId: state.run.id,
    repairedCount,
    skippedCount,
    failedCount,
    deliveries: deliveryResults,
  };
};
