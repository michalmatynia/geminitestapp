
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import {
  fetchMock,
  jsonResponse,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
  toastMock,
  renderWithProviders,
} from './AdminFilemakerMailPages.test-support';

setupAdminFilemakerMailPagesTest();

describe('AdminFilemakerMail pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('loads the mailbox page on a folder route', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
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
      if (url === '/api/filemaker/mail/accounts' && init?.method === 'POST') {
        return jsonResponse(
          {
            account: {
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
              updatedAt: '2026-03-28T10:05:00.000Z',
              provider: 'imap_smtp',
            },
          },
          201
        );
      }
      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        return jsonResponse({ result: { fetchedMessageCount: 3, lastSyncError: null } });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    expect((await screen.findAllByText('Support inbox')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Support inbox / Inbox')).toBeInTheDocument();

    await waitFor(() => {
      const threadsCall = fetchMock.mock.calls.find(([url]) =>
        String(url).startsWith('/api/filemaker/mail/threads?')
      );
      expect(threadsCall).toBeDefined();
    });
    expect(routerReplaceMock).not.toHaveBeenCalled();
  });

  it('routes account compose selection through the mail tree shell', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
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

    renderWithProviders(<AdminFilemakerMailPage />);

    expect((await screen.findAllByText('Support inbox')).length).toBeGreaterThan(0);
    const composeNodeButton = screen
      .getAllByRole('button', { name: /Compose/ })
      .find((button) => button.textContent?.includes('•Compose'));

    expect(composeNodeButton).toBeDefined();
    fireEvent.click(composeNodeButton!);

    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/compose?accountId=account-1'
    );
  });

  it('runs mailbox sync from the mail tree shell', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
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
      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        return jsonResponse({ result: { fetchedMessageCount: 3, lastSyncError: null } });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByText('Support inbox');
    const syncNodeButton = screen
      .getAllByRole('button', { name: /Sync/ })
      .find((button) => button.textContent?.includes('•Sync'));

    expect(syncNodeButton).toBeDefined();
    fireEvent.click(syncNodeButton!);

    await waitFor(() => {
      const syncCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST'
      );
      expect(syncCall).toBeDefined();
      expect(toastMock).toHaveBeenCalledWith('Mailbox sync finished. Messages fetched: 3.', {
        variant: 'success',
      });
    });
  });

  it('surfaces sync errors returned by the mailbox sync endpoint', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'INBOX';
      return null;
    });

    let navigationLoadCount = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        navigationLoadCount += 1;
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
              lastSyncError:
                navigationLoadCount > 1 ? 'Authentication failed' : null,
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
      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        return jsonResponse({
          result: {
            fetchedMessageCount: 0,
            lastSyncError: 'Authentication failed',
          },
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByText('Support inbox');
    const syncNodeButton = screen
      .getAllByRole('button', { name: /Sync/ })
      .find((button) => button.textContent?.includes('•Sync'));

    expect(syncNodeButton).toBeDefined();
    fireEvent.click(syncNodeButton!);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Authentication failed', {
        variant: 'error',
      });
      expect(screen.getAllByText('Sync error: Authentication failed').length).toBeGreaterThan(0);
    });
  });

  it('routes new mailbox selection through the mail tree shell', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
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

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByText('Support inbox');
    fireEvent.click(screen.getByRole('button', { name: /Add Mailbox/ }));

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/admin/filemaker/mail');
    });
  });

  it('syncs a newly created mailbox immediately after save', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );

    let navigationLoadCount = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        navigationLoadCount += 1;
        return jsonResponse({
          accounts:
            navigationLoadCount > 1
              ? [
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
                    lastSyncedAt: '2026-03-28T10:10:00.000Z',
                    lastSyncError: null,
                    createdAt: '2026-03-28T10:00:00.000Z',
                    updatedAt: '2026-03-28T10:10:00.000Z',
                    provider: 'imap_smtp',
                  },
                ]
              : [],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({
          folders:
            navigationLoadCount > 1
              ? [
                  {
                    id: 'account-1::INBOX',
                    accountId: 'account-1',
                    mailboxPath: 'INBOX',
                    mailboxRole: 'inbox',
                    threadCount: 2,
                    unreadCount: 1,
                    lastMessageAt: '2026-03-28T10:10:00.000Z',
                  },
                ]
              : [],
        });
      }
      if (url === '/api/filemaker/mail/accounts' && init?.method === 'POST') {
        return jsonResponse(
          {
            account: {
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
              updatedAt: '2026-03-28T10:05:00.000Z',
              provider: 'imap_smtp',
            },
          },
          201
        );
      }
      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        return jsonResponse({
          result: {
            fetchedMessageCount: 2,
            lastSyncError: null,
          },
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByRole('button', { name: 'Save Mailbox' });

    fireEvent.change(screen.getByLabelText('Mailbox name'), {
      target: { value: 'Support inbox' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP host'), {
      target: { value: 'imap.example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP user'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP password'), {
      target: { value: 'imap-secret' },
    });
    fireEvent.change(screen.getByLabelText('SMTP host'), {
      target: { value: 'smtp.example.com' },
    });
    fireEvent.change(screen.getByLabelText('SMTP user'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('SMTP password'), {
      target: { value: 'smtp-secret' },
    });
    fireEvent.change(screen.getByLabelText('Mailbox allowlist'), {
      target: { value: 'INBOX' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Mailbox' }));

    await waitFor(() => {
      const syncCall = fetchMock.mock.calls.find(
        ([url, init]) =>
          url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST'
      );
      expect(syncCall).toBeDefined();
      expect(toastMock).toHaveBeenCalledWith('Mailbox account saved.', {
        variant: 'success',
      });
      expect(toastMock).toHaveBeenCalledWith('Mailbox sync finished. Messages fetched: 2.', {
        variant: 'success',
      });
    });
  });

  it('shows the server-reported initial sync error after saving a mailbox', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );

    let navigationLoadCount = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        navigationLoadCount += 1;
        return jsonResponse({
          accounts:
            navigationLoadCount > 1
              ? [
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
                    lastSyncError: 'Authentication failed',
                    createdAt: '2026-03-28T10:00:00.000Z',
                    updatedAt: '2026-03-28T10:10:00.000Z',
                    provider: 'imap_smtp',
                  },
                ]
              : [],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: [] });
      }
      if (url === '/api/filemaker/mail/accounts' && init?.method === 'POST') {
        return jsonResponse(
          {
            account: {
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
              updatedAt: '2026-03-28T10:05:00.000Z',
              provider: 'imap_smtp',
            },
          },
          201
        );
      }
      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        return jsonResponse({
          result: {
            fetchedMessageCount: 0,
            lastSyncError: 'Authentication failed',
          },
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByRole('button', { name: 'Save Mailbox' });

    fireEvent.change(screen.getByLabelText('Mailbox name'), {
      target: { value: 'Support inbox' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP host'), {
      target: { value: 'imap.example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP user'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP password'), {
      target: { value: 'imap-secret' },
    });
    fireEvent.change(screen.getByLabelText('SMTP host'), {
      target: { value: 'smtp.example.com' },
    });
    fireEvent.change(screen.getByLabelText('SMTP user'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('SMTP password'), {
      target: { value: 'smtp-secret' },
    });
    fireEvent.change(screen.getByLabelText('Mailbox allowlist'), {
      target: { value: 'INBOX' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Mailbox' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Mailbox account saved.', {
        variant: 'success',
      });
      expect(toastMock).toHaveBeenCalledWith('Authentication failed', {
        variant: 'error',
      });
      expect(screen.getAllByText('Authentication failed').length).toBeGreaterThan(0);
    });
  });

  it('keeps the saved mailbox when the initial sync request fails after create', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );

    let navigationLoadCount = 0;

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        navigationLoadCount += 1;
        return jsonResponse({
          accounts:
            navigationLoadCount > 1
              ? [
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
                    lastSyncError: 'Connection timeout',
                    createdAt: '2026-03-28T10:00:00.000Z',
                    updatedAt: '2026-03-28T10:10:00.000Z',
                    provider: 'imap_smtp',
                  },
                ]
              : [],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: [] });
      }
      if (url === '/api/filemaker/mail/accounts' && init?.method === 'POST') {
        return jsonResponse(
          {
            account: {
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
              updatedAt: '2026-03-28T10:05:00.000Z',
              provider: 'imap_smtp',
            },
          },
          201
        );
      }
      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        throw new Error('Connection timeout');
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByRole('button', { name: 'Save Mailbox' });

    fireEvent.change(screen.getByLabelText('Mailbox name'), {
      target: { value: 'Support inbox' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP host'), {
      target: { value: 'imap.example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP user'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP password'), {
      target: { value: 'imap-secret' },
    });
    fireEvent.change(screen.getByLabelText('SMTP host'), {
      target: { value: 'smtp.example.com' },
    });
    fireEvent.change(screen.getByLabelText('SMTP user'), {
      target: { value: 'support@example.com' },
    });
    fireEvent.change(screen.getByLabelText('SMTP password'), {
      target: { value: 'smtp-secret' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Mailbox' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith('Mailbox account saved.', {
        variant: 'success',
      });
      expect(toastMock).toHaveBeenCalledWith(
        'Mailbox saved, but initial sync failed: Connection timeout',
        {
          variant: 'error',
        }
      );
      expect(screen.getByDisplayValue('Support inbox')).toBeInTheDocument();
    });
  });

  it('toggles mailbox status through the mail tree shell', async () => {
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
              threadCount: 0,
              unreadCount: 0,
              lastMessageAt: null,
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      if (url === '/api/filemaker/mail/accounts' && init?.method === 'POST') {
        const payload = JSON.parse(String(init.body)) as Record<string, unknown>;
        expect(payload).toMatchObject({
          id: 'account-1',
          emailAddress: 'support@example.com',
          status: 'paused',
        });
        expect(payload).not.toHaveProperty('imapPassword');
        expect(payload).not.toHaveProperty('smtpPassword');
        return jsonResponse(
          {
            account: {
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
              lastSyncError: null,
              createdAt: '2026-03-28T10:00:00.000Z',
              updatedAt: '2026-03-28T10:05:00.000Z',
              provider: 'imap_smtp',
            },
          },
          201
        );
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    expect((await screen.findAllByText('Support inbox')).length).toBeGreaterThan(0);
    const toggleNodeButton = screen
      .getAllByRole('button', { name: /Pause/ })
      .find((button) => button.textContent?.includes('•Pause'));

    expect(toggleNodeButton).toBeDefined();
    fireEvent.click(toggleNodeButton!);

    await waitFor(() => {
      const saveCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/filemaker/mail/accounts' && init?.method === 'POST'
      );
      expect(saveCall).toBeDefined();
      expect(toastMock).toHaveBeenCalledWith('Mailbox paused.', {
        variant: 'success',
      });
      expect(screen.getByText('Inactive: 1')).toBeInTheDocument();
      expect(screen.getByText('support@example.com • Status: paused')).toBeInTheDocument();
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
  });

  it('shows mailbox health warnings in the mail tree shell', async () => {
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
              lastSyncError: 'Authentication failed',
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
              threadCount: 0,
              unreadCount: 0,
              lastMessageAt: null,
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Sync error: Authentication failed').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Sync Errors: 1')).toBeInTheDocument();
    expect(screen.getByText('Inactive: 1')).toBeInTheDocument();
    expect(screen.getByText('support@example.com • Status: paused')).toBeInTheDocument();
  });

  it('routes mailbox settings from the attention branch in the mail tree shell', async () => {
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
              lastSyncError: 'Authentication failed',
              createdAt: '2026-03-28T10:00:00.000Z',
              updatedAt: '2026-03-28T10:00:00.000Z',
              provider: 'imap_smtp',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: [] });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByText('Needs Attention');
    const attentionNodeButton = screen
      .getAllByRole('button')
      .find(
        (button) =>
          button.textContent?.includes('Support inbox') &&
          button.textContent?.includes('Authentication failed')
      );

    expect(attentionNodeButton).toBeDefined();
    fireEvent.click(attentionNodeButton!);

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=settings'
      );
    });
  });

  it('routes to the attention overview panel from the root attention branch', async () => {
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
              lastSyncError: 'Authentication failed',
              createdAt: '2026-03-28T10:00:00.000Z',
              updatedAt: '2026-03-28T10:00:00.000Z',
              provider: 'imap_smtp',
            },
          ],
        });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: [] });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await screen.findByText('Needs Attention');
    fireEvent.click(screen.getByRole('button', { name: /Needs Attention/ }));

    await waitFor(() => {
      expect(routerPushMock).not.toHaveBeenCalled();
      expect(routerReplaceMock).toHaveBeenCalledWith('/admin/filemaker/mail?panel=attention');
    });
  });

  it('shows account sync recency in the mail tree shell for healthy accounts', async () => {
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
              threadCount: 0,
              unreadCount: 0,
              lastMessageAt: null,
            },
          ],
        });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailPage />);

    await waitFor(() => {
      expect(screen.getByText('support@example.com • Last sync: Never')).toBeInTheDocument();
    });
  });
});
