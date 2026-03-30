import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  searchFilemakerMailMessagesMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  searchFilemakerMailMessagesMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-mail-service', () => ({
  searchFilemakerMailMessages: searchFilemakerMailMessagesMock,
}));

import { GET_handler } from './handler';

describe('filemaker mail search handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('forwards query and accountId to the search service', async () => {
    const searchResponse = {
      query: 'invoice',
      totalHits: 1,
      groups: [
        {
          threadId: 'thread-1',
          threadSubject: 'Invoice #123',
          accountId: 'account-1',
          mailboxPath: 'INBOX',
          lastMessageAt: '2026-03-29T10:00:00Z',
          hits: [
            {
              messageId: 'msg-1',
              threadId: 'thread-1',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              subject: 'Invoice #123',
              from: { name: 'Alice', address: 'alice@example.com' },
              to: [{ name: null, address: 'bob@example.com' }],
              direction: 'inbound',
              sentAt: '2026-03-29T10:00:00Z',
              receivedAt: '2026-03-29T10:01:00Z',
              matchSnippet: '...please see attached invoice...',
              matchField: 'body',
            },
          ],
        },
      ],
    };

    searchFilemakerMailMessagesMock.mockResolvedValue(searchResponse);

    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/filemaker/mail/search?query=invoice&accountId=account-1'
      ),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(searchFilemakerMailMessagesMock).toHaveBeenCalledWith({
      query: 'invoice',
      accountId: 'account-1',
    });
    await expect(response.json()).resolves.toEqual(searchResponse);
  });

  it('passes empty query when none provided', async () => {
    searchFilemakerMailMessagesMock.mockResolvedValue({
      query: '',
      totalHits: 0,
      groups: [],
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/filemaker/mail/search'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(searchFilemakerMailMessagesMock).toHaveBeenCalledWith({ query: '' });
    await expect(response.json()).resolves.toEqual({
      query: '',
      totalHits: 0,
      groups: [],
    });
  });

  it('searches across all accounts when no accountId is given', async () => {
    searchFilemakerMailMessagesMock.mockResolvedValue({
      query: 'hello',
      totalHits: 0,
      groups: [],
    });

    await GET_handler(
      new NextRequest('http://localhost/api/filemaker/mail/search?query=hello'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(searchFilemakerMailMessagesMock).toHaveBeenCalledWith({
      query: 'hello',
    });
  });
});
