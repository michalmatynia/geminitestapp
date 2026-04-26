import type {
  FilemakerEmailCampaignDelivery,
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';
import type { FilemakerEmailCampaignAudienceRecipient } from '../types/campaigns';

export type CampaignListHygieneSeverity = 'error' | 'warning' | 'info';

export type CampaignListHygieneIssueCode =
  | 'duplicate_address'
  | 'role_address'
  | 'syntax_invalid'
  | 'currently_suppressed'
  | 'recently_bounced'
  | 'recently_failed';

export interface CampaignListHygieneIssue {
  code: CampaignListHygieneIssueCode;
  severity: CampaignListHygieneSeverity;
  emailAddress: string;
  message: string;
  recipientIndex?: number | undefined;
  recipientId?: string | undefined;
}

export interface CampaignListHygieneSummary {
  totalRecipients: number;
  uniqueAddresses: number;
  issues: CampaignListHygieneIssue[];
  byCode: Record<CampaignListHygieneIssueCode, number>;
  bySeverity: Record<CampaignListHygieneSeverity, number>;
  affectedAddresses: string[];
}

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

const DEFAULT_RECENT_BOUNCE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000; // 14 days
const DEFAULT_RECENT_FAILURE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const normalizeAddress = (value: string | null | undefined): string =>
  (value ?? '').trim().toLowerCase();

const localPart = (address: string): string => {
  const at = address.indexOf('@');
  if (at < 1) return '';
  return address.slice(0, at);
};

const buildEmptyByCode = (): Record<CampaignListHygieneIssueCode, number> => ({
  duplicate_address: 0,
  role_address: 0,
  syntax_invalid: 0,
  currently_suppressed: 0,
  recently_bounced: 0,
  recently_failed: 0,
});

const buildEmptyBySeverity = (): Record<CampaignListHygieneSeverity, number> => ({
  error: 0,
  warning: 0,
  info: 0,
});

interface RunListHygieneCheckInput {
  recipients: FilemakerEmailCampaignAudienceRecipient[];
  suppressionRegistry: FilemakerEmailCampaignSuppressionRegistry;
  deliveryRegistry: FilemakerEmailCampaignDeliveryRegistry;
  nowMs?: number;
  recentBounceWindowMs?: number;
  recentFailureWindowMs?: number;
}

export const runListHygieneCheck = (
  input: RunListHygieneCheckInput
): CampaignListHygieneSummary => {
  const nowMs = input.nowMs ?? Date.now();
  const bounceWindowMs = input.recentBounceWindowMs ?? DEFAULT_RECENT_BOUNCE_WINDOW_MS;
  const failureWindowMs = input.recentFailureWindowMs ?? DEFAULT_RECENT_FAILURE_WINDOW_MS;

  const issues: CampaignListHygieneIssue[] = [];
  const seenCounts = new Map<string, number>();

  // Index suppressions by normalised address.
  const suppressionByAddress = new Map<string, string>();
  input.suppressionRegistry.entries.forEach((entry) => {
    const key = normalizeAddress(entry.emailAddress);
    if (key) suppressionByAddress.set(key, entry.reason);
  });

  // Index recent bounces / failures by address.
  const recentBouncesByAddress = new Map<string, FilemakerEmailCampaignDelivery>();
  const recentFailuresByAddress = new Map<string, FilemakerEmailCampaignDelivery>();
  input.deliveryRegistry.deliveries.forEach((delivery) => {
    const key = normalizeAddress(delivery.emailAddress);
    if (!key) return;
    const at = Date.parse(delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt ?? '');
    if (!Number.isFinite(at)) return;

    if (delivery.status === 'bounced' && nowMs - at <= bounceWindowMs) {
      const existing = recentBouncesByAddress.get(key);
      if (
        !existing ||
        Date.parse(existing.sentAt ?? existing.updatedAt ?? existing.createdAt ?? '0') < at
      ) {
        recentBouncesByAddress.set(key, delivery);
      }
    }
    if (delivery.status === 'failed' && nowMs - at <= failureWindowMs) {
      const existing = recentFailuresByAddress.get(key);
      if (
        !existing ||
        Date.parse(existing.sentAt ?? existing.updatedAt ?? existing.createdAt ?? '0') < at
      ) {
        recentFailuresByAddress.set(key, delivery);
      }
    }
  });

  input.recipients.forEach((recipient, index) => {
    const address = normalizeAddress(recipient.email);
    seenCounts.set(address, (seenCounts.get(address) ?? 0) + 1);

    if (!address) {
      issues.push({
        code: 'syntax_invalid',
        severity: 'error',
        emailAddress: recipient.email ?? '',
        message: 'Recipient has no email address.',
        recipientIndex: index,
        recipientId: recipient.emailId,
      });
      return;
    }

    if (!EMAIL_RE.test(address)) {
      issues.push({
        code: 'syntax_invalid',
        severity: 'error',
        emailAddress: recipient.email,
        message: `"${recipient.email}" is not a valid email address.`,
        recipientIndex: index,
        recipientId: recipient.emailId,
      });
    }

    const local = localPart(address);
    if (local && ROLE_LOCAL_PARTS.has(local)) {
      issues.push({
        code: 'role_address',
        severity: 'warning',
        emailAddress: recipient.email,
        message: `Role address "${recipient.email}" — typically lower engagement, consider replacing with a personal contact.`,
        recipientIndex: index,
        recipientId: recipient.emailId,
      });
    }

    const suppressionReason = suppressionByAddress.get(address);
    if (suppressionReason) {
      issues.push({
        code: 'currently_suppressed',
        severity: 'error',
        emailAddress: recipient.email,
        message: `"${recipient.email}" is suppressed (${suppressionReason}). It will be skipped at send time.`,
        recipientIndex: index,
        recipientId: recipient.emailId,
      });
    }

    const recentBounce = recentBouncesByAddress.get(address);
    if (recentBounce) {
      issues.push({
        code: 'recently_bounced',
        severity: 'warning',
        emailAddress: recipient.email,
        message: `"${recipient.email}" bounced on a recent send (${recentBounce.failureCategory ?? 'bounced'}). Sending again risks reputation damage.`,
        recipientIndex: index,
        recipientId: recipient.emailId,
      });
    } else {
      const recentFailure = recentFailuresByAddress.get(address);
      if (recentFailure) {
        issues.push({
          code: 'recently_failed',
          severity: 'info',
          emailAddress: recipient.email,
          message: `"${recipient.email}" failed delivery on a recent run (${recentFailure.failureCategory ?? 'unknown'}). Worth verifying before retrying.`,
          recipientIndex: index,
          recipientId: recipient.emailId,
        });
      }
    }
  });

  // Emit duplicate_address issues exactly once per repeated address.
  seenCounts.forEach((count, address) => {
    if (count > 1) {
      issues.push({
        code: 'duplicate_address',
        severity: 'warning',
        emailAddress: address,
        message: `"${address}" appears ${count} times in the audience. Enable dedupe in the audience rule, or expect multiple sends to the same person.`,
      });
    }
  });

  const byCode = buildEmptyByCode();
  const bySeverity = buildEmptyBySeverity();
  const affected = new Set<string>();

  issues.forEach((issue) => {
    byCode[issue.code] += 1;
    bySeverity[issue.severity] += 1;
    if (issue.emailAddress) affected.add(normalizeAddress(issue.emailAddress));
  });

  return {
    totalRecipients: input.recipients.length,
    uniqueAddresses: seenCounts.size,
    issues,
    byCode,
    bySeverity,
    affectedAddresses: Array.from(affected),
  };
};

export const isCampaignListHygieneBlocking = (summary: CampaignListHygieneSummary): boolean =>
  summary.bySeverity.error > 0;
