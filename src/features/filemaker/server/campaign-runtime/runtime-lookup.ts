import { notFoundError } from '@/shared/errors/app-error';

import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignRun,
} from '../../types';
import type { FilemakerCampaignRuntimeState } from './runtime-types';

export const findCampaignOrThrow = (
  state: FilemakerCampaignRuntimeState,
  campaignId: string
): FilemakerEmailCampaign => {
  const campaign = state.campaignRegistry.campaigns.find((entry) => entry.id === campaignId);
  if (campaign === undefined) {
    throw notFoundError(`Campaign ${campaignId} not found.`);
  }
  return campaign;
};

export const findRunOrThrow = (
  state: FilemakerCampaignRuntimeState,
  runId: string
): FilemakerEmailCampaignRun => {
  const run = state.runRegistry.runs.find((entry) => entry.id === runId);
  if (run === undefined) {
    throw notFoundError(`Campaign run ${runId} not found.`);
  }
  return run;
};
