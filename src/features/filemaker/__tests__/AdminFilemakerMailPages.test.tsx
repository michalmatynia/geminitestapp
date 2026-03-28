import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  routerPushMock,
  searchParamsGetMock,
  routeParamsMock,
  toastMock,
  fetchMock,
} = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  searchParamsGetMock: vi.fn<(key: string) => string | null>(),
  routeParamsMock: { threadId: 'thread-1' as string | string[] | undefined },
  toastMock: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPushMock,
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
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
    type?: string;
  }) => <input type={type} value={value} onChange={onChange} placeholder={placeholder} />,
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
    data,
  }: {
    title: string;
    description: string;
    actions: Array<{ key: string; label: string; onClick: () => void }>;
    badges: React.ReactNode;
    data: Array<{ id: string; subject?: string }>;
  }) => (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>
      <div>{badges}</div>
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
      subject: 'Welcome',
      participantSummary: [{ address: 'jane@example.com', name: 'Jane' }],
      snippet: 'Hello',
      mailboxPath: 'INBOX',
      unreadCount: 1,
      lastMessageAt: '2026-03-28T10:00:00.000Z',
    };

    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === '/api/filemaker/mail/accounts' && !init?.method) {
        return jsonResponse({ accounts: [account] });
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

    await screen.findByText('Support inbox');
    expect(screen.getByText('Welcome')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Compose Email' }));
    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail/compose');

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Mailbox sync finished. Messages fetched: 3.',
        { variant: 'success' }
      );
    });

    fireEvent.change(screen.getByPlaceholderText('Primary support inbox'), {
      target: { value: 'Primary inbox' },
    });
    fireEvent.change(screen.getByPlaceholderText('support@example.com'), {
      target: { value: 'primary@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('imap.example.com'), {
      target: { value: 'imap.primary.test' },
    });
    fireEvent.change(screen.getByPlaceholderText('smtp.example.com'), {
      target: { value: 'smtp.primary.test' },
    });
    fireEvent.change(screen.getAllByRole('textbox')[4], {
      target: { value: 'imap-user' },
    });
    fireEvent.change(screen.getAllByRole('textbox')[6], {
      target: { value: 'smtp-user' },
    });
    fireEvent.change(screen.getByPlaceholderText('INBOX, Sent'), {
      target: { value: 'INBOX, Sent' },
    });
    fireEvent.change(screen.getAllByDisplayValue('')[0], {
      target: { value: 'imap-pass' },
    });
    fireEvent.change(screen.getAllByDisplayValue('')[1], {
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

  it('loads accounts in compose, sends an email, and navigates to the thread', async () => {
    const { AdminFilemakerMailComposePage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailComposePage'
    );
    searchParamsGetMock.mockImplementation((key: string) =>
      key === 'accountId' ? 'account-1' : null
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

    expect(routerPushMock).toHaveBeenCalledWith('/admin/filemaker/mail/threads/thread-99');
    expect(toastMock).toHaveBeenCalledWith('Email sent.', { variant: 'success' });
  });

  it('loads a thread, sends a reply, and refreshes the thread detail', async () => {
    const { AdminFilemakerMailThreadPage } = await import(
      '@/features/filemaker/pages/AdminFilemakerMailThreadPage'
    );
    routeParamsMock.threadId = 'thread%201';

    let threadLoads = 0;
    fetchMock.mockImplementation(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
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
  });
});
