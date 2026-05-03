import { describe, expect, it } from 'vitest';

import {
  isCampaignListHygieneBlocking,
  runListHygieneCheck,
  type CampaignListHygieneIssueCode,
} from '../settings/campaign-list-hygiene';
import type {
  FilemakerEmailCampaignDeliveryRegistry,
  FilemakerEmailCampaignSuppressionRegistry,
} from '../types';
import type { FilemakerEmailCampaignAudienceRecipient } from '../types/campaigns';

const recipient = (
  overrides: Partial<FilemakerEmailCampaignAudienceRecipient> = {}
): FilemakerEmailCampaignAudienceRecipient => ({
  emailId: 'em-1',
  email: 'jan@example.com',
  emailStatus: 'active',
  partyKind: 'person',
  partyId: 'p1',
  partyName: 'Jan Kowalski',
  city: 'Warsaw',
  country: 'PL',
  matchedEventIds: [],
  ...overrides,
});

const emptySuppressions: FilemakerEmailCampaignSuppressionRegistry = {
  version: 1,
  entries: [],
};

const emptyDeliveries: FilemakerEmailCampaignDeliveryRegistry = {
  version: 1,
  deliveries: [],
};

const codesIn = (codes: CampaignListHygieneIssueCode[]) => new Set(codes);

describe('runListHygieneCheck', () => {
  it('returns no issues for a clean list', () => {
    const summary = runListHygieneCheck({
      recipients: [recipient(), recipient({ emailId: 'em-2', email: 'maria@firma.pl' })],
      suppressionRegistry: emptySuppressions,
      deliveryRegistry: emptyDeliveries,
    });

    expect(summary.totalRecipients).toBe(2);
    expect(summary.uniqueAddresses).toBe(2);
    expect(summary.issues).toEqual([]);
    expect(summary.bySeverity.error).toBe(0);
    expect(isCampaignListHygieneBlocking(summary)).toBe(false);
  });

  it('flags syntactically invalid addresses as errors', () => {
    const summary = runListHygieneCheck({
      recipients: [recipient({ email: 'not-an-email' })],
      suppressionRegistry: emptySuppressions,
      deliveryRegistry: emptyDeliveries,
    });
    const codes = codesIn(summary.issues.map((issue) => issue.code));
    expect(codes.has('syntax_invalid')).toBe(true);
    expect(isCampaignListHygieneBlocking(summary)).toBe(true);
  });

  it('flags role addresses as warnings', () => {
    const summary = runListHygieneCheck({
      recipients: [
        recipient({ email: 'info@example.com' }),
        recipient({ email: 'no-reply@example.com', emailId: 'em-2' }),
      ],
      suppressionRegistry: emptySuppressions,
      deliveryRegistry: emptyDeliveries,
    });
    expect(summary.byCode.role_address).toBe(2);
    expect(summary.bySeverity.warning).toBeGreaterThanOrEqual(2);
    expect(isCampaignListHygieneBlocking(summary)).toBe(false);
  });

  it('flags currently-suppressed addresses as errors with the suppression reason', () => {
    const summary = runListHygieneCheck({
      recipients: [recipient({ email: 'jan@example.com' })],
      suppressionRegistry: {
        version: 1,
        entries: [
          {
            id: 's1',
            emailAddress: 'jan@example.com',
            reason: 'unsubscribed',
            actor: null,
            notes: null,
            campaignId: null,
            runId: null,
            deliveryId: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      deliveryRegistry: emptyDeliveries,
    });

    expect(summary.byCode.currently_suppressed).toBe(1);
    const issue = summary.issues.find((entry) => entry.code === 'currently_suppressed');
    expect(issue?.message).toMatch(/unsubscribed/);
    expect(isCampaignListHygieneBlocking(summary)).toBe(true);
  });

  it('flags recent bounces inside the window and not outside', () => {
    const nowMs = Date.parse('2026-04-27T12:00:00.000Z');
    const insideWindow = new Date(nowMs - 24 * 60 * 60 * 1000).toISOString();
    const outsideWindow = new Date(nowMs - 30 * 24 * 60 * 60 * 1000).toISOString();

    const summary = runListHygieneCheck({
      recipients: [
        recipient({ email: 'recent@example.com', emailId: 'em-1' }),
        recipient({ email: 'old@example.com', emailId: 'em-2' }),
      ],
      suppressionRegistry: emptySuppressions,
      deliveryRegistry: {
        version: 1,
        deliveries: [
          {
            id: 'd1',
            campaignId: 'c1',
            runId: 'r1',
            emailId: 'em-1',
            emailAddress: 'recent@example.com',
            partyKind: 'person',
            partyId: 'p1',
            status: 'bounced',
            provider: 'smtp',
            failureCategory: 'hard_bounce',
            providerMessage: null,
            lastError: null,
            sentAt: insideWindow,
            nextRetryAt: null,
            createdAt: insideWindow,
            updatedAt: insideWindow,
          },
          {
            id: 'd2',
            campaignId: 'c1',
            runId: 'r0',
            emailId: 'em-2',
            emailAddress: 'old@example.com',
            partyKind: 'person',
            partyId: 'p2',
            status: 'bounced',
            provider: 'smtp',
            failureCategory: 'hard_bounce',
            providerMessage: null,
            lastError: null,
            sentAt: outsideWindow,
            nextRetryAt: null,
            createdAt: outsideWindow,
            updatedAt: outsideWindow,
          },
        ],
      },
      nowMs,
    });

    expect(summary.byCode.recently_bounced).toBe(1);
    const bounceIssue = summary.issues.find((entry) => entry.code === 'recently_bounced');
    expect(bounceIssue?.emailAddress).toBe('recent@example.com');
  });

  it('flags duplicate addresses once per repeated address', () => {
    const summary = runListHygieneCheck({
      recipients: [
        recipient({ email: 'twice@example.com', emailId: 'em-1' }),
        recipient({ email: 'twice@example.com', emailId: 'em-2' }),
        recipient({ email: 'unique@example.com', emailId: 'em-3' }),
      ],
      suppressionRegistry: emptySuppressions,
      deliveryRegistry: emptyDeliveries,
    });

    expect(summary.byCode.duplicate_address).toBe(1);
    const dupeIssue = summary.issues.find((entry) => entry.code === 'duplicate_address');
    expect(dupeIssue?.emailAddress).toBe('twice@example.com');
    expect(dupeIssue?.message).toMatch(/2 times/);
  });
});
