import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  createFilemakerEmailCampaign,
  createFilemakerEmailCampaignDelivery,
  createFilemakerEmailCampaignRun,
} from '../settings';
import type { FilemakerMailAccount } from '../types';

vi.mock('server-only', () => ({}));

const {
  readFilemakerCampaignSettingValueMock,
  upsertFilemakerCampaignSettingValueMock,
  getFilemakerMailAccountMock,
  getFilemakerMailThreadForCampaignDeliveryMock,
  fileFilemakerCampaignEmailRecordAsMailMessageMock,
} = vi.hoisted(() => ({
  readFilemakerCampaignSettingValueMock: vi.fn(),
  upsertFilemakerCampaignSettingValueMock: vi.fn(),
  getFilemakerMailAccountMock: vi.fn(),
  getFilemakerMailThreadForCampaignDeliveryMock: vi.fn(),
  fileFilemakerCampaignEmailRecordAsMailMessageMock: vi.fn(),
}));

vi.mock('./campaign-settings-store', () => ({
  readFilemakerCampaignSettingValue: readFilemakerCampaignSettingValueMock,
  upsertFilemakerCampaignSettingValue: upsertFilemakerCampaignSettingValueMock,
}));

vi.mock('./filemaker-mail-service', () => ({
  getFilemakerMailAccount: getFilemakerMailAccountMock,
  getFilemakerMailThreadForCampaignDelivery: getFilemakerMailThreadForCampaignDeliveryMock,
}));

vi.mock('./campaign-email-delivery', () => ({
  fileFilemakerCampaignEmailRecordAsMailMessage:
    fileFilemakerCampaignEmailRecordAsMailMessageMock,
}));

const mailAccount: FilemakerMailAccount = {
  id: 'mail-account-1',
  createdAt: '2026-04-01T09:00:00.000Z',
  updatedAt: '2026-04-01T09:00:00.000Z',
  name: 'Sales',
  emailAddress: 'sales@example.com',
  provider: 'imap_smtp',
  status: 'active',
  imapHost: 'imap.example.com',
  imapPort: 993,
  imapSecure: true,
  imapUser: 'sales@example.com',
  imapPasswordSettingKey: 'imap-key',
  smtpHost: 'smtp.example.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: 'sales@example.com',
  smtpPasswordSettingKey: 'smtp-key',
  fromName: 'Sales',
  replyToEmail: 'replies@example.com',
  folderAllowlist: [],
  initialSyncLookbackDays: 30,
  maxMessagesPerSync: 100,
  lastSyncedAt: null,
  lastSyncError: null,
};

const createSettingsMap = (): Map<string, string> => {
  const campaign = createFilemakerEmailCampaign({
    id: 'campaign-1',
    name: 'Spring Expo',
    status: 'active',
    subject: 'Meet us',
    bodyText: 'Hello {{email}}',
    mailAccountId: 'mail-account-1',
  });
  const run = createFilemakerEmailCampaignRun({
    id: 'run-1',
    campaignId: 'campaign-1',
    status: 'completed',
    mode: 'live',
  });
  const deliveries = [
    createFilemakerEmailCampaignDelivery({
      id: 'delivery-1',
      campaignId: 'campaign-1',
      runId: 'run-1',
      emailAddress: 'filed@example.com',
      partyKind: 'person',
      partyId: 'person-1',
      status: 'sent',
      sentAt: '2026-04-01T10:00:00.000Z',
    }),
    createFilemakerEmailCampaignDelivery({
      id: 'delivery-2',
      campaignId: 'campaign-1',
      runId: 'run-1',
      emailAddress: 'missing@example.com',
      partyKind: 'person',
      partyId: 'person-2',
      status: 'sent',
      sentAt: '2026-04-01T10:01:00.000Z',
    }),
  ];

  return new Map([
    [FILEMAKER_EMAIL_CAMPAIGNS_KEY, JSON.stringify({ version: 1, campaigns: [campaign] })],
    [FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY, JSON.stringify({ version: 1, runs: [run] })],
    [FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY, JSON.stringify({ version: 1, deliveries })],
    [FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY, JSON.stringify({ version: 1, events: [] })],
  ]);
};

describe('repairFilemakerCampaignRunMailFiling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const settings = createSettingsMap();
    readFilemakerCampaignSettingValueMock.mockImplementation(
      async (key: string) => settings.get(key) ?? null
    );
    upsertFilemakerCampaignSettingValueMock.mockResolvedValue(true);
    getFilemakerMailAccountMock.mockResolvedValue(mailAccount);
    getFilemakerMailThreadForCampaignDeliveryMock.mockImplementation(
      async (input: { deliveryId: string }) =>
        input.deliveryId === 'delivery-1' ? { id: 'thread-existing' } : null
    );
    fileFilemakerCampaignEmailRecordAsMailMessageMock.mockResolvedValue({
      threadId: 'thread-repaired',
      messageId: 'message-repaired',
    });
  });

  it('files missing sent deliveries and preserves already-linked deliveries', async () => {
    const { repairFilemakerCampaignRunMailFiling } = await import(
      './campaign-mail-filing-repair'
    );

    const result = await repairFilemakerCampaignRunMailFiling('run-1');

    expect(result).toEqual(
      expect.objectContaining({
        campaignId: 'campaign-1',
        runId: 'run-1',
        repairedCount: 1,
        skippedCount: 1,
        failedCount: 0,
      })
    );
    expect(result.deliveries).toEqual([
      expect.objectContaining({
        deliveryId: 'delivery-1',
        status: 'already_filed',
        mailThreadId: 'thread-existing',
      }),
      expect.objectContaining({
        deliveryId: 'delivery-2',
        status: 'filed',
        mailThreadId: 'thread-repaired',
        mailMessageId: 'message-repaired',
      }),
    ]);
    expect(fileFilemakerCampaignEmailRecordAsMailMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account: mailAccount,
        providerMessageId: null,
        record: expect.objectContaining({
          to: 'missing@example.com',
          text: expect.stringContaining('Hello missing@example.com'),
          campaignId: 'campaign-1',
          runId: 'run-1',
          deliveryId: 'delivery-2',
        }),
      })
    );
    const filedRecord = fileFilemakerCampaignEmailRecordAsMailMessageMock.mock.calls[0]?.[0]
      ?.record as { text?: string } | undefined;
    expect(filedRecord?.text).toContain('Manage campaign email preferences:');
    expect(filedRecord?.text).toContain('Unsubscribe:');
    expect(upsertFilemakerCampaignSettingValueMock).toHaveBeenCalledWith(
      FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
      expect.stringContaining('Repaired mail filing for missing@example.com.')
    );
  });
});
