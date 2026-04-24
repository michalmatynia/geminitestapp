import 'server-only';

import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import { sendFilemakerCampaignEmail } from './campaign-email-delivery';
import { createCampaignRuntimeService } from './campaign-runtime/createCampaignRuntimeService';
import { createFilemakerCampaignDomainThrottle } from './campaign-runtime/domain-throttle';
import {
  FILEMAKER_CAMPAIGN_WARMUP_STATE_KEY,
  createFilemakerCampaignWarmupTracker,
  normalizeFilemakerCampaignWarmupState,
  type FilemakerCampaignWarmupState,
} from './campaign-runtime/warmup-tracker';
import type {
  FilemakerCampaignRuntimeDeps,
} from './campaign-runtime/runtime-types';

const defaultDomainThrottle = createFilemakerCampaignDomainThrottle();

const defaultWarmupTracker = createFilemakerCampaignWarmupTracker({
  readState: async (): Promise<FilemakerCampaignWarmupState> => {
    const raw = await readFilemakerCampaignSettingValue(FILEMAKER_CAMPAIGN_WARMUP_STATE_KEY);
    if (!raw) return { version: 1, senders: {} };
    try {
      return normalizeFilemakerCampaignWarmupState(JSON.parse(raw));
    } catch {
      return { version: 1, senders: {} };
    }
  },
  writeState: async (state) => {
    await upsertFilemakerCampaignSettingValue(
      FILEMAKER_CAMPAIGN_WARMUP_STATE_KEY,
      JSON.stringify(state)
    );
  },
});

export * from './campaign-runtime/runtime-types';
export * from './campaign-runtime/runtime-utils';

const defaultDeps: FilemakerCampaignRuntimeDeps = {
  readSettingValue: readFilemakerCampaignSettingValue,
  upsertSettingValue: upsertFilemakerCampaignSettingValue,
  sendCampaignEmail: sendFilemakerCampaignEmail,
  now: () => new Date(),
  throttleBeforeSend: (emailAddress: string) => defaultDomainThrottle.wait(emailAddress),
  reserveWarmupSlot: (senderKey: string) => defaultWarmupTracker.reserve(senderKey),
};

export const createFilemakerCampaignRuntimeService = (
  overrides?: Partial<FilemakerCampaignRuntimeDeps>
) => {
  const deps: FilemakerCampaignRuntimeDeps = {
    ...defaultDeps,
    ...overrides,
  };

  const service = createCampaignRuntimeService(deps);

  return {
    ...service,
    processCampaignRun: async (runId: string, _deliveryIds?: string[]) =>
      service.processRun({ runId, reason: 'manual' }),
  };
};

export const launchFilemakerEmailCampaignRun = async (input: {
  campaignId: string;
  mode: 'live' | 'dry_run';
  launchReason?: string | null;
}) => createFilemakerCampaignRuntimeService().launchRun(input);

export const processFilemakerEmailCampaignRun = async (input: {
  runId: string;
  reason?: 'manual' | 'retry';
}) => createFilemakerCampaignRuntimeService().processRun(input);

export const cancelFilemakerEmailCampaignRun = async (input: {
  runId: string;
  actor?: string | null;
  message?: string | null;
}) => createFilemakerCampaignRuntimeService().cancelRun(input);
