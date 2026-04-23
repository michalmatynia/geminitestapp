'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
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
type UseFilemakerMailDataResult = {
  accounts: FilemakerMailAccount[];
  setAccounts: Dispatch<SetStateAction<FilemakerMailAccount[]>>;
  folders: FilemakerMailFolderSummary[];
  setFolders: Dispatch<SetStateAction<FilemakerMailFolderSummary[]>>;
  threads: FilemakerMailThread[];
  setThreads: Dispatch<SetStateAction<FilemakerMailThread[]>>;
  recentThreads: FilemakerMailThread[];
  setRecentThreads: Dispatch<SetStateAction<FilemakerMailThread[]>>;
  isLoading: boolean;
  syncingAccountId: string | null;
  setSyncingAccountId: Dispatch<SetStateAction<string | null>>;
  fetchAccountsAndFolders: () => Promise<void>;
};
const RECENT_THREAD_PREVIEW_LIMIT = 5;

export const useFilemakerMailData = ({
  enabled,
  refreshKey,
  selectedAccountId,
  selectedMailboxPath,
}: {
  enabled: boolean;
  refreshKey: number;
  selectedAccountId: string | null;
  selectedMailboxPath: string | null;
}): UseFilemakerMailDataResult => {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [recentThreads, setRecentThreads] = useState<FilemakerMailThread[]>([]);
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
    if (selectedAccountId === null) {
      setRecentThreads([]);
      return;
    }
    try {
      const params = new URLSearchParams({
        accountId: selectedAccountId,
        limit: String(RECENT_THREAD_PREVIEW_LIMIT),
      });
      const result = await fetchJson<ThreadsResponse>(
        `/api/filemaker/mail/threads?${params.toString()}`
      );
      setRecentThreads(result.threads);
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Failed to load recent threads.', {
        variant: 'error',
      });
    }
  }, [selectedAccountId, toast]);

  const fetchFolderThreads = useCallback(async (): Promise<void> => {
    if (selectedAccountId === null || selectedMailboxPath === null) {
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

  useEffect((): void => {
    if (!enabled) {
      return;
    }
    void fetchAccountsAndFolders();
  }, [enabled, fetchAccountsAndFolders, refreshKey]);

  useEffect((): void => {
    if (!enabled) {
      return;
    }
    void fetchRecentThreads();
  }, [enabled, fetchRecentThreads, refreshKey]);

  useEffect((): void => {
    if (!enabled) {
      return;
    }
    void fetchFolderThreads();
  }, [enabled, fetchFolderThreads, refreshKey]);

  return {
    accounts,
    setAccounts,
    folders,
    setFolders,
    threads,
    setThreads,
    recentThreads,
    setRecentThreads,
    isLoading,
    syncingAccountId,
    setSyncingAccountId,
    fetchAccountsAndFolders,
  };
};
