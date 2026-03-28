'use client';

import {
  Inbox,
  Mail,
  MailPlus,
  RefreshCcw,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge, Button, Checkbox, FormField, FormSection, Input, useToast } from '@/shared/ui';

import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';
import { formatFilemakerMailFolderLabel } from '../mail-master-tree';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';

import type {
  FilemakerMailAccount,
  FilemakerMailAccountDraft,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type FoldersResponse = { folders: FilemakerMailFolderSummary[] };
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

const toDraftFromAccount = (account: FilemakerMailAccount): FilemakerMailAccountDraft => ({
  id: account.id,
  name: account.name,
  emailAddress: account.emailAddress,
  status: account.status,
  imapHost: account.imapHost,
  imapPort: account.imapPort,
  imapSecure: account.imapSecure,
  imapUser: account.imapUser,
  imapPassword: '',
  smtpHost: account.smtpHost,
  smtpPort: account.smtpPort,
  smtpSecure: account.smtpSecure,
  smtpUser: account.smtpUser,
  smtpPassword: '',
  fromName: account.fromName ?? null,
  replyToEmail: account.replyToEmail ?? null,
  folderAllowlist: account.folderAllowlist,
  initialSyncLookbackDays: account.initialSyncLookbackDays,
  maxMessagesPerSync: account.maxMessagesPerSync,
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

const buildMailSelectionHref = (input: {
  accountId?: string | null;
  mailboxPath?: string | null;
  panel?: 'account' | 'settings' | null;
}): string => {
  const search = new URLSearchParams();
  if (input.accountId) search.set('accountId', input.accountId);
  if (input.mailboxPath) search.set('mailboxPath', input.mailboxPath);
  if (input.accountId && input.panel === 'settings') search.set('panel', 'settings');
  const nextSearch = search.toString();
  return nextSearch ? `/admin/filemaker/mail?${nextSearch}` : '/admin/filemaker/mail';
};

export function AdminFilemakerMailPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [selection, setSelection] = useState<{
    accountId: string | null;
    mailboxPath: string | null;
    panel: 'account' | 'settings' | null;
  }>({
    accountId: searchParams.get('accountId'),
    mailboxPath: searchParams.get('mailboxPath'),
    panel: searchParams.get('panel') === 'settings' ? 'settings' : null,
  });
  const [isNavigationLoading, setIsNavigationLoading] = useState(true);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FilemakerMailAccountDraft>(defaultDraft);
  const [folderAllowlistValue, setFolderAllowlistValue] = useState('');
  const requestedAccountId = searchParams.get('accountId');
  const requestedMailboxPath = searchParams.get('mailboxPath');
  const requestedPanel = searchParams.get('panel') === 'settings' ? 'settings' : null;
  const selectedAccountId = selection.accountId;
  const selectedMailboxPath = selection.mailboxPath;
  const selectedPanel = selection.panel;
  const selectedAccount = useMemo(() => {
    return accounts.find((account) => account.id === selectedAccountId) ?? null;
  }, [accounts, selectedAccountId]);
  const selectedFolder = useMemo(() => {
    if (!selectedAccountId || !selectedMailboxPath) return null;
    return (
      folders.find(
        (folder) =>
          folder.accountId === selectedAccountId &&
          folder.mailboxPath === selectedMailboxPath
      ) ?? null
    );
  }, [folders, selectedAccountId, selectedMailboxPath]);

  const loadNavigation = useCallback(async (): Promise<void> => {
    setIsNavigationLoading(true);
    try {
      const [accountsResult, foldersResult] = await Promise.all([
        fetchJson<AccountsResponse>('/api/filemaker/mail/accounts'),
        fetchJson<FoldersResponse>('/api/filemaker/mail/folders'),
      ]);
      setAccounts(accountsResult.accounts);
      setFolders(foldersResult.folders);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load Filemaker mail.', {
        variant: 'error',
      });
    } finally {
      setIsNavigationLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadNavigation();
  }, [loadNavigation]);

  useEffect(() => {
    setSelection({
      accountId: requestedAccountId,
      mailboxPath: requestedMailboxPath,
      panel: requestedPanel,
    });
  }, [requestedAccountId, requestedMailboxPath, requestedPanel]);

  useEffect(() => {
    if (!selectedAccount) {
      setDraft(defaultDraft());
      setFolderAllowlistValue('');
      return;
    }
    setDraft(toDraftFromAccount(selectedAccount));
    setFolderAllowlistValue(formatFilemakerMailboxAllowlist(selectedAccount.folderAllowlist));
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedFolder) {
      setThreads([]);
      return;
    }

    const loadThreads = async (): Promise<void> => {
      setIsThreadsLoading(true);
      try {
        const result = await fetchJson<ThreadsResponse>(
          `/api/filemaker/mail/threads?accountId=${encodeURIComponent(selectedFolder.accountId)}&mailboxPath=${encodeURIComponent(selectedFolder.mailboxPath)}${
            deferredQuery ? `&query=${encodeURIComponent(deferredQuery)}` : ''
          }`
        );
        setThreads(result.threads);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to load mail threads.', {
          variant: 'error',
        });
      } finally {
        setIsThreadsLoading(false);
      }
    };

    void loadThreads();
  }, [deferredQuery, selectedFolder, toast]);

  useEffect(() => {
    if (isNavigationLoading) return;
    if (selection.accountId && selection.mailboxPath && selectedFolder) return;
    if (selection.accountId && !selection.mailboxPath && selectedAccount) return;

    const nextSelection =
      selection.accountId && selection.mailboxPath
        ? accounts.some((account) => account.id === selection.accountId)
          ? {
              accountId: selection.accountId,
              mailboxPath: null as string | null,
              panel: selection.panel,
            }
          : { accountId: null, mailboxPath: null, panel: null }
        : selection.accountId && !selectedAccount
          ? { accountId: null, mailboxPath: null, panel: null }
          : null;

    if (!nextSelection) {
      return;
    }
    setSelection(nextSelection);
  }, [
    accounts,
    isNavigationLoading,
    selectedAccount,
    selectedFolder,
    selection.accountId,
    selection.mailboxPath,
    selection.panel,
  ]);

  useEffect(() => {
    if (isNavigationLoading) return;
    const nextAccountId = selection.accountId ?? null;
    const nextMailboxPath = selection.mailboxPath ?? null;
    const nextPanel = selection.panel ?? null;
    if (
      (requestedAccountId ?? null) === nextAccountId &&
      (requestedMailboxPath ?? null) === nextMailboxPath &&
      requestedPanel === nextPanel
    ) {
      return;
    }
    router.replace(
      buildMailSelectionHref({
        accountId: nextAccountId,
        mailboxPath: nextMailboxPath,
        panel: nextPanel,
      })
    );
  }, [
    isNavigationLoading,
    requestedAccountId,
    requestedMailboxPath,
    requestedPanel,
    router,
    selection.accountId,
    selection.mailboxPath,
    selection.panel,
  ]);

  const handleSaveAccount = useCallback(async (): Promise<void> => {
    setIsSavingAccount(true);
    try {
      const payload = {
        ...draft,
        folderAllowlist: folderAllowlistValue
          .split(',')
          .map((entry) => entry.trim())
          .filter(Boolean),
      };
      const result = await fetchJson<{ account: FilemakerMailAccount }>(
        '/api/filemaker/mail/accounts',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );
      toast(draft.id ? 'Mailbox account updated.' : 'Mailbox account saved.', {
        variant: 'success',
      });
      await loadNavigation();
      setSelection({ accountId: result.account.id, mailboxPath: null, panel: 'settings' });
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to save mailbox account.', {
        variant: 'error',
      });
    } finally {
      setIsSavingAccount(false);
    }
  }, [draft, folderAllowlistValue, loadNavigation, toast]);

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
        await loadNavigation();
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Mailbox sync failed.', {
          variant: 'error',
        });
      } finally {
        setSyncingAccountId(null);
      }
    },
    [loadNavigation, toast]
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
            <Button
              type='button'
              size='sm'
              variant='outline'
              onClick={(): void => {
                router.push(
                  `/admin/filemaker/mail/threads/${encodeURIComponent(row.original.id)}?accountId=${encodeURIComponent(row.original.accountId)}&mailboxPath=${encodeURIComponent(row.original.mailboxPath)}`
                );
              }}
            >
              Open Thread
            </Button>
          </div>
        ),
      },
    ],
    [router]
  );

  const selectedAccountLabel = selectedAccount?.name ?? 'New mailbox account';
  const selectedFolderLabel = selectedFolder
    ? formatFilemakerMailFolderLabel(selectedFolder.mailboxPath, selectedFolder.mailboxRole)
    : null;

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar
        selectedAccountId={selectedAccountId}
        selectedMailboxPath={selectedMailboxPath}
        selectedPanel={selectedPanel}
        onNewMailbox={() => {
          setSelection({ accountId: null, mailboxPath: null, panel: null });
        }}
        onSelectAccount={(accountId) => {
          setSelection({ accountId, mailboxPath: null, panel: 'account' });
        }}
        onSelectAccountSettings={(accountId) => {
          setSelection({ accountId, mailboxPath: null, panel: 'settings' });
        }}
        onSelectFolder={({ accountId, mailboxPath }) => {
          setSelection({ accountId, mailboxPath, panel: null });
        }}
      />

      {selectedFolder ? (
        <FilemakerEntityTablePage
          title={`${selectedAccountLabel} / ${selectedFolderLabel}`}
          description='Browse synced mailbox threads and open a reply workspace.'
          icon={<Inbox className='size-4' />}
          actions={[
            {
              key: 'compose',
              label: 'Compose',
              icon: <MailPlus className='size-4' />,
              onClick: () =>
                router.push(
                  `/admin/filemaker/mail/compose?accountId=${encodeURIComponent(selectedFolder.accountId)}&mailboxPath=${encodeURIComponent(selectedFolder.mailboxPath)}`
                ),
            },
            ...(selectedAccount
              ? [
                  {
                    key: 'sync',
                    label:
                      syncingAccountId === selectedAccount.id ? 'Syncing...' : 'Sync',
                    icon: <RefreshCcw className='size-4' />,
                    variant: 'outline' as const,
                    disabled: syncingAccountId === selectedAccount.id,
                    onClick: () => {
                      void handleSyncAccount(selectedAccount.id);
                    },
                  },
                ]
              : []),
            {
              key: 'account',
              label: 'Open Account',
              icon: <Mail className='size-4' />,
              variant: 'outline',
              onClick: () =>
                setSelection({
                  accountId: selectedFolder.accountId,
                  mailboxPath: null,
                  panel: 'settings',
                }),
            },
            ...buildFilemakerNavActions(router, 'mail'),
          ]}
          badges={
            <>
              <Badge variant='outline' className='text-[10px]'>
                Threads: {selectedFolder.threadCount}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                Unread: {selectedFolder.unreadCount}
              </Badge>
            </>
          }
          query={query}
          onQueryChange={setQuery}
          queryPlaceholder='Search subject, snippet, or participant...'
          columns={columns}
          data={threads}
          isLoading={isNavigationLoading || isThreadsLoading}
          emptyTitle='No synced threads in this folder yet'
          emptyDescription='Run mailbox sync or select another folder.'
        />
      ) : (
        <div className='space-y-6 rounded-lg border border-border/60 bg-card/25 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='text-base font-semibold text-white'>{selectedAccountLabel}</div>
              <div className='text-sm text-gray-500'>
                {selectedAccount
                  ? 'Update mailbox connection settings and run sync from here.'
                  : 'Create a new IMAP/SMTP mailbox for Filemaker mail sync and replies.'}
              </div>
            </div>
            {selectedAccount ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={syncingAccountId === selectedAccount.id}
                onClick={(): void => {
                  void handleSyncAccount(selectedAccount.id);
                }}
              >
                <RefreshCcw className='mr-2 size-4' />
                {syncingAccountId === selectedAccount.id ? 'Syncing...' : 'Sync'}
              </Button>
            ) : null}
          </div>

          {selectedAccount ? (
            <div className='grid gap-3 text-xs text-gray-500 md:grid-cols-3'>
              <div>
                Last sync:{' '}
                {selectedAccount.lastSyncedAt
                  ? new Date(selectedAccount.lastSyncedAt).toLocaleString()
                  : 'Never'}
              </div>
              <div>
                Allowlist:{' '}
                {selectedAccount.folderAllowlist.length > 0
                  ? formatFilemakerMailboxAllowlist(selectedAccount.folderAllowlist)
                  : 'Auto'}
              </div>
              <div>Status: {selectedAccount.status}</div>
              {selectedAccount.lastSyncError ? (
                <div className='md:col-span-3 text-red-400'>{selectedAccount.lastSyncError}</div>
              ) : null}
            </div>
          ) : null}

          <FormSection title={selectedAccount ? 'Mailbox Settings' : 'Add Mailbox'} className='space-y-3 p-4'>
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
                  placeholder={selectedAccount ? 'Leave blank to keep current password' : ''}
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
                  placeholder={selectedAccount ? 'Leave blank to keep current password' : ''}
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
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                onClick={(): void => {
                  void handleSaveAccount();
                }}
                disabled={isSavingAccount}
              >
                {isSavingAccount
                  ? selectedAccount
                    ? 'Updating mailbox...'
                    : 'Saving mailbox...'
                  : selectedAccount
                    ? 'Update Mailbox'
                    : 'Save Mailbox'}
              </Button>
              {selectedAccount ? (
                <Button
                  type='button'
                  variant='outline'
                  onClick={(): void => {
                    router.push(`/admin/filemaker/mail/compose?accountId=${encodeURIComponent(selectedAccount.id)}`);
                  }}
                >
                  <MailPlus className='mr-2 size-4' />
                  Compose from Account
                </Button>
              ) : null}
            </div>
          </FormSection>
        </div>
      )}
    </div>
  );
}
