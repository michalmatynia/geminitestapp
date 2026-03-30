import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  requireFilemakerMailAdminSessionMock,
  sendFilemakerMailMessageMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  sendFilemakerMailMessageMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-mail-service', () => ({
  sendFilemakerMailMessage: sendFilemakerMailMessageMock,
}));

import { POST_handler } from './handler';

describe('filemaker mail send handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('parses compose input and returns the sent message payload', async () => {
    sendFilemakerMailMessageMock.mockResolvedValue({
      message: {
        id: 'message-1',
        threadId: 'thread-1',
      },
      outboxEntry: {
        id: 'outbox-1',
        status: 'sent',
      },
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/filemaker/mail/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          accountId: 'account-1',
          to: [{ address: 'jane@example.com', name: 'Jane' }],
          cc: [],
          bcc: [],
          subject: 'Hello',
          bodyHtml: '<p>Hello</p>',
        }),
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(sendFilemakerMailMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'account-1',
        subject: 'Hello',
        to: [{ address: 'jane@example.com', name: 'Jane' }],
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      message: {
        id: 'message-1',
        threadId: 'thread-1',
      },
      outboxEntry: {
        id: 'outbox-1',
        status: 'sent',
      },
    });
  });
});
