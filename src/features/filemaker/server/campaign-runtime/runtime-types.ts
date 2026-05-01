import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignContentGroupRegistry,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
  FilemakerMailAccount,
} from '../../types';
import type { FilemakerCampaignEmailSendResult } from '../campaign-email-delivery';
import type { FilemakerCampaignRunProcessProgress } from '../campaign-runtime.helpers';

export type FilemakerCampaignRuntimeState = {
  database: FilemakerDatabase;
  contentGroupRegistry: FilemakerEmailCampaignContentGroupRegistry;
  campaignRegistry: FilemakerEmailCampaignRegistry;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
};

export type FilemakerCampaignRuntimeDeps = {
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
    mailAccountId?: string | null;
    replyToEmail?: string | null;
    fromName?: string | null;
  }) => Promise<FilemakerCampaignEmailSendResult>;
  now: () => Date;
  listMailAccounts?: () => Promise<FilemakerMailAccount[]>;
  throttleBeforeSend?: (emailAddress: string) => Promise<void>;
  reserveWarmupSlot?: (senderKey: string) => Promise<
    { ok: true } | { ok: false; nextAvailableAt: string; dailyCap: number; used: number }
  >;
};

export type FilemakerCampaignRunLaunchResult = {
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
  queuedDeliveryCount: number;
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

export type FilemakerCampaignRunCancelResult = {
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
};

export type FilemakerCampaignProcessReason = 'manual' | 'retry';

export type FilemakerCampaignRuntimePersistInput = {
  campaignRegistry?: FilemakerEmailCampaignRegistry;
  contentGroupRegistry?: FilemakerEmailCampaignContentGroupRegistry;
  runRegistry?: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry?: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry?: FilemakerEmailCampaignDeliveryAttemptRegistry;
  eventRegistry?: FilemakerEmailCampaignEventRegistry;
  suppressionRegistry?: FilemakerEmailCampaignSuppressionRegistry;
};

export type FilemakerCampaignRuntimePersistence = {
  readRuntimeState: () => Promise<FilemakerCampaignRuntimeState>;
  persistRuntimeState: (input: FilemakerCampaignRuntimePersistInput) => Promise<void>;
};

export type FilemakerCampaignRunLaunchInput = {
  campaignId: string;
  mode: FilemakerEmailCampaignRun['mode'];
  launchReason?: string | null;
};

export type FilemakerCampaignRunProcessInput = {
  runId: string;
  reason?: FilemakerCampaignProcessReason;
};

export type FilemakerCampaignRunCancelInput = {
  runId: string;
  actor?: string | null;
  message?: string | null;
};

export type FilemakerCampaignRuntimeService = FilemakerCampaignRuntimePersistence & {
  launchRun: (input: FilemakerCampaignRunLaunchInput) => Promise<FilemakerCampaignRunLaunchResult>;
  processRun: (input: FilemakerCampaignRunProcessInput) => Promise<FilemakerCampaignRunProcessResult>;
  cancelRun: (input: FilemakerCampaignRunCancelInput) => Promise<FilemakerCampaignRunCancelResult>;
  launchCampaignRun: (input: FilemakerCampaignRunLaunchInput) => Promise<FilemakerCampaignRunLaunchResult>;
};
