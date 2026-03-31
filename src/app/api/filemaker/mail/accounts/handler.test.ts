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

import { GET_handler, POST_handler } from './handler';

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

    const response = await GET_handler(
      new NextRequest('http://localhost/api/filemaker/mail/accounts'),
      {} as Parameters<typeof GET_handler>[1]
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

    const response = await POST_handler(
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
      {} as Parameters<typeof POST_handler>[1]
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
});
