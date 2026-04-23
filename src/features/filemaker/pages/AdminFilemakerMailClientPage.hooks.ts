'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { fetchFilemakerMailJson } from '../mail-ui-helpers';
import type { FilemakerMailAccount, FilemakerMailFolderSummary, FilemakerMailThread } from '../types';
import {
  groupFilemakerMailFoldersByAccount,
  hasFilemakerMailSyncIssue,
} from './AdminFilemakerMailClientPage.helpers';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type FoldersResponse = { folders: FilemakerMailFolderSummary[] };
type ThreadsResponse = { threads: FilemakerMailThread[] };
type MailClientMailboxData = {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
  recentThreads: FilemakerMailThread[];
  loadError: string | null;
  recentThreadsError: string | null;
};

const DEFAULT_LOAD_ERROR = 'Failed to load Filemaker email client data.';
const DEFAULT_RECENT_THREADS_ERROR = 'Failed to load recent Filemaker mail activity.';
const RECENT_THREADS_LIMIT = 6;
const EMPTY_MAIL_CLIENT_DATA: MailClientMailboxData = {
  accounts: [],
  folders: [],
  recentThreads: [],
  loadError: null,
  recentThreadsError: null,
};

const getFetchErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error ? error.message : fallback;

const getSettledReason = <T,>(result: PromiseSettledResult<T>): unknown =>
  result.status === 'rejected' ? (result.reason as unknown) : undefined;

const getSettledValue = <T,>(result: PromiseSettledResult<T>, fallback: T): T =>
  result.status === 'fulfilled' ? result.value : fallback;

const getSettledErrorMessage = (error: unknown, fallback: string): string | null =>
  error === undefined ? null : getFetchErrorMessage(error, fallback);

const logSettledReason = (error: unknown): void => {
  if (error !== undefined) logClientError(error);
};

const loadAdminFilemakerMailClientData = async (): Promise<MailClientMailboxData> => {
  const [accountsResult, foldersResult, threadsResult] = await Promise.allSettled([
    fetchFilemakerMailJson<AccountsResponse>('/api/filemaker/mail/accounts'),
    fetchFilemakerMailJson<FoldersResponse>('/api/filemaker/mail/folders'),
    fetchFilemakerMailJson<ThreadsResponse>(`/api/filemaker/mail/threads?limit=${RECENT_THREADS_LIMIT}`),
  ]);
  const loadFailure = getSettledReason(accountsResult) ?? getSettledReason(foldersResult);
  const recentThreadsFailure = getSettledReason(threadsResult);

  logSettledReason(loadFailure);
  logSettledReason(recentThreadsFailure);

  return {
    accounts: getSettledValue(accountsResult, { accounts: [] }).accounts,
    folders: getSettledValue(foldersResult, { folders: [] }).folders,
    recentThreads: getSettledValue(threadsResult, { threads: [] }).threads,
    loadError: getSettledErrorMessage(loadFailure, DEFAULT_LOAD_ERROR),
    recentThreadsError: getSettledErrorMessage(
      recentThreadsFailure,
      DEFAULT_RECENT_THREADS_ERROR
    ),
  };
};

export function useAdminFilemakerMailClientPageState(): {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
  recentThreads: FilemakerMailThread[];
  recentThreadsError: string | null;
  foldersByAccount: Map<string, FilemakerMailFolderSummary[]>;
  activeAccounts: FilemakerMailAccount[];
  attentionAccounts: FilemakerMailAccount[];
  firstActiveAccount: FilemakerMailAccount | null;
  isLoading: boolean;
  loadError: string | null;
  loadMailboxData: () => Promise<void>;
} {
  const [mailboxData, setMailboxData] = useState<MailClientMailboxData>(EMPTY_MAIL_CLIENT_DATA);
  const [isLoading, setIsLoading] = useState(true);

  const loadMailboxData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setMailboxData((current) => ({
      ...current,
      loadError: null,
      recentThreadsError: null,
    }));
    setMailboxData(await loadAdminFilemakerMailClientData());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMailboxData();
  }, [loadMailboxData]);

  const foldersByAccount = useMemo(
    () => groupFilemakerMailFoldersByAccount(mailboxData.folders),
    [mailboxData.folders]
  );
  const activeAccounts = useMemo(
    () => mailboxData.accounts.filter((account) => account.status === 'active'),
    [mailboxData.accounts]
  );
  const attentionAccounts = useMemo(
    () => mailboxData.accounts.filter((account) => hasFilemakerMailSyncIssue(account)),
    [mailboxData.accounts]
  );

  return {
    accounts: mailboxData.accounts,
    folders: mailboxData.folders,
    recentThreads: mailboxData.recentThreads,
    recentThreadsError: mailboxData.recentThreadsError,
    foldersByAccount,
    activeAccounts,
    attentionAccounts,
    firstActiveAccount: activeAccounts[0] ?? mailboxData.accounts[0] ?? null,
    isLoading,
    loadError: mailboxData.loadError,
    loadMailboxData,
  };
}
