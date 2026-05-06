import type { Dispatch, SetStateAction } from 'react';
import type {
  FolderTreeViewportRenderNodeInput,
  useMasterFolderTreeViewModel,
} from '@/shared/lib/foldertree/public';
import type { useRouter } from 'nextjs-toploader/app';
import type { MailPageState } from '../pages/AdminFilemakerMailPage.hooks';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';
import type { FilemakerMailSidebarContextValue } from './FilemakerMailSidebarContext';

export type FilemakerMailTreeShell = ReturnType<typeof useMasterFolderTreeViewModel>;

export type FilemakerMailSidebarRouter = ReturnType<typeof useRouter>;

export type FilemakerMailSidebarPageContext = MailPageState | null;

export type FilemakerMailSidebarData = {
  accounts: FilemakerMailAccount[];
  fetchAccountsAndFolders: () => Promise<void>;
  folders: FilemakerMailFolderSummary[];
  isLoading: boolean;
  recentThreads: FilemakerMailThread[];
  setAccounts: Dispatch<SetStateAction<FilemakerMailAccount[]>>;
  setSyncingAccountId: Dispatch<SetStateAction<string | null>>;
  syncingAccountId: string | null;
  threads: FilemakerMailThread[];
};

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

export type FilemakerMailSidebarProps = {
  actions?: FilemakerMailSidebarActions;
  filters?: Partial<FilemakerMailSidebarFilters>;
  refreshKey?: number;
  selection?: Partial<FilemakerMailSidebarSelection>;
};

export type FilemakerMailRecentFilterUpdate = {
  recentMailboxFilter?: string | null;
  recentQuery?: string;
  recentUnreadOnly?: boolean;
};

export type FilemakerMailSidebarModel = {
  accountsCount: number;
  clearRecentFilters: () => void;
  clearSearchQuery: () => void;
  contextValue: FilemakerMailSidebarContextValue;
  errorAccountCount: number;
  foldersCount: number;
  handleCompose: () => void;
  handleNewMailbox: () => void;
  hasActiveRecentFilters: boolean;
  hasActiveSearchQuery: boolean;
  inactiveAccountCount: number;
  isLoading: boolean;
  isRecentContext: boolean;
  isSearchContext: boolean;
  recentMailboxFilter: string | null;
  recentMailboxOptions: Array<{ label: string; value: string }>;
  recentQuery: string | null;
  recentUnreadOnly: boolean;
  renderNode: (input: FolderTreeViewportRenderNodeInput) => React.JSX.Element;
  tree: FilemakerMailTreeShell;
  selectedAccountId: string | null;
  selectedMailboxPath: string | null;
  showRecentControls: boolean;
  threadsCount: number;
  updateRecentFilters: (input: FilemakerMailRecentFilterUpdate) => void;
  visibleRecentCount: number;
};
