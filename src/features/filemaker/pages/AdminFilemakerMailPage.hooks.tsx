'use client';

import { useRouter } from 'nextjs-toploader/app';
import { useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState, startTransition } from 'react';
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

const RECENT_THREAD_PREVIEW_LIMIT = 5;

const resolveStateAction = <State,>(
  nextState: React.SetStateAction<State>,
  previousState: State
): State =>
  typeof nextState === 'function'
    ? (nextState as (currentState: State) => State)(previousState)
    : nextState;

const isSameMailPageSelection = (
  left: MailPageSelection,
  right: MailPageSelection
): boolean =>
  left.accountId === right.accountId &&
  left.mailboxPath === right.mailboxPath &&
  left.panel === right.panel;

export interface MailPageState {
  accounts: FilemakerMailAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FilemakerMailAccount[]>>;
  folders: FilemakerMailFolderSummary[];
  threads: FilemakerMailThread[];
  recentPreviewThreads: FilemakerMailThread[];
  selection: MailPageSelection;
  setSelection: React.Dispatch<React.SetStateAction<MailPageSelection>>;
  selectedAccountId: MailPageSelection['accountId'];
  selectedMailboxPath: MailPageSelection['mailboxPath'];
  selectedPanel: MailPageSelection['panel'];
  isNavigationLoading: boolean;
  isThreadsLoading: boolean;
  isSavingAccount: boolean;
  syncingAccountId: string | null;
  setSyncingAccountId: React.Dispatch<React.SetStateAction<string | null>>;
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
  loadNavigation: () => Promise<void>;
  onNewMailbox: () => void;
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
      : rawRequestedPanel === 'settings' || rawRequestedPanel === 'account'
      ? 'settings'
      : rawRequestedPanel === 'recent'
        ? 'recent'
        : rawRequestedPanel === 'search'
          ? 'search'
          : rawRequestedAccountId && !rawRequestedMailboxPath
            ? 'settings'
            : null;

  const requestedAccountId = requestedPanel === 'attention' ? null : rawRequestedAccountId;
  const requestedMailboxPath = requestedPanel ? null : rawRequestedMailboxPath;

  const [query, setQueryState] = useState('');
  const nonRecentQueryScopeKeyRef = useRef<string | null>(null);
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [recentPreviewThreads, setRecentPreviewThreads] = useState<FilemakerMailThread[]>([]);
  const [recentMailboxFilter, setRecentMailboxFilterState] = useState('');
  const [recentUnreadOnly, setRecentUnreadOnlyState] = useState(false);
  const [selection, setSelectionState] = useState<MailPageSelection>({
    accountId: requestedAccountId,
    mailboxPath: requestedMailboxPath,
    panel: requestedPanel,
  });
  const shouldIgnoreActiveSearchState =
    rawRequestedPanel === 'search' &&
    selection.panel === 'search' &&
    (rawRequestedAccountId ?? null) !== (selection.accountId ?? null);
  const shouldIgnoreActiveRecentState =
    rawRequestedPanel === 'recent' &&
    selection.panel === 'recent' &&
    rawRequestedAccountId !== selection.accountId;
  const shouldIgnoreRequestedSearchState =
    rawRequestedPanel === 'search' &&
    (selection.panel !== 'search' ||
      (rawRequestedAccountId ?? null) !== (selection.accountId ?? null));
  const requestedSearchQuery =
    requestedPanel === 'search' && !shouldIgnoreRequestedSearchState
      ? rawRequestedSearchQuery
      : '';
  const shouldIgnoreRequestedRecentState =
    rawRequestedPanel === 'recent' &&
    (selection.panel !== 'recent' || rawRequestedAccountId !== selection.accountId);
  const requestedRecentMailboxFilter =
    requestedPanel === 'recent' && !shouldIgnoreRequestedRecentState
      ? rawRequestedRecentMailboxFilter
      : '';
  const requestedRecentUnreadOnly =
    requestedPanel === 'recent' && !shouldIgnoreRequestedRecentState
      ? rawRequestedRecentUnreadOnly
      : false;
  const requestedRecentQuery =
    requestedPanel === 'recent' && !shouldIgnoreRequestedRecentState
      ? rawRequestedRecentQuery
      : '';
  const requestedSelection = useMemo(
    () =>
      ({
        accountId: requestedAccountId,
        mailboxPath: requestedMailboxPath,
        panel: requestedPanel,
      }) satisfies MailPageSelection,
    [requestedAccountId, requestedMailboxPath, requestedPanel]
  );
  const requestedSelectionHref = buildMailSelectionHref({
    accountId: requestedAccountId,
    mailboxPath: requestedMailboxPath,
    panel: requestedPanel,
    recentMailboxFilter: requestedRecentMailboxFilter,
    recentUnreadOnly: requestedRecentUnreadOnly,
    recentQuery: requestedRecentQuery,
    searchQuery: requestedSearchQuery,
  });
  const effectiveQuery = shouldIgnoreActiveRecentState ? '' : query;
  const effectiveRecentMailboxFilter = shouldIgnoreActiveRecentState ? '' : recentMailboxFilter;
  const effectiveRecentUnreadOnly = shouldIgnoreActiveRecentState ? false : recentUnreadOnly;
  const deferredQuery = useDeferredValue(query.trim());
  const currentNonRecentQueryScopeKey =
    selection.panel === 'recent'
      ? null
      : [selection.panel ?? '', selection.accountId ?? '', selection.mailboxPath ?? ''].join('::');
  const shouldIgnoreThreadQuery =
    shouldIgnoreActiveRecentState ||
    (rawRequestedPanel === 'recent' && selection.panel !== 'recent') ||
    (currentNonRecentQueryScopeKey !== null &&
      nonRecentQueryScopeKeyRef.current !== null &&
      nonRecentQueryScopeKeyRef.current !== currentNonRecentQueryScopeKey);
  const threadSourceQuery = shouldIgnoreThreadQuery ? '' : effectiveQuery.trim();
  const activeThreadQuery = threadSourceQuery === '' ? '' : deferredQuery;
  const [isNavigationLoading, setIsNavigationLoading] = useState(true);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [isSavingAccount, setIsSavingAccount] = useState(false);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FilemakerMailAccountDraft>(defaultDraft);
  const [deepSearchQuery, setDeepSearchQueryState] = useState(requestedSearchQuery);
  const effectiveDeepSearchQuery = shouldIgnoreActiveSearchState ? '' : deepSearchQuery;
  const [deepSearchResults, setDeepSearchResults] = useState<FilemakerMailSearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [folderAllowlistValue, setFolderAllowlistValue] = useState('');
  const navigationRequestIdRef = useRef(0);
  const threadsRequestIdRef = useRef(0);
  const threadsSourceKeyRef = useRef<string | null>(null);
  const deepSearchRequestIdRef = useRef(0);
  const deepSearchSourceKeyRef = useRef<string | null>(null);
  const recentPreviewAccountIdRef = useRef<string | null>(null);
  const routeSyncHrefRef = useRef<string | null>(null);
  const routeSyncSourceKeyRef = useRef<string | null>(null);
  const hasPendingRouteSync = routeSyncHrefRef.current !== null;
  const isPendingRequestedRouteStale =
    hasPendingRouteSync && routeSyncHrefRef.current !== requestedSelectionHref;
  const shouldHoldLocalSelectionFromRoute =
    isPendingRequestedRouteStale &&
    !isSameMailPageSelection(selection, requestedSelection);
  const shouldHoldLocalRecentStateFromRoute =
    isPendingRequestedRouteStale &&
    selection.panel === 'recent' &&
    (recentMailboxFilter !== requestedRecentMailboxFilter ||
      recentUnreadOnly !== requestedRecentUnreadOnly ||
      query !== requestedRecentQuery);
  const shouldHoldLocalSearchStateFromRoute =
    isPendingRequestedRouteStale &&
    selection.panel === 'search' &&
    deepSearchQuery !== requestedSearchQuery;

  const setSelection = useCallback<React.Dispatch<React.SetStateAction<MailPageSelection>>>(
    (nextSelection) => {
      setSelectionState((previousSelection) => {
        const resolvedSelection = resolveStateAction(nextSelection, previousSelection);
        return isSameMailPageSelection(previousSelection, resolvedSelection)
          ? previousSelection
          : resolvedSelection;
      });
    },
    []
  );

  const setQuery = useCallback<React.Dispatch<React.SetStateAction<string>>>((nextQuery) => {
    setQueryState((previousQuery) => {
      const resolvedQuery = resolveStateAction(nextQuery, previousQuery);
      return previousQuery === resolvedQuery ? previousQuery : resolvedQuery;
    });
  }, []);

  const setRecentMailboxFilter = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (nextMailboxFilter) => {
      setRecentMailboxFilterState((previousMailboxFilter) => {
        const resolvedMailboxFilter = resolveStateAction(
          nextMailboxFilter,
          previousMailboxFilter
        );
        return previousMailboxFilter === resolvedMailboxFilter
          ? previousMailboxFilter
          : resolvedMailboxFilter;
      });
    },
    []
  );

  const setRecentUnreadOnly = useCallback<React.Dispatch<React.SetStateAction<boolean>>>(
    (nextRecentUnreadOnly) => {
      setRecentUnreadOnlyState((previousRecentUnreadOnly) => {
        const resolvedRecentUnreadOnly = resolveStateAction(
          nextRecentUnreadOnly,
          previousRecentUnreadOnly
        );
        return previousRecentUnreadOnly === resolvedRecentUnreadOnly
          ? previousRecentUnreadOnly
          : resolvedRecentUnreadOnly;
      });
    },
    []
  );

  const setDeepSearchQuery = useCallback<React.Dispatch<React.SetStateAction<string>>>(
    (nextDeepSearchQuery) => {
      setDeepSearchQueryState((previousDeepSearchQuery) => {
        const resolvedDeepSearchQuery = resolveStateAction(
          nextDeepSearchQuery,
          previousDeepSearchQuery
        );
        return previousDeepSearchQuery === resolvedDeepSearchQuery
          ? previousDeepSearchQuery
          : resolvedDeepSearchQuery;
      });
    },
    []
  );

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
    const requestId = navigationRequestIdRef.current + 1;
    navigationRequestIdRef.current = requestId;
    setIsNavigationLoading(true);
    try {
      const [accountsResult, foldersResult] = await Promise.all([
        fetchJson<AccountsResponse>('/api/filemaker/mail/accounts'),
        fetchJson<FoldersResponse>('/api/filemaker/mail/folders'),
      ]);
      if (requestId !== navigationRequestIdRef.current) {
        return;
      }
      setAccounts(accountsResult.accounts);
      setFolders(foldersResult.folders);
    } catch (error) {
      if (requestId !== navigationRequestIdRef.current) {
        return;
      }
      toast(error instanceof Error ? error.message : 'Failed to load Filemaker mail.', {
        variant: 'error',
      });
    } finally {
      if (requestId === navigationRequestIdRef.current) {
        setIsNavigationLoading(false);
      }
    }
  }, [toast]);

  useEffect(() => {
    void loadNavigation();
  }, [loadNavigation]);

  useEffect(() => {
    if (shouldHoldLocalSelectionFromRoute) {
      return;
    }
    setSelection(requestedSelection);
  }, [
    requestedSelection,
    setSelection,
    shouldHoldLocalSelectionFromRoute,
  ]);

  useEffect(() => {
    if (shouldHoldLocalRecentStateFromRoute) {
      return;
    }
    setRecentMailboxFilter(requestedRecentMailboxFilter);
    setRecentUnreadOnly(requestedRecentUnreadOnly);
  }, [
    requestedRecentMailboxFilter,
    requestedRecentUnreadOnly,
    setRecentMailboxFilter,
    setRecentUnreadOnly,
    shouldHoldLocalRecentStateFromRoute,
  ]);

  useEffect(() => {
    if (shouldHoldLocalSearchStateFromRoute) {
      return;
    }
    setDeepSearchQuery(requestedSearchQuery);
  }, [requestedSearchQuery, setDeepSearchQuery, shouldHoldLocalSearchStateFromRoute]);

  useEffect(() => {
    if (shouldHoldLocalRecentStateFromRoute) {
      return;
    }
    setQuery(requestedPanel === 'recent' ? requestedRecentQuery : '');
  }, [requestedPanel, requestedRecentQuery, setQuery, shouldHoldLocalRecentStateFromRoute]);

  useLayoutEffect(() => {
    if (selection.panel !== 'recent') {
      setRecentMailboxFilter('');
      setRecentUnreadOnly(false);
      setQuery('');
    }
    if (selection.panel !== 'search') {
      setDeepSearchQuery('');
    }
  }, [selection.panel, setDeepSearchQuery, setQuery, setRecentMailboxFilter, setRecentUnreadOnly]);

  useLayoutEffect(() => {
    if (selection.panel === 'recent') {
      nonRecentQueryScopeKeyRef.current = null;
      return;
    }

    const nextNonRecentQueryScopeKey = [
      selection.panel ?? '',
      selectedAccountId ?? '',
      selectedFolder?.mailboxPath ?? '',
    ].join('::');

    if (nonRecentQueryScopeKeyRef.current !== nextNonRecentQueryScopeKey) {
      nonRecentQueryScopeKeyRef.current = nextNonRecentQueryScopeKey;
      setQuery('');
    }
  }, [selectedAccountId, selectedFolder?.mailboxPath, selection.panel, setQuery]);

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
      threadsRequestIdRef.current += 1;
      threadsSourceKeyRef.current = null;
      setIsThreadsLoading(false);
      setThreads([]);
      return;
    }

    const nextThreadsSourceKey = [
      selectedAccountId,
      selection.panel ?? '',
      selectedFolder?.mailboxPath ?? '',
      threadSourceQuery,
    ].join('::');
    if (threadsSourceKeyRef.current !== nextThreadsSourceKey) {
      threadsRequestIdRef.current += 1;
      threadsSourceKeyRef.current = nextThreadsSourceKey;
      setIsThreadsLoading(true);
      setThreads([]);
    }
  }, [selectedAccountId, selectedFolder, selection.panel, threadSourceQuery]);

  useEffect(() => {
    if (!selectedAccountId || (!selectedFolder && selection.panel !== 'recent')) {
      setIsThreadsLoading(false);
      return;
    }

    const requestId = threadsRequestIdRef.current + 1;
    threadsRequestIdRef.current = requestId;

    const loadThreads = async (): Promise<void> => {
      setIsThreadsLoading(true);
      try {
        const baseQuery = `/api/filemaker/mail/threads?accountId=${encodeURIComponent(
          selectedAccountId
        )}`;
        const result = await fetchJson<ThreadsResponse>(
          selection.panel === 'recent'
            ? `${baseQuery}${activeThreadQuery ? `&query=${encodeURIComponent(activeThreadQuery)}` : ''}`
            : `${baseQuery}&mailboxPath=${encodeURIComponent(selectedFolder?.mailboxPath ?? '')}${
                activeThreadQuery ? `&query=${encodeURIComponent(activeThreadQuery)}` : ''
              }`
        );
        if (requestId !== threadsRequestIdRef.current) {
          return;
        }
        setThreads(result.threads);
      } catch (error) {
        if (requestId !== threadsRequestIdRef.current) {
          return;
        }
        toast(error instanceof Error ? error.message : 'Failed to load mail threads.', {
          variant: 'error',
        });
      } finally {
        if (requestId === threadsRequestIdRef.current) {
          setIsThreadsLoading(false);
        }
      }
    };

    void loadThreads();
  }, [activeThreadQuery, selectedAccountId, selectedFolder, selection.panel, toast]);

  useEffect(() => {
    if (isNavigationLoading) return;
    if (!selectedAccountId) {
      recentPreviewAccountIdRef.current = null;
      setRecentPreviewThreads([]);
      return;
    }

    if (recentPreviewAccountIdRef.current !== selectedAccountId) {
      recentPreviewAccountIdRef.current = selectedAccountId;
      setRecentPreviewThreads([]);
    }

    let isActive = true;

    const loadRecentPreviewThreads = async (): Promise<void> => {
      try {
        const params = new URLSearchParams({
          accountId: selectedAccountId,
          limit: String(RECENT_THREAD_PREVIEW_LIMIT),
        });
        const result = await fetchJson<ThreadsResponse>(
          `/api/filemaker/mail/threads?${params.toString()}`
        );
        if (!isActive) {
          return;
        }
        setRecentPreviewThreads(result.threads);
      } catch (error) {
        if (!isActive) {
          return;
        }
        setRecentPreviewThreads([]);
        toast(error instanceof Error ? error.message : 'Failed to load recent thread preview.', {
          variant: 'error',
        });
      }
    };

    void loadRecentPreviewThreads();

    return () => {
      isActive = false;
    };
  }, [accounts, isNavigationLoading, selectedAccountId, toast]);

  const deferredDeepSearch = useDeferredValue(effectiveDeepSearchQuery.trim());
  const deepSearchSourceQuery = effectiveDeepSearchQuery.trim();
  const activeDeepSearchQuery = deepSearchSourceQuery === '' ? '' : deferredDeepSearch;

  useEffect(() => {
    if (selection.panel !== 'search') {
      deepSearchSourceKeyRef.current = null;
      return;
    }
    if (deepSearchSourceQuery === '') {
      deepSearchSourceKeyRef.current = null;
      return;
    }

    const nextDeepSearchSourceKey = [selectedAccountId ?? 'all', deepSearchSourceQuery].join('::');
    if (deepSearchSourceKeyRef.current !== nextDeepSearchSourceKey) {
      deepSearchSourceKeyRef.current = nextDeepSearchSourceKey;
      setDeepSearchResults(null);
      setIsSearching(true);
    }
  }, [deepSearchSourceQuery, selectedAccountId, selection.panel]);

  useEffect(() => {
    if (selection.panel !== 'search') {
      deepSearchRequestIdRef.current += 1;
      setIsSearching(false);
      setDeepSearchResults(null);
      return;
    }
    if (activeDeepSearchQuery === '') {
      deepSearchRequestIdRef.current += 1;
      setIsSearching(false);
      setDeepSearchResults(null);
      return;
    }

    const requestId = deepSearchRequestIdRef.current + 1;
    deepSearchRequestIdRef.current = requestId;

    const runSearch = async (): Promise<void> => {
      setIsSearching(true);
      try {
        const url = `/api/filemaker/mail/search?query=${encodeURIComponent(activeDeepSearchQuery)}${
          selectedAccountId ? `&accountId=${encodeURIComponent(selectedAccountId)}` : ''
        }`;
        const result = await fetchJson<FilemakerMailSearchResponse>(url);
        if (requestId !== deepSearchRequestIdRef.current) {
          return;
        }
        setDeepSearchResults(result);
      } catch (error) {
        if (requestId !== deepSearchRequestIdRef.current) {
          return;
        }
        toast(error instanceof Error ? error.message : 'Message search failed.', {
          variant: 'error',
        });
      } finally {
        if (requestId === deepSearchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    };

    void runSearch();
  }, [activeDeepSearchQuery, selectedAccountId, selection.panel, toast]);

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
    const nextPanel = selection.panel ?? null;
    const nextAccountId = nextPanel === 'attention' ? null : selection.accountId ?? null;
    const nextMailboxPath = nextPanel ? null : selection.mailboxPath ?? null;
    const nextRecentMailboxFilter = nextPanel === 'recent' ? effectiveRecentMailboxFilter : '';
    const nextRecentUnreadOnly = nextPanel === 'recent' ? effectiveRecentUnreadOnly : false;
    const nextRecentQuery = nextPanel === 'recent' ? effectiveQuery : '';
    const nextSearchQuery = nextPanel === 'search' ? effectiveDeepSearchQuery : '';
    const nextHref = buildMailSelectionHref({
      accountId: nextAccountId,
      mailboxPath: nextMailboxPath,
      panel: nextPanel,
      recentMailboxFilter: nextRecentMailboxFilter,
      recentUnreadOnly: nextRecentUnreadOnly,
      recentQuery: nextRecentQuery,
      searchQuery: nextSearchQuery,
    });
    const currentRouteStateKey = [
      rawRequestedAccountId ?? '',
      rawRequestedMailboxPath ?? '',
      rawRequestedPanel ?? '',
      rawRequestedRecentMailboxFilter,
      rawRequestedRecentUnreadOnly ? '1' : '0',
      rawRequestedRecentQuery,
      rawRequestedSearchQuery,
    ].join('::');
    if (
      (rawRequestedAccountId ?? null) === nextAccountId &&
      (rawRequestedMailboxPath ?? null) === nextMailboxPath &&
      (rawRequestedPanel ?? null) === nextPanel &&
      rawRequestedRecentMailboxFilter === nextRecentMailboxFilter &&
      rawRequestedRecentUnreadOnly === nextRecentUnreadOnly &&
      rawRequestedRecentQuery === nextRecentQuery &&
      rawRequestedSearchQuery === nextSearchQuery
    ) {
      routeSyncHrefRef.current = null;
      routeSyncSourceKeyRef.current = null;
      return;
    }
    if (
      routeSyncHrefRef.current === nextHref &&
      routeSyncSourceKeyRef.current === currentRouteStateKey
    ) {
      return;
    }
    routeSyncHrefRef.current = nextHref;
    routeSyncSourceKeyRef.current = currentRouteStateKey;
    startTransition(() => {
      router.replace(nextHref);
    });
  }, [
    effectiveDeepSearchQuery,
    effectiveQuery,
    effectiveRecentMailboxFilter,
    effectiveRecentUnreadOnly,
    isNavigationLoading,
    rawRequestedAccountId,
    rawRequestedMailboxPath,
    rawRequestedPanel,
    rawRequestedRecentMailboxFilter,
    rawRequestedRecentQuery,
    rawRequestedRecentUnreadOnly,
    rawRequestedSearchQuery,
    router,
    selection.accountId,
    selection.mailboxPath,
    selection.panel,
  ]);

  const handleSaveAccount = useCallback(async (): Promise<void> => {
    setIsSavingAccount(true);
    try {
      const isCreate = !draft.id;
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

      if (isCreate) {
        try {
          const syncResult = await fetchJson<{
            result: { fetchedMessageCount: number; lastSyncError?: string | null };
          }>(`/api/filemaker/mail/accounts/${encodeURIComponent(result.account.id)}/sync`, {
            method: 'POST',
          });

          if (syncResult.result.lastSyncError) {
            toast(syncResult.result.lastSyncError, {
              variant: 'error',
            });
          } else {
            toast(
              `Mailbox sync finished. Messages fetched: ${syncResult.result.fetchedMessageCount}.`,
              {
                variant: 'success',
              }
            );
          }
        } catch (error) {
          toast(
            error instanceof Error
              ? `Mailbox saved, but initial sync failed: ${error.message}`
              : 'Mailbox saved, but initial sync failed.',
            {
              variant: 'error',
            }
          );
        }
      }

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

  const onNewMailbox = useCallback(() => {
    setSelection({ accountId: null, mailboxPath: null, panel: 'settings' });
  }, []);

  const handleSyncAccount = useCallback(
    async (accountId: string): Promise<void> => {
      setSyncingAccountId(accountId);
      try {
        const result = await fetchJson<{
          result: { fetchedMessageCount: number; lastSyncError?: string | null };
        }>(
          `/api/filemaker/mail/accounts/${encodeURIComponent(accountId)}/sync`,
          { method: 'POST' }
        );

        if (result.result.lastSyncError) {
          toast(result.result.lastSyncError, {
            variant: 'error',
          });
        } else {
          toast(`Mailbox sync finished. Messages fetched: ${result.result.fetchedMessageCount}.`, {
            variant: 'success',
          });
        }

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
                startTransition(() => { router.push(
                                    buildThreadHref({
                                      threadId: row.original.id,
                                      accountId: row.original.accountId,
                                      mailboxPath: row.original.mailboxPath,
                                      originPanel: isRecentPanel ? 'recent' : null,
                                      recentMailboxFilter: isRecentPanel ? effectiveRecentMailboxFilter : null,
                                      recentUnreadOnly: isRecentPanel ? effectiveRecentUnreadOnly : false,
                                      recentQuery: isRecentPanel ? effectiveQuery : null,
                                    })
                                  ); });
              }}
            >
              Open Thread
            </Button>
          </div>
        ),
      },
    ],
    [effectiveQuery, effectiveRecentMailboxFilter, effectiveRecentUnreadOnly, isRecentPanel, router]
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
      if (effectiveRecentMailboxFilter && thread.mailboxPath !== effectiveRecentMailboxFilter) return false;
      if (effectiveRecentUnreadOnly && thread.unreadCount < 1) return false;
      return true;
    });
  }, [effectiveRecentMailboxFilter, effectiveRecentUnreadOnly, isRecentPanel, threads]);

  const tableActions = useMemo(
    () => [
      {
        key: 'compose',
        label: 'Compose',
        icon: <MailPlus className='size-4' />,
        onClick: () =>
          startTransition(() => { router.push(
                        buildComposeHref({
                          accountId: selectedAccountId,
                          mailboxPath: selectedFolder?.mailboxPath ?? null,
                          originPanel: isRecentPanel ? 'recent' : null,
                          recentMailboxFilter: isRecentPanel ? effectiveRecentMailboxFilter : null,
                          recentUnreadOnly: isRecentPanel ? effectiveRecentUnreadOnly : false,
                          recentQuery: isRecentPanel ? effectiveQuery : null,
                        })
                      ); }),
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
      ...(isRecentPanel && (effectiveRecentMailboxFilter || effectiveRecentUnreadOnly || effectiveQuery)
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
      effectiveQuery,
      effectiveRecentMailboxFilter,
      effectiveRecentUnreadOnly,
      handleSyncAccount,
      isRecentPanel,
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
    recentPreviewThreads,
    selection,
    setSelection,
    isNavigationLoading,
    isThreadsLoading,
    isSavingAccount,
    syncingAccountId,
    setSyncingAccountId,
    draft,
    setDraft,
    deepSearchQuery: effectiveDeepSearchQuery,
    setDeepSearchQuery,
    deepSearchResults,
    setDeepSearchResults,
    isSearching,
    folderAllowlistValue,
    setFolderAllowlistValue,
    query: effectiveQuery,
    setQuery,
    recentMailboxFilter: effectiveRecentMailboxFilter,
    setRecentMailboxFilter,
    recentUnreadOnly: effectiveRecentUnreadOnly,
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
    loadNavigation,
    onNewMailbox,
    router,
  };
}
