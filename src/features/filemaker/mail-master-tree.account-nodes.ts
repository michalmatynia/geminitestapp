import type {
  FilemakerMailAccount,
  FilemakerMailFolderRole,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from './types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import type { MailTreeIndex } from './mail-master-tree.build';
import {
  formatFilemakerMailFolderLabel,
  toFilemakerMailAccountComposeNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailAccountRecentNodeId,
  toFilemakerMailAccountSettingsNodeId,
  toFilemakerMailAccountStatusToggleNodeId,
  toFilemakerMailAccountSyncNodeId,
  toFilemakerMailFolderNodeId,
  toFilemakerMailRecentThreadNodeId,
  toFilemakerMailThreadNodeId,
} from './mail-master-tree.ids';

type AccountActionNodeInput = {
  account: FilemakerMailAccount;
  id: string;
  kind: string;
  name: string;
  pathSuffix: string;
  sortOrder: number;
};

const folderRoleOrder: Record<FilemakerMailFolderRole, number> = {
  inbox: 0,
  sent: 1,
  drafts: 2,
  archive: 3,
  spam: 4,
  trash: 5,
  custom: 6,
};

const folderKey = (accountId: string, mailboxPath: string): string => `${accountId}::${mailboxPath}`;

const compareFolders = (
  left: FilemakerMailFolderSummary,
  right: FilemakerMailFolderSummary
): number => {
  const roleDelta = folderRoleOrder[left.mailboxRole] - folderRoleOrder[right.mailboxRole];
  if (roleDelta !== 0) return roleDelta;
  const timeDelta =
    Date.parse(right.lastMessageAt ?? '') - Date.parse(left.lastMessageAt ?? '');
  if (timeDelta !== 0) return timeDelta;
  return left.mailboxPath.localeCompare(right.mailboxPath);
};

const compareThreads = (left: FilemakerMailThread, right: FilemakerMailThread): number => {
  const timeDelta = Date.parse(right.lastMessageAt) - Date.parse(left.lastMessageAt);
  if (timeDelta !== 0) return timeDelta;
  return left.subject.localeCompare(right.subject);
};

const formatFilemakerMailThreadLabel = (thread: FilemakerMailThread): string => {
  const subject = thread.subject.trim();
  if (subject.length > 0) return subject;
  const participant = thread.participantSummary[0] ?? null;
  if (participant?.name !== undefined && participant.name !== null) return participant.name;
  return participant?.address ?? '(no subject)';
};

const accountMetadata = (account: FilemakerMailAccount): Record<string, unknown> => ({
  accountId: account.id,
  emailAddress: account.emailAddress,
  status: account.status,
  lastSyncedAt: account.lastSyncedAt ?? null,
  lastSyncError: account.lastSyncError ?? null,
});

const threadMetadata = (thread: FilemakerMailThread): Record<string, unknown> => ({
  accountId: thread.accountId,
  mailboxPath: thread.mailboxPath,
  threadId: thread.id,
  mailboxRole: thread.mailboxRole,
  unreadCount: thread.unreadCount,
  messageCount: thread.messageCount,
  participantSummary: thread.participantSummary,
  snippet: thread.snippet ?? null,
  lastMessageAt: thread.lastMessageAt,
});

const buildRecentRootNode = (
  account: FilemakerMailAccount,
  recentThreads: FilemakerMailThread[]
): MasterTreeNode => ({
  id: toFilemakerMailAccountRecentNodeId(account.id),
  type: 'folder',
  kind: 'mail_account_recent',
  parentId: toFilemakerMailAccountNodeId(account.id),
  name: 'Recent',
  path: `${account.emailAddress}/recent`,
  sortOrder: -1.5,
  icon: null,
  metadata: { accountId: account.id, threadCount: recentThreads.length },
});

const buildRecentThreadNode = (
  account: FilemakerMailAccount,
  thread: FilemakerMailThread,
  index: number
): MasterTreeNode => ({
  id: toFilemakerMailRecentThreadNodeId(account.id, thread.mailboxPath, thread.id),
  type: 'file',
  kind: 'mail_recent_thread',
  parentId: toFilemakerMailAccountRecentNodeId(account.id),
  name: formatFilemakerMailThreadLabel(thread),
  path: `${account.emailAddress}/recent/${thread.id}`,
  sortOrder: index,
  icon: null,
  metadata: threadMetadata(thread),
});

const buildRecentNodes = (
  account: FilemakerMailAccount,
  recentThreads: FilemakerMailThread[]
): MasterTreeNode[] => {
  if (recentThreads.length === 0) return [];
  return [
    buildRecentRootNode(account, recentThreads),
    ...recentThreads.map((thread, index) => buildRecentThreadNode(account, thread, index)),
  ];
};

const buildFolderThreadNode = (
  account: FilemakerMailAccount,
  folder: FilemakerMailFolderSummary,
  thread: FilemakerMailThread,
  index: number
): MasterTreeNode => ({
  id: toFilemakerMailThreadNodeId(account.id, folder.mailboxPath, thread.id),
  type: 'file',
  kind: 'mail_thread',
  parentId: toFilemakerMailFolderNodeId(account.id, folder.mailboxPath),
  name: formatFilemakerMailThreadLabel(thread),
  path: `${account.emailAddress}/${folder.mailboxPath}/${thread.id}`,
  sortOrder: index,
  icon: null,
  metadata: threadMetadata(thread),
});

const buildFolderRootNode = (
  account: FilemakerMailAccount,
  folder: FilemakerMailFolderSummary,
  index: number
): MasterTreeNode => ({
  id: toFilemakerMailFolderNodeId(account.id, folder.mailboxPath),
  type: 'folder',
  kind: 'mail_folder',
  parentId: toFilemakerMailAccountNodeId(account.id),
  name: formatFilemakerMailFolderLabel(folder.mailboxPath, folder.mailboxRole),
  path: `${account.emailAddress}/${folder.mailboxPath}`,
  sortOrder: index,
  icon: null,
  metadata: {
    accountId: account.id,
    mailboxPath: folder.mailboxPath,
    mailboxRole: folder.mailboxRole,
    unreadCount: folder.unreadCount,
    threadCount: folder.threadCount,
    lastMessageAt: folder.lastMessageAt ?? null,
  },
});

const buildFolderNodes = (
  account: FilemakerMailAccount,
  folder: FilemakerMailFolderSummary,
  folderIndex: number,
  index: MailTreeIndex
): MasterTreeNode[] => {
  const threadEntries = (index.threadsByFolderKey.get(folderKey(account.id, folder.mailboxPath)) ?? [])
    .slice()
    .sort(compareThreads);
  return [
    buildFolderRootNode(account, folder, folderIndex),
    ...threadEntries.map((thread, threadIndex) =>
      buildFolderThreadNode(account, folder, thread, threadIndex)
    ),
  ];
};

const buildAccountRootNode = (
  account: FilemakerMailAccount,
  accountIndex: number,
  folders: FilemakerMailFolderSummary[]
): MasterTreeNode => ({
  id: toFilemakerMailAccountNodeId(account.id),
  type: 'folder',
  kind: 'mail_account',
  parentId: null,
  name: account.name,
  path: account.emailAddress,
  sortOrder: accountIndex,
  icon: null,
  metadata: {
    ...accountMetadata(account),
    unreadCount: folders.reduce((sum, folder) => sum + folder.unreadCount, 0),
    folderCount: folders.length,
  },
});

const buildAccountActionNode = ({
  account,
  id,
  kind,
  name,
  pathSuffix,
  sortOrder,
}: AccountActionNodeInput): MasterTreeNode => ({
  id,
  type: 'folder',
  kind,
  parentId: toFilemakerMailAccountNodeId(account.id),
  name,
  path: `${account.emailAddress}/${pathSuffix}`,
  sortOrder,
  icon: null,
  metadata: accountMetadata(account),
});

const buildStatusToggleNode = (account: FilemakerMailAccount): MasterTreeNode => ({
  ...buildAccountActionNode({
    account,
    id: toFilemakerMailAccountStatusToggleNodeId(account.id),
    kind: 'mail_account_status_toggle',
    name: account.status === 'active' ? 'Pause' : 'Resume',
    pathSuffix: 'status',
    sortOrder: -1.6,
  }),
  metadata: {
    ...accountMetadata(account),
    nextStatus: account.status === 'active' ? 'paused' : 'active',
  },
});

const buildAccountActionNodes = (account: FilemakerMailAccount): MasterTreeNode[] => [
  buildAccountActionNode({
    account,
    id: toFilemakerMailAccountComposeNodeId(account.id),
    kind: 'mail_account_compose',
    name: 'Compose',
    pathSuffix: 'compose',
    sortOrder: -2,
  }),
  buildAccountActionNode({
    account,
    id: toFilemakerMailAccountSyncNodeId(account.id),
    kind: 'mail_account_sync',
    name: 'Sync',
    pathSuffix: 'sync',
    sortOrder: -1.75,
  }),
  buildStatusToggleNode(account),
];

const buildAccountSettingsNode = (account: FilemakerMailAccount): MasterTreeNode =>
  buildAccountActionNode({
    account,
    id: toFilemakerMailAccountSettingsNodeId(account.id),
    kind: 'mail_account_settings',
    name: 'Settings',
    pathSuffix: 'settings',
    sortOrder: -1,
  });

export const buildAccountNodes = (
  account: FilemakerMailAccount,
  accountIndex: number,
  index: MailTreeIndex
): MasterTreeNode[] => {
  const folderEntries = (index.foldersByAccountId.get(account.id) ?? []).slice().sort(compareFolders);
  const recentThreadEntries = (index.recentThreadsByAccountId.get(account.id) ?? [])
    .slice()
    .sort(compareThreads)
    .slice(0, 5);
  const folderNodes = folderEntries.flatMap((folder, folderIndex) =>
    buildFolderNodes(account, folder, folderIndex, index)
  );
  return [
    buildAccountRootNode(account, accountIndex, folderEntries),
    ...buildAccountActionNodes(account),
    ...buildRecentNodes(account, recentThreadEntries),
    buildAccountSettingsNode(account),
    ...folderNodes,
  ];
};
