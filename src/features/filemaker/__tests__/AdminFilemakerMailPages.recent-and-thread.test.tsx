import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  fetchMock,
  jsonResponse,
  routeParamsMock,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
  toastMock,
} from './AdminFilemakerMailPages.test-support';

setupAdminFilemakerMailPagesTest();

describe('AdminFilemakerMail pages recent and thread flows', () => {
  it('routes thread selection through the mail tree shell', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
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
              status: 'active',
              imapHost: 'imap.example.com',
              imapPort: 993,
              imapSecure: true,
              imapUser: 'support@example.com',
              imapPasswordSettingKey: 'imap-key',
              smtpHost: 'smtp.example.com',
              smtpPort: 465,
              smtpSecure: true,
              smtpUser: 'support@example.com',
              smtpPasswordSettingKey: 'smtp-key',
              fromName: 'Support',
              replyToEmail: null,
              folderAllowlist: ['INBOX'],
              initialSyncLookbackDays: 30,
              maxMessagesPerSync: 100,
              lastSyncedAt: null,
              lastSyncError: null,
              createdAt: '2026-03-28T10:00:00.000Z',
              updatedAt: '2026-03-28T10:00:00.000Z',
              provider: 'imap_smtp',
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
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        return jsonResponse({
          threads: [
            {
              id: 'thread-1',
              accountId: 'account-1',
              subject: 'Recent welcome',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
              snippet: 'Recent branch preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent welcome',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 3,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
            {
              id: 'thread-2',
              accountId: 'account-1',
              subject: 'Inbox digest',
              participantSummary: [{ address: 'news@example.com', name: 'News' }],
              snippet: 'Inbox branch preview',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Inbox digest',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 0,
              lastMessageAt: '2026-03-28T09:00:00.000Z',
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({
          threads: [
            {
              id: 'thread-1',
              accountId: 'account-1',
              subject: 'Welcome',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
              snippet: 'Tree preview snippet',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Welcome',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 3,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
            {
              id: 'thread-2',
              accountId: 'account-1',
              subject: 'Inbox digest',
              participantSummary: [{ address: 'news@example.com', name: 'News' }],
              snippet: 'Inbox branch preview',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Inbox digest',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 0,
              lastMessageAt: '2026-03-28T09:00:00.000Z',
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    expect(await screen.findByText('VIP • Recent branch preview')).toBeInTheDocument();
    const threadNodeButton = await screen.findByRole('button', { name: /Recent welcome/ });
    fireEvent.click(threadNodeButton);

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP'
    );
  });

  it('loads the account recent panel from route state', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'recent';
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
              status: 'active',
              imapHost: 'imap.example.com',
              imapPort: 993,
              imapSecure: true,
              imapUser: 'support@example.com',
              imapPasswordSettingKey: 'imap-key',
              smtpHost: 'smtp.example.com',
              smtpPort: 465,
              smtpSecure: true,
              smtpUser: 'support@example.com',
              smtpPasswordSettingKey: 'smtp-key',
              fromName: 'Support',
              replyToEmail: null,
              folderAllowlist: ['INBOX', 'VIP'],
              initialSyncLookbackDays: 30,
              maxMessagesPerSync: 100,
              lastSyncedAt: null,
              lastSyncError: null,
              createdAt: '2026-03-28T10:00:00.000Z',
              updatedAt: '2026-03-28T10:00:00.000Z',
              provider: 'imap_smtp',
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
      if (url.startsWith('/api/filemaker/mail/threads?accountId=account-1')) {
        const isWelcomeQuery = url.includes('query=welcome');
        return jsonResponse({
          threads: isWelcomeQuery
            ? [
                {
                  id: 'thread-1',
                  accountId: 'account-1',
                  subject: 'Recent welcome',
                  participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
                  snippet: 'Recent branch preview',
                  mailboxPath: 'VIP',
                  mailboxRole: 'custom',
                  normalizedSubject: 'Recent welcome',
                  relatedPersonIds: [],
                  relatedOrganizationIds: [],
                  messageCount: 3,
                  unreadCount: 1,
                  lastMessageAt: '2026-03-28T10:00:00.000Z',
                },
              ]
            : [
                {
                  id: 'thread-1',
                  accountId: 'account-1',
                  subject: 'Recent welcome',
                  participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
                  snippet: 'Recent branch preview',
                  mailboxPath: 'VIP',
                  mailboxRole: 'custom',
                  normalizedSubject: 'Recent welcome',
                  relatedPersonIds: [],
                  relatedOrganizationIds: [],
                  messageCount: 3,
                  unreadCount: 1,
                  lastMessageAt: '2026-03-28T10:00:00.000Z',
                },
                {
                  id: 'thread-2',
                  accountId: 'account-1',
                  subject: 'Inbox digest',
                  participantSummary: [{ address: 'team@example.com', name: 'Team' }],
                  snippet: 'Inbox branch preview',
                  mailboxPath: 'INBOX',
                  mailboxRole: 'inbox',
                  normalizedSubject: 'Inbox digest',
                  relatedPersonIds: [],
                  relatedOrganizationIds: [],
                  messageCount: 1,
                  unreadCount: 0,
                  lastMessageAt: '2026-03-28T09:00:00.000Z',
                },
              ],
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    expect(await screen.findByText('Support inbox / Recent')).toBeInTheDocument();
    expect(screen.getByText('VIP • Recent branch preview')).toBeInTheDocument();
    expect(screen.getByText('Account Recent')).toBeInTheDocument();
    expect(screen.getByText('Threads: 2')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'VIP' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: 'INBOX' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Sidebar recent unread only'));
    await waitFor(() => {
      expect(screen.getByText('Threads: 1')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=recent&recentUnread=1'
      );
    });

    fireEvent.change(screen.getByLabelText('Sidebar recent mailbox filter'), {
      target: { value: 'VIP' },
    });
    expect(within(screen.getByRole('list')).getByText('Recent welcome')).toBeInTheDocument();
    expect(screen.getByText('Mailbox: VIP')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=recent&recentMailbox=VIP&recentUnread=1'
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Recent welcome/ }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP&panel=recent&recentMailbox=VIP&recentUnread=1'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await waitFor(() => {
      expect(screen.getByText('Threads: 2')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });
    expect(screen.queryByText('Mailbox: VIP')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Sidebar recent search'), {
      target: { value: 'welcome' },
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Sidebar recent search')).toHaveValue('welcome');
      expect(screen.getByText('Threads: 1')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=recent&recentQuery=welcome'
      );
    });
    expect(screen.getByText('Search: welcome')).toBeInTheDocument();
    expect(screen.getByText('Recent: 1')).toBeInTheDocument();
    expect(screen.getByText('Recent Search: welcome')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Inbox digest/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Recent' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Recent' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?accountId=account-1&panel=recent'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear Filters' }));
    await waitFor(() => {
      expect(screen.getByText('Threads: 2')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.queryByText('Search: welcome')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Sidebar recent search')).toHaveValue('');
    });
  });

  it('loads accounts in compose, sends an email, and navigates to the thread', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
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
              threadCount: 0,
              unreadCount: 0,
              lastMessageAt: null,
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads?')) {
        return jsonResponse({ threads: [] });
      }
      if (url === '/api/filemaker/mail/send' && init?.method === 'POST') {
        return jsonResponse({ message: { threadId: 'thread-99' } }, 201);
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Follow-up' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Jane Doe <jane@example.com>, team@example.com'),
      {
        target: { value: 'Jane Doe <jane@example.com>, team@example.com' },
      }
    );
    fireEvent.change(screen.getByTestId('document-wysiwyg-editor'), {
      target: { value: '<p>Hello team</p>' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Send Email' })[0]!);

    await waitFor(() => {
      const sendCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/filemaker/mail/send' && init?.method === 'POST'
      );
      expect(sendCall).toBeDefined();
      const payload = JSON.parse(String(sendCall?.[1]?.body)) as {
        accountId: string;
        subject: string;
        to: Array<{ address: string; name: string | null }>;
        bodyHtml: string;
      };
      expect(payload.accountId).toBe('account-1');
      expect(payload.subject).toBe('Follow-up');
      expect(payload.to).toEqual([
        { address: 'jane@example.com', name: 'Jane Doe' },
        { address: 'team@example.com', name: null },
      ]);
      expect(payload.bodyHtml).toBe('<p>Hello team</p>');
    });

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/threads/thread-99?accountId=account-1&mailboxPath=INBOX'
    );
    expect(toastMock).toHaveBeenCalledWith('Email sent.', { variant: 'success' });
  });

  it('preserves recent-origin context in compose back and send routes', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
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
              id: 'thread-1',
              accountId: 'account-1',
              subject: 'Recent welcome',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
              snippet: 'Recent branch preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent welcome',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 3,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/send' && init?.method === 'POST') {
        return jsonResponse({ message: { threadId: 'thread-200' } }, 201);
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    fireEvent.click(screen.getByRole('button', { name: 'Back to Recent' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?accountId=account-1&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome'
    );

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Recent follow-up' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Jane Doe <jane@example.com>, team@example.com'),
      {
        target: { value: 'Jane Doe <jane@example.com>' },
      }
    );
    fireEvent.change(screen.getByTestId('document-wysiwyg-editor'), {
      target: { value: '<p>Reply from recent</p>' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Send Email' })[0]!);

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail/threads/thread-200?accountId=account-1&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome'
      );
    });
  });

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

  it('returns to the filtered recent panel from a recent-origin thread route', async () => {
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
          replyDraft: {
            accountId: 'account-1',
            to: [{ address: 'alice@example.com', name: 'Alice' }],
            subject: 'Re: Hello',
            bodyHtml: '<p><br/></p>',
            inReplyTo: 'provider-1',
          },
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Recent' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?accountId=account-1&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome'
    );
  });
});
