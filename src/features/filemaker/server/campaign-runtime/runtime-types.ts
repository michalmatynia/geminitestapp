'use client';

import type {
  FilemakerDatabase,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttempt,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../../types';
import type { FilemakerCampaignEmailSendResult } from '../campaign-email-delivery';
import type { FilemakerCampaignRunProcessProgress } from '../campaign-runtime.helpers';

export type FilemakerCampaignRuntimeState = {
  database: FilemakerDatabase;
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
    replyToEmail?: string | null;
    fromName?: string | null;
  }) => Promise<FilemakerCampaignEmailSendResult>;
  now: () => Date;
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
