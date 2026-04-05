import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  syncFilemakerMailAccountMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  syncFilemakerMailAccountMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  syncFilemakerMailAccount: syncFilemakerMailAccountMock,
}));

import { POST_handler } from './handler';

describe('filemaker mail account sync handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('decodes the route param and returns the sync result', async () => {
    syncFilemakerMailAccountMock.mockResolvedValue({
      accountId: 'account 1',
      foldersScanned: ['INBOX'],
      fetchedMessageCount: 12,
      insertedMessageCount: 10,
      updatedMessageCount: 2,
      touchedThreadCount: 5,
      lastSyncError: null,
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/mail/accounts/account%201/sync', {
        method: 'POST',
      }),
      { params: { accountId: 'account%201' } } as Parameters<typeof POST_handler>[1]
    );

    expect(syncFilemakerMailAccountMock).toHaveBeenCalledWith('account 1');
    await expect(response.json()).resolves.toEqual({
      result: expect.objectContaining({
        accountId: 'account 1',
        fetchedMessageCount: 12,
      }),
    });
  });
});
