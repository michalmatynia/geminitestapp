import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notFoundError } from '@/shared/errors/app-error';

const {
  requireFilemakerMailAdminSessionMock,
  getFilemakerMailThreadDetailMock,
  buildFilemakerMailReplyDraftMock,
} = vi.hoisted(() => ({
  requireFilemakerMailAdminSessionMock: vi.fn(),
  getFilemakerMailThreadDetailMock: vi.fn(),
  buildFilemakerMailReplyDraftMock: vi.fn(),
}));

vi.mock('@/features/filemaker/server/filemaker-mail-access', () => ({
  requireFilemakerMailAdminSession: requireFilemakerMailAdminSessionMock,
}));

vi.mock('@/features/filemaker/server/filemaker-mail-service', () => ({
  getFilemakerMailThreadDetail: getFilemakerMailThreadDetailMock,
  buildFilemakerMailReplyDraft: buildFilemakerMailReplyDraftMock,
}));

import { GET_handler } from './handler';

describe('filemaker mail thread detail handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireFilemakerMailAdminSessionMock.mockResolvedValue(undefined);
  });

  it('returns the thread detail and reply draft', async () => {
    getFilemakerMailThreadDetailMock.mockResolvedValue({
      thread: { id: 'thread 1', subject: 'Hello' },
      messages: [],
    });
    buildFilemakerMailReplyDraftMock.mockResolvedValue({
      accountId: 'account-1',
      to: [],
      subject: 'Re: Hello',
      bodyHtml: '<p><br/></p>',
      inReplyTo: null,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/filemaker/mail/threads/thread%201'),
      { params: { threadId: 'thread%201' } } as Parameters<typeof GET_handler>[1]
    );

    expect(getFilemakerMailThreadDetailMock).toHaveBeenCalledWith('thread 1');
    expect(buildFilemakerMailReplyDraftMock).toHaveBeenCalledWith('thread 1');
    await expect(response.json()).resolves.toEqual({
      detail: { thread: { id: 'thread 1', subject: 'Hello' }, messages: [] },
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
});
