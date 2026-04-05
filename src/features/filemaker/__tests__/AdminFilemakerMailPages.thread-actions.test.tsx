import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  fetchMock,
  jsonResponse,
  routeParamsMock,
  routerPushMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
  toastMock,
} from './AdminFilemakerMailPages.test-support';

setupAdminFilemakerMailPagesTest();

describe('AdminFilemakerMail pages thread actions flows', () => {
  it('loads a thread, sends a reply, and refreshes the thread detail', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) =>
      key === 'accountId' ? 'account-1' : key === 'mailboxPath' ? 'INBOX' : null
    );

    let threadLoads = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return jsonResponse({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              fromName: 'Support',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({
          folders: [
            {
              id: 'account-1::INBOX',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              threadCount: 1,
              unreadCount: 0,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads?')) {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Hi there',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 0,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads/thread%201' && !init?.method) {
        threadLoads += 1;
        return jsonResponse({
          detail: {
            thread: {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              mailboxPath: 'INBOX',
              unreadCount: 0,
              messageCount: 1,
            },
            messages: [
              {
                id: 'message-1',
                from: { address: 'alice@example.com', name: 'Alice' },
                to: [{ address: 'support@example.com', name: 'Support' }],
                htmlBody: '<p>Hi there</p>',
                textBody: 'Hi there',
                sentAt: '2026-03-28T10:00:00.000Z',
                receivedAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          },
          replyDraft: {
            accountId: 'account-1',
            to: [{ address: 'alice@example.com', name: 'Alice' }],
            subject: 'Re: Hello',
            bodyHtml: '<p><br/></p>',
            inReplyTo: 'provider-1',
          },
        });
      }
      if (url === '/api/filemaker/mail/send' && init?.method === 'POST') {
        return jsonResponse({ ok: true }, 201);
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    expect(
      screen.getByRole('link', {
        name: 'Open Filemaker Email text editor settings',
      })
    ).toHaveAttribute(
      'href',
      '/admin/settings/text-editors#text-editor-instance-filemaker_email'
    );
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Re: Hello again' },
    });
    fireEvent.change(screen.getByTestId('document-wysiwyg-editor'), {
      target: { value: '<p>Reply body</p>' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reply' }));

    await waitFor(() => {
      const sendCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/filemaker/mail/send' && init?.method === 'POST'
      );
      expect(sendCall).toBeDefined();
      const payload = JSON.parse(String(sendCall?.[1]?.body)) as {
        accountId: string;
        threadId: string;
        inReplyTo: string | null;
        subject: string;
        to: Array<{ address: string; name: string | null }>;
        bodyHtml: string;
      };
      expect(payload.accountId).toBe('account-1');
      expect(payload.threadId).toBe('thread 1');
      expect(payload.inReplyTo).toBe('provider-1');
      expect(payload.subject).toBe('Re: Hello again');
      expect(payload.to).toEqual([{ address: 'alice@example.com', name: 'Alice' }]);
      expect(payload.bodyHtml).toBe('<p>Reply body</p>');
    });

    await waitFor(() => {
      expect(threadLoads).toBe(2);
    });
    expect(toastMock).toHaveBeenCalledWith('Reply sent.', { variant: 'success' });

    fireEvent.click(screen.getByRole('button', { name: 'Back to Mail' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?accountId=account-1&mailboxPath=INBOX'
    );
  });

  it('reloads the mounted thread route and clears reply-only recipients when the thread changes', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) =>
      key === 'accountId' ? 'account-1' : key === 'mailboxPath' ? 'INBOX' : null
    );

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return jsonResponse({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              fromName: 'Support',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({
          folders: [
            {
              id: 'account-1::INBOX',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              threadCount: 2,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads?')) {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'First thread',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 0,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
            {
              id: 'thread 2',
              accountId: 'account-1',
              subject: 'Update',
              participantSummary: [{ address: 'bob@example.com', name: 'Bob' }],
              snippet: 'Second thread',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Update',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T11:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads/thread%201' && !init?.method) {
        return jsonResponse({
          detail: {
            thread: {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              mailboxPath: 'INBOX',
              unreadCount: 0,
              messageCount: 1,
            },
            messages: [
              {
                id: 'message-1',
                from: { address: 'alice@example.com', name: 'Alice' },
                to: [{ address: 'support@example.com', name: 'Support' }],
                htmlBody: '<p>Hi there</p>',
                textBody: 'Hi there',
                sentAt: '2026-03-28T10:00:00.000Z',
                receivedAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          },
          forwardDraft: null,
          replyDraft: {
            accountId: 'account-1',
            to: [{ address: 'alice@example.com', name: 'Alice' }],
            subject: 'Re: Hello',
            bodyHtml: '<p><br/></p>',
            inReplyTo: 'provider-1',
          },
        });
      }
      if (url === '/api/filemaker/mail/threads/thread%202' && !init?.method) {
        return jsonResponse({
          detail: {
            thread: {
              id: 'thread 2',
              accountId: 'account-1',
              subject: 'Update',
              mailboxPath: 'INBOX',
              unreadCount: 1,
              messageCount: 1,
            },
            messages: [
              {
                id: 'message-2',
                from: { address: 'bob@example.com', name: 'Bob' },
                to: [{ address: 'support@example.com', name: 'Support' }],
                htmlBody: '<p>Quick update</p>',
                textBody: 'Quick update',
                sentAt: '2026-03-28T11:00:00.000Z',
                receivedAt: '2026-03-28T11:00:00.000Z',
              },
            ],
          },
          forwardDraft: null,
          replyDraft: {
            accountId: 'account-1',
            to: [{ address: 'bob@example.com', name: 'Bob' }],
            subject: 'Re: Update',
            bodyHtml: '<p><br/></p>',
            inReplyTo: 'provider-2',
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    const { rerender } = render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    fireEvent.change(screen.getByLabelText('Cc'), {
      target: { value: 'cc@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Bcc'), {
      target: { value: 'bcc@example.com' },
    });

    routeParamsMock.threadId = 'thread%202';
    rerender(<AdminFilemakerMailThreadPage />);

    expect(await screen.findByText('Bob')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toHaveValue('Bob <bob@example.com>');
    expect(screen.getByLabelText('Cc')).toHaveValue('');
    expect(screen.getByLabelText('Bcc')).toHaveValue('');
    expect(screen.getByLabelText('Subject')).toHaveValue('Re: Update');
  });

  it('marks a thread read and unread from the thread page', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) =>
      key === 'accountId' ? 'account-1' : key === 'mailboxPath' ? 'INBOX' : null
    );

    let unreadCount = 1;
    let recentLoads = 0;
    let folderLoads = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return jsonResponse({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              fromName: 'Support',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({
          folders: [
            {
              id: 'account-1::INBOX',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              threadCount: 1,
              unreadCount,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        recentLoads += 1;
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Hi there',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=INBOX') {
        folderLoads += 1;
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Hi there',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads/thread%201' && !init?.method) {
        return jsonResponse({
          detail: {
            thread: {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              mailboxPath: 'INBOX',
              unreadCount,
              messageCount: 1,
            },
            messages: [
              {
                id: 'message-1',
                from: { address: 'alice@example.com', name: 'Alice' },
                to: [{ address: 'support@example.com', name: 'Support' }],
                htmlBody: '<p>Hi there</p>',
                textBody: 'Hi there',
                sentAt: '2026-03-28T10:00:00.000Z',
                receivedAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          },
          forwardDraft: null,
          replyDraft: {
            accountId: 'account-1',
            to: [{ address: 'alice@example.com', name: 'Alice' }],
            subject: 'Re: Hello',
            bodyHtml: '<p><br/></p>',
            inReplyTo: 'provider-1',
          },
        });
      }
      if (url === '/api/filemaker/mail/threads/thread%201' && init?.method === 'PATCH') {
        const payload = JSON.parse(String(init.body)) as { read: boolean };
        unreadCount = payload.read ? 0 : 1;
        return jsonResponse({
          thread: {
            id: 'thread 1',
            unreadCount,
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: 'Updated <updated@example.com>' },
    });
    fireEvent.change(screen.getByLabelText('Cc'), {
      target: { value: 'cc@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Bcc'), {
      target: { value: 'bcc@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Re: Draft in progress' },
    });
    fireEvent.change(screen.getByTestId('document-wysiwyg-editor'), {
      target: { value: '<p>Unsaved reply</p>' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Mark Read' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/mail/threads/thread%201',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ read: true }),
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark Unread' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('To')).toHaveValue('Updated <updated@example.com>');
    expect(screen.getByLabelText('Cc')).toHaveValue('cc@example.com');
    expect(screen.getByLabelText('Bcc')).toHaveValue('bcc@example.com');
    expect(screen.getByLabelText('Subject')).toHaveValue('Re: Draft in progress');
    expect(screen.getByTestId('document-wysiwyg-editor')).toHaveValue('<p>Unsaved reply</p>');
    await waitFor(() => {
      expect(recentLoads).toBeGreaterThanOrEqual(2);
      expect(folderLoads).toBeGreaterThanOrEqual(2);
    });
    expect(toastMock).toHaveBeenCalledWith('Marked as read.', { variant: 'success' });

    fireEvent.click(screen.getByRole('button', { name: 'Mark Unread' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/mail/threads/thread%201',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ read: false }),
        })
      );
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Mark Read' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('To')).toHaveValue('Updated <updated@example.com>');
    expect(screen.getByLabelText('Cc')).toHaveValue('cc@example.com');
    expect(screen.getByLabelText('Bcc')).toHaveValue('bcc@example.com');
    expect(screen.getByLabelText('Subject')).toHaveValue('Re: Draft in progress');
    expect(screen.getByTestId('document-wysiwyg-editor')).toHaveValue('<p>Unsaved reply</p>');
    await waitFor(() => {
      expect(recentLoads).toBeGreaterThanOrEqual(3);
      expect(folderLoads).toBeGreaterThanOrEqual(3);
    });
    expect(toastMock).toHaveBeenCalledWith('Marked as unread.', { variant: 'success' });
  });

  it('deletes a recent-origin thread and returns to the filtered recent panel', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'recent';
      if (key === 'recentMailbox') return 'VIP';
      if (key === 'recentUnread') return '1';
      if (key === 'recentQuery') return 'welcome';
      return null;
    });

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return jsonResponse({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              fromName: 'Support',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({
          folders: [
            {
              id: 'account-1::VIP',
              accountId: 'account-1',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              threadCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads?')) {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Hi there',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads/thread%201' && !init?.method) {
        return jsonResponse({
          detail: {
            thread: {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Hello',
              mailboxPath: 'VIP',
              unreadCount: 1,
              messageCount: 1,
            },
            messages: [
              {
                id: 'message-1',
                from: { address: 'alice@example.com', name: 'Alice' },
                to: [{ address: 'support@example.com', name: 'Support' }],
                htmlBody: '<p>Hi there</p>',
                textBody: 'Hi there',
                sentAt: '2026-03-28T10:00:00.000Z',
                receivedAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          },
          forwardDraft: null,
          replyDraft: {
            accountId: 'account-1',
            to: [{ address: 'alice@example.com', name: 'Alice' }],
            subject: 'Re: Hello',
            bodyHtml: '<p><br/></p>',
            inReplyTo: 'provider-1',
          },
        });
      }
      if (url === '/api/filemaker/mail/threads/thread%201' && init?.method === 'DELETE') {
        return jsonResponse({ ok: true });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/mail/threads/thread%201',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
    expect(toastMock).toHaveBeenCalledWith('Thread deleted.', { variant: 'success' });
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?accountId=account-1&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome'
    );
  });
});
