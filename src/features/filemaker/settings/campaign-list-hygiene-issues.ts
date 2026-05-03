import type { FilemakerEmailCampaignDelivery } from '../types';
import type { FilemakerEmailCampaignAudienceRecipient } from '../types/campaigns';
import type { CampaignListHygieneIssue } from './campaign-list-hygiene';

const ROLE_LOCAL_PARTS: ReadonlySet<string> = new Set([
  'admin',
  'administrator',
  'info',
  'sales',
  'support',
  'help',
  'helpdesk',
  'office',
  'contact',
  'enquiries',
  'inquiry',
  'marketing',
  'press',
  'media',
  'jobs',
  'careers',
  'hr',
  'finance',
  'accounts',
  'accounting',
  'billing',
  'noreply',
  'no-reply',
  'do-not-reply',
  'donotreply',
  'postmaster',
  'webmaster',
  'abuse',
  'security',
  'legal',
  'privacy',
]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RecentDeliveryIndexes = {
  recentBouncesByAddress: Map<string, FilemakerEmailCampaignDelivery>;
  recentFailuresByAddress: Map<string, FilemakerEmailCampaignDelivery>;
};

const localPart = (address: string): string => {
  const at = address.indexOf('@');
  if (at < 1) return '';
  return address.slice(0, at);
};

const buildBaseRecipientIssue = (
  recipient: FilemakerEmailCampaignAudienceRecipient,
  index: number
): Pick<CampaignListHygieneIssue, 'emailAddress' | 'recipientId' | 'recipientIndex'> => ({
  emailAddress: recipient.email,
  recipientIndex: index,
  recipientId: recipient.emailId,
});

const getSyntaxIssue = (
  recipient: FilemakerEmailCampaignAudienceRecipient,
  index: number,
  address: string
): CampaignListHygieneIssue | null => {
  if (address.length === 0) {
    return {
      ...buildBaseRecipientIssue(recipient, index),
      code: 'syntax_invalid',
      severity: 'error',
      message: 'Recipient has no email address.',
    };
  }
  if (EMAIL_RE.test(address)) return null;
  return {
    ...buildBaseRecipientIssue(recipient, index),
    code: 'syntax_invalid',
    severity: 'error',
    message: `"${recipient.email}" is not a valid email address.`,
  };
};

const getRoleAddressIssue = (
  recipient: FilemakerEmailCampaignAudienceRecipient,
  index: number,
  address: string
): CampaignListHygieneIssue | null => {
  const local = localPart(address);
  if (local.length === 0 || !ROLE_LOCAL_PARTS.has(local)) return null;
  return {
    ...buildBaseRecipientIssue(recipient, index),
    code: 'role_address',
    severity: 'warning',
    message: `Role address "${recipient.email}" — typically lower engagement, consider replacing with a personal contact.`,
  };
};

const getSuppressionIssue = (
  recipient: FilemakerEmailCampaignAudienceRecipient,
  index: number,
  suppressionReason: string | undefined
): CampaignListHygieneIssue | null => {
  if (suppressionReason === undefined || suppressionReason.length === 0) return null;
  return {
    ...buildBaseRecipientIssue(recipient, index),
    code: 'currently_suppressed',
    severity: 'error',
    message: `"${recipient.email}" is suppressed (${suppressionReason}). It will be skipped at send time.`,
  };
};

const getRecentDeliveryIssue = (
  recipient: FilemakerEmailCampaignAudienceRecipient,
  index: number,
  recentBounce: FilemakerEmailCampaignDelivery | undefined,
  recentFailure: FilemakerEmailCampaignDelivery | undefined
): CampaignListHygieneIssue | null => {
  if (recentBounce !== undefined) {
    return {
      ...buildBaseRecipientIssue(recipient, index),
      code: 'recently_bounced',
      severity: 'warning',
      message: `"${recipient.email}" bounced on a recent send (${recentBounce.failureCategory ?? 'bounced'}). Sending again risks reputation damage.`,
    };
  }
  if (recentFailure === undefined) return null;
  return {
    ...buildBaseRecipientIssue(recipient, index),
    code: 'recently_failed',
    severity: 'info',
    message: `"${recipient.email}" failed delivery on a recent run (${recentFailure.failureCategory ?? 'unknown'}). Worth verifying before retrying.`,
  };
};

export const buildRecipientIssues = (input: {
  address: string;
  index: number;
  recipient: FilemakerEmailCampaignAudienceRecipient;
  recentDeliveries: RecentDeliveryIndexes;
  suppressionByAddress: Map<string, string>;
}): CampaignListHygieneIssue[] => {
  const issues = [
    getSyntaxIssue(input.recipient, input.index, input.address),
    getRoleAddressIssue(input.recipient, input.index, input.address),
    getSuppressionIssue(input.recipient, input.index, input.suppressionByAddress.get(input.address)),
    getRecentDeliveryIssue(
      input.recipient,
      input.index,
      input.recentDeliveries.recentBouncesByAddress.get(input.address),
      input.recentDeliveries.recentFailuresByAddress.get(input.address)
    ),
  ];
  return issues.filter((issue): issue is CampaignListHygieneIssue => issue !== null);
};

export const buildDuplicateIssues = (
  seenCounts: Map<string, number>
): CampaignListHygieneIssue[] => {
  const issues: CampaignListHygieneIssue[] = [];
  seenCounts.forEach((count, address) => {
    if (count <= 1) return;
    issues.push({
      code: 'duplicate_address',
      severity: 'warning',
      emailAddress: address,
      message: `"${address}" appears ${count} times in the audience. Enable dedupe in the audience rule, or expect multiple sends to the same person.`,
    });
  });
  return issues;
};
