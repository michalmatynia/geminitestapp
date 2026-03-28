import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  routerPushMock,
  routerReplaceMock,
  searchParamsGetMock,
  routeParamsMock,
  toastMock,
  fetchMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerReplaceMock: vi.fn(),
  searchParamsGetMock: vi.fn<(key: string) => string | null>(),
  routeParamsMock: { threadId: 'thread-1' as string | string[] | undefined },
  toastMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
  }),
  useSearchParams: () => ({
    get: searchParamsGetMock,
  }),
  useParams: () => routeParamsMock,
}));

vi.mock('@/features/document-editor/components/DocumentWysiwygEditor', () => ({
  DocumentWysiwygEditor: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }) => (
    <textarea
      aria-label={placeholder ?? 'Document editor'}
      data-testid='document-wysiwyg-editor'
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('@/shared/ui/FolderTreePanel', () => ({
  FolderTreePanel: ({
    header,
    children,
  }: {
    header?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <section>
      {header}
      {children}
    </section>
  ),
}));

vi.mock('@/features/foldertree/public', () => ({
  useMasterFolderTreeShell: ({
    nodes,
  }: {
    nodes: Array<Record<string, unknown>>;
  }) => ({
    controller: { nodes },
    appearance: { rootDropUi: null },
    viewport: { scrollToNodeRef: { current: null } },
  }),
  FolderTreeViewportV2: ({
    controller,
    renderNode,
    emptyLabel,
  }: {
    controller: { nodes: Array<Record<string, unknown>> };
    renderNode: (input: {
      node: Record<string, unknown>;
      depth: number;
      hasChildren: boolean;
      isExpanded: boolean;
      isSelected: boolean;
      select: (event: React.MouseEvent<HTMLButtonElement>) => void;
      toggleExpand: () => void;
    }) => React.ReactNode;
    emptyLabel?: string;
  }) => {
    const nodes = controller.nodes ?? [];
    if (nodes.length === 0) return <div>{emptyLabel ?? 'No nodes'}</div>;
    return (
      <div>
        {nodes.map((node) => {
          const nodeId = String(node['id'] ?? '');
          const parentId = node['parentId'];
          const hasChildren = nodes.some((entry) => entry['parentId'] === nodeId);
          return (
            <div key={nodeId}>
              {renderNode({
                node,
                depth: parentId ? 1 : 0,
                hasChildren,
                isExpanded: true,
                isSelected: false,
                select: () => {},
                toggleExpand: () => {},
              })}
            </div>
          );
        })}
      </div>
    );
  },
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type = 'button',
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button type={type} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  ),
  FormField: ({
    label,
    children,
    className,
  }: {
    label: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <label className={className}>
      <span>{label}</span>
      {children}
    </label>
  ),
  FormSection: ({
    title,
    children,
    className,
  }: {
    title: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <section className={className}>
      <h2>{title}</h2>
      {children}
    </section>
  ),
  Input: ({
    value,
    onChange,
    placeholder,
    type = 'text',
    id,
    'aria-label': ariaLabel,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    type?: string;
    id?: string;
    'aria-label'?: string;
  }) => (
    <input
      id={id}
      aria-label={ariaLabel}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  PanelHeader: ({
    title,
    description,
    actions = [],
  }: {
    title: string;
    description?: string;
    actions?: Array<{ key: string; label: string; onClick: () => void }>;
  }) => (
    <header>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      <div>
        {actions.map((action) => (
          <button key={action.key} type='button' onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
    </header>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    placeholder,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? placeholder ?? 'Select'}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value=''>{placeholder ?? 'Select'}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
  Checkbox: ({
    checked,
    onCheckedChange,
    id,
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    id?: string;
  }) => (
    <input
      id={id}
      type='checkbox'
      checked={checked}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
    />
  ),
  ActionMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect?: (event: Event) => void;
  }) => (
    <button
      type='button'
      onClick={() => onSelect?.({ preventDefault() {} } as Event)}
    >
      {children}
    </button>
  ),
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/features/filemaker/components/shared/FilemakerEntityTablePage', () => ({
  FilemakerEntityTablePage: ({
    title,
    description,
    actions,
    badges,
    query,
    onQueryChange,
    queryPlaceholder,
    data,
  }: {
    title: string;
    description: string;
    actions: Array<{ key: string; label: string; onClick: () => void }>;
    badges: React.ReactNode;
    query: string;
    onQueryChange: (value: string) => void;
    queryPlaceholder: string;
    data: Array<{ id: string; subject?: string }>;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{badges}</div>
      <input
        aria-label={queryPlaceholder}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
      <div>
        {actions.map((action) => (
          <button key={action.key} type='button' onClick={action.onClick}>
            {action.label}
          </button>
        ))}
      </div>
      <ul>
        {data.map((item) => (
          <li key={item.id}>{item.subject ?? item.id}</li>
        ))}
      </ul>
    </section>
  ),
}));

type MockResponseBody = Record<string, unknown>;

const jsonResponse = (body: MockResponseBody, status: number = 200): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('AdminFilemakerMail pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsGetMock.mockReturnValue(null);
    routeParamsMock.threadId = 'thread-1';
    vi.stubGlobal('fetch', fetchMock);
  });

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
