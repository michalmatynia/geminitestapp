import type { FilemakerMailFolderRole } from './types';

export type FilemakerMailMasterNode =
  | { kind: 'mail_attention' }
  | { kind: 'mail_attention_account'; accountId: string }
  | { kind: 'mail_new_account' }
  | { kind: 'mail_search' }
  | { kind: 'mail_account'; accountId: string }
  | { kind: 'mail_account_compose'; accountId: string }
  | { kind: 'mail_account_sync'; accountId: string }
  | { kind: 'mail_account_status_toggle'; accountId: string }
  | { kind: 'mail_account_recent'; accountId: string }
  | { kind: 'mail_account_settings'; accountId: string }
  | { kind: 'mail_folder'; accountId: string; mailboxPath: string }
  | { kind: 'mail_thread'; accountId: string; mailboxPath: string; threadId: string }
  | { kind: 'mail_recent_thread'; accountId: string; mailboxPath: string; threadId: string };

const FILEMAKER_MAIL_NODE_PREFIX = 'filemaker-mail';

export const toFilemakerMailNewAccountNodeId = (): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:new-account`;

export const toFilemakerMailAttentionNodeId = (): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:attention`;

export const toFilemakerMailSearchNodeId = (): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:search`;

export const toFilemakerMailAttentionAccountNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:attention-account:${encodeURIComponent(accountId)}`;

export const toFilemakerMailAccountNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account:${encodeURIComponent(accountId)}`;

export const toFilemakerMailAccountComposeNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account-compose:${encodeURIComponent(accountId)}`;

export const toFilemakerMailAccountSyncNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account-sync:${encodeURIComponent(accountId)}`;

export const toFilemakerMailAccountStatusToggleNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account-status-toggle:${encodeURIComponent(accountId)}`;

export const toFilemakerMailAccountRecentNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account-recent:${encodeURIComponent(accountId)}`;

export const toFilemakerMailAccountSettingsNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account-settings:${encodeURIComponent(accountId)}`;

export const toFilemakerMailFolderNodeId = (accountId: string, mailboxPath: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:folder:${encodeURIComponent(accountId)}:${encodeURIComponent(mailboxPath)}`;

export const toFilemakerMailThreadNodeId = (
  accountId: string,
  mailboxPath: string,
  threadId: string
): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:thread:${encodeURIComponent(accountId)}:${encodeURIComponent(
    mailboxPath
  )}:${encodeURIComponent(threadId)}`;

export const toFilemakerMailRecentThreadNodeId = (
  accountId: string,
  mailboxPath: string,
  threadId: string
): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:recent-thread:${encodeURIComponent(
    accountId
  )}:${encodeURIComponent(mailboxPath)}:${encodeURIComponent(threadId)}`;

const decodeRequiredPart = (value: string | undefined): string | null => {
  if (value === undefined || value.length === 0) return null;
  return decodeURIComponent(value);
};

const parseSingleNode = (nodeId: string): FilemakerMailMasterNode | null => {
  if (nodeId === toFilemakerMailNewAccountNodeId()) return { kind: 'mail_new_account' };
  if (nodeId === toFilemakerMailAttentionNodeId()) return { kind: 'mail_attention' };
  if (nodeId === toFilemakerMailSearchNodeId()) return { kind: 'mail_search' };
  return null;
};

const parsePrimaryAccountNode = (
  kind: string | undefined,
  accountPart: string | undefined
): FilemakerMailMasterNode | null => {
  const accountId = decodeRequiredPart(accountPart);
  if (accountId === null) return null;
  switch (kind) {
    case 'attention-account':
      return { kind: 'mail_attention_account', accountId };
    case 'account':
      return { kind: 'mail_account', accountId };
    case 'account-compose':
      return { kind: 'mail_account_compose', accountId };
    case 'account-sync':
      return { kind: 'mail_account_sync', accountId };
    default:
      return null;
  }
};

const parseSecondaryAccountNode = (
  kind: string | undefined,
  accountPart: string | undefined
): FilemakerMailMasterNode | null => {
  const accountId = decodeRequiredPart(accountPart);
  if (accountId === null) return null;
  switch (kind) {
    case 'account-status-toggle':
      return { kind: 'mail_account_status_toggle', accountId };
    case 'account-recent':
      return { kind: 'mail_account_recent', accountId };
    case 'account-settings':
      return { kind: 'mail_account_settings', accountId };
    default:
      return null;
  }
};

const parseFolderNode = (
  accountPart: string | undefined,
  mailboxPart: string | undefined
): FilemakerMailMasterNode | null => {
  const accountId = decodeRequiredPart(accountPart);
  const mailboxPath = decodeRequiredPart(mailboxPart);
  if (accountId === null || mailboxPath === null) return null;
  return { kind: 'mail_folder', accountId, mailboxPath };
};

const parseThreadNode = (
  kind: 'mail_thread' | 'mail_recent_thread',
  accountPart: string | undefined,
  mailboxPart: string | undefined,
  threadPart: string | undefined
): FilemakerMailMasterNode | null => {
  const accountId = decodeRequiredPart(accountPart);
  const mailboxPath = decodeRequiredPart(mailboxPart);
  const threadId = decodeRequiredPart(threadPart);
  if (accountId === null || mailboxPath === null || threadId === null) return null;
  return { kind, accountId, mailboxPath, threadId };
};

const parseStructuredNodeParts = (parts: string[]): FilemakerMailMasterNode | null => {
  const kind = parts[1];
  if (kind === 'folder') return parseFolderNode(parts[2], parts[3]);
  if (kind === 'thread') return parseThreadNode('mail_thread', parts[2], parts[3], parts[4]);
  if (kind === 'recent-thread') {
    return parseThreadNode('mail_recent_thread', parts[2], parts[3], parts[4]);
  }
  return parsePrimaryAccountNode(kind, parts[2]) ?? parseSecondaryAccountNode(kind, parts[2]);
};

export const parseFilemakerMailMasterNodeId = (
  nodeId: string | null | undefined
): FilemakerMailMasterNode | null => {
  if (nodeId === null || nodeId === undefined) return null;
  if (!nodeId.startsWith(`${FILEMAKER_MAIL_NODE_PREFIX}:`)) return null;
  const singleNode = parseSingleNode(nodeId);
  if (singleNode !== null) return singleNode;

  return parseStructuredNodeParts(nodeId.split(':'));
};

export const formatFilemakerMailFolderLabel = (
  mailboxPath: string,
  mailboxRole: FilemakerMailFolderRole
): string => {
  if (mailboxRole === 'inbox') return 'Inbox';
  if (mailboxRole === 'sent') return 'Sent';
  if (mailboxRole === 'drafts') return 'Drafts';
  if (mailboxRole === 'archive') return 'Archive';
  if (mailboxRole === 'spam') return 'Spam';
  if (mailboxRole === 'trash') return 'Trash';
  return mailboxPath;
};
