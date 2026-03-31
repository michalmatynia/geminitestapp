import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  listFilemakerMailFolderSummariesMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  listFilemakerMailFolderSummariesMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  listFilemakerMailFolderSummaries: listFilemakerMailFolderSummariesMock,
}));

import { GET_handler } from './handler';

describe('filemaker mail folders handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('lists folder summaries with optional account filtering', async () => {
    listFilemakerMailFolderSummariesMock.mockResolvedValue([
      {
        id: 'account-1::INBOX',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        threadCount: 4,
        unreadCount: 2,
        lastMessageAt: '2026-03-28T10:00:00.000Z',
      },
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/filemaker/mail/folders?accountId=account-1'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(requireFilemakerMailAdminSessionMock).toHaveBeenCalled();
    expect(listFilemakerMailFolderSummariesMock).toHaveBeenCalledWith({
      accountId: 'account-1',
    });
    await expect(response.json()).resolves.toEqual({
      folders: [
        expect.objectContaining({
          id: 'account-1::INBOX',
          accountId: 'account-1',
          mailboxPath: 'INBOX',
        }),
      ],
    });
  });
});
