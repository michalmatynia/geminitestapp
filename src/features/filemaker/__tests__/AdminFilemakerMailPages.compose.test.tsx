import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  fetchMock,
  jsonResponse,
  mockAccounts,
  mockFolders,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
  renderWithProviders,
  toastMock,
} from './AdminFilemakerMailPages.test-support';

setupAdminFilemakerMailPagesTest();

describe('AdminFilemakerMail pages compose flows', () => {
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
      }
      if (url.startsWith('/api/filemaker/mail/threads?')) {
        return jsonResponse({ threads: [] });
      }
      if (url === '/api/filemaker/mail/send' && init?.method === 'POST') {
        return jsonResponse({ message: { threadId: 'thread-99' } }, 201);
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    renderWithProviders(<AdminFilemakerMailComposePage />);

    await screen.findByText(/Sending from:/);
    expect(
      screen.getByRole('link', {
        name: 'Open Filemaker Email text editor settings',
      })
    ).toHaveAttribute(
      'href',
      '/admin/settings/text-editors#text-editor-instance-filemaker_email'
    );

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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
            ...mockAccounts,
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
            ...mockFolders,
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
            ...mockAccounts,
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
            ...mockFolders,
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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

  it('forwards a recent-origin thread into compose while preserving recent filters', async () => {
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
