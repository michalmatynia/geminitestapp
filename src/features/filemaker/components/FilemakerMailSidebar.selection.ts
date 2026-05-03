import { formatFilemakerMailFolderLabel } from '../mail-master-tree';
import type { FilemakerMailFolderRole } from '../types';
import type {
  FilemakerMailSidebarData,
  FilemakerMailSidebarFilters,
  FilemakerMailSidebarPageContext,
  FilemakerMailSidebarSelection,
} from './FilemakerMailSidebar.types';

export const isPresentString = (value: string | null | undefined): boolean =>
  (value?.trim() ?? '').length > 0;

const resolveOriginPanel = (
  propsOriginPanel: FilemakerMailSidebarSelection['originPanel'] | undefined,
  pageContext: FilemakerMailSidebarPageContext
): FilemakerMailSidebarSelection['originPanel'] => {
  if (propsOriginPanel !== undefined && propsOriginPanel !== null) return propsOriginPanel;
  if (pageContext?.isRecentPanel === true) return 'recent';
  if (pageContext?.isSearchPanel === true) return 'search';
  return null;
};

const resolveSearchContextAccountId = (
  propsSearchContextAccountId: string | null | undefined,
  pageContext: FilemakerMailSidebarPageContext
): string | null => {
  if (propsSearchContextAccountId !== undefined && propsSearchContextAccountId !== null) {
    return propsSearchContextAccountId;
  }
  if (pageContext?.isSearchPanel === true) return pageContext.selectedAccountId;
  return null;
};

const resolveRecentUnreadOnly = (
  propsRecentUnreadOnly: boolean | undefined,
  pageContext: FilemakerMailSidebarPageContext
): boolean => propsRecentUnreadOnly ?? pageContext?.recentUnreadOnly ?? false;

const resolveAccountId = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): string | null => propsSelection?.accountId ?? pageContext?.selectedAccountId ?? null;

const resolveMailboxPath = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): string | null => propsSelection?.mailboxPath ?? pageContext?.selectedMailboxPath ?? null;

const resolvePanel = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): FilemakerMailSidebarSelection['panel'] => propsSelection?.panel ?? pageContext?.selectedPanel ?? null;

const resolveThreadId = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined
): string | null => propsSelection?.threadId ?? null;

const resolveRecentMailboxFilter = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): string | null => propsFilters?.recentMailboxFilter ?? pageContext?.recentMailboxFilter ?? null;

const resolveRecentQuery = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): string | null => propsFilters?.recentQuery ?? pageContext?.query ?? null;

const resolveSearchQuery = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): string | null => propsFilters?.searchQuery ?? pageContext?.deepSearchQuery ?? null;

export const resolveSelection = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): FilemakerMailSidebarSelection => ({
  accountId: resolveAccountId(propsSelection, pageContext),
  mailboxPath: resolveMailboxPath(propsSelection, pageContext),
  originPanel: resolveOriginPanel(propsSelection?.originPanel, pageContext),
  panel: resolvePanel(propsSelection, pageContext),
  threadId: resolveThreadId(propsSelection),
});

export const resolveFilters = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined,
  pageContext: FilemakerMailSidebarPageContext
): FilemakerMailSidebarFilters => ({
  recentMailboxFilter: resolveRecentMailboxFilter(propsFilters, pageContext),
  recentQuery: resolveRecentQuery(propsFilters, pageContext),
  recentUnreadOnly: resolveRecentUnreadOnly(propsFilters?.recentUnreadOnly, pageContext),
  searchContextAccountId: resolveSearchContextAccountId(propsFilters?.searchContextAccountId, pageContext),
  searchQuery: resolveSearchQuery(propsFilters, pageContext),
});

export const buildRecentMailboxOptions = (
  recentThreads: FilemakerMailSidebarData['recentThreads']
): Array<{ label: string; value: string }> => {
  const rolesByMailboxPath = new Map<string, FilemakerMailFolderRole>();
  recentThreads.forEach((thread) => {
    if (!rolesByMailboxPath.has(thread.mailboxPath)) {
      rolesByMailboxPath.set(thread.mailboxPath, thread.mailboxRole);
    }
  });
  return Array.from(rolesByMailboxPath.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([mailboxPath, mailboxRole]) => ({
      label: formatFilemakerMailFolderLabel(mailboxPath, mailboxRole),
      value: mailboxPath,
    }));
};
