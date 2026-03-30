'use client';

import {
  FilterX,
  Inbox,
  Mail,
  MailPlus,
  RefreshCcw,
  Search,
  Settings2,
  ShieldAlert,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';

import type { ColumnDef } from '@tanstack/react-table';

import {
  Badge,
  Button,
  Checkbox,
  FormField,
  FormSection,
  Input,
  SelectSimple,
  useToast,
} from '@/shared/ui';

import { FilemakerMailSidebar } from '../components/FilemakerMailSidebar';
import { buildFilemakerMailComposeHref as buildComposeHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailThreadHref as buildThreadHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';
import { formatFilemakerMailFolderLabel } from '../mail-master-tree';
import { buildFilemakerMailSelectionHref as buildMailSelectionHref, fetchFilemakerMailJson as fetchJson } from '../mail-ui-helpers';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';
import {
  createDefaultFilemakerMailDraft as defaultDraft,
  toDraftFromFilemakerMailAccount as toDraftFromAccount,
} from './AdminFilemakerMailPage.helpers';

import type {
  FilemakerMailAccount,
  FilemakerMailAccountDraft,
  FilemakerMailFolderSummary,
  FilemakerMailSearchResponse,
  FilemakerMailSearchResultGroup,
  FilemakerMailThread,
} from '../types';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type FoldersResponse = { folders: FilemakerMailFolderSummary[] };
type ThreadsResponse = { threads: FilemakerMailThread[] };

export function AdminFilemakerMailPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const rawRequestedAccountId = searchParams.get('accountId');
  const rawRequestedMailboxPath = searchParams.get('mailboxPath');
  const rawRequestedPanel = searchParams.get('panel');
  const rawRequestedSearchQuery = searchParams.get('searchQuery') ?? '';
  const rawRequestedRecentMailboxFilter = searchParams.get('recentMailbox') ?? '';
  const rawRequestedRecentUnreadOnly = searchParams.get('recentUnread') === '1';
  const rawRequestedRecentQuery = searchParams.get('recentQuery') ?? '';
  const requestedPanel =
    rawRequestedPanel === 'attention'
      ? 'attention'
      : rawRequestedPanel === 'settings'
      ? 'settings'
      : rawRequestedPanel === 'recent'
        ? 'recent'
        : rawRequestedPanel === 'search'
          ? 'search'
          : null;
  const requestedAccountId = requestedPanel === 'attention' ? null : rawRequestedAccountId;
  const requestedMailboxPath = requestedPanel ? null : rawRequestedMailboxPath;
  const requestedSearchQuery = requestedPanel === 'search' ? rawRequestedSearchQuery : '';
  const requestedRecentMailboxFilter = requestedPanel === 'recent' ? rawRequestedRecentMailboxFilter : '';
  const requestedRecentUnreadOnly = requestedPanel === 'recent' ? rawRequestedRecentUnreadOnly : false;
  const requestedRecentQuery = requestedPanel === 'recent' ? rawRequestedRecentQuery : '';
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [recentMailboxFilter, setRecentMailboxFilter] = useState('');
  const [recentUnreadOnly, setRecentUnreadOnly] = useState(false);
  const [selection, setSelection] = useState<{
    accountId: string | null;
    mailboxPath: string | null;
    panel: 'account' | 'attention' | 'recent' | 'search' | 'settings' | null;
  }>({
    accountId: requestedAccountId,
    mailboxPath: requestedMailboxPath,
    panel: requestedPanel,
  });
  const [isNavigationLoading, setIsNavigationLoading] = useState(true);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FilemakerMailAccountDraft>(defaultDraft);
  const [deepSearchQuery, setDeepSearchQuery] = useState(requestedSearchQuery);
  const [deepSearchResults, setDeepSearchResults] = useState<FilemakerMailSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [folderAllowlistValue, setFolderAllowlistValue] = useState('');
  const selectedAccountId = selection.accountId;
  const selectedMailboxPath = selection.mailboxPath;
  const selectedPanel = selection.panel;
  const attentionAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.status !== 'active' || Boolean(account.lastSyncError?.trim())
      ),
    [accounts]
  );
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
    setRecentMailboxFilter(requestedRecentMailboxFilter);
    setRecentUnreadOnly(requestedRecentUnreadOnly);
  }, [requestedRecentMailboxFilter, requestedRecentUnreadOnly]);

  useEffect(() => {
    setDeepSearchQuery(requestedSearchQuery);
  }, [requestedSearchQuery]);

  useEffect(() => {
    setQuery(requestedPanel === 'recent' ? requestedRecentQuery : '');
  }, [requestedPanel, requestedRecentQuery]);

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
    if (!selectedAccountId || (!selectedFolder && selection.panel !== 'recent')) {
      setThreads([]);
      return;
    }

    const loadThreads = async (): Promise<void> => {
      setIsThreadsLoading(true);
      try {
        const baseQuery = `/api/filemaker/mail/threads?accountId=${encodeURIComponent(
          selectedAccountId
        )}`;
        const result = await fetchJson<ThreadsResponse>(
          selection.panel === 'recent'
            ? `${baseQuery}${deferredQuery ? `&query=${encodeURIComponent(deferredQuery)}` : ''}`
            : `${baseQuery}&mailboxPath=${encodeURIComponent(selectedFolder?.mailboxPath ?? '')}${
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
  }, [deferredQuery, selectedAccountId, selectedFolder, selection.panel, toast]);

  const deferredDeepSearch = useDeferredValue(deepSearchQuery.trim());

  useEffect(() => {
    if (selection.panel !== 'search') {
      setDeepSearchResults(null);
      return;
    }
    if (!deferredDeepSearch) {
      setDeepSearchResults(null);
      return;
    }

    const runSearch = async (): Promise<void> => {
      setIsSearching(true);
      try {
        const url = `/api/filemaker/mail/search?query=${encodeURIComponent(deferredDeepSearch)}${
          selectedAccountId ? `&accountId=${encodeURIComponent(selectedAccountId)}` : ''
        }`;
        const result = await fetchJson<FilemakerMailSearchResponse>(url);
        setDeepSearchResults(result);
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Message search failed.', {
          variant: 'error',
        });
      } finally {
        setIsSearching(false);
      }
    };

    void runSearch();
  }, [deferredDeepSearch, selectedAccountId, selection.panel, toast]);

  useEffect(() => {
    if (isNavigationLoading) return;
    if (selection.panel === 'attention') return;
    if (selection.panel === 'search') return;
    if (selection.accountId && selection.panel === 'recent' && selectedAccount) return;
    if (selection.accountId && selection.mailboxPath && selectedFolder) return;
    if (selection.accountId && !selection.mailboxPath && selectedAccount) return;

    const nextSelection: typeof selection | null =
      selection.accountId && selection.mailboxPath
        ? accounts.some((account) => account.id === selection.accountId)
          ? {
              accountId: selection.accountId,
              mailboxPath: null as string | null,
              panel: selection.panel === 'recent' ? 'recent' : selection.panel,
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
    const nextPanel = selection.panel === 'account' ? null : selection.panel ?? null;
    const nextAccountId = nextPanel === 'attention' ? null : selection.accountId ?? null;
    const nextMailboxPath = nextPanel ? null : selection.mailboxPath ?? null;
    const nextRecentMailboxFilter = nextPanel === 'recent' ? recentMailboxFilter : '';
    const nextRecentUnreadOnly = nextPanel === 'recent' ? recentUnreadOnly : false;
    const nextRecentQuery = nextPanel === 'recent' ? query : '';
    const nextSearchQuery = nextPanel === 'search' ? deepSearchQuery : '';
    if (
      (rawRequestedAccountId ?? null) === nextAccountId &&
      (rawRequestedMailboxPath ?? null) === nextMailboxPath &&
      requestedPanel === nextPanel &&
      rawRequestedRecentMailboxFilter === nextRecentMailboxFilter &&
      rawRequestedRecentUnreadOnly === nextRecentUnreadOnly &&
      rawRequestedRecentQuery === nextRecentQuery &&
      rawRequestedSearchQuery === nextSearchQuery
    ) {
      return;
    }
    router.replace(
      buildMailSelectionHref({
        accountId: nextAccountId,
        mailboxPath: nextMailboxPath,
        panel: nextPanel,
        recentMailboxFilter: nextRecentMailboxFilter,
        recentUnreadOnly: nextRecentUnreadOnly,
        recentQuery: nextRecentQuery,
        searchQuery: nextSearchQuery,
      })
    );
  }, [
    deepSearchQuery,
    isNavigationLoading,
    query,
    requestedPanel,
    rawRequestedAccountId,
    rawRequestedMailboxPath,
    rawRequestedRecentMailboxFilter,
    rawRequestedRecentQuery,
    rawRequestedRecentUnreadOnly,
    rawRequestedSearchQuery,
    recentMailboxFilter,
    recentUnreadOnly,
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
  const selectedAccountLabel = selectedAccount?.name ?? 'New mailbox account';
  const selectedFolderLabel = selectedFolder
    ? formatFilemakerMailFolderLabel(selectedFolder.mailboxPath, selectedFolder.mailboxRole)
    : null;
  const isAttentionPanel = selectedPanel === 'attention';
  const isSearchPanel = selectedPanel === 'search';
  const isRecentPanel = selectedPanel === 'recent' && !selectedFolder;

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
                  buildThreadHref({
                    threadId: row.original.id,
                    accountId: row.original.accountId,
                    mailboxPath: row.original.mailboxPath,
                    originPanel: isRecentPanel ? 'recent' : null,
                    recentMailboxFilter: isRecentPanel ? recentMailboxFilter : null,
                    recentUnreadOnly: isRecentPanel ? recentUnreadOnly : false,
                    recentQuery: isRecentPanel ? query : null,
                  })
                );
              }}
            >
              Open Thread
            </Button>
          </div>
        ),
      },
    ],
    [isRecentPanel, query, recentMailboxFilter, recentUnreadOnly, router]
  );

  const recentMailboxOptions = useMemo(
    () =>
      Array.from(new Set(threads.map((thread) => thread.mailboxPath)))
        .sort((left, right) => left.localeCompare(right))
        .map((mailboxPath) => ({
          value: mailboxPath,
          label: mailboxPath,
        })),
    [threads]
  );
  const visibleThreads = useMemo(() => {
    if (!isRecentPanel) return threads;
    return threads.filter((thread) => {
      if (recentMailboxFilter && thread.mailboxPath !== recentMailboxFilter) return false;
      if (recentUnreadOnly && thread.unreadCount < 1) return false;
      return true;
    });
  }, [isRecentPanel, recentMailboxFilter, recentUnreadOnly, threads]);
  const tableActions = useMemo(
    () => [
      {
        key: 'compose',
        label: 'Compose',
        icon: <MailPlus className='size-4' />,
        onClick: () =>
          router.push(
            buildComposeHref({
              accountId: selectedAccountId,
              mailboxPath: selectedFolder?.mailboxPath ?? null,
              originPanel: isRecentPanel ? 'recent' : null,
              recentMailboxFilter: isRecentPanel ? recentMailboxFilter : null,
              recentUnreadOnly: isRecentPanel ? recentUnreadOnly : false,
              recentQuery: isRecentPanel ? query : null,
            })
          ),
      },
      ...(selectedAccount
        ? [
            {
              key: 'sync',
              label: syncingAccountId === selectedAccount.id ? 'Syncing...' : 'Sync',
              icon: <RefreshCcw className='size-4' />,
              variant: 'outline' as const,
              disabled: syncingAccountId === selectedAccount.id,
              onClick: () => {
                void handleSyncAccount(selectedAccount.id);
              },
            },
          ]
        : []),
      ...(isRecentPanel && (recentMailboxFilter || recentUnreadOnly || query)
        ? [
            {
              key: 'clear-recent-filters',
              label: 'Clear Filters',
              icon: <FilterX className='size-4' />,
              variant: 'outline' as const,
              onClick: () => {
                setQuery('');
                setRecentMailboxFilter('');
                setRecentUnreadOnly(false);
              },
            },
          ]
        : []),
      {
        key: 'search-messages',
        label: 'Search Messages',
        icon: <Search className='size-4' />,
        variant: 'outline' as const,
        onClick: () =>
          setSelection({
            accountId: selectedAccountId,
            mailboxPath: null,
            panel: 'search',
          }),
      },
      {
        key: 'account',
        label: 'Open Account',
        icon: <Mail className='size-4' />,
        variant: 'outline' as const,
        onClick: () =>
          setSelection({
            accountId: selectedAccountId,
            mailboxPath: null,
            panel: 'settings',
          }),
      },
      ...buildFilemakerNavActions(router, 'mail'),
    ],
    [
      handleSyncAccount,
      isRecentPanel,
      recentMailboxFilter,
      recentUnreadOnly,
      query,
      router,
      selectedAccount,
      selectedAccountId,
      selectedFolder,
      syncingAccountId,
    ]
  );

  return (
    <div className='page-section-compact grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]'>
      <FilemakerMailSidebar
        selectedAccountId={selectedAccountId}
        selectedMailboxPath={selectedMailboxPath}
        selectedPanel={selectedPanel}
        originPanel={isRecentPanel ? 'recent' : isSearchPanel ? 'search' : null}
        recentMailboxFilter={recentMailboxFilter}
        recentUnreadOnly={recentUnreadOnly}
        recentQuery={query}
        searchContextAccountId={isSearchPanel ? selectedAccountId : null}
        searchQuery={isSearchPanel ? deepSearchQuery : null}
        onRecentMailboxFilterChange={setRecentMailboxFilter}
        onRecentQueryChange={setQuery}
        onRecentUnreadOnlyChange={setRecentUnreadOnly}
        onSelectAttention={() => {
          setSelection({ accountId: null, mailboxPath: null, panel: 'attention' });
        }}
        onSelectSearch={() => {
          setSelection({ accountId: selectedAccountId, mailboxPath: null, panel: 'search' });
        }}
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
        onAccountUpdated={(account) => {
          setAccounts((current) =>
            current.map((entry) => (entry.id === account.id ? account : entry))
          );
        }}
      />

      {isAttentionPanel ? (
        <div className='space-y-6 rounded-lg border border-border/60 bg-card/25 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='text-base font-semibold text-white'>Mailboxes Requiring Attention</div>
              <div className='text-sm text-gray-500'>
                Review paused accounts and sync failures, then jump into mailbox settings.
              </div>
            </div>
            <Badge variant='outline' className='text-[10px]'>
              Affected: {attentionAccounts.length}
            </Badge>
          </div>

          {attentionAccounts.length > 0 ? (
            <div className='grid gap-3'>
              {attentionAccounts.map((account) => (
                <div
                  key={account.id}
                  className='rounded-lg border border-border/60 bg-card/25 p-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='text-sm font-semibold text-white'>{account.name}</div>
                      <div className='text-xs text-gray-500'>{account.emailAddress}</div>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      {account.status !== 'active' ? (
                        <Badge variant='outline' className='text-[10px]'>
                          Status: {account.status}
                        </Badge>
                      ) : null}
                      {account.lastSyncError ? (
                        <Badge variant='outline' className='text-[10px]'>
                          Sync error
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  <div className='mt-3 grid gap-2 text-xs text-gray-500 md:grid-cols-2'>
                    <div>
                      Last sync:{' '}
                      {account.lastSyncedAt
                        ? new Date(account.lastSyncedAt).toLocaleString()
                        : 'Never'}
                    </div>
                    <div>
                      Allowlist:{' '}
                      {account.folderAllowlist.length > 0
                        ? formatFilemakerMailboxAllowlist(account.folderAllowlist)
                        : 'Auto'}
                    </div>
                    {account.lastSyncError ? (
                      <div className='md:col-span-2 text-red-400'>{account.lastSyncError}</div>
                    ) : null}
                  </div>
                  <div className='mt-4 flex flex-wrap gap-2'>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setSelection({
                          accountId: account.id,
                          mailboxPath: null,
                          panel: 'settings',
                        });
                      }}
                    >
                      <Settings2 className='mr-2 size-4' />
                      Open Settings
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={() => {
                        setSelection({
                          accountId: account.id,
                          mailboxPath: null,
                          panel: 'account',
                        });
                      }}
                    >
                      <ShieldAlert className='mr-2 size-4' />
                      Open Mailbox
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
              All mailbox accounts are healthy.
            </div>
          )}
        </div>
      ) : isSearchPanel ? (
        <div className='space-y-6 rounded-lg border border-border/60 bg-card/25 p-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='text-base font-semibold text-white'>
                <Search className='mr-2 inline-block size-4' />
                Search Messages
              </div>
              <div className='text-sm text-gray-500'>
                Full-text search across all message bodies, subjects, and participants.
                {selectedAccount ? ` Scoped to ${selectedAccount.name}.` : ' Searching all accounts.'}
              </div>
            </div>
            {deepSearchResults ? (
              <Badge variant='outline' className='text-[10px]'>
                {deepSearchResults.totalHits} hit{deepSearchResults.totalHits !== 1 ? 's' : ''} in{' '}
                {deepSearchResults.groups.length} thread{deepSearchResults.groups.length !== 1 ? 's' : ''}
              </Badge>
            ) : null}
          </div>

          <div className='flex gap-2'>
            <Input
              value={deepSearchQuery}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) => setDeepSearchQuery(event.target.value)}
              placeholder='Search message bodies, subjects, senders...'
              aria-label='Deep message search'
              className='flex-1'
            />
            {deepSearchQuery ? (
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={() => {
                  setDeepSearchQuery('');
                  setDeepSearchResults(null);
                }}
              >
                <FilterX className='size-4' />
              </Button>
            ) : null}
          </div>

          {isSearching ? (
            <div className='text-sm text-gray-500'>Searching messages...</div>
          ) : deepSearchResults && deepSearchResults.groups.length > 0 ? (
            <div className='space-y-4'>
              {deepSearchResults.groups.map((group: FilemakerMailSearchResultGroup) => (
                <div
                  key={group.threadId}
                  className='rounded-lg border border-border/60 bg-card/25 p-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-semibold text-white'>
                        {group.threadSubject}
                      </div>
                      <div className='text-[11px] text-gray-500'>
                        {group.mailboxPath} &middot;{' '}
                        {group.lastMessageAt
                          ? new Date(group.lastMessageAt).toLocaleString()
                          : 'Unknown date'}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <Badge variant='outline' className='text-[10px]'>
                        {group.hits.length} match{group.hits.length !== 1 ? 'es' : ''}
                      </Badge>
                      <Button
                        type='button'
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          router.push(
                            buildThreadHref({
                              threadId: group.threadId,
                              accountId: group.accountId,
                              mailboxPath: group.mailboxPath,
                              originPanel: 'search',
                              searchAccountId: selectedAccountId ? null : 'all',
                              searchQuery: deepSearchQuery,
                            })
                          )
                        }
                      >
                        Open Thread
                      </Button>
                    </div>
                  </div>

                  <div className='mt-3 space-y-2'>
                    {group.hits.map((hit) => (
                      <div
                        key={hit.messageId}
                        className='rounded border border-border/40 bg-card/10 p-3'
                      >
                        <div className='flex flex-wrap items-center gap-2 text-[11px] text-gray-500'>
                          <span className='font-medium text-gray-300'>
                            {hit.from?.name ?? hit.from?.address ?? 'Unknown'}
                          </span>
                          <span>&rarr;</span>
                          <span>
                            {hit.to.map((p) => p.name ?? p.address).join(', ') || 'Unknown'}
                          </span>
                          <Badge variant='outline' className='text-[10px]'>
                            {hit.matchField}
                          </Badge>
                          <span>
                            {(hit.receivedAt ?? hit.sentAt)
                              ? new Date(hit.receivedAt ?? hit.sentAt ?? '').toLocaleString()
                              : ''}
                          </span>
                        </div>
                        <div className='mt-1 text-xs text-gray-400'>
                          {hit.matchSnippet}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : deepSearchResults && deepSearchResults.groups.length === 0 ? (
            <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
              No messages matched your search.
            </div>
          ) : !deepSearchQuery ? (
            <div className='rounded-lg border border-border/60 bg-card/25 p-4 text-sm text-gray-500'>
              Enter a search term to find messages across all synced mailboxes.
            </div>
          ) : null}
        </div>
      ) : selectedFolder || isRecentPanel ? (
        <FilemakerEntityTablePage
          title={
            isRecentPanel
              ? `${selectedAccountLabel} / Recent`
              : `${selectedAccountLabel} / ${selectedFolderLabel}`
          }
          description={
            isRecentPanel
              ? 'Browse the latest synced conversations across this mailbox account.'
              : 'Browse synced mailbox threads and open a reply workspace.'
          }
          icon={<Inbox className='size-4' />}
          actions={tableActions}
          badges={
            <>
              {selectedFolder ? (
                <>
                  <Badge variant='outline' className='text-[10px]'>
                    Threads: {selectedFolder.threadCount}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Unread: {selectedFolder.unreadCount}
                  </Badge>
                </>
              ) : (
                <>
                  <Badge variant='outline' className='text-[10px]'>
                    Threads: {visibleThreads.length}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    Account Recent
                  </Badge>
                  {recentMailboxFilter ? (
                    <Badge variant='outline' className='text-[10px]'>
                      Mailbox: {recentMailboxFilter}
                    </Badge>
                  ) : null}
                  {recentUnreadOnly ? (
                    <Badge variant='outline' className='text-[10px]'>
                      Unread only
                    </Badge>
                  ) : null}
                  {query ? (
                    <Badge variant='outline' className='text-[10px]'>
                      Search: {query}
                    </Badge>
                  ) : null}
                  <SelectSimple
                    value={recentMailboxFilter}
                    onValueChange={setRecentMailboxFilter}
                    options={recentMailboxOptions}
                    placeholder='All mailboxes'
                    ariaLabel='Recent mailbox filter'
                  />
                  <label
                    htmlFor='filemaker-mail-recent-unread-only'
                    className='flex items-center gap-2 text-[11px] text-gray-300'
                  >
                    <Checkbox
                      id='filemaker-mail-recent-unread-only'
                      checked={recentUnreadOnly}
                      onCheckedChange={(checked) => setRecentUnreadOnly(checked === true)}
                    />
                    Unread only
                  </label>
                </>
              )}
            </>
          }
          query={query}
          onQueryChange={setQuery}
          queryPlaceholder='Search subject, snippet, or participant...'
          columns={columns}
          data={visibleThreads}
          isLoading={isNavigationLoading || isThreadsLoading}
          emptyTitle={
            isRecentPanel ? 'No recent threads for this account yet' : 'No synced threads in this folder yet'
          }
          emptyDescription={
            isRecentPanel
              ? 'Run mailbox sync or open a specific folder.'
              : 'Run mailbox sync or select another folder.'
          }
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
                    router.push(
                      buildComposeHref({
                        accountId: selectedAccount.id,
                      })
                    );
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
