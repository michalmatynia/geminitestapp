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
type UseFilemakerMailDataParams = {
  enabled: boolean;
  refreshKey: number;
  selectedAccountId: string | null;
  selectedMailboxPath: string | null;
};
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
type UseMailNavigationResult = Pick<
  UseFilemakerMailDataResult,
  'accounts' | 'setAccounts' | 'folders' | 'setFolders' | 'isLoading' | 'fetchAccountsAndFolders'
>;
type UseRecentThreadsResult = Pick<
  UseFilemakerMailDataResult,
  'recentThreads' | 'setRecentThreads'
>;
type UseFolderThreadsResult = Pick<UseFilemakerMailDataResult, 'threads' | 'setThreads'>;
type ToastFn = ReturnType<typeof useToast>['toast'];

const RECENT_THREAD_PREVIEW_LIMIT = 5;

const useMailNavigation = (toast: ToastFn): UseMailNavigationResult => {
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  return { accounts, setAccounts, folders, setFolders, isLoading, fetchAccountsAndFolders };
};

const useRecentThreads = (
  selectedAccountId: string | null,
  refreshKey: number,
  toast: ToastFn
): UseRecentThreadsResult => {
  const [recentThreads, setRecentThreads] = useState<FilemakerMailThread[]>([]);

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

  useEffect((): void => {
    void fetchRecentThreads();
  }, [fetchRecentThreads, refreshKey]);

  return { recentThreads, setRecentThreads };
};

const useFolderThreads = (
  selectedAccountId: string | null,
  selectedMailboxPath: string | null,
  refreshKey: number,
  toast: ToastFn
): UseFolderThreadsResult => {
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);

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
    void fetchFolderThreads();
  }, [fetchFolderThreads, refreshKey]);

  return { threads, setThreads };
};

export const useFilemakerMailData = ({
  enabled,
  refreshKey,
  selectedAccountId,
  selectedMailboxPath,
}: UseFilemakerMailDataParams): UseFilemakerMailDataResult => {
  const { toast } = useToast();
  const navigation = useMailNavigation(toast);
  const { fetchAccountsAndFolders } = navigation;
  const recent = useRecentThreads(enabled ? selectedAccountId : null, refreshKey, toast);
  const folder = useFolderThreads(
    enabled ? selectedAccountId : null,
    enabled ? selectedMailboxPath : null,
    refreshKey,
    toast
  );
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  useEffect((): void => {
    if (!enabled) {
      return;
    }
    void fetchAccountsAndFolders();
  }, [enabled, fetchAccountsAndFolders, refreshKey]);

  return {
    accounts: navigation.accounts,
    setAccounts: navigation.setAccounts,
    folders: navigation.folders,
    setFolders: navigation.setFolders,
    threads: folder.threads,
    setThreads: folder.setThreads,
    recentThreads: recent.recentThreads,
    setRecentThreads: recent.setRecentThreads,
    isLoading: navigation.isLoading,
    syncingAccountId,
    setSyncingAccountId,
    fetchAccountsAndFolders,
  };
};
