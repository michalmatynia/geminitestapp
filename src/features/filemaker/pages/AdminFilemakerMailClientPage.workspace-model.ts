import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  formatFilemakerMailFolderLabel,
  parseFilemakerMailMasterNodeId,
} from '../mail-master-tree';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailParticipant,
  FilemakerMailThread,
  FilemakerMailThreadDetail,
} from '../types';

export type ThreadListResponse = {
  threads: FilemakerMailThread[];
};

export type ThreadDetailResponse = {
  detail: FilemakerMailThreadDetail;
  replyDraft: {
    accountId: string;
    to: FilemakerMailParticipant[];
    subject: string;
    bodyHtml: string;
    inReplyTo: string | null;
  } | null;
};

export type MailClientWorkspaceProps = {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
  firstActiveAccount: FilemakerMailAccount | null;
  isLoading: boolean;
  loadError: string | null;
  loadMailboxData: () => Promise<void>;
};

export type MailClientSelection = {
  accountId: string | null;
  mailboxPath: string | null;
  threadId: string | null;
};

export type MailClientReplyDraftState = {
  replyAccountId: string;
  replyTo: string;
  replyCc: string;
  replyBcc: string;
  replySubject: string;
  replyInReplyTo: string | null;
  replyHtml: string;
};

export const THREAD_LIST_LIMIT = 50;
export const EMPTY_REPLY_HTML = '<p><br/></p>';

export const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.trim() !== '';

export const normalizeSearchValue = (value: string | null): string | null => {
  if (!hasText(value)) return null;
  return value.trim();
};

export const formatParticipants = (participants: FilemakerMailParticipant[]): string =>
  participants
    .map((entry) => (hasText(entry.name) ? `${entry.name.trim()} <${entry.address}>` : entry.address))
    .join(', ');

export const formatThreadParticipants = (participants: FilemakerMailParticipant[]): string => {
  const firstParticipant = participants[0];
  if (firstParticipant === undefined) return 'Unknown sender';
  const firstLabel = hasText(firstParticipant.name)
    ? firstParticipant.name.trim()
    : firstParticipant.address;
  if (participants.length === 1) return firstLabel;
  return `${firstLabel} +${participants.length - 1}`;
};

export const formatDateTime = (value: string | null | undefined): string => {
  if (!hasText(value)) return 'Unknown time';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Unknown time';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
};

export const buildThreadListUrl = (selection: {
  accountId: string;
  mailboxPath: string | null;
}): string => {
  const search = new URLSearchParams({
    accountId: selection.accountId,
    limit: String(THREAD_LIST_LIMIT),
  });
  if (selection.mailboxPath !== null) search.set('mailboxPath', selection.mailboxPath);
  return `/api/filemaker/mail/threads?${search.toString()}`;
};

export const buildClientSelectionHref = (selection: MailClientSelection): string => {
  const search = new URLSearchParams();
  if (selection.accountId !== null) search.set('accountId', selection.accountId);
  if (selection.mailboxPath !== null) search.set('mailboxPath', selection.mailboxPath);
  if (selection.threadId !== null) search.set('threadId', selection.threadId);
  const nextSearch = search.toString();
  return nextSearch === ''
    ? '/admin/filemaker/mail-client'
    : `/admin/filemaker/mail-client?${nextSearch}`;
};

export const isClientTreeNode = (node: MasterTreeNode): boolean => {
  const parsed = parseFilemakerMailMasterNodeId(node.id);
  return (
    parsed?.kind === 'mail_account' ||
    parsed?.kind === 'mail_folder' ||
    parsed?.kind === 'mail_thread'
  );
};

export const getPrimaryFolderPath = (
  folders: FilemakerMailFolderSummary[],
  accountId: string
): string | null => {
  const accountFolders = folders.filter((folder) => folder.accountId === accountId);
  const inbox = accountFolders.find((folder) => folder.mailboxRole === 'inbox');
  return inbox?.mailboxPath ?? accountFolders[0]?.mailboxPath ?? null;
};

export const getSelectedMailboxLabel = ({
  accountId,
  folders,
  mailboxPath,
}: {
  accountId: string | null;
  folders: FilemakerMailFolderSummary[];
  mailboxPath: string | null;
}): string | null => {
  if (accountId === null || mailboxPath === null) return null;
  const folder = folders.find(
    (entry) => entry.accountId === accountId && entry.mailboxPath === mailboxPath
  );
  if (folder === undefined) return mailboxPath;
  return formatFilemakerMailFolderLabel(folder.mailboxPath, folder.mailboxRole);
};

export const resolveThreadSelection = (
  current: MailClientSelection,
  requested: Pick<MailClientSelection, 'accountId' | 'mailboxPath'>,
  threads: FilemakerMailThread[]
): MailClientSelection => {
  if (current.accountId !== requested.accountId || current.mailboxPath !== requested.mailboxPath) {
    return current;
  }
  if (current.threadId !== null && threads.some((thread) => thread.id === current.threadId)) {
    return current;
  }
  return {
    ...current,
    threadId: threads[0]?.id ?? null,
  };
};
