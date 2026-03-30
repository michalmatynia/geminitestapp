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

  it('loads a forward draft in compose and keeps recent context on send', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'recent';
      if (key === 'recentMailbox') return 'VIP';
      if (key === 'recentUnread') return '1';
      if (key === 'recentQuery') return 'welcome';
      if (key === 'forwardThreadId') return 'thread 1';
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
            messages: [],
          },
          forwardDraft: {
            accountId: 'account-1',
            to: [],
            cc: [],
            bcc: [],
            subject: 'Fwd: Hello',
            bodyHtml: '<p>Forwarded body</p>',
            inReplyTo: null,
          },
          replyDraft: null,
        });
      }
      if (url === '/api/filemaker/mail/send' && init?.method === 'POST') {
        return jsonResponse({ message: { threadId: 'thread-300' } }, 201);
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Subject')).toHaveValue('Fwd: Hello');
      expect(screen.getByTestId('document-wysiwyg-editor')).toHaveValue('<p>Forwarded body</p>');
    });

    fireEvent.change(
      screen.getByPlaceholderText('Jane Doe <jane@example.com>, team@example.com'),
      {
        target: { value: 'Bob <bob@example.com>' },
      }
    );
    fireEvent.click(screen.getAllByRole('button', { name: 'Send Email' })[0]!);

    await waitFor(() => {
      const sendCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/filemaker/mail/send' && init?.method === 'POST'
      );
      expect(sendCall).toBeDefined();
      const payload = JSON.parse(String(sendCall?.[1]?.body)) as {
        accountId: string;
        subject: string;
        bodyHtml: string;
      };
      expect(payload.accountId).toBe('account-1');
      expect(payload.subject).toBe('Fwd: Hello');
      expect(payload.bodyHtml).toBe('<p>Forwarded body</p>');
    });

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/threads/thread-300?accountId=account-1&mailboxPath=VIP&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome'
    );
  });

  it('clears a mounted forward draft when the compose route switches back to a fresh draft', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );

    let currentRoute = {
      accountId: 'account-1',
      mailboxPath: 'VIP',
      panel: 'recent',
      recentMailbox: 'VIP',
      recentUnread: '1',
      recentQuery: 'welcome',
      forwardThreadId: 'thread 1',
    } as Record<string, string | null>;

    searchParamsGetMock.mockImplementation((key: string) => currentRoute[key] ?? null);

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
            {
              id: 'account-2',
              name: 'Sales inbox',
              emailAddress: 'sales@example.com',
              fromName: 'Sales',
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
            {
              id: 'account-2::INBOX',
              accountId: 'account-2',
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
            messages: [],
          },
          forwardDraft: {
            accountId: 'account-1',
            to: [{ address: 'alice@example.com', name: 'Alice' }],
            cc: [{ address: 'cc@example.com', name: null }],
            bcc: [{ address: 'bcc@example.com', name: null }],
            subject: 'Fwd: Hello',
            bodyHtml: '<p>Forwarded body</p>',
            inReplyTo: null,
          },
          replyDraft: null,
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    const { rerender } = render(<AdminFilemakerMailComposePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Subject')).toHaveValue('Fwd: Hello');
      expect(screen.getByLabelText('To')).toHaveValue('Alice <alice@example.com>');
      expect(screen.getByLabelText('Cc')).toHaveValue('cc@example.com');
      expect(screen.getByLabelText('Bcc')).toHaveValue('bcc@example.com');
      expect(screen.getByTestId('document-wysiwyg-editor')).toHaveValue('<p>Forwarded body</p>');
    });

    currentRoute = {
      accountId: 'account-2',
      mailboxPath: 'INBOX',
      panel: null,
      recentMailbox: null,
      recentUnread: null,
      recentQuery: null,
      forwardThreadId: null,
    };
    rerender(<AdminFilemakerMailComposePage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mailbox account')).toHaveValue('account-2');
      expect(screen.getByLabelText('To')).toHaveValue('');
      expect(screen.getByLabelText('Cc')).toHaveValue('');
      expect(screen.getByLabelText('Bcc')).toHaveValue('');
      expect(screen.getByLabelText('Subject')).toHaveValue('');
      expect(screen.getByTestId('document-wysiwyg-editor')).toHaveValue('<p><br/></p>');
    });
  });

  it('drops stale route context when sending from a different mailbox account', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
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
            {
              id: 'account-2',
              name: 'Sales inbox',
              emailAddress: 'sales@example.com',
              fromName: 'Sales',
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
            {
              id: 'account-2::INBOX',
              accountId: 'account-2',
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
        return jsonResponse({ message: { threadId: 'thread-250' } }, 201);
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    fireEvent.change(screen.getByLabelText('Mailbox account'), {
      target: { value: 'account-2' },
    });
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Cross-account follow-up' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Jane Doe <jane@example.com>, team@example.com'),
      {
        target: { value: 'Client <client@example.com>' },
      }
    );
    fireEvent.change(screen.getByTestId('document-wysiwyg-editor'), {
      target: { value: '<p>New account draft</p>' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Send Email' })[0]!);

    await waitFor(() => {
      const sendCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/filemaker/mail/send' && init?.method === 'POST'
      );
      expect(sendCall).toBeDefined();
      const payload = JSON.parse(String(sendCall?.[1]?.body)) as {
        accountId: string;
      };
      expect(payload.accountId).toBe('account-2');
    });

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail/threads/thread-250?accountId=account-2'
      );
    });
  });

  it('clears a mounted fresh compose draft when the origin route changes for the same account', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );

    let currentRoute = {
      accountId: 'account-1',
      mailboxPath: 'VIP',
      panel: 'recent',
      recentMailbox: 'VIP',
      recentUnread: '1',
      recentQuery: 'welcome',
      searchQuery: null,
      searchAccountId: null,
      forwardThreadId: null,
    } as Record<string, string | null>;

    searchParamsGetMock.mockImplementation((key: string) => currentRoute[key] ?? null);

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
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    const { rerender } = render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: 'Client <client@example.com>' },
    });
    fireEvent.change(screen.getByLabelText('Cc'), {
      target: { value: 'cc@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Bcc'), {
      target: { value: 'bcc@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Recent draft' },
    });
    fireEvent.change(screen.getByTestId('document-wysiwyg-editor'), {
      target: { value: '<p>Keep me out of the next route</p>' },
    });

    currentRoute = {
      accountId: 'account-1',
      mailboxPath: null,
      panel: 'search',
      recentMailbox: null,
      recentUnread: null,
      recentQuery: null,
      searchQuery: 'invoice',
      searchAccountId: null,
      forwardThreadId: null,
    };
    rerender(<AdminFilemakerMailComposePage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Back to Search' })).toBeInTheDocument();
      expect(screen.getByLabelText('Mailbox account')).toHaveValue('account-1');
      expect(screen.getByLabelText('To')).toHaveValue('');
      expect(screen.getByLabelText('Cc')).toHaveValue('');
      expect(screen.getByLabelText('Bcc')).toHaveValue('');
      expect(screen.getByLabelText('Subject')).toHaveValue('');
      expect(screen.getByTestId('document-wysiwyg-editor')).toHaveValue('<p><br/></p>');
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

  it('forwards a recent-origin thread into compose while preserving recent filters', async () => {
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
          forwardDraft: {
            accountId: 'account-1',
            to: [],
            cc: [],
            bcc: [],
            subject: 'Fwd: Hello',
            bodyHtml: '<p>Forwarded body</p>',
            inReplyTo: null,
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
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/compose?accountId=account-1&forwardThreadId=thread+1&mailboxPath=VIP&panel=recent&recentMailbox=VIP&recentUnread=1&recentQuery=welcome'
    );
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

  it('preserves search-origin context in compose back and send routes', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
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
        return jsonResponse({ threads: [] });
      }
      if (url === '/api/filemaker/mail/send' && init?.method === 'POST') {
        return jsonResponse({ message: { threadId: 'thread-400' } }, 201);
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    fireEvent.click(screen.getByRole('button', { name: 'Back to Search' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?panel=search&accountId=account-1&searchQuery=invoice'
    );

    fireEvent.change(screen.getByLabelText('Subject'), {
      target: { value: 'Search follow-up' },
    });
    fireEvent.change(
      screen.getByPlaceholderText('Jane Doe <jane@example.com>, team@example.com'),
      {
        target: { value: 'Jane Doe <jane@example.com>' },
      }
    );
    fireEvent.change(screen.getByTestId('document-wysiwyg-editor'), {
      target: { value: '<p>Reply from search</p>' },
    });
    fireEvent.click(screen.getAllByRole('button', { name: 'Send Email' })[0]!);

    await waitFor(() => {
      expect(routerPushMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail/threads/thread-400?accountId=account-1&panel=search&searchQuery=invoice'
      );
    });
  });

  it('returns to search from a search-origin thread route', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
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
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Search' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?panel=search&accountId=account-1&searchQuery=invoice'
    );
  });

  it('returns to global search from a global-search thread route', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
      if (key === 'searchAccountId') return 'all';
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
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    fireEvent.click(screen.getByRole('button', { name: 'Back to Search' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?panel=search&searchQuery=invoice'
    );
  });

  it('forwards a search-origin thread into compose while preserving the search query', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
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
          forwardDraft: {
            accountId: 'account-1',
            to: [],
            cc: [],
            bcc: [],
            subject: 'Fwd: Hello',
            bodyHtml: '<p>Forwarded body</p>',
            inReplyTo: null,
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
    fireEvent.click(screen.getByRole('button', { name: 'Forward' }));

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/compose?accountId=account-1&forwardThreadId=thread+1&mailboxPath=VIP&panel=search&searchQuery=invoice'
    );
  });

  it('deletes a search-origin thread and returns to the search panel', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
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
      '/admin/filemaker/mail?panel=search&accountId=account-1&searchQuery=invoice'
    );
  });

  it('opens account-scoped search from a recent-origin thread via the sidebar', async () => {
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
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    fireEvent.click(screen.getByRole('button', { name: /Search Messages/ }));

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?panel=search&accountId=account-1'
    );
  });

  it('shows clear search in search-origin compose and keeps account scope', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
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
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    expect(screen.getByText('Search Query: invoice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?panel=search&accountId=account-1'
    );
  });

  it('shows clear search in global search-origin compose and keeps global scope', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
      if (key === 'searchAccountId') return 'all';
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
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    expect(screen.getByText('Search Query: invoice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));

    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail?panel=search');
  });

  it('highlights the folder thread instead of the recent thread on a folder-origin thread route', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
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
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Recent Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Recent preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Folder Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Folder preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Folder Hello',
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
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    const sidebar = screen.getByText('Mail Navigation').closest('section');
    expect(sidebar).not.toBeNull();
    const scoped = within(sidebar!);

    expect(scoped.getByRole('button', { name: /Folder Hello/ })).toHaveClass('bg-sky-500/15');
    expect(scoped.getByRole('button', { name: /Recent Hello/ })).not.toHaveClass('bg-sky-500/15');
  });

  it('ignores stale recent filters on a folder-origin thread route', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'recentMailbox') return 'INBOX';
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
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Recent Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Recent preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Folder Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Folder preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Folder Hello',
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
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    const sidebar = screen.getByText('Mail Navigation').closest('section');
    expect(sidebar).not.toBeNull();
    const scoped = within(sidebar!);

    expect(scoped.getByRole('button', { name: /Recent Hello/ })).toBeInTheDocument();
    expect(scoped.getByText('Recent: 1')).toBeInTheDocument();
    expect(scoped.queryByText('Recent Mailbox: INBOX')).not.toBeInTheDocument();
    expect(scoped.queryByText('Recent Unread')).not.toBeInTheDocument();
    expect(scoped.queryByText('Recent Search: welcome')).not.toBeInTheDocument();
  });

  it('highlights search instead of recent or folder threads on a search-origin thread route', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
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
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Recent Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Recent preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Folder Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Folder preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Folder Hello',
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
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    const sidebar = screen.getByText('Mail Navigation').closest('section');
    expect(sidebar).not.toBeNull();
    const scoped = within(sidebar!);

    expect(scoped.getByRole('button', { name: /Search Messages/ })).toHaveClass('bg-sky-500/15');
    expect(scoped.getByRole('button', { name: /Recent Hello/ })).not.toHaveClass('bg-sky-500/15');
    expect(scoped.getByRole('button', { name: /Folder Hello/ })).not.toHaveClass('bg-sky-500/15');
  });

  it('normalizes a fresh compose route by removing stale recent and search params', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );

    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'recentMailbox') return 'INBOX';
      if (key === 'recentUnread') return '1';
      if (key === 'recentQuery') return 'welcome';
      if (key === 'searchQuery') return 'invoice';
      if (key === 'searchAccountId') return 'all';
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
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByLabelText('Mailbox account');
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail/compose?accountId=account-1&mailboxPath=VIP'
      );
    });
  });

  it('normalizes a search-origin thread route while preserving the global search context marker', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
      if (key === 'searchAccountId') return 'all';
      if (key === 'recentMailbox') return 'INBOX';
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
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailThreadPage />);

    await screen.findByText('Alice');
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail/threads/thread%201?accountId=account-1&mailboxPath=VIP&panel=search&searchQuery=invoice&searchAccountId=all'
      );
    });
  });

  it('highlights compose instead of the folder node on a folder-origin compose route', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
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
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Recent Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Recent preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 2',
              accountId: 'account-1',
              subject: 'Folder Hello',
              participantSummary: [{ address: 'bob@example.com', name: 'Bob' }],
              snippet: 'Folder preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Folder Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    const sidebar = screen.getByText('Mail Navigation').closest('section');
    expect(sidebar).not.toBeNull();
    const scoped = within(sidebar!);
    const composeTreeButton = scoped
      .getAllByRole('button', { name: /Compose/ })
      .find((button) => button.className.includes('transition'));
    const folderTreeButton = scoped
      .getAllByRole('button')
      .find(
        (button) =>
          button.className.includes('transition') &&
          button.textContent?.includes('VIP') &&
          !button.textContent?.includes('Recent Hello') &&
          !button.textContent?.includes('Compose')
      );

    expect(composeTreeButton).toBeDefined();
    expect(composeTreeButton).toHaveClass('bg-sky-500/15');
    expect(folderTreeButton).toBeDefined();
    expect(folderTreeButton).not.toHaveClass('bg-sky-500/15');
  });

  it('highlights compose instead of search on a search-origin compose route with mailboxPath', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
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
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 1',
              accountId: 'account-1',
              subject: 'Recent Hello',
              participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
              snippet: 'Recent preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP') {
        return jsonResponse({
          threads: [
            {
              id: 'thread 2',
              accountId: 'account-1',
              subject: 'Folder Hello',
              participantSummary: [{ address: 'bob@example.com', name: 'Bob' }],
              snippet: 'Folder preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Folder Hello',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    const sidebar = screen.getByText('Mail Navigation').closest('section');
    expect(sidebar).not.toBeNull();
    const scoped = within(sidebar!);
    const composeTreeButton = scoped
      .getAllByRole('button', { name: /Compose/ })
      .find((button) => button.className.includes('transition'));

    expect(composeTreeButton).toBeDefined();
    expect(composeTreeButton).toHaveClass('bg-sky-500/15');
    expect(scoped.getByRole('button', { name: /Search Messages/ })).not.toHaveClass('bg-sky-500/15');
  });
});
