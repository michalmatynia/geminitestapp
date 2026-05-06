import { startTransition } from 'react';

import { buildFilemakerMailComposeHref as buildComposeHref } from './FilemakerMailSidebar.helpers';
import { buildRecentMailboxOptions, isPresentString } from './FilemakerMailSidebar.selection';
import type { SidebarFilterActions } from './FilemakerMailSidebar.actions';
import type { FilemakerMailSidebarContextValue } from './FilemakerMailSidebarContext';
import type {
  FilemakerMailSidebarData,
  FilemakerMailSidebarFilters,
  FilemakerMailSidebarModel,
  FilemakerMailSidebarRouter,
  FilemakerMailSidebarSelection,
  FilemakerMailTreeShell,
} from './FilemakerMailSidebar.types';

type SidebarModelInput = {
  contextValue: FilemakerMailSidebarContextValue;
  data: FilemakerMailSidebarData;
  filterActions: SidebarFilterActions;
  filters: FilemakerMailSidebarFilters;
  isRecentContext: boolean;
  isSearchContext: boolean;
  onNewMailbox: (() => void) | undefined;
  renderNode: FilemakerMailSidebarModel['renderNode'];
  router: FilemakerMailSidebarRouter;
  selection: FilemakerMailSidebarSelection;
  treeShell: FilemakerMailTreeShell;
  visibleRecentThreads: FilemakerMailSidebarData['recentThreads'];
};

const navigate = (router: FilemakerMailSidebarRouter, href: string): void => {
  startTransition(() => {
    router.push(href);
  });
};

const resolveComposeSearchAccountId = (
  isSearchContext: boolean,
  filters: FilemakerMailSidebarFilters
): string | null => {
  if (!isSearchContext) return null;
  if (filters.searchContextAccountId !== null) return null;
  return 'all';
};

const buildComposeHandler = (input: SidebarModelInput): (() => void) => {
  const href = buildComposeHref({
    accountId: input.selection.accountId,
    mailboxPath: input.selection.mailboxPath,
    originPanel: input.selection.originPanel,
    recentMailboxFilter: input.filters.recentMailboxFilter,
    recentQuery: input.filters.recentQuery,
    recentUnreadOnly: input.filters.recentUnreadOnly,
    searchAccountId: resolveComposeSearchAccountId(input.isSearchContext, input.filters),
    searchQuery: input.filters.searchQuery,
  });
  return (): void => {
    navigate(input.router, href);
  };
};

const buildNewMailboxHandler = (input: SidebarModelInput): (() => void) => {
  if (input.onNewMailbox !== undefined) return input.onNewMailbox;
  return (): void => {
    navigate(input.router, '/admin/filemaker/mail');
  };
};

const countMatchingAccounts = (
  accounts: FilemakerMailSidebarData['accounts'],
  predicate: (account: FilemakerMailSidebarData['accounts'][number]) => boolean
): number => accounts.filter(predicate).length;

const buildSidebarCounts = (
  data: FilemakerMailSidebarData,
  visibleRecentThreads: FilemakerMailSidebarData['recentThreads']
): Pick<
  FilemakerMailSidebarModel,
  'accountsCount' | 'errorAccountCount' | 'foldersCount' | 'inactiveAccountCount' | 'threadsCount' | 'visibleRecentCount'
> => ({
  accountsCount: data.accounts.length,
  errorAccountCount: countMatchingAccounts(data.accounts, (account) => isPresentString(account.lastSyncError)),
  foldersCount: data.folders.length,
  inactiveAccountCount: countMatchingAccounts(data.accounts, (account) => account.status !== 'active'),
  threadsCount: data.threads.length,
  visibleRecentCount: Math.min(visibleRecentThreads.length, 5),
});

const buildActiveFilterFlags = (
  filters: FilemakerMailSidebarFilters
): Pick<FilemakerMailSidebarModel, 'hasActiveRecentFilters' | 'hasActiveSearchQuery'> => ({
  hasActiveRecentFilters:
    filters.recentMailboxFilter !== null ||
    filters.recentUnreadOnly ||
    isPresentString(filters.recentQuery),
  hasActiveSearchQuery: isPresentString(filters.searchQuery),
});

export const buildSidebarModel = (input: SidebarModelInput): FilemakerMailSidebarModel => ({
  ...buildSidebarCounts(input.data, input.visibleRecentThreads),
  ...buildActiveFilterFlags(input.filters),
  clearRecentFilters: input.filterActions.clearRecentFilters,
  clearSearchQuery: input.filterActions.clearSearchQuery,
  contextValue: input.contextValue,
  handleCompose: buildComposeHandler(input),
  handleNewMailbox: buildNewMailboxHandler(input),
  isLoading: input.data.isLoading,
  isRecentContext: input.isRecentContext,
  isSearchContext: input.isSearchContext,
  recentMailboxFilter: input.filters.recentMailboxFilter,
  recentMailboxOptions: buildRecentMailboxOptions(input.visibleRecentThreads),
  recentQuery: input.filters.recentQuery,
  recentUnreadOnly: input.filters.recentUnreadOnly,
  renderNode: input.renderNode,
  tree: input.treeShell,
  selectedAccountId: input.selection.accountId,
  selectedMailboxPath: input.selection.mailboxPath,
  showRecentControls: input.selection.accountId !== null && input.selection.panel === 'recent',
  updateRecentFilters: input.filterActions.updateRecentFilters,
});
