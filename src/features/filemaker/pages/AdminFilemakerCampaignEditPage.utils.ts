import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryAttemptRegistry,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignEventRegistry,
  FilemakerEmailCampaignLifecycleStatus,
  FilemakerEmailCampaignLaunchMode,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignRunRegistry,
  FilemakerEmailCampaignSuppressionReason,
  FilemakerPartyKind,
} from '../types';
import {
  createFilemakerEmailCampaign,
  resolveFilemakerEmailCampaignRetryableDeliveries,
} from '../settings';
import type { FilemakerEmailCampaignSchedulerStatus } from '../settings';

export const CAMPAIGN_STATUS_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<FilemakerEmailCampaignLifecycleStatus>
> = [
  { value: 'draft', label: 'Draft', description: 'Not launchable yet.' },
  { value: 'active', label: 'Active', description: 'Eligible for launch when conditions pass.' },
  { value: 'paused', label: 'Paused', description: 'Temporarily blocked from launch.' },
  { value: 'archived', label: 'Archived', description: 'Kept for reference only.' },
];

export const LAUNCH_MODE_OPTIONS: Array<LabeledOptionWithDescriptionDto<FilemakerEmailCampaignLaunchMode>> =
  [
    { value: 'manual', label: 'Manual', description: 'Launch only when triggered manually.' },
    { value: 'scheduled', label: 'Scheduled', description: 'Launch at a fixed date and time.' },
    { value: 'recurring', label: 'Recurring', description: 'Launch inside recurring windows.' },
  ];

export const EMAIL_STATUS_OPTIONS: Array<LabeledOptionWithDescriptionDto<string>> = [
  { value: 'active', label: 'Active', description: 'Deliverable and in use.' },
  { value: 'inactive', label: 'Inactive', description: 'Known but not currently used.' },
  { value: 'bounced', label: 'Bounced', description: 'Delivery is failing.' },
  { value: 'unverified', label: 'Unverified', description: 'Still awaiting verification.' },
];

export const PARTY_KIND_OPTIONS: Array<LabeledOptionWithDescriptionDto<FilemakerPartyKind>> = [
  { value: 'person', label: 'Persons', description: 'Campaign targets person-linked emails.' },
  {
    value: 'organization',
    label: 'Organizations',
    description: 'Campaign targets organization-linked emails.',
  },
];

export const RECURRING_FREQUENCY_OPTIONS: Array<LabeledOptionWithDescriptionDto<string>> = [
  { value: 'daily', label: 'Daily', description: 'Every day in the allowed window.' },
  { value: 'weekly', label: 'Weekly', description: 'Selected weekdays each week.' },
  { value: 'monthly', label: 'Monthly', description: 'Uses the same weekday window every month.' },
];

export const WEEKDAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
];

export const SUPPRESSION_REASON_OPTIONS: Array<
  LabeledOptionWithDescriptionDto<FilemakerEmailCampaignSuppressionReason>
> = [
  {
    value: 'manual_block',
    label: 'Manual block',
    description: 'Prevent delivery until the address is explicitly removed.',
  },
  {
    value: 'unsubscribed',
    label: 'Unsubscribed',
    description: 'Use when the recipient opted out from future mailings.',
  },
  {
    value: 'bounced',
    label: 'Bounced',
    description: 'Use when the address is no longer deliverable.',
  },
];

export const buildCampaignIdFromName = (name: string): string => {
  const token = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+/g, '')
    .replace(/-+$/g, '');
  return `filemaker-email-campaign-${token || 'draft'}`;
};

const normalizeCampaignName = (value: string | null | undefined): string =>
  value?.trim() || 'Untitled campaign';

export const createDuplicatedCampaignDraft = (input: {
  campaign: FilemakerEmailCampaign;
  existingCampaigns: FilemakerEmailCampaign[];
  nowIso?: string;
}): FilemakerEmailCampaign => {
  const nowIso = input.nowIso ?? new Date().toISOString();
  const existingNameKeys = new Set(
    input.existingCampaigns.map((campaign) => normalizeCampaignName(campaign.name).toLowerCase())
  );
  const existingIds = new Set(input.existingCampaigns.map((campaign) => campaign.id));
  const sourceName = normalizeCampaignName(input.campaign.name);
  const baseCopyName = `${sourceName} Copy`;

  let duplicateName = baseCopyName;
  let suffix = 2;
  while (
    existingNameKeys.has(duplicateName.toLowerCase()) ||
    existingIds.has(buildCampaignIdFromName(duplicateName))
  ) {
    duplicateName = `${baseCopyName} ${suffix}`;
    suffix += 1;
  }

  return createFilemakerEmailCampaign({
    ...input.campaign,
    id: buildCampaignIdFromName(duplicateName),
    name: duplicateName,
    status: 'draft',
    approvalGrantedAt: null,
    approvedBy: null,
    lastLaunchedAt: null,
    lastEvaluatedAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
  });
};

export const removeCampaignArtifacts = (input: {
  campaignId: string;
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  schedulerStatus: FilemakerEmailCampaignSchedulerStatus;
}): {
  runRegistry: FilemakerEmailCampaignRunRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  schedulerStatus: FilemakerEmailCampaignSchedulerStatus;
} => ({
  runRegistry: {
    ...input.runRegistry,
    runs: input.runRegistry.runs.filter((run) => run.campaignId !== input.campaignId),
  },
  deliveryRegistry: {
    ...input.deliveryRegistry,
    deliveries: input.deliveryRegistry.deliveries.filter(
      (delivery) => delivery.campaignId !== input.campaignId
    ),
  },
  attemptRegistry: {
    ...input.attemptRegistry,
    attempts: input.attemptRegistry.attempts.filter(
      (attempt) => attempt.campaignId !== input.campaignId
    ),
  },
  eventRegistry: {
    ...input.eventRegistry,
    events: input.eventRegistry.events.filter((event) => event.campaignId !== input.campaignId),
  },
  schedulerStatus: {
    ...input.schedulerStatus,
    launchedRuns: input.schedulerStatus.launchedRuns.filter(
      (entry) => entry.campaignId !== input.campaignId
    ),
    launchFailures: input.schedulerStatus.launchFailures.filter(
      (entry) => entry.campaignId !== input.campaignId
    ),
  },
});

export const createBlankCampaignDraft = (): FilemakerEmailCampaign => {
  const draft = createFilemakerEmailCampaign({
    id: '',
    name: '',
    subject: '',
    status: 'draft',
  });
  return {
    ...draft,
    id: '',
    name: '',
    subject: '',
    previewText: null,
    mailAccountId: null,
    fromName: null,
    replyToEmail: null,
    bodyText: null,
    bodyHtml: null,
    description: null,
    approvalGrantedAt: null,
    approvedBy: null,
    lastLaunchedAt: null,
    lastEvaluatedAt: null,
  };
};

export const parseCommaSeparatedValues = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((entry: string) => entry.trim())
        .filter(Boolean)
    )
  );

export const formatCommaSeparatedValues = (values: string[]): string => values.join(', ');

export const toDateTimeLocalValue = (value: string | null | undefined): string => {
  if (!value) return '';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const date = new Date(parsed);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const hour = `${date.getHours()}`.padStart(2, '0');
  const minute = `${date.getMinutes()}`.padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
};

export type FilemakerCampaignRunActionId = 'process' | 'retry' | 'cancel';

export const getRunActions = (input: {
  run: FilemakerEmailCampaignRun;
  deliveries: FilemakerEmailCampaignDelivery[];
  attemptRegistry: FilemakerEmailCampaignDeliveryAttemptRegistry;
}): Array<{
  action: FilemakerCampaignRunActionId;
  label: string;
}> => {
  const queuedCount = input.deliveries.filter((delivery) => delivery.status === 'queued').length;
  const retryableCount = resolveFilemakerEmailCampaignRetryableDeliveries({
    deliveries: input.deliveries,
    attemptRegistry: input.attemptRegistry,
  }).retryableDeliveries.length;
  const actions: Array<{
    action: FilemakerCampaignRunActionId;
    label: string;
  }> = [];

  if (
    queuedCount > 0 &&
    (input.run.status === 'pending' || input.run.status === 'queued')
  ) {
    actions.push({
      action: 'process',
      label: queuedCount === 1 ? 'Process queued (1)' : `Process queued (${queuedCount})`,
    });
  }

  if (
    input.run.mode === 'live' &&
    retryableCount > 0 &&
    input.run.status !== 'running' &&
    input.run.status !== 'cancelled'
  ) {
    actions.push({
      action: 'retry',
      label: retryableCount === 1 ? 'Retry failed (1)' : `Retry failed (${retryableCount})`,
    });
  }

  if (
    input.run.status === 'pending' ||
    input.run.status === 'queued' ||
    input.run.status === 'running'
  ) {
    actions.push({
      action: 'cancel',
      label: 'Cancel run',
    });
  }

  return actions;
};
