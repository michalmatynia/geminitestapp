import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  enqueueFilemakerMailSyncJobMock,
  startFilemakerMailSyncQueueMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  enqueueFilemakerMailSyncJobMock: vi.fn(),
  startFilemakerMailSyncQueueMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/server/queues/filemaker', () => ({
  enqueueFilemakerMailSyncJob: enqueueFilemakerMailSyncJobMock,
  startFilemakerMailSyncQueue: startFilemakerMailSyncQueueMock,
}));

import { postHandler } from './handler';

describe('filemaker mail account sync handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('decodes the route param and returns the queued sync dispatch', async () => {
    enqueueFilemakerMailSyncJobMock.mockResolvedValue({
      accountId: 'account 1',
      dispatchMode: 'queued',
      jobId: 'job-1',
      reason: 'manual',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });

    const response = await postHandler(
      new NextRequest('http://localhost/api/filemaker/mail/accounts/account%201/sync', {
        method: 'POST',
      }),
      { params: { accountId: 'account%201' } } as Parameters<typeof postHandler>[1]
    );

    expect(startFilemakerMailSyncQueueMock).toHaveBeenCalledTimes(1);
    expect(enqueueFilemakerMailSyncJobMock).toHaveBeenCalledWith({
      accountId: 'account 1',
      reason: 'manual',
    });
    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({
      accountId: 'account 1',
      dispatchMode: 'queued',
      jobId: 'job-1',
      reason: 'manual',
      requestedAt: '2026-04-24T10:00:00.000Z',
    });
  });
});
