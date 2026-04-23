import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  fetchMock,
  jsonResponse,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
} from './AdminFilemakerMailPages.test-support';

setupAdminFilemakerMailPagesTest();

describe('AdminFilemakerMail pages recent flows', () => {
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
      if (
        url === '/api/filemaker/mail/threads?accountId=account-1' ||
        url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      ) {
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
    expect(await screen.findByText('VIP • Recent branch preview')).toBeInTheDocument();
    expect(screen.getByText('Account Recent')).toBeInTheDocument();
    expect(screen.getByText('Threads: 2')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getAllByRole('option', { name: 'VIP' }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('option', { name: 'INBOX' }).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByLabelText('Unread only'));
    await waitFor(() => {
      expect(screen.getByText('Threads: 1')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
    });
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=recent&recentUnread=1'
      );
    });

    fireEvent.change(screen.getByLabelText('Recent mailbox filter'), {
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

    fireEvent.change(screen.getByLabelText('Search subject, snippet, or participant...'), {
      target: { value: 'welcome' },
    });
    await waitFor(() => {
      expect(screen.getByLabelText('Search subject, snippet, or participant...')).toHaveValue(
        'welcome'
      );
      expect(screen.getByText('Threads: 1')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(1);
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=recent&recentQuery=welcome'
      );
    });
    expect(screen.getByText('Search: welcome')).toBeInTheDocument();
    expect(screen.getByText('Recent: 2')).toBeInTheDocument();
    expect(screen.getByText('Recent Search: welcome')).toBeInTheDocument();
    expect(within(screen.getByRole('list')).queryByText('Inbox digest')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Filters' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Recent' })).toBeInTheDocument();

    routerPushMock.mockClear();
    routerReplaceMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Recent' }));
    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).not.toHaveBeenCalled();
      expect(screen.queryByText('Recent Search: welcome')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Threads: 2')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.queryByText('Search: welcome')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Search subject, snippet, or participant...')).toHaveValue('');
    });
    expect(screen.queryByRole('button', { name: 'Clear Filters' })).not.toBeInTheDocument();
  });

  it('clears stale recent rows before a delayed recent query response resolves', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'recent';
      return null;
    });

    let resolveUrgentThreads:
      | ((value: Response | PromiseLike<Response>) => void)
      | undefined;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return Promise.resolve(
          jsonResponse({
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
          })
        );
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return Promise.resolve(
          jsonResponse({
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
          })
        );
      }
      if (
        url === '/api/filemaker/mail/threads?accountId=account-1' ||
        url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      ) {
        return Promise.resolve(
          jsonResponse({
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
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&query=urgent') {
        return new Promise<Response>((resolve) => {
          resolveUrgentThreads = resolve;
        });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`));
    });

    render(<AdminFilemakerMailPage />);

    expect(await screen.findByText('Support inbox / Recent')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText('Threads: 2')).toBeInTheDocument();
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
    });

    fireEvent.change(screen.getByLabelText('Search subject, snippet, or participant...'), {
      target: { value: 'urgent' },
    });

    const threadsList = screen.getByRole('list');
    await waitFor(() => {
      expect(within(threadsList).queryByText('Recent welcome')).not.toBeInTheDocument();
      expect(within(threadsList).queryByText('Inbox digest')).not.toBeInTheDocument();
      expect(within(threadsList).queryAllByRole('listitem')).toHaveLength(0);
    });
    await waitFor(() => {
      expect(resolveUrgentThreads).toBeDefined();
    });

    await act(async () => {
      resolveUrgentThreads?.(
        jsonResponse({
          threads: [
            {
              id: 'thread-3',
              accountId: 'account-1',
              subject: 'Urgent invoice',
              participantSummary: [{ address: 'vip@example.com', name: 'VIP' }],
              snippet: 'Need approval today',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Urgent invoice',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T11:00:00.000Z',
            },
          ],
        })
      );
    });

    expect(await screen.findByText('Urgent invoice')).toBeInTheDocument();
    expect(within(threadsList).queryByText('Recent welcome')).not.toBeInTheDocument();
    expect(within(threadsList).queryByText('Inbox digest')).not.toBeInTheDocument();
    expect(within(threadsList).getAllByRole('listitem')).toHaveLength(1);
  });

  it('returns to the filtered recent panel from a recent-origin thread route', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    // @ts-ignore
    const { routeParamsMock } = await import('./AdminFilemakerMailPages.test-support');
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

  it('highlights the folder thread instead of the recent thread on a folder-origin thread route', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    // @ts-ignore
    const { routeParamsMock } = await import('./AdminFilemakerMailPages.test-support');
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
      if (
        url === '/api/filemaker/mail/threads?accountId=account-1' ||
        url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      ) {
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
    // @ts-ignore
    const { routeParamsMock } = await import('./AdminFilemakerMailPages.test-support');
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
      if (
        url === '/api/filemaker/mail/threads?accountId=account-1' ||
        url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      ) {
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
});
