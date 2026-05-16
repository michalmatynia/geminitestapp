'use client';

import { startTransition, useMemo } from 'react';

import { buildFilemakerMailSelectionHref as buildMailSelectionHref } from '../mail-ui-helpers';
import type {
  FilemakerMailRecentFilterUpdate,
  FilemakerMailSidebarFilters,
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

const navigate = (router: FilemakerMailSidebarRouter, href: string): void => {
  startTransition(() => {
    router.push(href);
  });
};

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

const updateRecentFilters = (input: {
  filters: FilemakerMailSidebarFilters;
  router: FilemakerMailSidebarRouter;
  selectedAccountId: string | null;
  update: FilemakerMailRecentFilterUpdate;
}): void => {
  navigateRecentRoute(input);
};

const clearRecentFilters = (input: {
  filters: FilemakerMailSidebarFilters;
  router: FilemakerMailSidebarRouter;
  selectedAccountId: string | null;
}): void => {
  navigateRecentRoute({
    filters: input.filters,
    router: input.router,
    selectedAccountId: input.selectedAccountId,
    update: { recentMailboxFilter: null, recentQuery: '', recentUnreadOnly: false },
  });
};

const clearSearchQuery = (input: {
  filters: FilemakerMailSidebarFilters;
  router: FilemakerMailSidebarRouter;
}): void => {
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
  router: FilemakerMailSidebarRouter;
}): SidebarSelectionActions => {
  return useMemo(
    () => ({
      openAccountSettings: (accountId: string): void => {
        navigate(input.router, buildMailSelectionHref({ accountId, panel: 'settings' }));
      },
      openAttentionPanel: (): void => {
        navigate(input.router, buildMailSelectionHref({ panel: 'attention' }));
      },
      openFolder: (selection: { accountId: string; mailboxPath: string }): void => {
        navigate(input.router, buildMailSelectionHref(selection));
      },
      openRecentPanel: (accountId: string): void => {
        navigate(input.router, buildMailSelectionHref({ accountId, panel: 'recent' }));
      },
      openSearchPanel: (): void => {
        navigate(input.router, buildMailSelectionHref({
          accountId: input.effectiveSearchAccountId,
          panel: 'search',
        }));
      },
    }),
    [input.effectiveSearchAccountId, input.router]
  );
};

export const useSidebarFilterActions = (input: {
  filters: FilemakerMailSidebarFilters;
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
