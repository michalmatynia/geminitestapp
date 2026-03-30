import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notFoundError } from '@/shared/errors/app-error';

const {
  requireFilemakerMailAdminSessionMock,
  buildFilemakerMailForwardDraftMock,
  getFilemakerMailThreadDetailMock,
  buildFilemakerMailReplyDraftMock,
  markFilemakerMailThreadReadMock,
  deleteFilemakerMailThreadMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  buildFilemakerMailForwardDraftMock: vi.fn(),
  getFilemakerMailThreadDetailMock: vi.fn(),
  buildFilemakerMailReplyDraftMock: vi.fn(),
  markFilemakerMailThreadReadMock: vi.fn(),
  deleteFilemakerMailThreadMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-mail-service', () => ({
  buildFilemakerMailForwardDraft: buildFilemakerMailForwardDraftMock,
  getFilemakerMailThreadDetail: getFilemakerMailThreadDetailMock,
  buildFilemakerMailReplyDraft: buildFilemakerMailReplyDraftMock,
  markFilemakerMailThreadRead: markFilemakerMailThreadReadMock,
  deleteFilemakerMailThread: deleteFilemakerMailThreadMock,
}));

import { DELETE_handler, GET_handler, PATCH_handler } from './handler';

describe('filemaker mail thread detail handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('returns the thread detail and reply draft', async () => {
    const detail = {
      thread: { id: 'thread 1', subject: 'Hello' },
      messages: [],
    };
    getFilemakerMailThreadDetailMock.mockResolvedValue(detail);
    buildFilemakerMailReplyDraftMock.mockResolvedValue({
      accountId: 'account-1',
      to: [],
      subject: 'Re: Hello',
      bodyHtml: '<p><br/></p>',
      inReplyTo: null,
    });
    buildFilemakerMailForwardDraftMock.mockResolvedValue({
      accountId: 'account-1',
      to: [],
      cc: [],
      bcc: [],
      subject: 'Fwd: Hello',
      bodyHtml: '<p>Forwarded</p>',
      inReplyTo: null,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/filemaker/mail/threads/thread%201'),
      { params: { threadId: 'thread%201' } } as Parameters<typeof GET_handler>[1]
    );

    expect(getFilemakerMailThreadDetailMock).toHaveBeenCalledWith('thread 1');
    expect(buildFilemakerMailForwardDraftMock).toHaveBeenCalledWith(detail);
    expect(buildFilemakerMailReplyDraftMock).toHaveBeenCalledWith(detail);
    await expect(response.json()).resolves.toEqual({
      detail,
      forwardDraft: {
        accountId: 'account-1',
        to: [],
        cc: [],
        bcc: [],
        subject: 'Fwd: Hello',
        bodyHtml: '<p>Forwarded</p>',
        inReplyTo: null,
      },
      replyDraft: {
        accountId: 'account-1',
        to: [],
        subject: 'Re: Hello',
        bodyHtml: '<p><br/></p>',
        inReplyTo: null,
      },
    });
  });

  it('throws not found when the thread does not exist', async () => {
    getFilemakerMailThreadDetailMock.mockResolvedValue(null);

    await expect(
      GET_handler(new NextRequest('http://localhost/api/filemaker/mail/threads/missing'), {
        params: { threadId: 'missing' },
      } as Parameters<typeof GET_handler>[1])
    ).rejects.toMatchObject(notFoundError('Filemaker mail thread was not found.'));
  });

  it('marks a thread read via patch', async () => {
    markFilemakerMailThreadReadMock.mockResolvedValue({
      id: 'thread 1',
      unreadCount: 0,
    });

    const response = await PATCH_handler(
      new NextRequest('http://localhost/api/filemaker/mail/threads/thread%201', {
        method: 'PATCH',
        body: JSON.stringify({ read: true }),
      }),
      { params: { threadId: 'thread%201' } } as Parameters<typeof PATCH_handler>[1]
    );

    expect(markFilemakerMailThreadReadMock).toHaveBeenCalledWith('thread 1', true);
    await expect(response.json()).resolves.toEqual({
      thread: {
        id: 'thread 1',
        unreadCount: 0,
      },
    });
  });

  it('deletes a thread via delete', async () => {
    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/filemaker/mail/threads/thread%201', {
        method: 'DELETE',
      }),
      { params: { threadId: 'thread%201' } } as Parameters<typeof DELETE_handler>[1]
    );

    expect(deleteFilemakerMailThreadMock).toHaveBeenCalledWith('thread 1');
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
