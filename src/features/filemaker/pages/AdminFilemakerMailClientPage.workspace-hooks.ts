'use client';

import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import type React from 'react';
import { startTransition, useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@/shared/ui/primitives.public';

import { fetchFilemakerMailJson } from '../mail-ui-helpers';
import { parseFilemakerMailParticipantsInput } from '../mail-utils';
import type {
  FilemakerMailAccount,
  FilemakerMailThread,
  FilemakerMailThreadDetail,
} from '../types';
import {
  buildClientSelectionHref,
  buildThreadListUrl,
  EMPTY_REPLY_HTML,
  formatParticipants,
  normalizeSearchValue,
  resolveThreadSelection,
  type MailClientReplyDraftState,
  type MailClientSelection,
  type ThreadDetailResponse,
  type ThreadListResponse,
} from './AdminFilemakerMailClientPage.workspace-model';

type SelectionController = {
  selection: MailClientSelection;
  applySelection: (selection: MailClientSelection) => void;
  setSelection: React.Dispatch<React.SetStateAction<MailClientSelection>>;
};

type ThreadsState = {
  threads: FilemakerMailThread[];
  threadsError: string | null;
  isThreadsLoading: boolean;
  refreshThreads: () => void;
};

type DetailState = MailClientReplyDraftState & {
  detail: FilemakerMailThreadDetail | null;
  detailError: string | null;
  isDetailLoading: boolean;
  refreshDetail: () => void;
  setReplyTo: (value: string) => void;
  setReplyCc: (value: string) => void;
  setReplyBcc: (value: string) => void;
  setReplySubject: (value: string) => void;
  setReplyHtml: (value: string) => void;
};

const getInitialSelection = (searchParams: ReturnType<typeof useSearchParams>): MailClientSelection => ({
  accountId: normalizeSearchValue(searchParams.get('accountId')),
  mailboxPath: normalizeSearchValue(searchParams.get('mailboxPath')),
  threadId: normalizeSearchValue(searchParams.get('threadId')),
});

export const useMailClientSelection = ({
  accounts,
  firstActiveAccount,
}: {
  accounts: FilemakerMailAccount[];
  firstActiveAccount: FilemakerMailAccount | null;
}): SelectionController => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selection, setSelection] = useState<MailClientSelection>(() =>
    getInitialSelection(searchParams)
  );
  const applySelection = useCallback(
    (nextSelection: MailClientSelection): void => {
      setSelection(nextSelection);
      startTransition(() => {
        router.replace(buildClientSelectionHref(nextSelection));
      });
    },
    [router]
  );

  useEffect(() => {
    if (accounts.length === 0) {
      setSelection({ accountId: null, mailboxPath: null, threadId: null });
      return;
    }
    const accountExists =
      selection.accountId !== null &&
      accounts.some((account) => account.id === selection.accountId);
    if (accountExists) return;
    const nextAccountId = firstActiveAccount?.id ?? accounts[0]?.id ?? null;
    setSelection({ accountId: nextAccountId, mailboxPath: null, threadId: null });
  }, [accounts, firstActiveAccount, selection.accountId]);

  return { selection, applySelection, setSelection };
};

export const useMailClientThreads = ({
  selection,
  setSelection,
}: {
  selection: MailClientSelection;
  setSelection: React.Dispatch<React.SetStateAction<MailClientSelection>>;
}): ThreadsState => {
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [isThreadsLoading, setIsThreadsLoading] = useState(false);
  const [threadsRefreshKey, setThreadsRefreshKey] = useState(0);
  const refreshThreads = useCallback((): void => {
    setThreadsRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (selection.accountId === null) {
      setThreads([]);
      setThreadsError(null);
      setIsThreadsLoading(false);
      return undefined;
    }
    let isCancelled = false;
    setIsThreadsLoading(true);
    setThreadsError(null);
    void fetchFilemakerMailJson<ThreadListResponse>(
      buildThreadListUrl({
        accountId: selection.accountId,
        mailboxPath: selection.mailboxPath,
      })
    )
      .then((result) => {
        if (isCancelled) return;
        setThreads(result.threads);
        setSelection((current) => resolveThreadSelection(current, selection, result.threads));
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setThreads([]);
        setThreadsError(error instanceof Error ? error.message : 'Failed to load emails.');
        setSelection((current) => ({ ...current, threadId: null }));
      })
      .finally(() => {
        if (!isCancelled) setIsThreadsLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [selection.accountId, selection.mailboxPath, setSelection, threadsRefreshKey]);

  return { threads, threadsError, isThreadsLoading, refreshThreads };
};

const createEmptyReplyDraft = (): MailClientReplyDraftState => ({
  replyAccountId: '',
  replyTo: '',
  replyCc: '',
  replyBcc: '',
  replySubject: '',
  replyInReplyTo: null,
  replyHtml: EMPTY_REPLY_HTML,
});

const createReplyDraftFromResponse = (result: ThreadDetailResponse): MailClientReplyDraftState => {
  if (result.replyDraft === null) {
    return {
      ...createEmptyReplyDraft(),
      replyAccountId: result.detail.thread.accountId,
      replySubject: result.detail.thread.subject,
    };
  }
  return {
    replyAccountId: result.replyDraft.accountId,
    replyTo: formatParticipants(result.replyDraft.to),
    replyCc: '',
    replyBcc: '',
    replySubject: result.replyDraft.subject,
    replyInReplyTo: result.replyDraft.inReplyTo,
    replyHtml: result.replyDraft.bodyHtml,
  };
};

export const useMailClientDetail = (threadId: string | null): DetailState => {
  const [detail, setDetail] = useState<FilemakerMailThreadDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const [replyDraft, setReplyDraft] = useState<MailClientReplyDraftState>(createEmptyReplyDraft);
  const refreshDetail = useCallback((): void => {
    setDetailRefreshKey((current) => current + 1);
  }, []);

  useEffect(() => {
    if (threadId === null) {
      setDetail(null);
      setDetailError(null);
      setIsDetailLoading(false);
      setReplyDraft(createEmptyReplyDraft());
      return undefined;
    }
    let isCancelled = false;
    setIsDetailLoading(true);
    setDetailError(null);
    void fetchFilemakerMailJson<ThreadDetailResponse>(
      `/api/filemaker/mail/threads/${encodeURIComponent(threadId)}`
    )
      .then((result) => {
        if (isCancelled) return;
        setDetail(result.detail);
        setReplyDraft(createReplyDraftFromResponse(result));
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setDetail(null);
        setDetailError(error instanceof Error ? error.message : 'Failed to load selected email.');
      })
      .finally(() => {
        if (!isCancelled) setIsDetailLoading(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [threadId, detailRefreshKey]);

  return {
    detail,
    detailError,
    isDetailLoading,
    refreshDetail,
    ...replyDraft,
    setReplyTo: (value: string): void => setReplyDraft((current) => ({ ...current, replyTo: value })),
    setReplyCc: (value: string): void => setReplyDraft((current) => ({ ...current, replyCc: value })),
    setReplyBcc: (value: string): void => setReplyDraft((current) => ({ ...current, replyBcc: value })),
    setReplySubject: (value: string): void => setReplyDraft((current) => ({ ...current, replySubject: value })),
    setReplyHtml: (value: string): void => setReplyDraft((current) => ({ ...current, replyHtml: value })),
  };
};

export const useMailClientReplySender = ({
  detailState,
  loadMailboxData,
  refreshDetail,
  refreshThreads,
  threadId,
}: {
  detailState: DetailState;
  loadMailboxData: () => Promise<void>;
  refreshDetail: () => void;
  refreshThreads: () => void;
  threadId: string | null;
}): { isSending: boolean; sendReply: () => void } => {
  const { toast } = useToast();
  const [isSending, setIsSending] = useState(false);
  const sendReply = useCallback((): void => {
    if (detailState.detail === null || threadId === null) return;
    setIsSending(true);
    void (async () => {
      try {
        await fetchFilemakerMailJson('/api/filemaker/mail/send', {
          method: 'POST',
          body: JSON.stringify({
            accountId: detailState.replyAccountId,
            threadId,
            inReplyTo: detailState.replyInReplyTo,
            to: parseFilemakerMailParticipantsInput(detailState.replyTo),
            cc: parseFilemakerMailParticipantsInput(detailState.replyCc),
            bcc: parseFilemakerMailParticipantsInput(detailState.replyBcc),
            subject: detailState.replySubject,
            bodyHtml: detailState.replyHtml,
          }),
        });
        toast('Reply sent.', { variant: 'success' });
        refreshThreads();
        refreshDetail();
        await loadMailboxData();
      } catch (error) {
        toast(error instanceof Error ? error.message : 'Failed to send reply.', {
          variant: 'error',
        });
      } finally {
        setIsSending(false);
      }
    })();
  }, [detailState, loadMailboxData, refreshDetail, refreshThreads, threadId, toast]);

  return { isSending, sendReply };
};

export const useSelectedAccount = (
  accounts: FilemakerMailAccount[],
  accountId: string | null
): FilemakerMailAccount | null =>
  useMemo(
    () => accounts.find((account) => account.id === accountId) ?? null,
    [accounts, accountId]
  );
