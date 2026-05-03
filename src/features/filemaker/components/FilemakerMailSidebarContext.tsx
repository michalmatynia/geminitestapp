'use client';

import type React from 'react';
import { createContext, useContext } from 'react';
import type { FilemakerMailAccount } from '../types';

export type FilemakerMailSidebarContextValue = {
  accounts: FilemakerMailAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<FilemakerMailAccount[]>>;
  syncingAccountId: string | null;
  setSyncingAccountId: (id: string | null) => void;
  statusUpdatingAccountId: string | null;
  setStatusUpdatingAccountId: (id: string | null) => void;
  fetchAccountsAndFolders: () => Promise<void>;
  effectiveSearchAccountId: string | null;
  searchQuery: string | null;
  recentMailboxFilter: string | null;
  recentUnreadOnly: boolean;
  recentQuery: string | null;
  originPanel: 'recent' | 'search' | null;
  selectedPanel: 'account' | 'attention' | 'compose' | 'recent' | 'search' | 'settings' | null;
  isSearchContext: boolean;
  onNewMailbox?: () => void;
  onSelectSearch?: () => void;
  onSelectAttention?: () => void;
  onSelectRecent?: (accountId: string) => void;
  onSelectAccountSettings?: (accountId: string) => void;
  onSelectFolder?: (selection: { accountId: string; mailboxPath: string }) => void;
  onAccountUpdated?: (account: FilemakerMailAccount) => void | Promise<void>;
  onSelectAccount?: (accountId: string) => void;
};

export const FilemakerMailSidebarContext = createContext<FilemakerMailSidebarContextValue | null>(
  null
);

export function useFilemakerMailSidebar(): FilemakerMailSidebarContextValue {
  const context = useContext(FilemakerMailSidebarContext);
  if (!context) {
    throw new Error('useFilemakerMailSidebar must be used within FilemakerMailSidebar');
  }
  return context;
}
