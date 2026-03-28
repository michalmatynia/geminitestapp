import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type {
  FilemakerEmailCampaign,
  FilemakerEmailCampaignLifecycleStatus,
  FilemakerEmailCampaignLaunchMode,
  FilemakerEmailCampaignRun,
  FilemakerEmailCampaignSuppressionReason,
  FilemakerEmailCampaignRunStatus,
  FilemakerPartyKind,
} from '../types';
import { createFilemakerEmailCampaign } from '../settings';

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

export const getRunActions = (run: FilemakerEmailCampaignRun): Array<{
  label: string;
  nextStatus: FilemakerEmailCampaignRunStatus;
}> => {
  if (run.status === 'pending' || run.status === 'queued') {
    return [{ label: 'Mark Running', nextStatus: 'running' }];
  }
  if (run.status === 'running') {
    return [
      { label: 'Mark Completed', nextStatus: 'completed' },
      { label: 'Mark Failed', nextStatus: 'failed' },
      { label: 'Cancel Run', nextStatus: 'cancelled' },
    ];
  }
  return [];
};
