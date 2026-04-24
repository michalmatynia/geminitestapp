// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchMock,
  routeSearchParamsState,
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  usePathnameMock,
} = vi.hoisted(() => ({
  fetchMock: vi.fn(),
  routeSearchParamsState: { current: new URLSearchParams() },
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  searchParamsGetMock: vi.fn<(key: string) => string | null>(),
  usePathnameMock: vi.fn(() => '/admin/filemaker/mail-client'),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: searchParamsGetMock,
  }),
  usePathname: usePathnameMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
}));

describe('AdminFilemakerMailClientPage', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    routerPushMock.mockReset();
    routerReplaceMock.mockReset();
    searchParamsGetMock.mockReset();
    routeSearchParamsState.current = new URLSearchParams();
    searchParamsGetMock.mockImplementation((key: string) => routeSearchParamsState.current.get(key));
    usePathnameMock.mockReset();
    usePathnameMock.mockReturnValue('/admin/filemaker/mail-client');
    routerReplaceMock.mockImplementation((href: string) => {
      const nextUrl = new URL(href, 'https://example.test');
      routeSearchParamsState.current = new URLSearchParams(nextUrl.search);
      usePathnameMock.mockReturnValue(nextUrl.pathname);
    });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('renders mailbox shortcuts and quick-entry links from the mail client landing page', async () => {
    const { AdminFilemakerMailClientPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailClientPage'
    );

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts') {
        return Response.json({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              provider: 'imap_smtp',
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
              lastSyncedAt: '2026-04-23T08:00:00.000Z',
              lastSyncError: null,
              createdAt: '2026-04-20T08:00:00.000Z',
              updatedAt: '2026-04-23T08:00:00.000Z',
            },
            {
              id: 'account-2',
              name: 'Billing inbox',
              emailAddress: 'billing@example.com',
              provider: 'imap_smtp',
              status: 'paused',
              imapHost: 'imap.example.com',
              imapPort: 993,
              imapSecure: true,
              imapUser: 'billing@example.com',
              imapPasswordSettingKey: 'imap-billing-key',
              smtpHost: 'smtp.example.com',
              smtpPort: 465,
              smtpSecure: true,
              smtpUser: 'billing@example.com',
              smtpPasswordSettingKey: 'smtp-billing-key',
              fromName: 'Billing',
              replyToEmail: null,
              folderAllowlist: ['Archive'],
              initialSyncLookbackDays: 30,
              maxMessagesPerSync: 100,
              lastSyncedAt: null,
              lastSyncError: 'Mailbox auth failed',
              createdAt: '2026-04-20T08:00:00.000Z',
              updatedAt: '2026-04-23T08:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/folders') {
        return Response.json({
          folders: [
            {
              id: 'folder-1',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              threadCount: 12,
              unreadCount: 3,
              lastMessageAt: '2026-04-23T09:00:00.000Z',
            },
            {
              id: 'folder-2',
              accountId: 'account-1',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              threadCount: 2,
              unreadCount: 1,
              lastMessageAt: '2026-04-22T09:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/threads?limit=6') {
        return Response.json({
          threads: [
            {
              id: 'thread-1',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              providerThreadId: null,
              subject: 'Quarterly support update',
              normalizedSubject: 'quarterly support update',
              snippet: 'Latest support status for the quarter.',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane Example' }],
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              unreadCount: 2,
              messageCount: 3,
              lastMessageAt: '2026-04-23T09:30:00.000Z',
              createdAt: '2026-04-23T09:00:00.000Z',
              updatedAt: '2026-04-23T09:30:00.000Z',
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<AdminFilemakerMailClientPage />);

    expect(await screen.findByRole('heading', { name: 'Support inbox' })).toBeInTheDocument();
    expect(
      screen.getByRole('searchbox', { name: 'Filter mailboxes and recent threads' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show all mailboxes' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open Workspace' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail'
    );
    expect(screen.getByRole('link', { name: 'Add Mailbox' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?panel=settings'
    );
    expect(screen.getByRole('link', { name: 'Search Messages' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?panel=search'
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Compose' })
        .some((link) => link.getAttribute('href') === '/admin/filemaker/mail/compose?accountId=account-1')
    ).toBe(true);
    expect(screen.getByRole('link', { name: 'Needs Attention' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?panel=attention'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail');

    routerPushMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Add Mailbox' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail?panel=settings');

    routerPushMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Compose' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail/compose?accountId=account-1');
    expect(screen.queryByTestId('mail-client-focused-account-account-1')).not.toBeInTheDocument();

    const supportCard = screen.getByTestId('mail-client-account-account-1');
    expect(within(supportCard).getByRole('link', { name: 'Open Inbox' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?accountId=account-1&mailboxPath=INBOX'
    );
    expect(within(supportCard).getByRole('link', { name: 'Focus' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail-client?accountId=account-1'
    );
    expect(screen.getByRole('link', { name: 'Open Thread' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail/threads/thread-1?accountId=account-1&mailboxPath=INBOX'
    );
    expect(screen.getByRole('link', { name: 'Focus Mailbox' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail-client?accountId=account-1'
    );
    expect(screen.getByText('Quarterly support update')).toBeInTheDocument();
    expect(within(supportCard).getByRole('link', { name: 'VIP' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?accountId=account-1&mailboxPath=VIP'
    );

    const billingCard = screen.getByTestId('mail-client-account-account-2');
    expect(within(billingCard).getByText('Mailbox auth failed')).toBeInTheDocument();
    expect(within(billingCard).getByRole('link', { name: 'Open Settings' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?accountId=account-2&panel=settings'
    );

    const attentionCard = screen.getByTestId('mail-client-attention-account-account-2');
    expect(within(attentionCard).getByText('Mailbox auth failed')).toBeInTheDocument();
    expect(within(attentionCard).getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    expect(within(attentionCard).getByRole('link', { name: 'Open Settings' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?accountId=account-2&panel=settings'
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });
  });

  it('filters mailbox cards, attention state, and recent activity from the dedicated dashboard controls', async () => {
    const { AdminFilemakerMailClientPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailClientPage'
    );

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts') {
        return Response.json({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              provider: 'imap_smtp',
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
              lastSyncedAt: '2026-04-23T08:00:00.000Z',
              lastSyncError: null,
              createdAt: '2026-04-20T08:00:00.000Z',
              updatedAt: '2026-04-23T08:00:00.000Z',
            },
            {
              id: 'account-2',
              name: 'Billing inbox',
              emailAddress: 'billing@example.com',
              provider: 'imap_smtp',
              status: 'paused',
              imapHost: 'imap.example.com',
              imapPort: 993,
              imapSecure: true,
              imapUser: 'billing@example.com',
              imapPasswordSettingKey: 'imap-billing-key',
              smtpHost: 'smtp.example.com',
              smtpPort: 465,
              smtpSecure: true,
              smtpUser: 'billing@example.com',
              smtpPasswordSettingKey: 'smtp-billing-key',
              fromName: 'Billing',
              replyToEmail: null,
              folderAllowlist: ['Archive'],
              initialSyncLookbackDays: 30,
              maxMessagesPerSync: 100,
              lastSyncedAt: null,
              lastSyncError: 'Mailbox auth failed',
              createdAt: '2026-04-20T08:00:00.000Z',
              updatedAt: '2026-04-23T08:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/folders') {
        return Response.json({
          folders: [
            {
              id: 'folder-1',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              threadCount: 12,
              unreadCount: 3,
              lastMessageAt: '2026-04-23T09:00:00.000Z',
            },
            {
              id: 'folder-2',
              accountId: 'account-1',
              mailboxPath: 'VIP',
              mailboxRole: 'custom',
              threadCount: 2,
              unreadCount: 1,
              lastMessageAt: '2026-04-22T09:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/threads?limit=6') {
        return Response.json({
          threads: [
            {
              id: 'thread-1',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              providerThreadId: null,
              subject: 'Quarterly support update',
              normalizedSubject: 'quarterly support update',
              snippet: 'Latest support status for the quarter.',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane Example' }],
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              unreadCount: 2,
              messageCount: 3,
              lastMessageAt: '2026-04-23T09:30:00.000Z',
              createdAt: '2026-04-23T09:00:00.000Z',
              updatedAt: '2026-04-23T09:30:00.000Z',
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<AdminFilemakerMailClientPage />);

    expect(await screen.findByRole('heading', { name: 'Support inbox' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Focus Billing inbox' }));

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith('/admin/filemaker/mail-client?accountId=account-2');
      expect(screen.queryByTestId('mail-client-account-account-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('mail-client-account-account-2')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('radio', { name: 'Attention' }));

    await waitFor(() => {
      expect(screen.queryByTestId('mail-client-account-account-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('mail-client-account-account-2')).toBeInTheDocument();
      expect(screen.getByTestId('mail-client-attention-account-account-2')).toBeInTheDocument();
      expect(screen.getByText('No recent threads match the current filter.')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter mailboxes and recent threads' }), {
      target: { value: 'billing' },
    });

    await waitFor(() => {
      expect(screen.queryByTestId('mail-client-account-account-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('mail-client-account-account-2')).toBeInTheDocument();
      expect(screen.getByText('No recent threads match the current filter.')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('radio', { name: 'All' }));
    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter mailboxes and recent threads' }), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Show all mailboxes' }));

    expect(await screen.findByTestId('mail-client-account-account-1')).toBeInTheDocument();
    expect(screen.getByText('Quarterly support update')).toBeInTheDocument();
  });

  it('hydrates and updates dashboard route state on the standalone mail-client page', async () => {
    const { AdminFilemakerMailClientPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailClientPage'
    );

    routeSearchParamsState.current = new URLSearchParams('scope=attention&accountId=account-2&query=billing');
    searchParamsGetMock.mockImplementation((key: string) => routeSearchParamsState.current.get(key));

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts') {
        return Response.json({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              provider: 'imap_smtp',
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
              lastSyncedAt: '2026-04-23T08:00:00.000Z',
              lastSyncError: null,
              createdAt: '2026-04-20T08:00:00.000Z',
              updatedAt: '2026-04-23T08:00:00.000Z',
            },
            {
              id: 'account-2',
              name: 'Billing inbox',
              emailAddress: 'billing@example.com',
              provider: 'imap_smtp',
              status: 'paused',
              imapHost: 'imap.example.com',
              imapPort: 993,
              imapSecure: true,
              imapUser: 'billing@example.com',
              imapPasswordSettingKey: 'imap-billing-key',
              smtpHost: 'smtp.example.com',
              smtpPort: 465,
              smtpSecure: true,
              smtpUser: 'billing@example.com',
              smtpPasswordSettingKey: 'smtp-billing-key',
              fromName: 'Billing',
              replyToEmail: null,
              folderAllowlist: ['Archive'],
              initialSyncLookbackDays: 30,
              maxMessagesPerSync: 100,
              lastSyncedAt: null,
              lastSyncError: 'Mailbox auth failed',
              createdAt: '2026-04-20T08:00:00.000Z',
              updatedAt: '2026-04-23T08:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/folders') {
        return Response.json({
          folders: [
            {
              id: 'folder-billing-archive',
              accountId: 'account-2',
              mailboxPath: 'Archive',
              mailboxRole: 'custom',
              threadCount: 18,
              unreadCount: 6,
              lastMessageAt: '2026-04-23T10:00:00.000Z',
            },
            {
              id: 'folder-billing-inbox',
              accountId: 'account-2',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              threadCount: 4,
              unreadCount: 1,
              lastMessageAt: '2026-04-22T08:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/threads?limit=6') {
        return Response.json({
          threads: [
            {
              id: 'thread-billing-1',
              accountId: 'account-2',
              mailboxPath: 'Archive',
              mailboxRole: 'custom',
              providerThreadId: null,
              subject: 'Billing mailbox sync follow-up',
              normalizedSubject: 'billing mailbox sync follow-up',
              snippet: 'Billing auth and sync details for the latest retry.',
              participantSummary: [{ address: 'ops@example.com', name: 'Billing Ops' }],
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              unreadCount: 2,
              messageCount: 4,
              lastMessageAt: '2026-04-23T10:30:00.000Z',
              createdAt: '2026-04-23T10:00:00.000Z',
              updatedAt: '2026-04-23T10:30:00.000Z',
            },
          ],
        });
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<AdminFilemakerMailClientPage />);

    expect(await screen.findByDisplayValue('billing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Focus Billing inbox' })).toBeInTheDocument();
    expect(screen.getByTestId('mail-client-account-account-2')).toBeInTheDocument();
    expect(screen.queryByTestId('mail-client-account-account-1')).not.toBeInTheDocument();
    expect(within(screen.getByTestId('mail-client-account-account-2')).getByRole('link', { name: 'Show All' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail-client?scope=attention&query=billing'
    );
    expect(
      screen
        .getAllByRole('link', { name: 'Open Workspace' })
        .some((link) => link.getAttribute('href') === '/admin/filemaker/mail?accountId=account-2&panel=settings')
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'Search Messages' })
        .some(
          (link) =>
            link.getAttribute('href') ===
            '/admin/filemaker/mail?panel=search&accountId=account-2&searchQuery=billing'
        )
    ).toBe(true);
    const focusedMailbox = screen.getByTestId('mail-client-focused-account-account-2');
    const focusedRecentCard = screen.getByTestId('mail-client-recent-thread-thread-billing-1');
    expect(within(focusedMailbox).getByText('Focused mailbox')).toBeInTheDocument();
    expect(within(focusedMailbox).getByText('Mailbox auth failed')).toBeInTheDocument();
    expect(
      within(focusedMailbox).getByTestId('mail-client-focused-folder-folder-billing-archive')
    ).toBeInTheDocument();
    expect(within(focusedMailbox).getByRole('link', { name: 'Open Archive' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail?accountId=account-2&mailboxPath=Archive'
    );
    expect(within(focusedMailbox).getByText('Threads: 18')).toBeInTheDocument();
    expect(
      within(focusedMailbox).getByTestId('mail-client-focused-thread-thread-billing-1')
    ).toBeInTheDocument();
    expect(
      within(focusedMailbox).getByRole('link', { name: 'Open Thread' })
    ).toHaveAttribute(
      'href',
      '/admin/filemaker/mail/threads/thread-billing-1?accountId=account-2&mailboxPath=Archive&panel=search&searchQuery=billing'
    );
    expect(
      within(focusedMailbox).getByRole('link', { name: 'Open Latest Thread' })
    ).toHaveAttribute(
      'href',
      '/admin/filemaker/mail/threads/thread-billing-1?accountId=account-2&mailboxPath=Archive&panel=search&searchQuery=billing'
    );
    expect(
      within(focusedRecentCard).getByRole('link', { name: 'Open Thread' })
    ).toHaveAttribute(
      'href',
      '/admin/filemaker/mail/threads/thread-billing-1?accountId=account-2&mailboxPath=Archive&panel=search&searchQuery=billing'
    );
    expect(within(focusedMailbox).getByText('Billing mailbox sync follow-up')).toBeInTheDocument();
    expect(within(focusedMailbox).getByRole('link', { name: 'Show All' })).toHaveAttribute(
      'href',
      '/admin/filemaker/mail-client?scope=attention&query=billing'
    );
    expect(routerReplaceMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Open Workspace' }));
    expect(routerPushMock).toHaveBeenCalledWith(
      '/admin/filemaker/mail?accountId=account-2&panel=settings'
    );

    routerPushMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Add Mailbox' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail?panel=settings');

    routerPushMock.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'Compose' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail/compose?accountId=account-1');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Filter mailboxes and recent threads' }), {
      target: { value: 'billing ops' },
    });

    await waitFor(() => {
      expect(routerReplaceMock).toHaveBeenCalledWith(
        '/admin/filemaker/mail-client?scope=attention&accountId=account-2&query=billing+ops'
      );
    });
  });

  it('shows a workspace empty state when no mailboxes exist', async () => {
    const { AdminFilemakerMailClientPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailClientPage'
    );

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts') {
        return Response.json({ accounts: [] });
      }
      if (url === '/api/filemaker/mail/folders') {
        return Response.json({ folders: [] });
      }
      if (url === '/api/filemaker/mail/threads?limit=6') {
        return Response.json({ threads: [] });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<AdminFilemakerMailClientPage />);

    expect(await screen.findByText('No mailboxes configured yet.')).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('link', { name: 'Add Mailbox' })
        .some((link) => link.getAttribute('href') === '/admin/filemaker/mail?panel=settings')
    ).toBe(true);
    expect(
      screen
        .getAllByRole('link', { name: 'Open Workspace' })
        .some((link) => link.getAttribute('href') === '/admin/filemaker/mail')
    ).toBe(true);
  });

  it('syncs and pauses a mailbox from the landing page', async () => {
    const { AdminFilemakerMailClientPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailClientPage'
    );

    let accounts = [
      {
        id: 'account-1',
        name: 'Support inbox',
        emailAddress: 'support@example.com',
        provider: 'imap_smtp',
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
        createdAt: '2026-04-20T08:00:00.000Z',
        updatedAt: '2026-04-20T08:00:00.000Z',
      },
    ];

    const folders = [
      {
        id: 'folder-1',
        accountId: 'account-1',
        mailboxPath: 'INBOX',
        mailboxRole: 'inbox',
        threadCount: 12,
        unreadCount: 3,
        lastMessageAt: '2026-04-23T09:00:00.000Z',
      },
    ];

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return Response.json({ accounts });
      }

      if (url === '/api/filemaker/mail/folders' && !init?.method) {
        return Response.json({ folders });
      }

      if (url === '/api/filemaker/mail/threads?limit=6' && !init?.method) {
        return Response.json({
          threads: [
            {
              id: 'thread-1',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              providerThreadId: null,
              subject: 'Sync validation thread',
              normalizedSubject: 'sync validation thread',
              snippet: 'Mailbox update preview',
              participantSummary: [{ address: 'jane@example.com', name: 'Jane Example' }],
              relatedPersonIds: [],
              relatedOrganizationIds: [],
              unreadCount: 1,
              messageCount: 2,
              lastMessageAt: '2026-04-23T09:30:00.000Z',
              createdAt: '2026-04-23T09:00:00.000Z',
              updatedAt: '2026-04-23T09:30:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/accounts/account-1/sync' && init?.method === 'POST') {
        accounts = accounts.map((account) =>
          account.id === 'account-1'
            ? {
                ...account,
                lastSyncedAt: '2026-04-23T11:00:00.000Z',
                updatedAt: '2026-04-23T11:00:00.000Z',
              }
            : account
        );
        return Response.json({
          result: {
            fetchedMessageCount: 5,
            lastSyncError: null,
          },
        });
      }

      if (url === '/api/filemaker/mail/accounts/account-1/status' && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body)) as { status: 'active' | 'paused' };
        accounts = accounts.map((account) =>
          account.id === 'account-1'
            ? {
                ...account,
                status: body.status,
                updatedAt: '2026-04-23T12:00:00.000Z',
              }
            : account
        );
        return Response.json({ account: accounts[0] });
      }

      throw new Error(`Unexpected fetch: ${url} (${init?.method ?? 'GET'})`);
    });

    render(<AdminFilemakerMailClientPage />);

    const mailboxCard = await screen.findByTestId('mail-client-account-account-1');
    expect(screen.getByText('All connected mailboxes currently look healthy.')).toBeInTheDocument();

    fireEvent.click(within(mailboxCard).getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/mail/accounts/account-1/sync',
        expect.objectContaining({ method: 'POST' })
      );
    });

    await waitFor(() => {
      expect(within(mailboxCard).queryByText('Last sync: Never')).not.toBeInTheDocument();
      expect(within(mailboxCard).getByText(/^Last sync:/)).toBeInTheDocument();
    });

    fireEvent.click(within(mailboxCard).getByRole('button', { name: 'Pause' }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/filemaker/mail/accounts/account-1/status',
        expect.objectContaining({ method: 'PATCH' })
      );
    });

    await waitFor(() => {
      expect(within(mailboxCard).getByText('paused')).toBeInTheDocument();
      expect(within(mailboxCard).getByRole('button', { name: 'Resume' })).toBeInTheDocument();
    });

    const attentionCard = await screen.findByTestId('mail-client-attention-account-account-1');
    expect(within(attentionCard).getByRole('button', { name: 'Resume' })).toBeInTheDocument();
  });

  it('keeps mailbox cards visible when recent activity fails to load', async () => {
    const { AdminFilemakerMailClientPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailClientPage'
    );

    fetchMock.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts') {
        return Response.json({
          accounts: [
            {
              id: 'account-1',
              name: 'Support inbox',
              emailAddress: 'support@example.com',
              provider: 'imap_smtp',
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
              lastSyncedAt: '2026-04-23T08:00:00.000Z',
              lastSyncError: null,
              createdAt: '2026-04-20T08:00:00.000Z',
              updatedAt: '2026-04-23T08:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/folders') {
        return Response.json({
          folders: [
            {
              id: 'folder-1',
              accountId: 'account-1',
              mailboxPath: 'INBOX',
              mailboxRole: 'inbox',
              threadCount: 12,
              unreadCount: 3,
              lastMessageAt: '2026-04-23T09:00:00.000Z',
            },
          ],
        });
      }

      if (url === '/api/filemaker/mail/threads?limit=6') {
        throw new Error('Recent activity is temporarily unavailable');
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    render(<AdminFilemakerMailClientPage />);

    expect(await screen.findByRole('heading', { name: 'Support inbox' })).toBeInTheDocument();
    expect(screen.getByText('Recent activity is temporarily unavailable')).toBeInTheDocument();
    expect(screen.queryByText('Mail client data could not be loaded.')).not.toBeInTheDocument();
  });
});
