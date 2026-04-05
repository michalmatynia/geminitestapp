'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { MailPlus, RefreshCcw, FilterX, Search, Mail } from 'lucide-react';
import type { PanelAction } from '@/shared/contracts/ui/panels';

import { useToast, Button } from '@/shared/ui/primitives.public';
import {
  buildFilemakerMailComposeHref as buildComposeHref,
  buildFilemakerMailThreadHref as buildThreadHref,
} from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { formatFilemakerMailFolderLabel } from '../mail-master-tree';
import {
  buildFilemakerMailSelectionHref as buildMailSelectionHref,
  fetchFilemakerMailJson as fetchJson,
} from '../mail-ui-helpers';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';
import {
  createDefaultFilemakerMailDraft as defaultDraft,
  toDraftFromFilemakerMailAccount as toDraftFromAccount,
} from './AdminFilemakerMailPage.helpers';
import type {
  AccountsResponse,
  FoldersResponse,
  MailPageSelection,
  ThreadsResponse,
} from './AdminFilemakerMailPage.types';
import type {
  FilemakerMailAccount,
  FilemakerMailAccountDraft,
  FilemakerMailFolderSummary,
  FilemakerMailSearchResponse,
  FilemakerMailThread,
} from '../types';

export interface MailPageState {
  accounts: FilemakerMailAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FilemakerMailAccount[]>>;
  folders: FilemakerMailFolderSummary[];
  threads: FilemakerMailThread[];
  selection: MailPageSelection;
  setSelection: React.Dispatch<React.SetStateAction<MailPageSelection>>;
  selectedAccountId: MailPageSelection['accountId'];
  selectedMailboxPath: MailPageSelection['mailboxPath'];
  selectedPanel: MailPageSelection['panel'];
  isNavigationLoading: boolean;
  isThreadsLoading: boolean;
  isSavingAccount: boolean;
  syncingAccountId: string | null;
  draft: FilemakerMailAccountDraft;
  setDraft: React.Dispatch<React.SetStateAction<FilemakerMailAccountDraft>>;
  deepSearchQuery: string;
  setDeepSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  deepSearchResults: FilemakerMailSearchResponse | null;
  setDeepSearchResults: React.Dispatch<React.SetStateAction<FilemakerMailSearchResponse | null>>;
  isSearching: boolean;
  folderAllowlistValue: string;
  setFolderAllowlistValue: React.Dispatch<React.SetStateAction<string>>;
  query: string;
  setQuery: React.Dispatch<React.SetStateAction<string>>;
  recentMailboxFilter: string;
  setRecentMailboxFilter: React.Dispatch<React.SetStateAction<string>>;
  recentUnreadOnly: boolean;
  setRecentUnreadOnly: React.Dispatch<React.SetStateAction<boolean>>;
  attentionAccounts: FilemakerMailAccount[];
  selectedAccount: FilemakerMailAccount | null;
  selectedFolder: FilemakerMailFolderSummary | null;
  selectedAccountLabel: string;
  selectedFolderLabel: string | null;
  isAttentionPanel: boolean;
  isSearchPanel: boolean;
  isRecentPanel: boolean;
  columns: ColumnDef<FilemakerMailThread>[];
  recentMailboxOptions: { value: string; label: string }[];
  visibleThreads: FilemakerMailThread[];
  tableActions: PanelAction[];
  handleSaveAccount: () => Promise<void>;
  handleSyncAccount: (accountId: string) => Promise<void>;
  router: ReturnType<typeof useRouter>;
}

export function useAdminFilemakerMailPageState(): MailPageState {
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
  const [selection, setSelection] = useState<MailPageSelection>({
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

  return {
    accounts,
    setAccounts,
    folders,
    threads,
    selection,
    setSelection,
    isNavigationLoading,
    isThreadsLoading,
    isSavingAccount,
    syncingAccountId,
    draft,
    setDraft,
    deepSearchQuery,
    setDeepSearchQuery,
    deepSearchResults,
    setDeepSearchResults,
    isSearching,
    folderAllowlistValue,
    setFolderAllowlistValue,
    query,
    setQuery,
    recentMailboxFilter,
    setRecentMailboxFilter,
    recentUnreadOnly,
    setRecentUnreadOnly,
    attentionAccounts,
    selectedAccountId,
    selectedMailboxPath,
    selectedPanel,
    selectedAccount,
    selectedFolder,
    selectedAccountLabel,
    selectedFolderLabel,
    isAttentionPanel,
    isSearchPanel,
    isRecentPanel,
    columns,
    recentMailboxOptions,
    visibleThreads,
    tableActions,
    handleSaveAccount,
    handleSyncAccount,
    router,
  };
}
