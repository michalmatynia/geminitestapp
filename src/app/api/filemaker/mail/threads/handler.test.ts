import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  listFilemakerMailThreadsMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  listFilemakerMailThreadsMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
  listFilemakerMailThreads: listFilemakerMailThreadsMock,
}));

import { GET_handler } from './handler';

describe('filemaker mail threads handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('forwards query and account filters to the thread listing service', async () => {
    listFilemakerMailThreadsMock.mockResolvedValue([
      {
        id: 'thread-1',
        subject: 'Hello',
      },
    ]);

    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/filemaker/mail/threads?query=hello&accountId=account-1'
      ),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(listFilemakerMailThreadsMock).toHaveBeenCalledWith({
      query: 'hello',
      accountId: 'account-1',
    });
    await expect(response.json()).resolves.toEqual({
      threads: [{ id: 'thread-1', subject: 'Hello' }],
    });
  });
});
