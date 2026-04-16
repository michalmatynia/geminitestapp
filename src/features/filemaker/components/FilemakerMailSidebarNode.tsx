'use client';

import { useRouter } from 'nextjs-toploader/app';
import React, { memo, startTransition } from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { useToast } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import {
  formatFilemakerMailFolderLabel,
  parseFilemakerMailMasterNodeId,
} from '../mail-master-tree';
import type { FilemakerMailFolderRole } from '@/shared/contracts/filemaker-mail';
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
  RefreshCcw,
  renderFilemakerMailCountBadge as renderCountBadge,
  Search,
  Settings2,
  ShieldAlert,
  toFilemakerAccountStatusToggleDraft as toAccountStatusToggleDraft,
} from './FilemakerMailSidebar.helpers';

import type { FilemakerMailAccount } from '../types';
import { useFilemakerMailSidebar } from './FilemakerMailSidebarContext';

export const FilemakerMailSidebarNode = memo(({
  input,
}: {
  input: FolderTreeViewportRenderNodeInput;
}): React.JSX.Element => {
  const router = useRouter();
  const { toast } = useToast();
  const {
    accounts,
    setAccounts,
    syncingAccountId,
    setSyncingAccountId,
    statusUpdatingAccountId,
    setStatusUpdatingAccountId,
    fetchAccountsAndFolders,
    effectiveSearchAccountId,
    searchQuery,
    recentMailboxFilter,
    recentUnreadOnly,
    recentQuery,
    originPanel,
    isSearchContext,
    onNewMailbox,
    onSelectSearch,
    onSelectAttention,
    onSelectAccountSettings,
    onSelectFolder,
    onAccountUpdated,
    onSelectAccount,
  } = useFilemakerMailSidebar();

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
  const isSearch = parsed?.kind === 'mail_search';
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
    : isSearch
    ? Search
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
          startTransition(() => {
            router.push('/admin/filemaker/mail');
          });
          return;
        }
        if (parsed?.kind === 'mail_search') {
          if (onSelectSearch) {
            onSelectSearch();
            return;
          }
          startTransition(() => {
            router.push(
              buildMailSelectionHref({
                panel: 'search',
                accountId: effectiveSearchAccountId,
                searchQuery,
              })
            );
          });
          return;
        }
        if (parsed?.kind === 'mail_attention') {
          if (onSelectAttention) {
            onSelectAttention();
            return;
          }
          startTransition(() => {
            router.push(buildMailSelectionHref({ panel: 'attention' }));
          });
          return;
        }
        if (parsed?.kind === 'mail_attention_account') {
          if (onSelectAccountSettings) {
            onSelectAccountSettings(parsed.accountId);
            return;
          }
          startTransition(() => {
            router.push(
              buildMailSelectionHref({
                accountId: parsed.accountId,
                panel: 'settings',
                recentMailboxFilter,
                recentUnreadOnly,
                recentQuery,
              })
            );
          });
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
          startTransition(() => {
            router.push(
              buildMailSelectionHref({
                accountId: parsed.accountId,
                mailboxPath: parsed.mailboxPath,
                recentMailboxFilter,
                recentUnreadOnly,
                recentQuery,
              })
            );
          });
          return;
        }
        if (parsed?.kind === 'mail_account_compose') {
          startTransition(() => {
            router.push(
              buildComposeHref({
                accountId: parsed.accountId,
                originPanel,
                recentMailboxFilter,
                recentUnreadOnly,
                recentQuery,
                searchAccountId: isSearchContext && !effectiveSearchAccountId ? 'all' : null,
                searchQuery,
              })
            );
          });
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
              await fetchAccountsAndFolders();
              toast(`Mailbox sync finished. Messages fetched: ${result.result.fetchedMessageCount}.`, {
                variant: 'success',
              });
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
                current.map((entry) => (entry.id === result.account.id ? result.account : entry))
              );
              await onAccountUpdated?.(result.account);
              toast(nextStatus === 'paused' ? 'Mailbox paused.' : 'Mailbox resumed.', {
                variant: 'success',
              });
            } catch (error) {
              toast(error instanceof Error ? error.message : 'Failed to update mailbox status.', {
                variant: 'error',
              });
            } finally {
              setStatusUpdatingAccountId(null);
            }
          })();
          return;
        }
        if (parsed?.kind === 'mail_account_recent') {
          startTransition(() => {
            router.push(
              buildMailSelectionHref({
                accountId: parsed.accountId,
                panel: 'recent',
                recentMailboxFilter,
                recentUnreadOnly,
                recentQuery,
              })
            );
          });
          return;
        }
        if (parsed?.kind === 'mail_thread' || parsed?.kind === 'mail_recent_thread') {
          startTransition(() => {
            router.push(
              buildThreadHref({
                threadId: parsed.threadId,
                accountId: parsed.accountId,
                mailboxPath: parsed.mailboxPath,
                originPanel,
                recentMailboxFilter,
                recentUnreadOnly,
                recentQuery,
                searchAccountId: isSearchContext && !effectiveSearchAccountId ? 'all' : null,
                searchQuery,
              })
            );
          });
          return;
        }
        if (parsed?.kind === 'mail_account_settings') {
          if (onSelectAccountSettings) {
            onSelectAccountSettings(parsed.accountId);
            return;
          }
          startTransition(() => {
            router.push(
              buildMailSelectionHref({
                accountId: parsed.accountId,
                panel: 'settings',
                recentMailboxFilter,
                recentUnreadOnly,
                recentQuery,
              })
            );
          });
          return;
        }
        if (parsed?.kind === 'mail_account') {
          if (onSelectAccount) {
            onSelectAccount(parsed.accountId);
            return;
          }
          startTransition(() => {
            router.push(
              buildMailSelectionHref({
                accountId: parsed.accountId,
                panel: 'account',
                recentMailboxFilter,
                recentUnreadOnly,
                recentQuery,
              })
            );
          });
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
        <span className='inline-flex size-4 items-center justify-center text-xs opacity-40'>•</span>
      )}
      <Icon className='size-4 shrink-0 text-gray-400' />
      <span className='min-w-0 flex-1'>
        <span className='block truncate'>{nodeLabel}</span>
        {isThread && threadSecondaryLabel ? (
          <span className='block truncate text-[11px] text-gray-500'>{threadSecondaryLabel}</span>
        ) : null}
        {isAccount && accountSecondaryLabel ? (
          <span className='block truncate text-[11px] text-gray-500'>{accountSecondaryLabel}</span>
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
          <span className='block truncate text-[11px] text-gray-500'>{managementSecondaryLabel}</span>
        ) : null}
      </span>
      {messageCount > 0 ? renderCountBadge('', messageCount) : null}
      {threadCount > 0 ? renderCountBadge('', threadCount) : null}
      {unreadCount > 0 ? renderCountBadge('', unreadCount, 'accent') : null}
    </button>
  );
});
