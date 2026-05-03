import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  updateFilemakerMailAccountStatusMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  updateFilemakerMailAccountStatusMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  updateFilemakerMailAccountStatus: updateFilemakerMailAccountStatusMock,
}));

import { patchHandler } from './handler';

describe('filemaker mail account status handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('decodes the route param and updates the mailbox status', async () => {
    updateFilemakerMailAccountStatusMock.mockResolvedValue({
      id: 'account 1',
      status: 'paused',
    });

    const response = await patchHandler(
      new NextRequest('http://localhost/api/filemaker/mail/accounts/account%201/status', {
        method: 'PATCH',
        body: JSON.stringify({ status: 'paused' }),
      }),
      { params: { accountId: 'account%201' } } as Parameters<typeof patchHandler>[1]
    );

    expect(updateFilemakerMailAccountStatusMock).toHaveBeenCalledWith('account 1', 'paused');
    await expect(response.json()).resolves.toEqual({
      account: expect.objectContaining({
        id: 'account 1',
        status: 'paused',
      }),
    });
  });
});
