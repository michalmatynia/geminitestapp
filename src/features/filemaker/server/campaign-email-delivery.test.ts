import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FilemakerMailAccount } from '../types';

const {
  readSecretSettingValuesMock,
  getFilemakerMailAccountMock,
  sendMailMock,
  createTransportMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  readSecretSettingValuesMock: vi.fn(),
  getFilemakerMailAccountMock: vi.fn(),
  sendMailMock: vi.fn(),
  createTransportMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/shared/lib/settings/secret-settings', () => ({
  readSecretSettingValues: readSecretSettingValuesMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

vi.mock('./filemaker-mail-service', () => ({
  getFilemakerMailAccount: getFilemakerMailAccountMock,
}));

vi.mock('nodemailer', () => ({
  createTransport: createTransportMock,
}));

const createMailAccount = (overrides?: Partial<FilemakerMailAccount>): FilemakerMailAccount => ({
  id: 'mail-account-sales',
  createdAt: '2026-04-02T10:00:00.000Z',
  updatedAt: '2026-04-02T10:00:00.000Z',
  name: 'Sales',
  emailAddress: 'sales@example.com',
  provider: 'imap_smtp',
  status: 'active',
  imapHost: 'imap.example.com',
  imapPort: 993,
  imapSecure: true,
  imapUser: 'sales@example.com',
  imapPasswordSettingKey: 'filemaker_mail_account_mail-account-sales_imap_password',
  smtpHost: 'smtp.example.com',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: 'sales-user',
  smtpPasswordSettingKey: 'filemaker_mail_account_mail-account-sales_smtp_password',
  fromName: 'Sales Team',
  replyToEmail: 'reply@example.com',
  folderAllowlist: [],
  initialSyncLookbackDays: 30,
  maxMessagesPerSync: 100,
  lastSyncedAt: null,
  lastSyncError: null,
  ...overrides,
});

describe('sendFilemakerCampaignEmail', () => {
  beforeEach(() => {
    createTransportMock.mockReturnValue({
      sendMail: sendMailMock,
    });
    sendMailMock.mockResolvedValue({ messageId: 'message-1' });
    readSecretSettingValuesMock.mockResolvedValue({
      'filemaker_mail_account_mail-account-sales_smtp_password': 'account-password',
    });
    getFilemakerMailAccountMock.mockResolvedValue(createMailAccount());
  });

  afterEach(async () => {
    vi.clearAllMocks();
    const module = await import('./campaign-email-delivery');
    module.__resetDeliveredFilemakerCampaignEmails();
  });

  it('uses the selected Filemaker mail account SMTP settings and sender defaults', async () => {
    const module = await import('./campaign-email-delivery');

    const result = await module.sendFilemakerCampaignEmail({
      to: 'recipient@example.com',
      subject: 'Welcome',
      text: 'Hello from campaign',
      html: '<p>Hello from campaign</p>',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      mailAccountId: 'mail-account-sales',
    });

    expect(getFilemakerMailAccountMock).toHaveBeenCalledWith('mail-account-sales');
    expect(readSecretSettingValuesMock).toHaveBeenCalledWith([
      'filemaker_mail_account_mail-account-sales_smtp_password',
    ]);
    expect(createTransportMock).toHaveBeenCalledWith({
      host: 'smtp.example.com',
      port: 465,
      secure: true,
      auth: {
        user: 'sales-user',
        pass: 'account-password',
      },
    });
    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Sales Team" <sales@example.com>',
        to: 'recipient@example.com',
        replyTo: 'reply@example.com',
        subject: 'Welcome',
      })
    );
    expect(result).toEqual(
      expect.objectContaining({
        provider: 'smtp',
        providerMessage: 'Sent through the Filemaker mail account "Sales".',
      })
    );
    expect(module.__getDeliveredFilemakerCampaignEmails()).toEqual([
      expect.objectContaining({
        campaignId: 'campaign-1',
        mailAccountId: 'mail-account-sales',
        fromName: 'Sales Team',
        replyToEmail: 'reply@example.com',
      }),
    ]);
    expect(logSystemEventMock).not.toHaveBeenCalled();
  });

  it('lets campaign sender overrides win over selected account defaults', async () => {
    const module = await import('./campaign-email-delivery');

    await module.sendFilemakerCampaignEmail({
      to: 'recipient@example.com',
      subject: 'Override check',
      text: 'Hello from campaign',
      campaignId: 'campaign-1',
      runId: 'run-1',
      deliveryId: 'delivery-1',
      mailAccountId: 'mail-account-sales',
      fromName: 'Campaign Owner',
      replyToEmail: 'campaign-replies@example.com',
    });

    expect(sendMailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: '"Campaign Owner" <sales@example.com>',
        replyTo: 'campaign-replies@example.com',
      })
    );
    expect(module.__getDeliveredFilemakerCampaignEmails()).toEqual([
      expect.objectContaining({
        fromName: 'Campaign Owner',
        replyToEmail: 'campaign-replies@example.com',
      }),
    ]);
  });
});
