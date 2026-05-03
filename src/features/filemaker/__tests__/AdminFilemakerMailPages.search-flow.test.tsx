import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  fetchMock,
  jsonResponse,
  mockAccounts,
  mockFolders,
  routeParamsMock,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  setupAdminFilemakerMailPagesTest,
  toastMock,
} from './AdminFilemakerMailPages.test-support';

setupAdminFilemakerMailPagesTest();

describe('AdminFilemakerMail pages search flow', () => {
  it('ignores a stale deep-search response after clearing the search query', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'search';
      if (key === 'accountId') return 'account-1';
      if (key === 'searchQuery') return 'invoice';
      return null;
    });

    let resolveSearchRequest: ((response: Response) => void) | null = null;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return Promise.resolve(jsonResponse({ accounts: mockAccounts }));
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return Promise.resolve(jsonResponse({ folders: mockFolders }));
      }
      if (
        url === '/api/filemaker/mail/threads?accountId=account-1' ||
        url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      ) {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/search?query=invoice&accountId=account-1') {
        return new Promise<Response>((resolve) => {
          resolveSearchRequest = resolve;
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    await screen.findByLabelText('Deep message search');
    await waitFor(() => {
      expect(resolveSearchRequest).not.toBeNull();
    });

    routerReplaceMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?panel=search&accountId=account-1'
      );
    });

    resolveSearchRequest?.(
      jsonResponse({
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
      })
    );

    await waitFor(() => {
      expect(screen.queryByText('Invoice question')).not.toBeInTheDocument();
      expect(
        screen.getByText('Enter a search term to find messages across all synced mailboxes.')
      ).toBeInTheDocument();
    });
  });

  it('clears previous deep-search results immediately when the query changes', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    searchParamsGetMock.mockImplementation((key: string) => {
      if (key === 'panel') return 'search';
      if (key === 'accountId') return 'account-1';
      if (key === 'searchQuery') return 'invoice';
      return null;
    });

    let resolveReceiptSearchRequest: ((response: Response) => void) | null = null;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return Promise.resolve(jsonResponse({ accounts: mockAccounts }));
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return Promise.resolve(jsonResponse({ folders: mockFolders }));
      }
      if (
        url === '/api/filemaker/mail/threads?accountId=account-1' ||
        url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      ) {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/search?query=invoice&accountId=account-1') {
        return Promise.resolve(
          jsonResponse({
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
          })
        );
      }
      if (url === '/api/filemaker/mail/search?query=receipt&accountId=account-1') {
        return new Promise<Response>((resolve) => {
          resolveReceiptSearchRequest = resolve;
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailPage />);

    expect(await screen.findByText('Invoice question')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Deep message search'), {
      target: { value: 'receipt' },
    });

    await waitFor(() => {
      expect(screen.queryByText('Invoice question')).not.toBeInTheDocument();
      expect(screen.getByText('Searching messages...')).toBeInTheDocument();
    });

    resolveReceiptSearchRequest?.(
      jsonResponse({
        totalHits: 1,
        groups: [
          {
            threadId: 'thread-2',
            threadSubject: 'Receipt request',
            accountId: 'account-1',
            mailboxPath: 'VIP',
            lastMessageAt: '2026-03-28T10:00:00.000Z',
            hits: [
              {
                messageId: 'message-2',
                matchField: 'subject',
                matchSnippet: 'Receipt request',
                from: { address: 'bob@example.com', name: 'Bob' },
                to: [{ address: 'support@example.com', name: 'Support' }],
                sentAt: '2026-03-28T10:00:00.000Z',
                receivedAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          },
        ],
      })
    );

    expect((await screen.findAllByText('Receipt request')).length).toBeGreaterThan(0);
  });

  it('keeps the latest local search query when an older search route lands', async () => {
    const { AdminFilemakerMailPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailPage'
    );
    let currentSearchParams = new URLSearchParams('panel=search&accountId=account-1&searchQuery=invoice');
    searchParamsGetMock.mockImplementation((key: string) => currentSearchParams.get(key));

    let resolveReceiptSearchRequest: ((response: Response) => void) | null = null;

    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return Promise.resolve(jsonResponse({ accounts: mockAccounts }));
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return Promise.resolve(jsonResponse({ folders: mockFolders }));
      }
      if (
        url === '/api/filemaker/mail/threads?accountId=account-1' ||
        url === '/api/filemaker/mail/threads?accountId=account-1&limit=5'
      ) {
        return Promise.resolve(jsonResponse({ threads: [] }));
      }
      if (url === '/api/filemaker/mail/search?query=invoice&accountId=account-1') {
        return Promise.resolve(
          jsonResponse({
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
          })
        );
      }
      if (url === '/api/filemaker/mail/search?query=receipt&accountId=account-1') {
        return new Promise<Response>((resolve) => {
          resolveReceiptSearchRequest = resolve;
        });
      }
      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    const { rerender } = render(<AdminFilemakerMailPage />);

    expect(await screen.findByText('Invoice question')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Deep message search'), {
      target: { value: 'receipt' },
    });

    await waitFor(() => {
      expect(screen.getByLabelText('Deep message search')).toHaveValue('receipt');
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?panel=search&accountId=account-1&searchQuery=receipt'
      );
      expect(resolveReceiptSearchRequest).not.toBeNull();
    });

    routerReplaceMock.mockClear();
    currentSearchParams = new URLSearchParams('panel=search&accountId=account-1&searchQuery=draft');
    rerender(<AdminFilemakerMailPage />);

    await waitFor(() => {
      expect(screen.getByLabelText('Deep message search')).toHaveValue('receipt');
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail?panel=search&accountId=account-1&searchQuery=receipt'
      );
    });

    expect(
      fetchMock.mock.calls.some(
        ([url]) => String(url) === '/api/filemaker/mail/search?query=draft&accountId=account-1'
      )
    ).toBe(false);

    resolveReceiptSearchRequest?.(
      jsonResponse({
        totalHits: 1,
        groups: [
          {
            threadId: 'thread-2',
            threadSubject: 'Receipt request',
            accountId: 'account-1',
            mailboxPath: 'VIP',
            lastMessageAt: '2026-03-28T10:00:00.000Z',
            hits: [
              {
                messageId: 'message-2',
                matchField: 'subject',
                matchSnippet: 'Receipt request',
                from: { address: 'bob@example.com', name: 'Bob' },
                to: [{ address: 'support@example.com', name: 'Support' }],
                sentAt: '2026-03-28T10:00:00.000Z',
                receivedAt: '2026-03-28T10:00:00.000Z',
              },
            ],
          },
        ],
      })
    );

    expect((await screen.findAllByText('Receipt request')).length).toBeGreaterThan(0);
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
      '/admin/filemaker/mail/compose?forwardThreadId=thread+1&accountId=account-1&mailboxPath=VIP&panel=search&searchQuery=invoice'
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

    await screen.findByText(/Sending from:/);
    expect(screen.getByText('Search Query: invoice')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Clear Search' }));

    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail?panel=search');
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
        return jsonResponse({ accounts: mockAccounts });
      }
      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return jsonResponse({ folders: mockFolders });
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
});
