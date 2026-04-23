import { StrictMode } from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

describe('AdminFilemakerMail pages - Routing and Param Cleaning', () => {
  it('cleans stale recent and search params from a folder route and keeps compose/search actions clean', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'INBOX';
      if (key === 'recentMailbox') return 'VIP';
      if (key === 'recentUnread') return '1';
      if (key === 'recentQuery') return 'welcome';
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
              threadCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
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
              snippet: 'Hello',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Welcome',
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

    render(<AdminFilemakerMailPage />);

    expect((await screen.findAllByText('Welcome')).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&mailboxPath=INBOX'
      );
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Compose' })[1]!);
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/compose?accountId=account-1&mailboxPath=INBOX'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Search Messages' }));
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?panel=search&accountId=account-1'
      );
    });
  });

  it('cleans a stale mailboxPath from a search route', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'search';
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'VIP';
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
      if (url.startsWith('/api/filemaker/mail/search?')) {
        return jsonResponse({ totalHits: 0, groups: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByLabelText('Deep message search');
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?panel=search&accountId=account-1&searchQuery=invoice'
      );
    });
    expect(
      fetchMock.mock.calls.filter(([url]) =>
        String(url).startsWith('/api/filemaker/mail/search?')
      )
    ).toHaveLength(1);

    routerPushMock.mockClear();
    routerReplaceMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));
    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith('/admin/filemaker/mail?panel=search&accountId=account-1');
    });
  });

  it('cleans stale account scope from the attention route', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'attention';
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'INBOX';
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
              status: 'paused',
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
              lastSyncError: 'Mailbox auth failed',
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
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Mailboxes Requiring Attention');
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/admin/filemaker/mail?panel=attention');
    });
  });

  it('cleans stale folder and filter params from a settings route and keeps compose-from-account clean', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'settings';
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'INBOX';
      if (key === 'recentMailbox') return 'VIP';
      if (key === 'recentUnread') return '1';
      if (key === 'recentQuery') return 'welcome';
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
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Mailbox Settings');
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=settings'
      );
    });

    const sidebar = screen.getByText('Mail Navigation').closest('section');
    expect(sidebar).not.toBeNull();
    const scoped = within(sidebar!);
    expect(scoped.getByRole('button', { name: /Support inbox/ })).toHaveClass('bg-sky-500/15');
    expect(scoped.getByRole('button', { name: /Settings/ })).not.toHaveClass('bg-sky-500/15');

    fireEvent.click(screen.getByRole('button', { name: 'Compose from Account' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail/compose?accountId=account-1');
  });

  it('canonicalizes a direct account route to settings', async () => {
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
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Mailbox Settings');
    await waitFor(() => {
      const recentPreviewCall = fetchMock.mock.calls.find(
        ([url]) => url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      );
      expect(recentPreviewCall).toBeDefined();
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) => url === '/api/filemaker/mail/accounts' && !init?.method
        )
      ).toHaveLength(1);
      expect(
        fetchMock.mock.calls.filter(
          ([url, init]) => url === '/api/filemaker/mail/folders' && !init?.method
        )
      ).toHaveLength(1);
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=settings'
      );
    });
  });

  it('canonicalizes a direct account route only once under strict mode', async () => {
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
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(
      <StrictMode>
        <AdminFilemakerMailPage />
      </StrictMode>
    );

    await screen.findByText('Mailbox Settings');
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=settings'
      );
      expect(routerReplaceMock).toHaveBeenCalledTimes(1);
    });
  });

  it('ignores a repeat click on the already-selected account settings node', async () => {
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
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Mailbox Settings');
    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=settings'
      );
    });

    routerPushMock.mockClear();
    routerReplaceMock.mockClear();

    const sidebar = screen.getByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);
    fireEvent.click(scoped.getByRole('button', { name: /Support inbox/ }));

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).not.toHaveBeenCalled();
    });
  });

  it('clears the previous account recent preview immediately when switching accounts', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      return null;
    });

    let resolveSecondRecentPreview: ((response: Response) => void) | null = null;

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
                folderAllowlist: ['INBOX'],
                initialSyncLookbackDays: 30,
                maxMessagesPerSync: 100,
                lastSyncedAt: null,
                lastSyncError: null,
                createdAt: '2026-03-28T10:00:00.000Z',
                updatedAt: '2026-03-28T10:00:00.000Z',
                provider: 'imap_smtp',
              },
              {
                id: 'account-2',
                name: 'Sales inbox',
                emailAddress: 'sales@example.com',
                status: 'active',
                imapHost: 'imap.example.com',
                imapPort: 993,
                imapSecure: true,
                imapUser: 'sales@example.com',
                imapPasswordSettingKey: 'imap-key-2',
                smtpHost: 'smtp.example.com',
                smtpPort: 465,
                smtpSecure: true,
                smtpUser: 'sales@example.com',
                smtpPasswordSettingKey: 'smtp-key-2',
                fromName: 'Sales',
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
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
              {
                id: 'account-2::INBOX',
                accountId: 'account-2',
                mailboxPath: 'INBOX',
                mailboxRole: 'inbox',
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&limit=5') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-1',
                accountId: 'account-1',
                subject: 'Support follow-up',
                participantSummary: [{ address: 'alice@example.com', name: 'Alice' }],
                snippet: 'Support preview',
                mailboxPath: 'INBOX',
                mailboxRole: 'inbox',
                normalizedSubject: 'Support follow-up',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-2&limit=5') {
        return new Promise<Response>((resolve) => {
          resolveSecondRecentPreview = resolve;
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-2') {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Mailbox Settings');
    const sidebar = screen.getByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);
    expect(await scoped.findByRole('button', { name: /Support follow-up/ })).toBeInTheDocument();

    fireEvent.click(scoped.getByRole('button', { name: /Sales inbox/ }));

    await waitFor(() => {
      expect(scoped.queryByRole('button', { name: /Support follow-up/ })).not.toBeInTheDocument();
    });

    resolveSecondRecentPreview?.(
      jsonResponse({
        threads: [
          {
            id: 'thread-2',
            accountId: 'account-2',
            subject: 'Sales welcome',
            participantSummary: [{ address: 'bob@example.com', name: 'Bob' }],
            snippet: 'Sales preview',
            mailboxPath: 'INBOX',
            mailboxRole: 'inbox',
            normalizedSubject: 'Sales welcome',
            relatedPersonIds: [],
            relatedOrganizationIds: [],
            messageCount: 1,
            unreadCount: 1,
            lastMessageAt: '2026-03-28T10:00:00.000Z',
          },
        ],
      })
    );

    expect(await scoped.findByRole('button', { name: /Sales welcome/ })).toBeInTheDocument();
  });

  it('clears stale folder threads immediately when switching folders', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'INBOX';
      return null;
    });

    let resolveVipThreads: ((response: Response) => void) | null = null;

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
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
              {
                id: 'account-1::VIP',
                accountId: 'account-1',
                mailboxPath: 'VIP',
                mailboxRole: 'custom',
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T09:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&limit=5') {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=INBOX') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-inbox',
                accountId: 'account-1',
                subject: 'Inbox thread',
                participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
                snippet: 'Inbox preview',
                mailboxPath: 'INBOX',
                mailboxRole: 'inbox',
                normalizedSubject: 'Inbox thread',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP') {
        return new Promise<Response>((resolve) => {
          resolveVipThreads = resolve;
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await waitFor(() => {
      expect(within(screen.getByRole('list')).getByText('Inbox thread')).toBeInTheDocument();
    });

    const sidebar = screen.getByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);
    fireEvent.click(scoped.getByRole('button', { name: /VIP/ }));

    await waitFor(() => {
      expect(within(screen.getByRole('list')).queryByText('Inbox thread')).not.toBeInTheDocument();
    });

    resolveVipThreads?.(
      jsonResponse({
        threads: [
          {
            id: 'thread-vip',
            accountId: 'account-1',
            subject: 'VIP thread',
            participantSummary: [{ address: 'vip@example.com', name: 'VIP' }],
            snippet: 'VIP preview',
            mailboxPath: 'VIP',
            mailboxRole: 'custom',
            normalizedSubject: 'VIP thread',
            relatedPersonIds: [],
            relatedOrganizationIds: [],
            messageCount: 1,
            unreadCount: 1,
            lastMessageAt: '2026-03-28T09:00:00.000Z',
          },
        ],
      })
    );

    expect(within(await screen.findByRole('list')).getByText('VIP thread')).toBeInTheDocument();
  });

  it('clears the previous folder query before loading another folder', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'INBOX';
      return null;
    });

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
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
              {
                id: 'account-1::VIP',
                accountId: 'account-1',
                mailboxPath: 'VIP',
                mailboxRole: 'custom',
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T09:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&limit=5') {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=INBOX') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-inbox',
                accountId: 'account-1',
                subject: 'Inbox invoice',
                participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
                snippet: 'Inbox preview',
                mailboxPath: 'INBOX',
                mailboxRole: 'inbox',
                normalizedSubject: 'Inbox invoice',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-vip',
                accountId: 'account-1',
                subject: 'VIP follow-up',
                participantSummary: [{ address: 'vip@example.com', name: 'VIP' }],
                snippet: 'VIP preview',
                mailboxPath: 'VIP',
                mailboxRole: 'custom',
                normalizedSubject: 'VIP follow-up',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T09:00:00.000Z',
              },
            ],
          })
        );
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await waitFor(() => {
      expect(within(screen.getByRole('list')).getByText('Inbox invoice')).toBeInTheDocument();
    });

    const queryInput = screen.getByLabelText('Search subject, snippet, or participant...');
    fireEvent.change(queryInput, {
      target: { value: 'invoice' },
    });
    await waitFor(() => {
      expect(queryInput).toHaveValue('invoice');
    });

    const sidebar = screen.getByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);
    fireEvent.click(scoped.getByRole('button', { name: /VIP/ }));

    await waitFor(() => {
      expect(queryInput).toHaveValue('');
    });
    expect(await within(screen.getByRole('list')).findByText('VIP follow-up')).toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/filemaker/mail/threads?accountId=account-1&mailboxPath=VIP&query=invoice')
      )
    ).toBe(false);
  });

  it('opens account settings from the sidebar without pushing a competing route transition', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockReturnValue(null);

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
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    const sidebar = await screen.findByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);

    fireEvent.click(scoped.getByRole('button', { name: /Support inbox/ }));

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=settings'
      );
      expect(scoped.getByRole('button', { name: /Support inbox/ })).toHaveClass('bg-sky-500/15');
    });
  });

  it('opens a folder from the sidebar without pushing a competing route transition', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockReturnValue(null);

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
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    const sidebar = await screen.findByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);

    fireEvent.click(scoped.getByRole('button', { name: /Inbox/ }));

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&mailboxPath=INBOX'
      );
    });
  });

  it('clears a stale recent query before loading a folder from the sidebar', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'recent';
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
      if (url === '/api/filemaker/mail/threads?accountId=account-1&query=welcome') {
        return jsonResponse({
          threads: [
            {
              id: 'thread-recent',
              accountId: 'account-1',
              subject: 'Recent welcome',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
              snippet: 'Recent result',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent welcome',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&limit=5') {
        return jsonResponse({
          threads: [
            {
              id: 'thread-recent',
              accountId: 'account-1',
              subject: 'Recent welcome',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
              snippet: 'Recent preview',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              normalizedSubject: 'Recent welcome',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T10:00:00.000Z',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&mailboxPath=INBOX') {
        return jsonResponse({
          threads: [
            {
              id: 'thread-folder',
              accountId: 'account-1',
              subject: 'Inbox thread',
              participantSummary: [{ address: 'team@example.com', name: 'Team' }],
              snippet: 'Folder result',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Inbox thread',
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              messageCount: 1,
              unreadCount: 1,
              lastMessageAt: '2026-03-28T11:00:00.000Z',
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    expect(await screen.findByText('Support inbox / Recent')).toBeInTheDocument();
    const threadsList = screen.getByRole('list');
    expect(await within(threadsList).findByText('Recent welcome')).toBeInTheDocument();

    const sidebar = screen.getByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);
    fireEvent.click(scoped.getByRole('button', { name: /Inbox/ }));

    expect(await within(threadsList).findByText('Inbox thread')).toBeInTheDocument();
    expect(within(threadsList).queryByText('Recent welcome')).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/filemaker/mail/threads?accountId=account-1&mailboxPath=INBOX&query=welcome')
      )
    ).toBe(false);

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&mailboxPath=INBOX'
      );
    });
  });

  it('clears stale recent filters before loading another account recent view', async () => {
    const { MailPageProvider, useMailPageContext } = await import(
      '@/features/filemaker/pages/FilemakerMail.context'
    );
    const { MailThreadsSection } = await import(
      '@/features/filemaker/pages/mail-page-sections/MailThreadsSection'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'recent';
      if (key === 'recentMailbox') return 'VIP';
      if (key === 'recentUnread') return '1';
      if (key === 'recentQuery') return 'welcome';
      return null;
    });

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
              {
                id: 'account-2',
                name: 'Sales inbox',
                emailAddress: 'sales@example.com',
                status: 'active',
                imapHost: 'imap.example.com',
                imapPort: 993,
                imapSecure: true,
                imapUser: 'sales@example.com',
                imapPasswordSettingKey: 'imap-key-2',
                smtpHost: 'smtp.example.com',
                smtpPort: 465,
                smtpSecure: true,
                smtpUser: 'sales@example.com',
                smtpPasswordSettingKey: 'smtp-key-2',
                fromName: 'Sales',
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
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T09:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&query=welcome') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-support',
                accountId: 'account-1',
                subject: 'Recent welcome',
                participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
                snippet: 'Support result',
                mailboxPath: 'VIP',
                mailboxRole: 'custom',
                normalizedSubject: 'Recent welcome',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&limit=5') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-support',
                accountId: 'account-1',
                subject: 'Recent welcome',
                participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
                snippet: 'Support preview',
                mailboxPath: 'VIP',
                mailboxRole: 'custom',
                normalizedSubject: 'Recent welcome',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-2') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-sales',
                accountId: 'account-2',
                subject: 'Sales update',
                participantSummary: [{ address: 'saleslead@example.com', name: 'Sales Lead' }],
                snippet: 'Sales result',
                mailboxPath: 'INBOX',
                mailboxRole: 'inbox',
                normalizedSubject: 'Sales update',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T09:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-2&limit=5') {
        return Promise.resolve(
          jsonResponse({
            threads: [
              {
                id: 'thread-sales',
                accountId: 'account-2',
                subject: 'Sales update',
                participantSummary: [{ address: 'saleslead@example.com', name: 'Sales Lead' }],
                snippet: 'Sales preview',
                mailboxPath: 'INBOX',
                mailboxRole: 'inbox',
                normalizedSubject: 'Sales update',
                relatedPersonIds: [],
                relatedOrganizationIds: [],
                messageCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T09:00:00.000Z',
              },
            ],
          })
        );
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    function RecentAccountSwitchHarness(): React.JSX.Element {
      const { setSelection } = useMailPageContext();

      return (
        <>
          <button
            type='button'
            onClick={() =>
              setSelection({ accountId: 'account-2', mailboxPath: null, panel: 'recent' })
            }
          >
            Open Sales Recent
          </button>
          <MailThreadsSection />
        </>
      );
    }

    render(
      <MailPageProvider>
        <RecentAccountSwitchHarness />
      </MailPageProvider>
    );

    const threadsList = screen.getByRole('list');
    expect(await within(threadsList).findByText('Recent welcome')).toBeInTheDocument();
    expect(screen.getByLabelText('Search subject, snippet, or participant...')).toHaveValue(
      'welcome'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Sales Recent' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Search subject, snippet, or participant...')).toHaveValue('');
    });
    expect(await within(threadsList).findByText('Sales update')).toBeInTheDocument();
    expect(within(threadsList).queryByText('Recent welcome')).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/filemaker/mail/threads?accountId=account-2&query=welcome')
      )
    ).toBe(false);

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-2&panel=recent'
      );
    });
  });

  it('opens the recent panel from the sidebar without pushing a competing route transition', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'panel') return 'settings';
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
              subject: 'Welcome',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
              snippet: 'Hello',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              normalizedSubject: 'Welcome',
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

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Mailbox Settings');
    routerPushMock.mockClear();
    routerReplaceMock.mockClear();

    const sidebar = screen.getByText('Mail Navigation');
    const scoped = within(sidebar.closest('section')!);
    fireEvent.click(await scoped.findByRole('button', { name: /Recent/ }));

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=recent'
      );
    });
  });

  it('keeps search context when opening a thread from search results', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'search';
      if (key === 'accountId') return 'account-1';
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
        return jsonResponse({ threads: [] });
      }
      if (url === '/api/filemaker/mail/search?query=invoice&accountId=account-1') {
        return jsonResponse({
          totalHits: 1,
          groups: [
            {
              threadId: 'thread-1',
              threadSubject: 'Invoice question',
              accountId: 'account-1',
              mailboxPath: 'VIP',
              lastMessageAt: '2026-03-28T10:00:00.000Z',
              hits: [
                {
                  messageId: 'message-1',
                  matchField: 'body',
                  matchSnippet: 'Invoice status update',
                  from: { address: 'alice@example.com', name: 'Alice' },
                  to: [{ address: 'support@example.com', name: 'Support' }],
                  sentAt: '2026-03-28T10:00:00.000Z',
                  receivedAt: '2026-03-28T10:00:00.000Z',
                },
              ],
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Invoice question');
    fireEvent.click(screen.getByRole('button', { name: 'Open Thread' }));

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP&panel=search&searchQuery=invoice'
    );
  });

  it('clears stale scoped search query before loading another account search view', async () => {
    const { MailPageProvider, useMailPageContext } = await import(
      '@/features/filemaker/pages/FilemakerMail.context'
    );
    const { MailSearchSection } = await import(
      '@/features/filemaker/pages/mail-page-sections/MailSearchSection'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'search';
      if (key === 'accountId') return 'account-1';
      if (key === 'searchQuery') return 'invoice';
      return null;
    });

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
                folderAllowlist: ['INBOX'],
                initialSyncLookbackDays: 30,
                maxMessagesPerSync: 100,
                lastSyncedAt: null,
                lastSyncError: null,
                createdAt: '2026-03-28T10:00:00.000Z',
                updatedAt: '2026-03-28T10:00:00.000Z',
                provider: 'imap_smtp',
              },
              {
                id: 'account-2',
                name: 'Sales inbox',
                emailAddress: 'sales@example.com',
                status: 'active',
                imapHost: 'imap.example.com',
                imapPort: 993,
                imapSecure: true,
                imapUser: 'sales@example.com',
                imapPasswordSettingKey: 'imap-key-2',
                smtpHost: 'smtp.example.com',
                smtpPort: 465,
                smtpSecure: true,
                smtpUser: 'sales@example.com',
                smtpPasswordSettingKey: 'smtp-key-2',
                fromName: 'Sales',
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
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
              {
                id: 'account-2::INBOX',
                accountId: 'account-2',
                mailboxPath: 'INBOX',
                mailboxRole: 'inbox',
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T09:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&limit=5') {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-2&limit=5') {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/search?query=invoice&accountId=account-1') {
        return Promise.resolve(
          jsonResponse({
            totalHits: 1,
            groups: [
              {
                threadId: 'thread-support',
                threadSubject: 'Invoice question',
                accountId: 'account-1',
                mailboxPath: 'INBOX',
                lastMessageAt: '2026-03-28T10:00:00.000Z',
                hits: [
                  {
                    messageId: 'message-1',
                    matchField: 'body',
                    matchSnippet: 'Invoice status update',
                    from: { address: 'alice@example.com', name: 'Alice' },
                    to: [{ address: 'support@example.com', name: 'Support' }],
                    sentAt: '2026-03-28T10:00:00.000Z',
                    receivedAt: '2026-03-28T10:00:00.000Z',
                  },
                ],
              },
            ],
          })
        );
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    function SearchAccountSwitchHarness(): React.JSX.Element {
      const { setSelection } = useMailPageContext();

      return (
        <>
          <button
            type='button'
            onClick={() =>
              setSelection({ accountId: 'account-2', mailboxPath: null, panel: 'search' })
            }
          >
            Open Sales Search
          </button>
          <MailSearchSection />
        </>
      );
    }

    render(
      <MailPageProvider>
        <SearchAccountSwitchHarness />
      </MailPageProvider>
    );

    expect(await screen.findByText('Invoice question')).toBeInTheDocument();
    expect(screen.getByLabelText('Deep message search')).toHaveValue('invoice');

    fireEvent.click(screen.getByRole('button', { name: 'Open Sales Search' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Deep message search')).toHaveValue('');
      expect(
        screen.getByText('Enter a search term to find messages across all synced mailboxes.')
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Invoice question')).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/filemaker/mail/search?query=invoice&accountId=account-2')
      )
    ).toBe(false);

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?panel=search&accountId=account-2'
      );
    });
  });

  it('clears a stale global search query before loading an account search view', async () => {
    const { MailPageProvider, useMailPageContext } = await import(
      '@/features/filemaker/pages/FilemakerMail.context'
    );
    const { MailSearchSection } = await import(
      '@/features/filemaker/pages/mail-page-sections/MailSearchSection'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'search';
      if (key === 'searchQuery') return 'invoice';
      return null;
    });

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
                threadCount: 1,
                unreadCount: 1,
                lastMessageAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          })
        );
      }
      if (url === '/api/filemaker/mail/threads?accountId=account-1&limit=5') {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/search?query=invoice') {
        return Promise.resolve(
          jsonResponse({
            totalHits: 1,
            groups: [
              {
                threadId: 'thread-global',
                threadSubject: 'Global invoice',
                accountId: 'account-1',
                mailboxPath: 'INBOX',
                lastMessageAt: '2026-03-28T10:00:00.000Z',
                hits: [
                  {
                    messageId: 'message-1',
                    matchField: 'body',
                    matchSnippet: 'Invoice status update',
                    from: { address: 'alice@example.com', name: 'Alice' },
                    to: [{ address: 'support@example.com', name: 'Support' }],
                    sentAt: '2026-03-28T10:00:00.000Z',
                    receivedAt: '2026-03-28T10:00:00.000Z',
                  },
                ],
              },
            ],
          })
        );
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    function GlobalSearchToAccountHarness(): React.JSX.Element {
      const { setSelection } = useMailPageContext();

      return (
        <>
          <button
            type='button'
            onClick={() =>
              setSelection({ accountId: 'account-1', mailboxPath: null, panel: 'search' })
            }
          >
            Open Support Search
          </button>
          <MailSearchSection />
        </>
      );
    }

    render(
      <MailPageProvider>
        <GlobalSearchToAccountHarness />
      </MailPageProvider>
    );

    expect(await screen.findByText('Global invoice')).toBeInTheDocument();
    expect(screen.getByLabelText('Deep message search')).toHaveValue('invoice');

    fireEvent.click(screen.getByRole('button', { name: 'Open Support Search' }));

    await waitFor(() => {
      expect(screen.getByLabelText('Deep message search')).toHaveValue('');
      expect(
        screen.getByText('Enter a search term to find messages across all synced mailboxes.')
      ).toBeInTheDocument();
    });
    expect(screen.queryByText('Global invoice')).not.toBeInTheDocument();
    expect(
      fetchMock.mock.calls.some(([url]) =>
        String(url).includes('/api/filemaker/mail/search?query=invoice&accountId=account-1')
      )
    ).toBe(false);

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?panel=search&accountId=account-1'
      );
    });
  });

  it('keeps global search context when opening a thread from search results', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
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
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      if (url === '/api/filemaker/mail/search?query=invoice') {
        return jsonResponse({
          totalHits: 1,
          groups: [
            {
              threadId: 'thread-1',
              threadSubject: 'Invoice question',
              accountId: 'account-1',
              mailboxPath: 'VIP',
              lastMessageAt: '2026-03-28T10:00:00.000Z',
              hits: [
                {
                  messageId: 'message-1',
                  matchField: 'body',
                  matchSnippet: 'Invoice status update',
                  from: { address: 'alice@example.com', name: 'Alice' },
                  to: [{ address: 'support@example.com', name: 'Support' }],
                  sentAt: '2026-03-28T10:00:00.000Z',
                  receivedAt: '2026-03-28T10:00:00.000Z',
                },
              ],
            },
          ],
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Invoice question');
    fireEvent.click(screen.getByRole('button', { name: 'Open Thread' }));

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=VIP&panel=search&searchQuery=invoice&searchAccountId=all'
    );
  });
});
