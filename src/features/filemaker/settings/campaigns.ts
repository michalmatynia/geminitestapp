import { normalizeString } from '../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaign,
} from '../types';

export * from '../types/campaigns';
export * from './campaign-factories';
export * from './campaign-summarizers';

import {
  type FilemakerEmailCampaignAudiencePreview,
  type FilemakerEmailCampaignLaunchEvaluation,
} from '../types/campaigns';

type CampaignRecurringRule = NonNullable<FilemakerEmailCampaign['launch']['recurring']>;
type ScheduledLaunchEvaluation = Pick<
  FilemakerEmailCampaignLaunchEvaluation,
  'blockers' | 'nextEligibleAt'
>;

const hasHourBound = (value: number | null | undefined): value is number =>
  value !== null && value !== undefined;

const isWithinBoundedAllowedHours = (
  hour: number,
  start: number,
  end: number
): boolean => {
  if (start <= end) {
    return hour >= start && hour <= end;
  }
  return hour >= start || hour <= end;
};

const isWithinAllowedHours = (
  hour: number,
  start: number | null | undefined,
  end: number | null | undefined
): boolean => {
  if (!hasHourBound(start)) {
    if (!hasHourBound(end)) return true;
    return hour <= end;
  }
  if (!hasHourBound(end)) return hour >= start;
  return isWithinBoundedAllowedHours(hour, start, end);
};

const isCampaignApprovalSatisfied = (campaign: FilemakerEmailCampaign): boolean => {
  if (campaign.launch.requireApproval === false) return true;
  return normalizeString(campaign.approvalGrantedAt).length > 0;
};

const isWeekdayPolicySatisfied = (onlyWeekdays: boolean, weekday: number): boolean => {
  if (onlyWeekdays === false) return true;
  return weekday !== 0 && weekday !== 6;
};

const evaluateBaseCampaignLaunchBlockers = (
  campaign: FilemakerEmailCampaign,
  preview: FilemakerEmailCampaignAudiencePreview,
  now: Date = new Date()
): string[] => {
  const blockers: string[] = [];
  const hour = now.getHours();
  const weekday = now.getDay();

  if (campaign.status !== 'active') {
    blockers.push('Campaign must be active before it can launch.');
  }
  if (preview.recipients.length < campaign.launch.minAudienceSize) {
    blockers.push(
      `Audience preview has ${preview.recipients.length} recipients, below the minimum of ${campaign.launch.minAudienceSize}.`
    );
  }
  if (!isCampaignApprovalSatisfied(campaign)) {
    blockers.push('Campaign launch requires approval.');
  }
  if (!isWeekdayPolicySatisfied(campaign.launch.onlyWeekdays, weekday)) {
    blockers.push('Campaign can launch only on weekdays.');
  }
  if (
    !isWithinAllowedHours(hour, campaign.launch.allowedHourStart, campaign.launch.allowedHourEnd)
  ) {
    blockers.push('Campaign is outside of the allowed launch hours.');
  }

  return blockers;
};

const evaluateScheduledCampaignLaunch = (
  campaign: FilemakerEmailCampaign,
  now: Date
): ScheduledLaunchEvaluation => {
  if (campaign.launch.mode !== 'scheduled') {
    return { blockers: [], nextEligibleAt: null };
  }

  const scheduledAt = normalizeString(campaign.launch.scheduledAt);
  const scheduledTime = Date.parse(scheduledAt);
  if (scheduledAt.length === 0 || Number.isNaN(scheduledTime)) {
    return {
      blockers: ['Scheduled launch mode requires a valid scheduled time.'],
      nextEligibleAt: null,
    };
  }
  if (scheduledTime <= now.getTime()) {
    return { blockers: [], nextEligibleAt: null };
  }

  return {
    blockers: ['Campaign is scheduled for a future time.'],
    nextEligibleAt: new Date(scheduledTime).toISOString(),
  };
};

const evaluateRecurringRuleLaunchBlockers = (
  recurring: CampaignRecurringRule,
  now: Date
): string[] => {
  const blockers: string[] = [];
  const hour = now.getHours();
  const weekday = now.getDay();

  if (recurring.weekdays.length > 0 && !recurring.weekdays.includes(weekday)) {
    blockers.push('Campaign is outside of the recurring weekday window.');
  }
  if (!isWithinAllowedHours(hour, recurring.hourStart, recurring.hourEnd)) {
    blockers.push('Campaign is outside of the recurring hour window.');
  }
  return blockers;
};

const evaluateRecurringCampaignLaunchBlockers = (
  campaign: FilemakerEmailCampaign,
  now: Date
): string[] => {
  if (campaign.launch.mode !== 'recurring') return [];
  if (campaign.launch.recurring === null || campaign.launch.recurring === undefined) {
    return ['Recurring launch mode requires recurring settings.'];
  }
  return evaluateRecurringRuleLaunchBlockers(campaign.launch.recurring, now);
};

export const evaluateFilemakerEmailCampaignLaunch = (
  campaign: FilemakerEmailCampaign,
  preview: FilemakerEmailCampaignAudiencePreview,
  now: Date = new Date()
): FilemakerEmailCampaignLaunchEvaluation => {
  const scheduledEvaluation = evaluateScheduledCampaignLaunch(campaign, now);
  const blockers = [
    ...evaluateBaseCampaignLaunchBlockers(campaign, preview, now),
    ...scheduledEvaluation.blockers,
    ...evaluateRecurringCampaignLaunchBlockers(campaign, now),
  ];

  return {
    isEligible: blockers.length === 0,
    blockers,
    nextEligibleAt: scheduledEvaluation.nextEligibleAt,
  };
};
