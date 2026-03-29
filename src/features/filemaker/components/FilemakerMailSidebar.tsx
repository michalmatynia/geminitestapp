'use client';

import { FilterX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { FolderTreeViewportV2, useMasterFolderTreeShell } from '@/features/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/features/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { Badge, Button, Checkbox, Input, SelectSimple, useToast } from '@/shared/ui';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';
import { cn } from '@/shared/utils';

import {
  buildFilemakerMailMasterNodes,
  formatFilemakerMailFolderLabel,
  parseFilemakerMailMasterNodeId,
  toFilemakerMailAttentionNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailAccountComposeNodeId,
  toFilemakerMailAccountRecentNodeId,
  toFilemakerMailAccountSettingsNodeId,
  toFilemakerMailAccountStatusToggleNodeId,
  toFilemakerMailAccountSyncNodeId,
  toFilemakerMailFolderNodeId,
  toFilemakerMailNewAccountNodeId,
  toFilemakerMailThreadNodeId,
} from '../mail-master-tree';
import {
  buildFilemakerMailSelectionHref as buildMailSelectionHref,
  fetchFilemakerMailJson as fetchJson,
} from '../mail-ui-helpers';
import {
  buildFilemakerMailComposeHref as buildComposeHref,
  buildFilemakerMailThreadHref as buildThreadHref,
  CirclePause,
  CirclePlay,
  Clock3,
  formatFilemakerMailLastSyncedLabel as formatLastSyncedLabel,
  formatFilemakerMailThreadParticipantsLabel as formatThreadParticipantsLabel,
  getFilemakerMailFolderIcon as getFolderIcon,
  Mail,
  MailPlus,
  matchesFilemakerMailRecentThreadFilters as matchesRecentThreadFilters,
  RefreshCcw,
  renderFilemakerMailCountBadge as renderCountBadge,
  Settings2,
  ShieldAlert,
  toFilemakerAccountStatusToggleDraft as toAccountStatusToggleDraft,
} from './FilemakerMailSidebar.helpers';

import type {
  FilemakerMailAccount,
  FilemakerMailFolderRole,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';

type AccountsResponse = { accounts: FilemakerMailAccount[] };
type FoldersResponse = { folders: FilemakerMailFolderSummary[] };
type ThreadsResponse = { threads: FilemakerMailThread[] };

type FilemakerMailSidebarProps = {
  selectedAccountId?: string | null;
  selectedMailboxPath?: string | null;
  selectedThreadId?: string | null;
  selectedPanel?: 'account' | 'attention' | 'compose' | 'recent' | 'settings' | null;
  originPanel?: 'recent' | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
  onRecentMailboxFilterChange?: (value: string) => void;
  onRecentQueryChange?: (value: string) => void;
  onRecentUnreadOnlyChange?: (value: boolean) => void;
  onSelectAttention?: () => void;
  onSelectAccount?: (accountId: string) => void;
  onSelectAccountSettings?: (accountId: string) => void;
  onSelectFolder?: (selection: { accountId: string; mailboxPath: string }) => void;
  onAccountUpdated?: (account: FilemakerMailAccount) => void | Promise<void>;
  onNewMailbox?: () => void;
};

export function FilemakerMailSidebar({
  selectedAccountId = null,
  selectedMailboxPath = null,
  selectedThreadId = null,
  selectedPanel = null,
  originPanel = null,
  recentMailboxFilter = null,
  recentUnreadOnly = false,
  recentQuery = null,
  onRecentMailboxFilterChange,
  onRecentQueryChange,
  onRecentUnreadOnlyChange,
  onSelectAttention,
  onSelectAccount,
  onSelectAccountSettings,
  onSelectFolder,
  onAccountUpdated,
  onNewMailbox,
}: FilemakerMailSidebarProps): React.JSX.Element {
  const router = useRouter();
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<FilemakerMailAccount[]>([]);
  const [folders, setFolders] = useState<FilemakerMailFolderSummary[]>([]);
  const [threads, setThreads] = useState<FilemakerMailThread[]>([]);
  const [recentThreads, setRecentThreads] = useState<FilemakerMailThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);
  const [statusUpdatingAccountId, setStatusUpdatingAccountId] = useState<string | null>(null);
  const hasActiveRecentFilters = Boolean(
    recentMailboxFilter || recentUnreadOnly || recentQuery?.trim()
  );
  const isRecentContext = selectedPanel === 'recent' || originPanel === 'recent';
  const showRecentControls = Boolean(selectedAccountId && selectedPanel === 'recent');
  const errorAccountCount = useMemo(
    () => accounts.filter((account) => Boolean(account.lastSyncError?.trim())).length,
    [accounts]
  );
  const inactiveAccountCount = useMemo(
    () => accounts.filter((account) => account.status !== 'active').length,
    [accounts]
  );
  const visibleRecentThreads = useMemo(
    () =>
      recentThreads.filter((thread) =>
        matchesRecentThreadFilters(thread, {
          recentMailboxFilter,
          recentUnreadOnly,
          recentQuery,
        })
      ),
    [recentMailboxFilter, recentQuery, recentThreads, recentUnreadOnly]
  );
  const recentMailboxOptions = useMemo(
    () => {
      const rolesByMailboxPath = new Map<string, FilemakerMailThread['mailboxRole']>();
      recentThreads.forEach((thread) => {
        if (!rolesByMailboxPath.has(thread.mailboxPath)) {
          rolesByMailboxPath.set(thread.mailboxPath, thread.mailboxRole);
        }
      });

      return Array.from(rolesByMailboxPath.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([mailboxPath, mailboxRole]) => ({
          value: mailboxPath,
          label: formatFilemakerMailFolderLabel(mailboxPath, mailboxRole),
        }));
    },
    [recentThreads]
  );

  const treeNodes = useMemo(
    (): MasterTreeNode[] =>
      buildFilemakerMailMasterNodes({
        accounts,
        folders,
        threads,
        recentThreads: visibleRecentThreads,
      }),
    [accounts, folders, threads, visibleRecentThreads]
  );
  const selectedNodeId = useMemo(() => {
    if (selectedPanel === 'attention') {
      return toFilemakerMailAttentionNodeId();
    }
    if (selectedAccountId && selectedThreadId) {
      const recentMatch = treeNodes.find(
        (node) =>
          node.kind === 'mail_recent_thread' &&
          node.metadata?.['accountId'] === selectedAccountId &&
          node.metadata?.['threadId'] === selectedThreadId
      );
      if (recentMatch) return recentMatch.id;
    }
    if (selectedAccountId && selectedPanel === 'recent') {
      return toFilemakerMailAccountRecentNodeId(selectedAccountId);
    }
    if (selectedAccountId && selectedMailboxPath && selectedThreadId) {
      return toFilemakerMailThreadNodeId(
        selectedAccountId,
        selectedMailboxPath,
        selectedThreadId
      );
    }
    if (selectedAccountId && selectedMailboxPath) {
      const match = treeNodes.find(
        (node) =>
          node.kind === 'mail_folder' &&
          node.metadata?.['accountId'] === selectedAccountId &&
          node.metadata?.['mailboxPath'] === selectedMailboxPath
      );
      if (match) return match.id;
    }
    if (selectedAccountId && selectedPanel === 'compose') {
      return toFilemakerMailAccountComposeNodeId(selectedAccountId);
    }
    if (selectedAccountId && syncingAccountId === selectedAccountId) {
      return toFilemakerMailAccountSyncNodeId(selectedAccountId);
    }
    if (selectedAccountId && statusUpdatingAccountId === selectedAccountId) {
      return toFilemakerMailAccountStatusToggleNodeId(selectedAccountId);
    }
    if (selectedAccountId && selectedPanel === 'settings') {
      return toFilemakerMailAccountSettingsNodeId(selectedAccountId);
    }
    if (selectedAccountId) {
      return toFilemakerMailAccountNodeId(selectedAccountId);
    }
    return toFilemakerMailNewAccountNodeId();
  }, [
    selectedAccountId,
    selectedMailboxPath,
    selectedPanel,
    selectedThreadId,
    statusUpdatingAccountId,
    syncingAccountId,
    treeNodes,
  ]);
  const initiallyExpandedNodeIds = useMemo(() => {
    const nodeIds = accounts.map((account) => toFilemakerMailAccountNodeId(account.id));
    if (accounts.some((account) => account.status !== 'active' || account.lastSyncError?.trim())) {
      nodeIds.push(toFilemakerMailAttentionNodeId());
    }
    if (selectedAccountId && selectedMailboxPath) {
      nodeIds.push(toFilemakerMailFolderNodeId(selectedAccountId, selectedMailboxPath));
    }
    if (selectedAccountId && visibleRecentThreads.length > 0) {
      nodeIds.push(toFilemakerMailAccountRecentNodeId(selectedAccountId));
    }
    return nodeIds;
  }, [accounts, selectedAccountId, selectedMailboxPath, visibleRecentThreads.length]);

  const {
    controller,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({
    instance: 'filemaker_mail',
    nodes: treeNodes,
    selectedNodeId,
    initiallyExpandedNodeIds,
  });

  useEffect(() => {
    const load = async (): Promise<void> => {
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
    };
    void load();
  }, [toast]);

  useEffect(() => {
    if (!selectedAccountId) {
      setRecentThreads([]);
      return;
    }

    const loadRecentThreads = async (): Promise<void> => {
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
    };

    void loadRecentThreads();
  }, [selectedAccountId, toast]);

  useEffect(() => {
    if (!selectedAccountId || !selectedMailboxPath) {
      setThreads([]);
      return;
    }

    const loadThreads = async (): Promise<void> => {
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
    };

    void loadThreads();
  }, [selectedAccountId, selectedMailboxPath, toast]);

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => {
      const parsed = parseFilemakerMailMasterNodeId(input.node.id);
      const unreadCount =
        typeof input.node.metadata?.['unreadCount'] === 'number'
          ? input.node.metadata['unreadCount']
          : 0;
      const threadCount =
        typeof input.node.metadata?.['threadCount'] === 'number'
          ? input.node.metadata['threadCount']
          : 0;
      const messageCount =
        typeof input.node.metadata?.['messageCount'] === 'number'
          ? input.node.metadata['messageCount']
          : 0;
      const isNewAccount = parsed?.kind === 'mail_new_account';
      const isAttention = parsed?.kind === 'mail_attention';
      const isAttentionAccount = parsed?.kind === 'mail_attention_account';
      const isAccount = parsed?.kind === 'mail_account';
      const isAccountCompose = parsed?.kind === 'mail_account_compose';
      const isAccountSync = parsed?.kind === 'mail_account_sync';
      const isAccountStatusToggle = parsed?.kind === 'mail_account_status_toggle';
      const isAccountRecent = parsed?.kind === 'mail_account_recent';
      const isAccountSettings = parsed?.kind === 'mail_account_settings';
      const isRecentThread = parsed?.kind === 'mail_recent_thread';
      const isThread = parsed?.kind === 'mail_thread' || parsed?.kind === 'mail_recent_thread';
      const threadSnippet =
        typeof input.node.metadata?.['snippet'] === 'string'
          ? input.node.metadata['snippet'].trim()
          : '';
      const threadParticipants = formatThreadParticipantsLabel(
        input.node.metadata?.['participantSummary']
      );
      const folderRole =
        typeof input.node.metadata?.['mailboxRole'] === 'string'
          ? (input.node.metadata['mailboxRole'] as FilemakerMailFolderRole)
          : 'custom';
      const threadMailboxPath =
        typeof input.node.metadata?.['mailboxPath'] === 'string'
          ? input.node.metadata['mailboxPath']
          : '';
      const threadFolderLabel =
        isRecentThread && threadMailboxPath
          ? formatFilemakerMailFolderLabel(threadMailboxPath, folderRole)
          : '';
      const baseThreadSecondaryLabel = threadSnippet || threadParticipants;
      const threadSecondaryLabel =
        threadFolderLabel && baseThreadSecondaryLabel
          ? `${threadFolderLabel} • ${baseThreadSecondaryLabel}`
          : threadFolderLabel || baseThreadSecondaryLabel;
      const nodeStatus =
        typeof input.node.metadata?.['status'] === 'string'
          ? input.node.metadata['status']
          : null;
      const emailAddress =
        typeof input.node.metadata?.['emailAddress'] === 'string'
          ? input.node.metadata['emailAddress'].trim()
          : '';
      const lastSyncedAt = input.node.metadata?.['lastSyncedAt'];
      const lastSyncError =
        typeof input.node.metadata?.['lastSyncError'] === 'string'
          ? input.node.metadata['lastSyncError'].trim()
          : '';
      const accountSecondaryLabel = isAccount
        ? emailAddress
          ? nodeStatus && nodeStatus !== 'active'
            ? `${emailAddress} • Status: ${nodeStatus}`
            : lastSyncError
              ? `${emailAddress} • Sync error`
              : `${emailAddress} • ${formatLastSyncedLabel(lastSyncedAt)}`
          : nodeStatus && nodeStatus !== 'active'
            ? `Status: ${nodeStatus}`
            : ''
        : '';
      const attentionSecondaryLabel = isAttentionAccount
        ? lastSyncError
          ? `Sync error: ${lastSyncError}`
          : nodeStatus && nodeStatus !== 'active'
            ? `Status: ${nodeStatus}`
            : formatLastSyncedLabel(lastSyncedAt)
        : '';
      const managementSecondaryLabel =
        isAccountSync || isAccountSettings
          ? lastSyncError
            ? `Sync error: ${lastSyncError}`
            : formatLastSyncedLabel(lastSyncedAt)
          : isAccountStatusToggle
            ? `Current status: ${nodeStatus ?? 'active'}`
          : '';
      const Icon = isNewAccount
        ? MailPlus
        : isAttention
        ? ShieldAlert
        : isAttentionAccount
          ? Settings2
        : isAccount
        ? Mail
        : isAccountCompose
          ? MailPlus
          : isAccountSync
            ? RefreshCcw
          : isAccountStatusToggle
            ? nodeStatus === 'active'
              ? CirclePause
              : CirclePlay
          : isAccountRecent
            ? Clock3
          : isAccountSettings
            ? Settings2
            : isThread
              ? Mail
              : getFolderIcon(folderRole);
      const hasChildren = input.hasChildren;

      const isSyncingNode = isAccountSync && syncingAccountId === parsed?.accountId;
      const isStatusUpdatingNode =
        isAccountStatusToggle && statusUpdatingAccountId === parsed?.accountId;
      const nodeLabel =
        isSyncingNode
          ? 'Syncing...'
          : isStatusUpdatingNode
            ? nodeStatus === 'active'
              ? 'Pausing...'
              : 'Resuming...'
            : input.node.name;

      return (
        <button
          type='button'
          onClick={(event): void => {
            input.select(event);
            if (parsed?.kind === 'mail_new_account') {
              if (onNewMailbox) {
                onNewMailbox();
                return;
              }
              router.push('/admin/filemaker/mail');
              return;
            }
            if (parsed?.kind === 'mail_attention') {
              if (onSelectAttention) {
                onSelectAttention();
                return;
              }
              router.push(buildMailSelectionHref({ panel: 'attention' }));
              return;
            }
            if (parsed?.kind === 'mail_attention_account') {
              if (onSelectAccountSettings) {
                onSelectAccountSettings(parsed.accountId);
                return;
              }
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  panel: 'settings',
                  recentMailboxFilter,
                  recentUnreadOnly,
                  recentQuery,
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_folder') {
              if (onSelectFolder) {
                onSelectFolder({
                  accountId: parsed.accountId,
                  mailboxPath: parsed.mailboxPath,
                });
                return;
              }
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  mailboxPath: parsed.mailboxPath,
                  recentMailboxFilter,
                  recentUnreadOnly,
                  recentQuery,
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_account_compose') {
              router.push(
                buildComposeHref({
                  accountId: parsed.accountId,
                  originPanel,
                  recentMailboxFilter,
                  recentUnreadOnly,
                  recentQuery,
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_account_sync') {
              if (syncingAccountId === parsed.accountId) {
                return;
              }
              setSyncingAccountId(parsed.accountId);
              void (async () => {
                try {
                  const result = await fetchJson<{ result: { fetchedMessageCount: number } }>(
                    `/api/filemaker/mail/accounts/${encodeURIComponent(parsed.accountId)}/sync`,
                    { method: 'POST' }
                  );
                  const [accountsResult, foldersResult] = await Promise.all([
                    fetchJson<AccountsResponse>('/api/filemaker/mail/accounts'),
                    fetchJson<FoldersResponse>('/api/filemaker/mail/folders'),
                  ]);
                  setAccounts(accountsResult.accounts);
                  setFolders(foldersResult.folders);
                  if (selectedAccountId === parsed.accountId) {
                    const recentResult = await fetchJson<ThreadsResponse>(
                      `/api/filemaker/mail/threads?accountId=${encodeURIComponent(parsed.accountId)}`
                    );
                    setRecentThreads(recentResult.threads);
                    if (selectedMailboxPath) {
                      const threadResult = await fetchJson<ThreadsResponse>(
                        `/api/filemaker/mail/threads?accountId=${encodeURIComponent(
                          parsed.accountId
                        )}&mailboxPath=${encodeURIComponent(selectedMailboxPath)}`
                      );
                      setThreads(threadResult.threads);
                    }
                  }
                  toast(
                    `Mailbox sync finished. Messages fetched: ${result.result.fetchedMessageCount}.`,
                    {
                      variant: 'success',
                    }
                  );
                } catch (error) {
                  toast(error instanceof Error ? error.message : 'Mailbox sync failed.', {
                    variant: 'error',
                  });
                } finally {
                  setSyncingAccountId(null);
                }
              })();
              return;
            }
            if (parsed?.kind === 'mail_account_status_toggle') {
              const account = accounts.find((entry) => entry.id === parsed.accountId);
              if (!account || statusUpdatingAccountId === parsed.accountId) {
                return;
              }
              const nextStatus = account.status === 'active' ? 'paused' : 'active';
              setStatusUpdatingAccountId(parsed.accountId);
              void (async () => {
                try {
                  const result = await fetchJson<{ account: FilemakerMailAccount }>(
                    '/api/filemaker/mail/accounts',
                    {
                      method: 'POST',
                      body: JSON.stringify(toAccountStatusToggleDraft(account, nextStatus)),
                    }
                  );
                  setAccounts((current) =>
                    current.map((entry) =>
                      entry.id === result.account.id ? result.account : entry
                    )
                  );
                  await onAccountUpdated?.(result.account);
                  toast(
                    nextStatus === 'paused' ? 'Mailbox paused.' : 'Mailbox resumed.',
                    {
                      variant: 'success',
                    }
                  );
                } catch (error) {
                  toast(
                    error instanceof Error
                      ? error.message
                      : 'Failed to update mailbox status.',
                    {
                      variant: 'error',
                    }
                  );
                } finally {
                  setStatusUpdatingAccountId(null);
                }
              })();
              return;
            }
            if (parsed?.kind === 'mail_account_recent') {
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  panel: 'recent',
                  recentMailboxFilter,
                  recentUnreadOnly,
                  recentQuery,
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_thread' || parsed?.kind === 'mail_recent_thread') {
              router.push(
                buildThreadHref({
                  threadId: parsed.threadId,
                  accountId: parsed.accountId,
                  mailboxPath: parsed.mailboxPath,
                  originPanel,
                  recentMailboxFilter,
                  recentUnreadOnly,
                  recentQuery,
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_account_settings') {
              if (onSelectAccountSettings) {
                onSelectAccountSettings(parsed.accountId);
                return;
              }
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  panel: 'settings',
                  recentMailboxFilter,
                  recentUnreadOnly,
                  recentQuery,
                })
              );
              return;
            }
            if (parsed?.kind === 'mail_account') {
              if (onSelectAccount) {
                onSelectAccount(parsed.accountId);
                return;
              }
              router.push(
                buildMailSelectionHref({
                  accountId: parsed.accountId,
                  panel: 'account',
                  recentMailboxFilter,
                  recentUnreadOnly,
                  recentQuery,
                })
              );
            }
          }}
          className={cn(
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition',
            input.isSelected
              ? 'bg-sky-500/15 text-white ring-1 ring-inset ring-sky-400/40'
              : 'text-gray-300 hover:bg-white/5'
          )}
          style={{ paddingLeft: `${input.depth * 16 + 8}px` }}
        >
          {hasChildren ? (
            <span
              aria-hidden='true'
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                input.toggleExpand();
              }}
              className='inline-flex size-4 items-center justify-center rounded hover:bg-white/5'
            >
              {input.isExpanded ? '▾' : '▸'}
            </span>
          ) : (
            <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>
              •
            </span>
          )}
          <Icon className='size-4 shrink-0 text-gray-400' />
          <span className='min-w-0 flex-1'>
            <span className='block truncate'>{nodeLabel}</span>
            {isThread && threadSecondaryLabel ? (
              <span className='block truncate text-[11px] text-gray-500'>
                {threadSecondaryLabel}
              </span>
            ) : null}
            {isAccount && accountSecondaryLabel ? (
              <span className='block truncate text-[11px] text-gray-500'>
                {accountSecondaryLabel}
              </span>
            ) : null}
            {isAttentionAccount && attentionSecondaryLabel ? (
              <span className='block truncate text-[11px] text-amber-300/80'>
                {attentionSecondaryLabel}
              </span>
            ) : null}
            {(isAccountSync || isAccountSettings) && managementSecondaryLabel ? (
              <span className='block truncate text-[11px] text-amber-300/80'>
                {managementSecondaryLabel}
              </span>
            ) : null}
            {isAccountStatusToggle && managementSecondaryLabel ? (
              <span className='block truncate text-[11px] text-gray-500'>
                {managementSecondaryLabel}
              </span>
            ) : null}
          </span>
          {messageCount > 0 ? renderCountBadge('', messageCount) : null}
          {threadCount > 0 ? renderCountBadge('', threadCount) : null}
          {unreadCount > 0 ? renderCountBadge('', unreadCount, 'accent') : null}
        </button>
      );
    },
    [
      accounts,
      onAccountUpdated,
      onSelectAttention,
      onSelectAccount,
      onSelectAccountSettings,
      onSelectFolder,
      recentMailboxFilter,
      recentUnreadOnly,
      recentQuery,
      originPanel,
      router,
      selectedAccountId,
      selectedMailboxPath,
      statusUpdatingAccountId,
      syncingAccountId,
      toast,
    ]
  );

  const updateRecentRoute = useCallback(
    (input: {
      recentMailboxFilter?: string | null;
      recentUnreadOnly?: boolean;
      recentQuery?: string;
    }): void => {
      if (!selectedAccountId) return;
      router.replace(
        buildMailSelectionHref({
          accountId: selectedAccountId,
          panel: 'recent',
          recentMailboxFilter: input.recentMailboxFilter ?? recentMailboxFilter,
          recentUnreadOnly: input.recentUnreadOnly ?? recentUnreadOnly,
          recentQuery: input.recentQuery ?? recentQuery,
        })
      );
    },
    [recentMailboxFilter, recentQuery, recentUnreadOnly, router, selectedAccountId]
  );

  return (
    <div className='rounded-lg border border-border/60 bg-card/25 p-3'>
      <FolderTreePanel
        className='min-h-[680px]'
        bodyClassName='min-h-0 overflow-hidden'
        masterInstance='filemaker_mail'
        header={
          <div className='space-y-3 border-b border-border/60 px-1 pb-3'>
            <div>
              <div className='text-sm font-semibold text-white'>Mail Navigation</div>
              <div className='text-xs text-gray-500'>
                Manage mailbox accounts and browse synced folders.
              </div>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={(): void => {
                  if (onNewMailbox) {
                    onNewMailbox();
                    return;
                  }
                  router.push('/admin/filemaker/mail');
                }}
              >
                New Mailbox
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                onClick={(): void => {
                  router.push(
                    buildComposeHref({
                      accountId: selectedAccountId,
                      mailboxPath: selectedMailboxPath,
                      originPanel,
                      recentMailboxFilter,
                      recentUnreadOnly,
                      recentQuery,
                    })
                  );
                }}
              >
                <MailPlus className='mr-2 size-4' />
                Compose
              </Button>
              {selectedAccountId && isRecentContext && hasActiveRecentFilters ? (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={(): void => {
                    router.push(
                      buildMailSelectionHref({
                        accountId: selectedAccountId,
                        panel: 'recent',
                      })
                    );
                  }}
                >
                  <FilterX className='mr-2 size-4' />
                  Clear Recent
                </Button>
              ) : null}
            </div>
            {showRecentControls ? (
              <div className='space-y-2 rounded-md border border-white/10 bg-white/[0.03] p-2'>
                <SelectSimple
                  value={recentMailboxFilter ?? ''}
                  onValueChange={(nextValue) => {
                    if (onRecentMailboxFilterChange) {
                      onRecentMailboxFilterChange(nextValue);
                      return;
                    }
                    updateRecentRoute({ recentMailboxFilter: nextValue });
                  }}
                  options={recentMailboxOptions}
                  placeholder='All mailboxes'
                  ariaLabel='Sidebar recent mailbox filter'
                />
                <Input
                  value={recentQuery ?? ''}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
                    const nextValue = event.target.value;
                    if (onRecentQueryChange) {
                      onRecentQueryChange(nextValue);
                      return;
                    }
                    updateRecentRoute({ recentQuery: nextValue });
                  }}
                  aria-label='Sidebar recent search'
                  placeholder='Filter recent threads...'
                />
                <label
                  htmlFor='filemaker-mail-sidebar-recent-unread'
                  className='flex items-center gap-2 text-[11px] text-gray-300'
                >
                  <Checkbox
                    id='filemaker-mail-sidebar-recent-unread'
                    checked={recentUnreadOnly}
                    onCheckedChange={(checked) => {
                      const nextValue = checked === true;
                      if (onRecentUnreadOnlyChange) {
                        onRecentUnreadOnlyChange(nextValue);
                        return;
                      }
                      updateRecentRoute({ recentUnreadOnly: nextValue });
                    }}
                  />
                  Sidebar recent unread only
                </label>
              </div>
            ) : null}
            <div className='flex flex-wrap gap-2 text-[10px]'>
              <Badge variant='outline'>Accounts: {accounts.length}</Badge>
              <Badge variant='outline'>Folders: {folders.length}</Badge>
              {errorAccountCount > 0 ? (
                <Badge variant='outline'>Sync Errors: {errorAccountCount}</Badge>
              ) : null}
              {inactiveAccountCount > 0 ? (
                <Badge variant='outline'>Inactive: {inactiveAccountCount}</Badge>
              ) : null}
              {selectedAccountId ? (
                <Badge variant='outline'>Recent: {Math.min(visibleRecentThreads.length, 5)}</Badge>
              ) : null}
              {selectedAccountId && recentMailboxFilter ? (
                <Badge variant='outline'>Recent Mailbox: {recentMailboxFilter}</Badge>
              ) : null}
              {selectedAccountId && recentUnreadOnly ? (
                <Badge variant='outline'>Recent Unread</Badge>
              ) : null}
              {selectedAccountId && recentQuery?.trim() ? (
                <Badge variant='outline'>Recent Search: {recentQuery.trim()}</Badge>
              ) : null}
              {selectedAccountId && selectedMailboxPath ? (
                <Badge variant='outline'>Threads: {threads.length}</Badge>
              ) : null}
            </div>
          </div>
        }
      >
        <div className='min-h-0 overflow-auto p-2'>
          <FolderTreeViewportV2
            controller={controller}
            scrollToNodeRef={scrollToNodeRef}
            rootDropUi={rootDropUi}
            enableDnd={false}
            emptyLabel={isLoading ? 'Loading mailboxes...' : 'No mailboxes configured'}
            renderNode={renderNode}
          />
        </div>
      </FolderTreePanel>
    </div>
  );
}
