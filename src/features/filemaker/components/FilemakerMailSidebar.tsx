'use client';

import { FilterX } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useCallback, useMemo, useState, startTransition } from 'react';

import { FolderTreeViewportV2, useMasterFolderTreeShell } from '@/shared/lib/foldertree/public';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import { Badge, Button, Checkbox, Input } from '@/shared/ui/primitives.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { FolderTreePanel } from '@/shared/ui/FolderTreePanel';

import {
  buildFilemakerMailMasterNodes,
  formatFilemakerMailFolderLabel,
  toFilemakerMailAttentionNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailAccountComposeNodeId,
  toFilemakerMailAccountRecentNodeId,
  toFilemakerMailAccountSettingsNodeId,
  toFilemakerMailAccountStatusToggleNodeId,
  toFilemakerMailAccountSyncNodeId,
  toFilemakerMailFolderNodeId,
  toFilemakerMailNewAccountNodeId,
  toFilemakerMailSearchNodeId,
  toFilemakerMailThreadNodeId,
} from '../mail-master-tree';
import {
  buildFilemakerMailSelectionHref as buildMailSelectionHref,
} from '../mail-ui-helpers';
import {
  buildFilemakerMailComposeHref as buildComposeHref,
  MailPlus,
} from './FilemakerMailSidebar.helpers';

import type {
  FilemakerMailAccount,
  FilemakerMailFolderRole,
} from '../types';
import { useFilemakerMailData } from './FilemakerMailSidebar.hooks';
import {
  FilemakerMailSidebarContext,
  type FilemakerMailSidebarContextValue,
} from './FilemakerMailSidebarContext';
import { FilemakerMailSidebarNode } from './FilemakerMailSidebarNode';

type FilemakerMailSidebarProps = {
  selectedAccountId?: string | null;
  selectedMailboxPath?: string | null;
  selectedThreadId?: string | null;
  selectedPanel?: 'account' | 'attention' | 'compose' | 'recent' | 'search' | 'settings' | null;
  originPanel?: 'recent' | 'search' | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
  searchContextAccountId?: string | null;
  searchQuery?: string | null;
  refreshKey?: number;
  onRecentMailboxFilterChange?: (value: string) => void;
  onRecentQueryChange?: (value: string) => void;
  onRecentUnreadOnlyChange?: (value: boolean) => void;
  onSelectAttention?: () => void;
  onSelectSearch?: () => void;
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
  searchContextAccountId = null,
  searchQuery = null,
  refreshKey = 0,
  onRecentMailboxFilterChange,
  onRecentQueryChange,
  onRecentUnreadOnlyChange,
  onSelectAttention,
  onSelectSearch,
  onSelectAccount,
  onSelectAccountSettings,
  onSelectFolder,
  onAccountUpdated,
  onNewMailbox,
}: FilemakerMailSidebarProps): React.JSX.Element {
  const router = useRouter();
  const {
    accounts,
    setAccounts,
    folders,
    threads,
    recentThreads,
    isLoading,
    syncingAccountId,
    setSyncingAccountId,
    fetchAccountsAndFolders,
  } = useFilemakerMailData({
    refreshKey,
    selectedAccountId,
    selectedMailboxPath,
    searchContextAccountId,
    searchQuery,
    recentMailboxFilter,
    recentQuery,
  });

  const [statusUpdatingAccountId, setStatusUpdatingAccountId] = useState<string | null>(null);

  const hasActiveRecentFilters = Boolean(
    recentMailboxFilter || recentUnreadOnly || recentQuery?.trim()
  );
  const isRecentContext = selectedPanel === 'recent' || originPanel === 'recent';
  const isSearchContext = selectedPanel === 'search' || originPanel === 'search';
  const effectiveSearchAccountId = isSearchContext ? searchContextAccountId : selectedAccountId;
  const hasActiveSearchQuery = Boolean(searchQuery?.trim());
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
    () => recentThreads,
    [recentThreads]
  );

  const recentMailboxOptions = useMemo(
    () => {
      const rolesByMailboxPath = new Map<string, FilemakerMailFolderRole>();
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
    const isImplicitSearchSelection = selectedPanel == null && originPanel === 'search';
    const isImplicitRecentSelection = selectedPanel == null && originPanel === 'recent';

    if (selectedPanel === 'search' || isImplicitSearchSelection) {
      return toFilemakerMailSearchNodeId();
    }
    if (selectedPanel === 'attention') {
      return toFilemakerMailAttentionNodeId();
    }
    if (selectedAccountId && selectedPanel === 'compose') {
      return toFilemakerMailAccountComposeNodeId(selectedAccountId);
    }
    if (
      selectedAccountId &&
      selectedThreadId &&
      (selectedPanel === 'recent' || isImplicitRecentSelection)
    ) {
      const recentMatch = treeNodes.find(
        (node) =>
          node.kind === 'mail_recent_thread' &&
          node.metadata?.['accountId'] === selectedAccountId &&
          node.metadata?.['threadId'] === selectedThreadId
      );
      if (recentMatch) return recentMatch.id;
    }
    if (selectedAccountId && (selectedPanel === 'recent' || isImplicitRecentSelection)) {
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
    originPanel,
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

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.JSX.Element => (
      <FilemakerMailSidebarNode input={input} />
    ),
    []
  );

  const updateRecentRoute = useCallback(
    (input: {
      recentMailboxFilter?: string | null;
      recentUnreadOnly?: boolean;
      recentQuery?: string;
    }): void => {
      if (!selectedAccountId) return;
      startTransition(() => {
        router.replace(
          buildMailSelectionHref({
            accountId: selectedAccountId,
            panel: 'recent',
            recentMailboxFilter: input.recentMailboxFilter ?? recentMailboxFilter,
            recentUnreadOnly: input.recentUnreadOnly ?? recentUnreadOnly,
            recentQuery: input.recentQuery ?? recentQuery,
          })
        );
      });
    },
    [recentMailboxFilter, recentQuery, recentUnreadOnly, router, selectedAccountId]
  );

  const contextValue = useMemo<FilemakerMailSidebarContextValue>(
    () => ({
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
      selectedPanel,
      isSearchContext,
      onNewMailbox,
      onSelectSearch,
      onSelectAttention,
      onSelectAccountSettings,
      onSelectFolder,
      onAccountUpdated,
      onSelectAccount,
    }),
    [
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
      selectedPanel,
      isSearchContext,
      onNewMailbox,
      onSelectSearch,
      onSelectAttention,
      onSelectAccountSettings,
      onSelectFolder,
      onAccountUpdated,
      onSelectAccount,
    ]
  );

  return (
    <FilemakerMailSidebarContext.Provider value={contextValue}>
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
                    startTransition(() => {
                      router.push('/admin/filemaker/mail');
                    });
                  }}
                >
                  New Mailbox
                </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={(): void => {
                    startTransition(() => {
                      router.push(
                        buildComposeHref({
                          accountId: selectedAccountId,
                          mailboxPath: selectedMailboxPath,
                          originPanel,
                          recentMailboxFilter,
                          recentUnreadOnly,
                          recentQuery,
                          searchAccountId: isSearchContext && !effectiveSearchAccountId ? 'all' : null,
                          searchQuery,
                        })
                      );
                    });
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
                      startTransition(() => {
                        router.push(
                          buildMailSelectionHref({
                            accountId: selectedAccountId,
                            panel: 'recent',
                          })
                        );
                      });
                    }}
                  >
                    <FilterX className='mr-2 size-4' />
                    Clear Recent
                  </Button>
                ) : null}
                {isSearchContext && hasActiveSearchQuery ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={(): void => {
                      startTransition(() => {
                        router.push(
                          buildMailSelectionHref({
                            accountId: effectiveSearchAccountId,
                            panel: 'search',
                          })
                        );
                      });
                    }}
                  >
                    <FilterX className='mr-2 size-4' />
                    Clear Search
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
                {isRecentContext && selectedAccountId && recentMailboxFilter ? (
                  <Badge variant='outline'>Recent Mailbox: {recentMailboxFilter}</Badge>
                ) : null}
                {isRecentContext && selectedAccountId && recentUnreadOnly ? (
                  <Badge variant='outline'>Recent Unread</Badge>
                ) : null}
                {isRecentContext && selectedAccountId && recentQuery?.trim() ? (
                  <Badge variant='outline'>Recent Search: {recentQuery.trim()}</Badge>
                ) : null}
                {isSearchContext && hasActiveSearchQuery ? (
                  <Badge variant='outline'>Search Query: {searchQuery?.trim()}</Badge>
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
    </FilemakerMailSidebarContext.Provider>
  );
}
