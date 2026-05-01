'use client';

import { useMemo } from 'react';

import type { FilemakerMailSidebarContextValue } from './FilemakerMailSidebarContext';
import type {
  FilemakerMailSidebarData,
  FilemakerMailSidebarFilters,
  FilemakerMailSidebarSelection,
} from './FilemakerMailSidebar.types';

export const useSidebarContextValue = (input: {
  data: FilemakerMailSidebarData;
  effectiveSearchAccountId: string | null;
  filters: FilemakerMailSidebarFilters;
  isSearchContext: boolean;
  onAccountUpdated: FilemakerMailSidebarContextValue['onAccountUpdated'];
  onNewMailbox: FilemakerMailSidebarContextValue['onNewMailbox'];
  onSelectAccount: FilemakerMailSidebarContextValue['onSelectAccount'];
  onSelectAccountSettings: FilemakerMailSidebarContextValue['onSelectAccountSettings'];
  onSelectAttention: FilemakerMailSidebarContextValue['onSelectAttention'];
  onSelectFolder: FilemakerMailSidebarContextValue['onSelectFolder'];
  onSelectRecent: FilemakerMailSidebarContextValue['onSelectRecent'];
  onSelectSearch: FilemakerMailSidebarContextValue['onSelectSearch'];
  originPanel: FilemakerMailSidebarSelection['originPanel'];
  selectedPanel: FilemakerMailSidebarSelection['panel'];
  setStatusUpdatingAccountId: (id: string | null) => void;
  statusUpdatingAccountId: string | null;
}): FilemakerMailSidebarContextValue =>
  useMemo(
    () => ({
      accounts: input.data.accounts,
      effectiveSearchAccountId: input.effectiveSearchAccountId,
      fetchAccountsAndFolders: input.data.fetchAccountsAndFolders,
      isSearchContext: input.isSearchContext,
      onAccountUpdated: input.onAccountUpdated,
      onNewMailbox: input.onNewMailbox,
      onSelectAccount: input.onSelectAccount,
      onSelectAccountSettings: input.onSelectAccountSettings,
      onSelectAttention: input.onSelectAttention,
      onSelectFolder: input.onSelectFolder,
      onSelectRecent: input.onSelectRecent,
      onSelectSearch: input.onSelectSearch,
      originPanel: input.originPanel,
      recentMailboxFilter: input.filters.recentMailboxFilter,
      recentQuery: input.filters.recentQuery,
      recentUnreadOnly: input.filters.recentUnreadOnly,
      searchQuery: input.filters.searchQuery,
      selectedPanel: input.selectedPanel,
      setAccounts: input.data.setAccounts,
      setStatusUpdatingAccountId: input.setStatusUpdatingAccountId,
      setSyncingAccountId: input.data.setSyncingAccountId,
      statusUpdatingAccountId: input.statusUpdatingAccountId,
      syncingAccountId: input.data.syncingAccountId,
    }),
    [input]
  );
