import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  fetchMock,
  jsonResponse,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
  toastMock,
} from './AdminFilemakerMailPages.test-support';

setupAdminFilemakerMailPagesTest();

describe('AdminFilemakerMail pages', () => {
  it('loads the mailbox page, saves an account, and triggers sync/compose actions', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'accountId') return 'account-1';
      if (key === 'mailboxPath') return 'INBOX';
      return null;
    });
    const account = {
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
    };
    const thread = {
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
    };
    const folder = {
      id: 'account-1::INBOX',
      accountId: 'account-1',
      mailboxPath: 'INBOX',
      mailboxRole: 'inbox',
      threadCount: 1,
      unreadCount: 1,
      lastMessageAt: '2026-03-28T10:00:00.000Z',
    };

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return jsonResponse({ accounts: [account] });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: [folder] });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [thread] });
      }
      if (url === '/api/filemaker/mail/accounts' && init?.method === 'POST') {
        return jsonResponse({ account }, 201);
      }
      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        return jsonResponse({
          result: { fetchedMessageCount: 3 },
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    expect((await screen.findAllByText('Support inbox')).length).toBeGreaterThan(0);
    expect((await screen.findAllByText('Welcome')).length).toBeGreaterThan(0);
    expect(routerReplaceMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole('button', { name: 'Compose' })[1]!);
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail/compose?accountId=account-1&mailboxPath=INBOX'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Mailbox sync finished. Messages fetched: 3.',
        { variant: 'success' }
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'New Mailbox' }));

    fireEvent.change(screen.getByLabelText('Mailbox name'), {
      target: { value: 'Primary inbox' },
    });
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'primary@example.com' },
    });
    fireEvent.change(screen.getByLabelText('IMAP host'), {
      target: { value: 'imap.primary.test' },
    });
    fireEvent.change(screen.getByLabelText('SMTP host'), {
      target: { value: 'smtp.primary.test' },
    });
    fireEvent.change(screen.getByLabelText('IMAP user'), {
      target: { value: 'imap-user' },
    });
    fireEvent.change(screen.getByLabelText('SMTP user'), {
      target: { value: 'smtp-user' },
    });
    fireEvent.change(screen.getByLabelText('Mailbox allowlist'), {
      target: { value: 'INBOX, Sent' },
    });
    fireEvent.change(screen.getByLabelText('IMAP password'), {
      target: { value: 'imap-pass' },
    });
    fireEvent.change(screen.getByLabelText('SMTP password'), {
      target: { value: 'smtp-pass' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Mailbox' }));

    await waitFor(() => {
      const saveCall = fetchMock.mock.calls.find(
        ([url, init]) => url === '/api/filemaker/mail/accounts' && init?.method === 'POST'
      );
      expect(saveCall).toBeDefined();
      const payload = JSON.parse(String(saveCall?.[1]?.body)) as {
        name: string;
        emailAddress: string;
        folderAllowlist: string[];
      };
      expect(payload.name).toBe('Primary inbox');
      expect(payload.emailAddress).toBe('primary@example.com');
      expect(payload.folderAllowlist).toEqual(['INBOX', 'Sent']);
    });
  });

  it('routes account settings selection through the mail tree shell', async () => {
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

    render(<AdminFilemakerMailPage />);

    expect((await screen.findAllByText('Support inbox')).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: /Settings/ }));

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?accountId=account-1&panel=settings'
      );
    });
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

    render(<AdminFilemakerMailPage />);

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
        return jsonResponse({ result: { fetchedMessageCount: 3 } });
      }
      if (url.startsWith('/api/filemaker/mail/threads')) {
        return jsonResponse({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

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

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Support inbox');
    fireEvent.click(screen.getByRole('button', { name: /Add Mailbox/ }));

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/admin/filemaker/mail');
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
        const payload = JSON.parse(String(init.body)) as {
          status: string;
          imapPassword: string;
          smtpPassword: string;
        };
        expect(payload.status).toBe('paused');
        expect(payload.imapPassword).toBe('');
        expect(payload.smtpPassword).toBe('');
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

    render(<AdminFilemakerMailPage />);

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

    render(<AdminFilemakerMailPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Sync error: Authentication failed').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Sync Errors: 1')).toBeInTheDocument();
    expect(screen.getByText('Inactive: 1')).toBeInTheDocument();
    expect(screen.getByText('support@example.com • Status: paused')).toBeInTheDocument();
  });

  it('opens mailbox settings from the attention branch in the mail tree shell', async () => {
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

    render(<AdminFilemakerMailPage />);

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
      expect(screen.getByText('Mailbox Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Email address')).toHaveValue('support@example.com');
      expect(screen.getByText('Status: paused')).toBeInTheDocument();
    });
  });

  it('opens the attention overview panel from the root attention branch', async () => {
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

    render(<AdminFilemakerMailPage />);

    await screen.findByText('Needs Attention');
    fireEvent.click(screen.getByRole('button', { name: /Needs Attention/ }));

    await waitFor(() => {
      expect(screen.getByText('Mailboxes Requiring Attention')).toBeInTheDocument();
      expect(screen.getByText('Affected: 1')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Open Mailbox' })).toBeInTheDocument();
      expect(screen.getByText('Authentication failed')).toBeInTheDocument();
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

    render(<AdminFilemakerMailPage />);

    await waitFor(() => {
      expect(screen.getByText('support@example.com • Last sync: Never')).toBeInTheDocument();
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
      if (url === '/api/filemaker/mail/threads?accountId=account-1') {
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
});
