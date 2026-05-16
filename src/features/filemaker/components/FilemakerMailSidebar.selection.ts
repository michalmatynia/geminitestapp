import { formatFilemakerMailFolderLabel } from '../mail-master-tree';
import type { FilemakerMailFolderRole } from '../types';
import type {
  FilemakerMailSidebarData,
  FilemakerMailSidebarFilters,
  FilemakerMailSidebarSelection,
} from './FilemakerMailSidebar.types';

export const isPresentString = (value: string | null | undefined): boolean =>
  (value?.trim() ?? '').length > 0;

const resolveOriginPanel = (
  propsOriginPanel: FilemakerMailSidebarSelection['originPanel'] | undefined
): FilemakerMailSidebarSelection['originPanel'] => propsOriginPanel ?? null;

const resolveSearchContextAccountId = (
  propsSearchContextAccountId: string | null | undefined
): string | null => {
  if (propsSearchContextAccountId !== undefined && propsSearchContextAccountId !== null) {
    return propsSearchContextAccountId;
  }
  return null;
};

const resolveRecentUnreadOnly = (
  propsRecentUnreadOnly: boolean | undefined
): boolean => propsRecentUnreadOnly ?? false;

const resolveAccountId = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined
): string | null => propsSelection?.accountId ?? null;

const resolveMailboxPath = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined
): string | null => propsSelection?.mailboxPath ?? null;

const resolveThreadId = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined
): string | null => propsSelection?.threadId ?? null;

const resolveRecentMailboxFilter = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined
): string | null => propsFilters?.recentMailboxFilter ?? null;

const resolveRecentQuery = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined
): string | null => propsFilters?.recentQuery ?? null;

const resolveSearchQuery = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined
): string | null => propsFilters?.searchQuery ?? null;

export const resolveSelection = (
  propsSelection: Partial<FilemakerMailSidebarSelection> | undefined
): FilemakerMailSidebarSelection => ({
  accountId: resolveAccountId(propsSelection),
  mailboxPath: resolveMailboxPath(propsSelection),
  originPanel: resolveOriginPanel(propsSelection?.originPanel),
  panel: propsSelection?.panel ?? null,
  threadId: resolveThreadId(propsSelection),
});

export const resolveFilters = (
  propsFilters: Partial<FilemakerMailSidebarFilters> | undefined
): FilemakerMailSidebarFilters => ({
  recentMailboxFilter: resolveRecentMailboxFilter(propsFilters),
  recentQuery: resolveRecentQuery(propsFilters),
  recentUnreadOnly: resolveRecentUnreadOnly(propsFilters?.recentUnreadOnly),
  searchContextAccountId: resolveSearchContextAccountId(propsFilters?.searchContextAccountId),
  searchQuery: resolveSearchQuery(propsFilters),
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
