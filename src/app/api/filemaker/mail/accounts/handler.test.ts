import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  listFilemakerMailAccountsMock,
  upsertFilemakerMailAccountMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  listFilemakerMailAccountsMock: vi.fn(),
  upsertFilemakerMailAccountMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  listFilemakerMailAccounts: listFilemakerMailAccountsMock,
  upsertFilemakerMailAccount: upsertFilemakerMailAccountMock,
}));

import { getHandler, postHandler } from './handler';

describe('filemaker mail accounts handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('lists accounts for an elevated admin session', async () => {
    listFilemakerMailAccountsMock.mockResolvedValue([
      {
        id: 'account-1',
        name: 'Support',
        emailAddress: 'support@example.com',
      },
    ]);

    const response = await getHandler(
      new NextRequest('http://localhost/api/filemaker/mail/accounts'),
      {} as Parameters<typeof getHandler>[1]
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(listFilemakerMailAccountsMock).toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({
      accounts: [
        {
          id: 'account-1',
          name: 'Support',
          emailAddress: 'support@example.com',
        },
      ],
    });
  });

  it('parses and saves a mailbox account draft', async () => {
    upsertFilemakerMailAccountMock.mockResolvedValue({
      id: 'account-1',
      name: 'Support',
      emailAddress: 'support@example.com',
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/mail/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: 'Support',
          emailAddress: 'support@example.com',
          status: 'active',
          imapHost: 'imap.example.com',
          imapPort: 993,
          imapSecure: true,
          imapUser: 'support@example.com',
          imapPassword: 'secret',
          smtpHost: 'smtp.example.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'support@example.com',
          smtpPassword: 'secret',
          fromName: 'Support',
          replyToEmail: null,
          folderAllowlist: ['INBOX'],
          initialSyncLookbackDays: 30,
          maxMessagesPerSync: 100,
        }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(upsertFilemakerMailAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Support',
        emailAddress: 'support@example.com',
        folderAllowlist: ['INBOX'],
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      account: {
        id: 'account-1',
        name: 'Support',
        emailAddress: 'support@example.com',
      },
    });
  });

  it('defaults omitted update passwords so stored credentials can be preserved', async () => {
    upsertFilemakerMailAccountMock.mockResolvedValue({
      id: 'account-1',
      name: 'Support',
      emailAddress: 'support@example.com',
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/mail/accounts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 'account-1',
          name: 'Support',
          emailAddress: 'support@example.com',
          status: 'active',
          imapHost: 'imap.example.com',
          imapPort: 993,
          imapSecure: true,
          imapUser: 'support@example.com',
          smtpHost: 'smtp.example.com',
          smtpPort: 465,
          smtpSecure: true,
          smtpUser: 'support@example.com',
          fromName: 'Support',
          replyToEmail: null,
          folderAllowlist: ['INBOX'],
          initialSyncLookbackDays: 30,
          maxMessagesPerSync: 100,
        }),
      }),
      {} as Parameters<typeof postHandler>[1]
    );

    expect(upsertFilemakerMailAccountMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'account-1',
        imapPassword: '',
        smtpPassword: '',
      })
    );
    expect(response.status).toBe(201);
  });
});
