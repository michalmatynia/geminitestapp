'use client';

import { startTransition, useCallback, useMemo } from 'react';

import { buildFilemakerMailSelectionHref as buildMailSelectionHref } from '../mail-ui-helpers';
import type { MailPageSelection } from '../pages/AdminFilemakerMailPage.types';
import type {
  FilemakerMailRecentFilterUpdate,
  FilemakerMailSidebarFilters,
  FilemakerMailSidebarPageContext,
  FilemakerMailSidebarRouter,
} from './FilemakerMailSidebar.types';

export type SidebarSelectionActions = {
  openAccountSettings: (accountId: string) => void;
  openAttentionPanel: () => void;
  openFolder: (selection: { accountId: string; mailboxPath: string }) => void;
  openRecentPanel: (accountId: string) => void;
  openSearchPanel: () => void;
};

export type SidebarFilterActions = {
  clearRecentFilters: () => void;
  clearSearchQuery: () => void;
  updateRecentFilters: (input: FilemakerMailRecentFilterUpdate) => void;
};

type RecentFilterState = {
  mailboxFilter: string;
  query: string;
  unreadOnly: boolean;
};

const isSamePageSelection = (
  pageContext: NonNullable<FilemakerMailSidebarPageContext>,
  nextSelection: MailPageSelection
): boolean =>
  pageContext.selectedAccountId === nextSelection.accountId &&
  pageContext.selectedMailboxPath === nextSelection.mailboxPath &&
  pageContext.selectedPanel === nextSelection.panel;

const navigateRecentRoute = (input: {
  filters: FilemakerMailSidebarFilters;
  router: FilemakerMailSidebarRouter;
  selectedAccountId: string | null;
  update: FilemakerMailRecentFilterUpdate;
}): void => {
  if (input.selectedAccountId === null) return;
  startTransition(() => {
    input.router.replace(
      buildMailSelectionHref({
        accountId: input.selectedAccountId,
        panel: 'recent',
        recentMailboxFilter: input.update.recentMailboxFilter ?? input.filters.recentMailboxFilter,
        recentQuery: input.update.recentQuery ?? input.filters.recentQuery,
        recentUnreadOnly: input.update.recentUnreadOnly ?? input.filters.recentUnreadOnly,
      })
    );
  });
};

const resolveRecentFilterState = (input: {
  filters: FilemakerMailSidebarFilters;
  update: FilemakerMailRecentFilterUpdate;
}): RecentFilterState => ({
  mailboxFilter: input.update.recentMailboxFilter ?? input.filters.recentMailboxFilter ?? '',
  query: input.update.recentQuery ?? input.filters.recentQuery ?? '',
  unreadOnly: input.update.recentUnreadOnly ?? input.filters.recentUnreadOnly,
});

const isSameRecentFilterState = (
  pageContext: NonNullable<FilemakerMailSidebarPageContext>,
  state: RecentFilterState
): boolean =>
  pageContext.recentMailboxFilter === state.mailboxFilter &&
  pageContext.recentUnreadOnly === state.unreadOnly &&
  pageContext.query === state.query;

const applyPageRecentFilters = (input: {
  filters: FilemakerMailSidebarFilters;
  pageContext: NonNullable<FilemakerMailSidebarPageContext>;
  update: FilemakerMailRecentFilterUpdate;
}): void => {
  const nextState = resolveRecentFilterState({ filters: input.filters, update: input.update });
  if (isSameRecentFilterState(input.pageContext, nextState)) return;
  startTransition(() => {
    input.pageContext.setRecentMailboxFilter(nextState.mailboxFilter);
    input.pageContext.setRecentUnreadOnly(nextState.unreadOnly);
    input.pageContext.setQuery(nextState.query);
  });
};

const updateRecentFilters = (input: {
  filters: FilemakerMailSidebarFilters;
  pageContext: FilemakerMailSidebarPageContext;
  selectedAccountId: string | null;
  update: FilemakerMailRecentFilterUpdate;
}): void => {
  if (input.pageContext === null || input.selectedAccountId === null) {
    navigateRecentRoute(input);
    return;
  }
  applyPageRecentFilters({
    filters: input.filters,
    pageContext: input.pageContext,
    update: input.update,
  });
};

const resetPageRecentFilters = (
  pageContext: NonNullable<FilemakerMailSidebarPageContext>
): void => {
  if (isSameRecentFilterState(pageContext, { mailboxFilter: '', query: '', unreadOnly: false })) return;
  startTransition(() => {
    pageContext.setRecentMailboxFilter('');
    pageContext.setRecentUnreadOnly(false);
    pageContext.setQuery('');
  });
};

const clearRecentFilters = (input: {
  filters: FilemakerMailSidebarFilters;
  pageContext: FilemakerMailSidebarPageContext;
  router: FilemakerMailSidebarRouter;
  selectedAccountId: string | null;
}): void => {
  if (input.pageContext === null || input.selectedAccountId === null) {
    navigateRecentRoute({
      filters: input.filters,
      router: input.router,
      selectedAccountId: input.selectedAccountId,
      update: { recentMailboxFilter: null, recentQuery: '', recentUnreadOnly: false },
    });
    return;
  }
  resetPageRecentFilters(input.pageContext);
};

const clearSearchQuery = (input: {
  filters: FilemakerMailSidebarFilters;
  pageContext: FilemakerMailSidebarPageContext;
  router: FilemakerMailSidebarRouter;
  selectedAccountId: string | null;
}): void => {
  if (input.pageContext !== null) {
    if (input.pageContext.deepSearchQuery === '') return;
    startTransition(() => {
      input.pageContext.setDeepSearchQuery('');
    });
    return;
  }
  startTransition(() => {
    input.router.push(
      buildMailSelectionHref({
        accountId: input.filters.searchContextAccountId,
        panel: 'search',
      })
    );
  });
};

export const useSidebarSelectionActions = (input: {
  effectiveSearchAccountId: string | null;
  pageContext: FilemakerMailSidebarPageContext;
}): SidebarSelectionActions => {
  const applyPageSelection = useCallback(
    (nextSelection: MailPageSelection): void => {
      if (input.pageContext === null) return;
      if (isSamePageSelection(input.pageContext, nextSelection)) return;
      input.pageContext.setSelection(nextSelection);
    },
    [input.pageContext]
  );
  return useMemo(
    () => ({
      openAccountSettings: (accountId: string): void => {
        applyPageSelection({ accountId, mailboxPath: null, panel: 'settings' });
      },
      openAttentionPanel: (): void => {
        applyPageSelection({ accountId: null, mailboxPath: null, panel: 'attention' });
      },
      openFolder: (selection: { accountId: string; mailboxPath: string }): void => {
        applyPageSelection({ ...selection, panel: null });
      },
      openRecentPanel: (accountId: string): void => {
        applyPageSelection({ accountId, mailboxPath: null, panel: 'recent' });
      },
      openSearchPanel: (): void => {
        applyPageSelection({
          accountId: input.effectiveSearchAccountId,
          mailboxPath: null,
          panel: 'search',
        });
      },
    }),
    [applyPageSelection, input.effectiveSearchAccountId]
  );
};

export const useSidebarFilterActions = (input: {
  filters: FilemakerMailSidebarFilters;
  pageContext: FilemakerMailSidebarPageContext;
  router: FilemakerMailSidebarRouter;
  selectedAccountId: string | null;
}): SidebarFilterActions =>
  useMemo(
    () => ({
      clearRecentFilters: (): void => {
        clearRecentFilters(input);
      },
      clearSearchQuery: (): void => {
        clearSearchQuery(input);
      },
      updateRecentFilters: (update: FilemakerMailRecentFilterUpdate): void => {
        updateRecentFilters({ ...input, update });
      },
    }),
    [input]
  );
