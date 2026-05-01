import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import type {
  FilemakerCampaignRuntimeDeps,
  FilemakerCampaignRuntimeState,
} from './runtime-types';

export type RuntimeProcessClock = {
  nowIso: string;
  nowMs: number;
};

export type RuntimeProcessState = {
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  deliveries: FilemakerEmailCampaignDelivery[];
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  stopped: boolean;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
};

export type RuntimeDeliveryContext = {
  campaign: FilemakerEmailCampaign;
  clock: RuntimeProcessClock;
  deps: FilemakerCampaignRuntimeDeps;
  run: FilemakerEmailCampaignRun;
  runtimeState: FilemakerCampaignRuntimeState;
};
