import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignRun,
  FilemakerMailAccount,
} from '../types';

export type FilemakerCampaignMailFilingRepairStatus =
  'already_filed' | 'filed' | 'failed' | 'skipped';

export type FilemakerCampaignMailFilingRepairDeliveryResult = {
  deliveryId: string;
  emailAddress: string;
  status: FilemakerCampaignMailFilingRepairStatus;
  mailThreadId: string | null;
  mailMessageId: string | null;
  message: string;
};

export type FilemakerCampaignMailFilingRepairResult = {
  campaignId: string;
  runId: string;
  repairedCount: number;
  skippedCount: number;
  failedCount: number;
  deliveries: FilemakerCampaignMailFilingRepairDeliveryResult[];
};

export type RepairRecordInput = {
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  delivery: FilemakerEmailCampaignDelivery;
};

export type RepairDeliveryInput = RepairRecordInput & {
  account: FilemakerMailAccount;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
};

export type RepairState = {
  campaign: FilemakerEmailCampaign;
  run: FilemakerEmailCampaignRun;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
};
