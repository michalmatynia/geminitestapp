'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';
import { fetchFilemakerMailJson as fetchJson } from '../mail-ui-helpers';
import { useToast } from '@/shared/ui/primitives.public';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type FoldersResponse = { folders: FilemakerMailFolderSummary[] };
type ThreadsResponse = { threads: FilemakerMailThread[] };

export const useFilemakerMailData = ({
  refreshKey,
  selectedAccountId,
  selectedMailboxPath,
  searchContextAccountId,
  searchQuery,
  recentMailboxFilter,
  recentQuery,
}: {
  refreshKey: number;
  selectedAccountId: string | null;
  selectedMailboxPath: string | null;
  searchContextAccountId: string | null;
  searchQuery: string | null;
  recentMailboxFilter: string | null;
  recentQuery: string | null;
}) => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [recentThreads, setRecentThreads] = useState<FilemakerMailThread[]>([]);
  const [searchResults, setSearchResults] = useState<FilemakerMailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  const fetchAccountsAndFolders = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const [accountsResult, foldersResult] = await Promise.all([
        fetchJson<AccountsResponse>('/api/filemaker/mail/accounts'),
        fetchJson<FoldersResponse>('/api/filemaker/mail/folders'),
      ]);
      setAccounts(accountsResult.accounts);
      setFolders(foldersResult.folders);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load Filemaker mail navigation.', {
        variant: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const fetchRecentThreads = useCallback(async (): Promise<void> => {
    if (!selectedAccountId) {
      setRecentThreads([]);
      return;
    }
    try {
      const result = await fetchJson<ThreadsResponse>(
        `/api/filemaker/mail/threads?accountId=${encodeURIComponent(selectedAccountId)}`
      );
      setRecentThreads(result.threads);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load recent threads.', {
        variant: 'error',
      });
    }
  }, [selectedAccountId, toast]);

  const fetchFolderThreads = useCallback(async (): Promise<void> => {
    if (!selectedAccountId || !selectedMailboxPath) {
      setThreads([]);
      return;
    }
    try {
      const result = await fetchJson<ThreadsResponse>(
        `/api/filemaker/mail/threads?accountId=${encodeURIComponent(
          selectedAccountId
        )}&mailboxPath=${encodeURIComponent(selectedMailboxPath)}`
      );
      setThreads(result.threads);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load folder threads.', {
        variant: 'error',
      });
    }
  }, [selectedAccountId, selectedMailboxPath, toast]);

  const fetchSearchResults = useCallback(async (): Promise<void> => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }
    try {
      const params = new URLSearchParams({ query: searchQuery });
      if (searchContextAccountId) params.set('accountId', searchContextAccountId);

      const result = await fetchJson<ThreadsResponse>(
        `/api/filemaker/mail/search?${params.toString()}`
      );
      setSearchResults(result.threads);
    } catch (error) {
      console.error('Failed to fetch search results:', error);
    }
  }, [searchContextAccountId, searchQuery]);

  useEffect((): void => {
    void fetchAccountsAndFolders();
  }, [fetchAccountsAndFolders, refreshKey]);

  useEffect((): void => {
    void fetchRecentThreads();
  }, [fetchRecentThreads, refreshKey]);

  useEffect((): void => {
    void fetchFolderThreads();
  }, [fetchFolderThreads, refreshKey]);

  useEffect((): void => {
    void fetchSearchResults();
  }, [fetchSearchResults]);

  return {
    accounts,
    setAccounts,
    folders,
    setFolders,
    threads,
    setThreads,
    recentThreads,
    setRecentThreads,
    searchResults,
    isLoading,
    syncingAccountId,
    setSyncingAccountId,
    fetchAccountsAndFolders,
  };
};
