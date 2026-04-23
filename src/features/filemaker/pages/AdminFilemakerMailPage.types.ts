import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';

export type AccountsResponse = { accounts: FilemakerMailAccount[] };
export type FoldersResponse = { folders: FilemakerMailFolderSummary[] };
export type ThreadsResponse = { threads: FilemakerMailThread[] };

export type MailPageSelection = {
  accountId: string | null;
  mailboxPath: string | null;
  panel: 'attention' | 'recent' | 'search' | 'settings' | null;
};
