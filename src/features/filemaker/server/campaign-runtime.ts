import 'server-only';

import {
  readFilemakerCampaignSettingValue,
  upsertFilemakerCampaignSettingValue,
} from './campaign-settings-store';
import { sendFilemakerCampaignEmail } from './campaign-email-delivery';
import { createCampaignRuntimeService } from './campaign-runtime/createCampaignRuntimeService';
import type {
  FilemakerCampaignRuntimeDeps,
} from './campaign-runtime/runtime-types';

export * from './campaign-runtime/runtime-types';
export * from './campaign-runtime/runtime-utils';

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
