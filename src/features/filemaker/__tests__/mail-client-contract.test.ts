import { describe, expect, it } from 'vitest';

import {
  filemakerMailCampaignContextSchema,
  filemakerMailComposeInputSchema,
  filemakerMailFlagPatchSchema,
  filemakerMailSyncDispatchResponseSchema,
  filemakerMailSyncResultSchema,
  filemakerMailThreadSchema,
} from '@/shared/contracts/filemaker-mail';
import {
  filemakerEmailCampaignEventSchema,
  filemakerEmailCampaignEventTypeSchema,
} from '@/shared/contracts/filemaker';
import {
  isFilemakerEmailCampaignEventType,
} from '@/features/filemaker/settings/campaign-factory-normalizers';
import { createFilemakerEmailCampaignEvent } from '@/features/filemaker/settings/campaign-factories';

import {
  buildThreadId,
  pickAnchorAddress,
} from '@/features/filemaker/server/mail/mail-utils';

describe('filemaker mail client contract extensions', () => {
  it('allows reply_received as a campaign event type in zod + normalizer', () => {
    expect(filemakerEmailCampaignEventTypeSchema.parse('reply_received')).toBe('reply_received');
    expect(isFilemakerEmailCampaignEventType('reply_received')).toBe(true);
  });

  it('preserves reply mail linkage on campaign events', () => {
    const event = createFilemakerEmailCampaignEvent({
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      type: 'reply_received',
      message: 'Reply received from jane@example.com',
      mailThreadId: 'thread-1',
      mailMessageId: 'message-1',
    });

    const parsed = filemakerEmailCampaignEventSchema.parse(event);

    expect(parsed.mailThreadId).toBe('thread-1');
    expect(parsed.mailMessageId).toBe('message-1');
  });

  it('accepts campaignContext on thread schema', () => {
    const parsed = filemakerMailThreadSchema.parse({
      id: 'filemaker-mail-thread-abc',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      accountId: 'acct-1',
      mailboxPath: 'INBOX',
      mailboxRole: 'inbox',
      subject: 'Hi',
      normalizedSubject: 'hi',
      anchorAddress: 'jane@example.com',
      participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
      relatedPersonIds: [],
      relatedOrganizationIds: [],
      unreadCount: 0,
      messageCount: 1,
      lastMessageAt: '2026-01-01T00:00:00.000Z',
      campaignContext: {
        campaignId: 'campaign-1',
        runId: 'run-1',
        deliveryId: 'delivery-1',
      },
    });
    expect(parsed.campaignContext?.campaignId).toBe('campaign-1');
    expect(parsed.anchorAddress).toBe('jane@example.com');
  });

  it('defaults anchorAddress to empty string when omitted', () => {
    const parsed = filemakerMailThreadSchema.parse({
      id: 'filemaker-mail-thread-xyz',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      accountId: 'acct-1',
      mailboxPath: 'INBOX',
      subject: 'Hi',
      normalizedSubject: 'hi',
      participantSummary: [],
      lastMessageAt: '2026-01-01T00:00:00.000Z',
    });
    expect(parsed.anchorAddress).toBe('');
  });

  it('flag-patch schema accepts any subset of flags', () => {
    expect(filemakerMailFlagPatchSchema.parse({})).toEqual({});
    expect(filemakerMailFlagPatchSchema.parse({ seen: true, flagged: false })).toEqual({
      seen: true,
      flagged: false,
    });
  });

  it('campaign context schema requires campaignId only', () => {
    expect(
      filemakerMailCampaignContextSchema.parse({ campaignId: 'campaign-1' })
    ).toEqual({ campaignId: 'campaign-1' });
    expect(() => filemakerMailCampaignContextSchema.parse({})).toThrow();
  });

  it('compose input accepts attachments and overrideSuppression', () => {
    const parsed = filemakerMailComposeInputSchema.parse({
      accountId: 'acct-1',
      to: [{ address: 'jane@example.com' }],
      subject: 'Hello',
      bodyHtml: '<p>hi</p>',
      attachments: [
        {
          fileName: 'report.pdf',
          contentType: 'application/pdf',
          dataBase64: 'ZmFrZQ==',
        },
      ],
      overrideSuppression: true,
    });
    expect(parsed.attachments).toHaveLength(1);
    expect(parsed.overrideSuppression).toBe(true);
  });

  it('sync result schema preserves optional sync errors', () => {
    const parsed = filemakerMailSyncResultSchema.parse({
      accountId: 'acct-1',
      foldersScanned: ['INBOX'],
      fetchedMessageCount: 0,
      insertedMessageCount: 0,
      updatedMessageCount: 0,
      touchedThreadCount: 0,
      completedAt: '2026-01-01T00:00:00.000Z',
      lastSyncError: 'IMAP command failed (NO): sync is not available',
    });

    expect(parsed.lastSyncError).toBe('IMAP command failed (NO): sync is not available');
  });

  it('sync dispatch schema represents queued runtime jobs', () => {
    const parsed = filemakerMailSyncDispatchResponseSchema.parse({
      accountId: 'acct-1',
      dispatchMode: 'queued',
      jobId: 'mail-sync-job-1',
      reason: 'manual',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });

    expect(parsed.dispatchMode).toBe('queued');
    expect(parsed.jobId).toBe('mail-sync-job-1');
  });
});

describe('buildThreadId anchoring', () => {
  it('produces the same id for the same subject+anchor (no providerThreadId)', () => {
    const first = buildThreadId({
      accountId: 'acct-1',
      providerThreadId: null,
      normalizedSubject: 're: roadmap',
      anchorAddress: 'jane@example.com',
    });
    const second = buildThreadId({
      accountId: 'acct-1',
      providerThreadId: null,
      normalizedSubject: 're: roadmap',
      anchorAddress: 'jane@example.com',
    });
    expect(first).toBe(second);
  });

  it('producing a different id when the anchor address changes', () => {
    const first = buildThreadId({
      accountId: 'acct-1',
      providerThreadId: null,
      normalizedSubject: 're: roadmap',
      anchorAddress: 'jane@example.com',
    });
    const second = buildThreadId({
      accountId: 'acct-1',
      providerThreadId: null,
      normalizedSubject: 're: roadmap',
      anchorAddress: 'paul@example.com',
    });
    expect(first).not.toBe(second);
  });

  it('prefers providerThreadId over subject+anchor', () => {
    const withProviderId = buildThreadId({
      accountId: 'acct-1',
      providerThreadId: 'provider-thread-123',
      normalizedSubject: 'different subject',
      anchorAddress: 'jane@example.com',
    });
    const sameProviderDifferentSubject = buildThreadId({
      accountId: 'acct-1',
      providerThreadId: 'provider-thread-123',
      normalizedSubject: 'unrelated',
      anchorAddress: 'paul@example.com',
    });
    expect(withProviderId).toBe(sameProviderDifferentSubject);
  });

  it('pickAnchorAddress returns the first participant', () => {
    expect(pickAnchorAddress([{ address: 'a@example.com', name: null }])).toBe('a@example.com');
    expect(
      pickAnchorAddress([
        { address: 'first@example.com', name: null },
        { address: 'second@example.com', name: null },
      ])
    ).toBe('first@example.com');
    expect(pickAnchorAddress([])).toBe('unknown');
  });
});
