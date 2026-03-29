import { normalizeString } from '../filemaker-settings.helpers';
import type {
  FilemakerEmailCampaign,
} from '../types';

export * from '../types/campaigns';
export * from './campaign-factories';
export * from './campaign-summarizers';

import {
  FilemakerEmailCampaignAudiencePreview,
  FilemakerEmailCampaignLaunchEvaluation,
} from '../types/campaigns';

const isWithinAllowedHours = (
  hour: number,
  start: number | null | undefined,
  end: number | null | undefined
): boolean => {
  if (start == null && end == null) return true;
  if (start != null && end != null) {
    if (start <= end) {
      return hour >= start && hour <= end;
    }
    return hour >= start || hour <= end;
  }
  if (start != null) return hour >= start;
  return hour <= (end ?? 23);
};

export const evaluateFilemakerEmailCampaignLaunch = (
  campaign: FilemakerEmailCampaign,
  preview: FilemakerEmailCampaignAudiencePreview,
  now: Date = new Date()
): FilemakerEmailCampaignLaunchEvaluation => {
  const blockers: string[] = [];
  let nextEligibleAt: string | null = null;
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
  if (campaign.launch.requireApproval && !campaign.approvalGrantedAt) {
    blockers.push('Campaign launch requires approval.');
  }
  if (campaign.launch.onlyWeekdays && (weekday === 0 || weekday === 6)) {
    blockers.push('Campaign can launch only on weekdays.');
  }
  if (
    !isWithinAllowedHours(hour, campaign.launch.allowedHourStart, campaign.launch.allowedHourEnd)
  ) {
    blockers.push('Campaign is outside of the allowed launch hours.');
  }

  if (campaign.launch.mode === 'scheduled') {
    const scheduledAt = normalizeString(campaign.launch.scheduledAt);
    const scheduledTime = Date.parse(scheduledAt);
    if (!scheduledAt || Number.isNaN(scheduledTime)) {
      blockers.push('Scheduled launch mode requires a valid scheduled time.');
    } else if (scheduledTime > now.getTime()) {
      blockers.push('Campaign is scheduled for a future time.');
      nextEligibleAt = new Date(scheduledTime).toISOString();
    }
  }

  if (campaign.launch.mode === 'recurring') {
    const recurring = campaign.launch.recurring;
    if (!recurring) {
      blockers.push('Recurring launch mode requires recurring settings.');
    } else {
      if (recurring.weekdays.length > 0 && !recurring.weekdays.includes(weekday)) {
        blockers.push('Campaign is outside of the recurring weekday window.');
      }
      if (!isWithinAllowedHours(hour, recurring.hourStart, recurring.hourEnd)) {
        blockers.push('Campaign is outside of the recurring hour window.');
      }
    }
  }

  return {
    isEligible: blockers.length === 0,
    blockers,
    nextEligibleAt,
  };
};
