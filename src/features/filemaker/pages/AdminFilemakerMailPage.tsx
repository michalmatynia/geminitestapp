'use client';

import { Inbox, MailPlus, RefreshCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';

import type { FilemakerMailAccount, FilemakerMailAccountDraft, FilemakerMailThread } from '../types';
import { Badge, Button, FormField, FormSection, Input, Checkbox, ActionMenu, DropdownMenuItem, useToast } from '@/shared/ui';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type ThreadsResponse = { threads: FilemakerMailThread[] };

const defaultDraft = (): FilemakerMailAccountDraft => ({
  name: '',
  emailAddress: '',
  status: 'active',
  imapHost: '',
  imapPort: 993,
  imapSecure: true,
  imapUser: '',
  imapPassword: '',
  smtpHost: '',
  smtpPort: 465,
  smtpSecure: true,
  smtpUser: '',
  smtpPassword: '',
  fromName: null,
  replyToEmail: null,
  folderAllowlist: [],
  initialSyncLookbackDays: 30,
  maxMessagesPerSync: 100,
});

const fetchJson = async <T,>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return (await response.json()) as T;
};

export function AdminFilemakerMailPage(): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FilemakerMailAccountDraft>(defaultDraft);
  const [folderAllowlistValue, setFolderAllowlistValue] = useState('');

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [accountsResult, threadsResult] = await Promise.all([
        fetchJson<AccountsResponse>('/api/filemaker/mail/accounts'),
        fetchJson<ThreadsResponse>(
          `/api/filemaker/mail/threads${deferredQuery ? `?query=${encodeURIComponent(deferredQuery)}` : ''}`
        ),
      ]);
      setAccounts(accountsResult.accounts);
      setThreads(threadsResult.threads);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load Filemaker mail.', {
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [deferredQuery, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreateAccount = useCallback(async (): Promise<void> => {
    setIsSavingAccount(true);
    try {
      await fetchJson<{ account: FilemakerMailAccount }>('/api/filemaker/mail/accounts', {
        method: 'POST',
        body: JSON.stringify({
          ...draft,
          folderAllowlist: folderAllowlistValue
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean),
        }),
      });
      toast('Mailbox account saved.', { variant: 'success' });
      setDraft(defaultDraft());
      setFolderAllowlistValue('');
      await load();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save mailbox account.', {
        variant: 'error',
      });
    } finally {
      setIsSavingAccount(false);
    }
  }, [draft, folderAllowlistValue, load, toast]);

  const handleSyncAccount = useCallback(
    async (accountId: string): Promise<void> => {
      setSyncingAccountId(accountId);
      try {
        const result = await fetchJson<{ result: { fetchedMessageCount: number } }>(
          `/api/filemaker/mail/accounts/${encodeURIComponent(accountId)}/sync`,
          { method: 'POST' }
        );
        toast(`Mailbox sync finished. Messages fetched: ${result.result.fetchedMessageCount}.`, {
          variant: 'success',
        });
        await load();
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Mailbox sync failed.', {
          variant: 'error',
        });
      } finally {
        setSyncingAccountId(null);
      }
    },
    [load, toast]
  );

  const columns = useMemo<ColumnDef<FilemakerMailThread>[]>(
    () => [
      {
        id: 'subject',
        header: 'Thread',
        cell: ({ row }) => (
          <div className='min-w-0 space-y-1'>
            <div className='truncate text-sm font-semibold text-white'>{row.original.subject}</div>
            <div className='truncate text-[11px] text-gray-500'>
              {row.original.participantSummary
                .map((participant) => participant.name ?? participant.address)
                .join(', ')}
            </div>
            {row.original.snippet ? (
              <div className='line-clamp-2 text-[11px] text-gray-400'>{row.original.snippet}</div>
            ) : null}
          </div>
        ),
      },
      {
        id: 'mailbox',
        header: 'Mailbox',
        cell: ({ row }) => (
          <div className='space-y-0.5 text-[11px] text-gray-500'>
            <div>{row.original.mailboxPath}</div>
            <div className='capitalize'>Unread: {row.original.unreadCount}</div>
          </div>
        ),
      },
      {
        accessorKey: 'lastMessageAt',
        header: 'Last Activity',
        cell: ({ row }) => (
          <div className='text-[11px] text-gray-500'>
            {new Date(row.original.lastMessageAt).toLocaleString()}
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <ActionMenu ariaLabel={`Actions for thread ${row.original.subject}`}>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  router.push(
                    `/admin/filemaker/mail/threads/${encodeURIComponent(row.original.id)}`
                  );
                }}
              >
                Open Thread
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [router]
  );

  return (
    <div className='page-section-compact space-y-6'>
      <div className='rounded-lg border border-border/60 bg-card/25 p-4'>
        <div className='mb-4 flex items-center justify-between gap-3'>
          <div>
            <div className='text-sm font-semibold text-white'>Mailbox Accounts</div>
            <div className='text-xs text-gray-500'>
              Add IMAP/SMTP accounts for Filemaker inbox sync and replies.
            </div>
          </div>
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={(): void => {
              router.push('/admin/filemaker/mail/compose');
            }}
          >
            <MailPlus className='mr-2 size-4' />
            Compose Email
          </Button>
        </div>

        <div className='grid gap-4 lg:grid-cols-[1.3fr_1fr]'>
          <div className='space-y-3'>
            {accounts.length === 0 ? (
              <div className='rounded-md border border-dashed border-border/60 p-4 text-sm text-gray-500'>
                No mailboxes configured yet.
              </div>
            ) : (
              accounts.map((account) => (
                <div
                  key={account.id}
                  className='rounded-md border border-border/60 bg-card/25 p-3 text-sm text-gray-300'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div>
                      <div className='font-medium text-white'>{account.name}</div>
                      <div className='text-[11px] text-gray-500'>{account.emailAddress}</div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='text-[10px] capitalize'>
                        {account.status}
                      </Badge>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        disabled={syncingAccountId === account.id}
                        onClick={(): void => {
                          void handleSyncAccount(account.id);
                        }}
                      >
                        <RefreshCcw className='mr-2 size-4' />
                        {syncingAccountId === account.id ? 'Syncing...' : 'Sync'}
                      </Button>
                    </div>
                  </div>
                  <div className='mt-2 grid gap-2 text-[11px] text-gray-500 md:grid-cols-2'>
                    <div>
                      IMAP: {account.imapHost}:{account.imapPort}
                    </div>
                    <div>
                      SMTP: {account.smtpHost}:{account.smtpPort}
                    </div>
                    <div>
                      Last sync:{' '}
                      {account.lastSyncedAt
                        ? new Date(account.lastSyncedAt).toLocaleString()
                        : 'Never'}
                    </div>
                    <div>
                      Folders:{' '}
                      {account.folderAllowlist.length > 0
                        ? formatFilemakerMailboxAllowlist(account.folderAllowlist)
                        : 'Auto'}
                    </div>
                  </div>
                  {account.lastSyncError ? (
                    <div className='mt-2 text-[11px] text-red-400'>{account.lastSyncError}</div>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <FormSection title='Add Mailbox' className='space-y-3 p-4'>
            <FormField label='Mailbox name'>
              <Input
                value={draft.name}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder='Primary support inbox'
              />
            </FormField>
            <FormField label='Email address'>
              <Input
                value={draft.emailAddress}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setDraft((prev) => ({ ...prev, emailAddress: event.target.value }))
                }
                placeholder='support@example.com'
              />
            </FormField>
            <div className='grid gap-3 md:grid-cols-2'>
              <FormField label='IMAP host'>
                <Input
                  value={draft.imapHost}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, imapHost: event.target.value }))
                  }
                  placeholder='imap.example.com'
                />
              </FormField>
              <FormField label='IMAP port'>
                <Input
                  value={String(draft.imapPort)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({
                      ...prev,
                      imapPort: Number.parseInt(event.target.value, 10) || 993,
                    }))
                  }
                />
              </FormField>
              <FormField label='IMAP user'>
                <Input
                  value={draft.imapUser}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, imapUser: event.target.value }))
                  }
                />
              </FormField>
              <FormField label='IMAP password'>
                <Input
                  type='password'
                  value={draft.imapPassword}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, imapPassword: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <FormField label='SMTP host'>
                <Input
                  value={draft.smtpHost}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, smtpHost: event.target.value }))
                  }
                  placeholder='smtp.example.com'
                />
              </FormField>
              <FormField label='SMTP port'>
                <Input
                  value={String(draft.smtpPort)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({
                      ...prev,
                      smtpPort: Number.parseInt(event.target.value, 10) || 465,
                    }))
                  }
                />
              </FormField>
              <FormField label='SMTP user'>
                <Input
                  value={draft.smtpUser}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, smtpUser: event.target.value }))
                  }
                />
              </FormField>
              <FormField label='SMTP password'>
                <Input
                  type='password'
                  value={draft.smtpPassword}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, smtpPassword: event.target.value }))
                  }
                />
              </FormField>
            </div>
            <div className='grid gap-3 md:grid-cols-2'>
              <FormField label='From name'>
                <Input
                  value={draft.fromName ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, fromName: event.target.value || null }))
                  }
                  placeholder='Filemaker Team'
                />
              </FormField>
              <FormField label='Reply-to email'>
                <Input
                  value={draft.replyToEmail ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({ ...prev, replyToEmail: event.target.value || null }))
                  }
                  placeholder='reply@example.com'
                />
              </FormField>
            </div>
            <FormField label='Mailbox allowlist'>
              <Input
                value={folderAllowlistValue}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                  setFolderAllowlistValue(event.target.value)
                }
                placeholder='INBOX, Sent'
              />
            </FormField>
            <div className='grid gap-3 md:grid-cols-2'>
              <FormField label='Initial sync lookback (days)'>
                <Input
                  value={String(draft.initialSyncLookbackDays)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({
                      ...prev,
                      initialSyncLookbackDays: Number.parseInt(event.target.value, 10) || 30,
                    }))
                  }
                />
              </FormField>
              <FormField label='Max messages per sync'>
                <Input
                  value={String(draft.maxMessagesPerSync)}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setDraft((prev) => ({
                      ...prev,
                      maxMessagesPerSync: Number.parseInt(event.target.value, 10) || 100,
                    }))
                  }
                />
              </FormField>
            </div>
            <div className='flex items-center gap-6'>
              <label
                htmlFor='filemaker-mail-account-imap-secure'
                className='flex items-center gap-2 text-sm text-white'
              >
                <Checkbox
                  id='filemaker-mail-account-imap-secure'
                  checked={draft.imapSecure}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, imapSecure: checked === true }))
                  }
                />
                IMAP secure
              </label>
              <label
                htmlFor='filemaker-mail-account-smtp-secure'
                className='flex items-center gap-2 text-sm text-white'
              >
                <Checkbox
                  id='filemaker-mail-account-smtp-secure'
                  checked={draft.smtpSecure}
                  onCheckedChange={(checked) =>
                    setDraft((prev) => ({ ...prev, smtpSecure: checked === true }))
                  }
                />
                SMTP secure
              </label>
            </div>
            <Button
              type='button'
              onClick={(): void => {
                void handleCreateAccount();
              }}
              disabled={isSavingAccount}
            >
              {isSavingAccount ? 'Saving mailbox...' : 'Save Mailbox'}
            </Button>
          </FormSection>
        </div>
      </div>

      <FilemakerEntityTablePage
        title='Filemaker Mail'
        description='Browse synced mailbox threads and open a reply workspace.'
        icon={<Inbox className='size-4' />}
        actions={[
          {
            key: 'compose',
            label: 'Compose',
            icon: <MailPlus className='size-4' />,
            onClick: () => router.push('/admin/filemaker/mail/compose'),
          },
          ...buildFilemakerNavActions(router, 'mail'),
        ]}
        badges={
          <>
            <Badge variant='outline' className='text-[10px]'>
              Accounts: {accounts.length}
            </Badge>
            <Badge variant='outline' className='text-[10px]'>
              Threads: {threads.length}
            </Badge>
          </>
        }
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder='Search subject, snippet, or participant...'
        columns={columns}
        data={threads}
        isLoading={isLoading}
        emptyTitle='No synced threads yet'
        emptyDescription='Add a mailbox account and run sync to populate the Filemaker inbox.'
      />
    </div>
  );
}
