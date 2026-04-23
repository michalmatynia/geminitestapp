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

import { useOptionalMailPageContext } from '../pages/FilemakerMail.context';

export type FilemakerMailSidebarSelection = {
  accountId: string | null;
  mailboxPath: string | null;
  threadId: string | null;
  panel: 'attention' | 'compose' | 'recent' | 'search' | 'settings' | null;
  originPanel: 'recent' | 'search' | null;
};

export type FilemakerMailSidebarFilters = {
  recentMailboxFilter: string | null;
  recentUnreadOnly: boolean;
  recentQuery: string | null;
  searchContextAccountId: string | null;
  searchQuery: string | null;
};

export type FilemakerMailSidebarActions = {
  onRecentMailboxFilterChange?: (value: string) => void;
  onRecentQueryChange?: (value: string) => void;
  onRecentUnreadOnlyChange?: (value: boolean) => void;
  onSelectAttention?: () => void;
  onSelectSearch?: () => void;
  onSelectRecent?: (accountId: string) => void;
  onSelectAccount?: (accountId: string) => void;
  onSelectAccountSettings?: (accountId: string) => void;
  onSelectFolder?: (selection: { accountId: string; mailboxPath: string }) => void;
  onAccountUpdated?: (account: FilemakerMailAccount) => void | Promise<void>;
  onNewMailbox?: () => void;
};

type FilemakerMailSidebarProps = {
  selection?: Partial<FilemakerMailSidebarSelection>;
  filters?: Partial<FilemakerMailSidebarFilters>;
  actions?: FilemakerMailSidebarActions;
  refreshKey?: number;
};

export function FilemakerMailSidebar({
  selection: propsSelection,
  filters: propsFilters,
  actions: propsActions,
  refreshKey = 0,
}: FilemakerMailSidebarProps): React.JSX.Element {
  const pageContext = useOptionalMailPageContext();

  const selection = useMemo((): FilemakerMailSidebarSelection => ({
    accountId: propsSelection?.accountId ?? pageContext?.selectedAccountId ?? null,
    mailboxPath: propsSelection?.mailboxPath ?? pageContext?.selectedMailboxPath ?? null,
    threadId: propsSelection?.threadId ?? null,
    panel: propsSelection?.panel ?? pageContext?.selectedPanel ?? null,
    originPanel: propsSelection?.originPanel ?? (pageContext?.isRecentPanel ? 'recent' : pageContext?.isSearchPanel ? 'search' : null),
  }), [propsSelection, pageContext]);

  const filters = useMemo((): FilemakerMailSidebarFilters => ({
    recentMailboxFilter: propsFilters?.recentMailboxFilter ?? pageContext?.recentMailboxFilter ?? null,
    recentUnreadOnly: propsFilters?.recentUnreadOnly ?? pageContext?.recentUnreadOnly ?? false,
    recentQuery: propsFilters?.recentQuery ?? pageContext?.query ?? null,
    searchContextAccountId: propsFilters?.searchContextAccountId ?? (pageContext?.isSearchPanel ? pageContext.selectedAccountId : null),
    searchQuery: propsFilters?.searchQuery ?? pageContext?.deepSearchQuery ?? null,
  }), [propsFilters, pageContext]);

  const {
    accountId: selectedAccountId,
    mailboxPath: selectedMailboxPath,
    threadId: selectedThreadId,
    panel: selectedPanel,
    originPanel,
  } = selection;

  const {
    recentMailboxFilter,
    recentUnreadOnly,
    recentQuery,
    searchContextAccountId,
    searchQuery,
  } = filters;

  const router = useRouter();
  const fallbackData = useFilemakerMailData({
    enabled: pageContext == null,
    refreshKey,
    selectedAccountId,
    selectedMailboxPath,
  });
  const accounts = pageContext?.accounts ?? fallbackData.accounts;
  const setAccounts = pageContext?.setAccounts ?? fallbackData.setAccounts;
  const folders = pageContext?.folders ?? fallbackData.folders;
  const threads = pageContext?.threads ?? fallbackData.threads;
  const recentThreads = pageContext?.recentPreviewThreads ?? fallbackData.recentThreads;
  const isLoading = pageContext?.isNavigationLoading ?? fallbackData.isLoading;
  const syncingAccountId = pageContext?.syncingAccountId ?? fallbackData.syncingAccountId;
  const setSyncingAccountId =
    pageContext?.setSyncingAccountId ?? fallbackData.setSyncingAccountId;
  const fetchAccountsAndFolders =
    pageContext?.loadNavigation ?? fallbackData.fetchAccountsAndFolders;

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

  const applyPageSelection = useCallback(
    (nextSelection: {
      accountId: string | null;
      mailboxPath: string | null;
      panel: FilemakerMailSidebarSelection['panel'];
    }): void => {
      if (!pageContext) {
        return;
      }
      if (
        pageContext.selectedAccountId === nextSelection.accountId &&
        pageContext.selectedMailboxPath === nextSelection.mailboxPath &&
        pageContext.selectedPanel === nextSelection.panel
      ) {
        return;
      }
      pageContext.setSelection(nextSelection);
    },
    [pageContext]
  );

  const openAttentionPanel = useCallback((): void => {
    applyPageSelection({ accountId: null, mailboxPath: null, panel: 'attention' });
  }, [applyPageSelection]);

  const openSearchPanel = useCallback((): void => {
    applyPageSelection({
      accountId: effectiveSearchAccountId,
      mailboxPath: null,
      panel: 'search',
    });
  }, [applyPageSelection, effectiveSearchAccountId]);

  const openAccountSettings = useCallback(
    (accountId: string): void => {
      applyPageSelection({
        accountId,
        mailboxPath: null,
        panel: 'settings',
      });
    },
    [applyPageSelection]
  );

  const openFolder = useCallback(
    (nextSelection: { accountId: string; mailboxPath: string }): void => {
      applyPageSelection({
        accountId: nextSelection.accountId,
        mailboxPath: nextSelection.mailboxPath,
        panel: null,
      });
    },
    [applyPageSelection]
  );

  const openRecentPanel = useCallback(
    (accountId: string): void => {
      applyPageSelection({
        accountId,
        mailboxPath: null,
        panel: 'recent',
      });
    },
    [applyPageSelection]
  );

  const updateRecentFilters = useCallback(
    (input: {
      recentMailboxFilter?: string | null;
      recentUnreadOnly?: boolean;
      recentQuery?: string;
    }): void => {
      if (pageContext && selectedAccountId) {
        const nextMailboxFilter = input.recentMailboxFilter ?? recentMailboxFilter ?? '';
        const nextRecentUnreadOnly = input.recentUnreadOnly ?? recentUnreadOnly;
        const nextRecentQuery = input.recentQuery ?? recentQuery ?? '';
        if (
          pageContext.recentMailboxFilter === nextMailboxFilter &&
          pageContext.recentUnreadOnly === nextRecentUnreadOnly &&
          pageContext.query === nextRecentQuery
        ) {
          return;
        }
        startTransition(() => {
          pageContext.setRecentMailboxFilter(nextMailboxFilter);
          pageContext.setRecentUnreadOnly(nextRecentUnreadOnly);
          pageContext.setQuery(nextRecentQuery);
        });
        return;
      }
      updateRecentRoute(input);
    },
    [
      pageContext,
      recentMailboxFilter,
      recentQuery,
      recentUnreadOnly,
      selectedAccountId,
      updateRecentRoute,
    ]
  );

  const clearRecentFilters = useCallback((): void => {
    if (pageContext && selectedAccountId) {
      if (
        pageContext.recentMailboxFilter === '' &&
        pageContext.recentUnreadOnly === false &&
        pageContext.query === ''
      ) {
        return;
      }
      startTransition(() => {
        pageContext.setRecentMailboxFilter('');
        pageContext.setRecentUnreadOnly(false);
        pageContext.setQuery('');
      });
      return;
    }
    startTransition(() => {
      router.push(
        buildMailSelectionHref({
          accountId: selectedAccountId,
          panel: 'recent',
        })
      );
    });
  }, [pageContext, router, selectedAccountId]);

  const clearSearchQuery = useCallback((): void => {
    if (pageContext) {
      if (pageContext.deepSearchQuery === '') {
        return;
      }
      startTransition(() => {
        pageContext.setDeepSearchQuery('');
      });
      return;
    }
    startTransition(() => {
      router.push(
        buildMailSelectionHref({
          accountId: effectiveSearchAccountId,
          panel: 'search',
        })
      );
    });
  }, [effectiveSearchAccountId, pageContext, router]);

  const onNewMailbox = propsActions?.onNewMailbox ?? pageContext?.onNewMailbox;
  const onSelectSearch = propsActions?.onSelectSearch ?? (pageContext ? openSearchPanel : undefined);
  const onSelectAttention =
    propsActions?.onSelectAttention ?? (pageContext ? openAttentionPanel : undefined);
  const onSelectRecent = propsActions?.onSelectRecent ?? (pageContext ? openRecentPanel : undefined);
  const onSelectAccountSettings =
    propsActions?.onSelectAccountSettings ?? (pageContext ? openAccountSettings : undefined);
  const onSelectFolder = propsActions?.onSelectFolder ?? (pageContext ? openFolder : undefined);
  const onAccountUpdated = propsActions?.onAccountUpdated;
  const onSelectAccount = propsActions?.onSelectAccount ?? (pageContext ? openAccountSettings : undefined);
  const onRecentMailboxFilterChange = propsActions?.onRecentMailboxFilterChange;
  const onRecentQueryChange = propsActions?.onRecentQueryChange;
  const onRecentUnreadOnlyChange = propsActions?.onRecentUnreadOnlyChange;

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
      onSelectRecent,
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
      onSelectRecent,
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
                    onClick={clearRecentFilters}
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
                    onClick={clearSearchQuery}
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
                      updateRecentFilters({ recentMailboxFilter: nextValue });
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
                      updateRecentFilters({ recentQuery: nextValue });
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
                        updateRecentFilters({ recentUnreadOnly: nextValue });
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
