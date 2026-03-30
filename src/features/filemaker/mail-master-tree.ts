import type {
  FilemakerMailAccount,
  FilemakerMailFolderRole,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from './types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

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

const folderRoleOrder: Record<FilemakerMailFolderRole, number> = {
  inbox: 0,
  sent: 1,
  drafts: 2,
  archive: 3,
  spam: 4,
  trash: 5,
  custom: 6,
};

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

export const parseFilemakerMailMasterNodeId = (
  nodeId: string | null | undefined
): FilemakerMailMasterNode | null => {
  if (!nodeId?.startsWith(`${FILEMAKER_MAIL_NODE_PREFIX}:`)) return null;
  if (nodeId === toFilemakerMailNewAccountNodeId()) {
    return { kind: 'mail_new_account' };
  }
  if (nodeId === toFilemakerMailAttentionNodeId()) {
    return { kind: 'mail_attention' };
  }
  if (nodeId === toFilemakerMailSearchNodeId()) {
    return { kind: 'mail_search' };
  }
  const parts = nodeId.split(':');
  if (parts.length < 3) return null;
  if (parts[1] === 'attention-account' && parts[2]) {
    return {
      kind: 'mail_attention_account',
      accountId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[1] === 'account' && parts[2]) {
    return {
      kind: 'mail_account',
      accountId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[1] === 'account-compose' && parts[2]) {
    return {
      kind: 'mail_account_compose',
      accountId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[1] === 'account-sync' && parts[2]) {
    return {
      kind: 'mail_account_sync',
      accountId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[1] === 'account-status-toggle' && parts[2]) {
    return {
      kind: 'mail_account_status_toggle',
      accountId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[1] === 'account-recent' && parts[2]) {
    return {
      kind: 'mail_account_recent',
      accountId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[1] === 'account-settings' && parts[2]) {
    return {
      kind: 'mail_account_settings',
      accountId: decodeURIComponent(parts[2]),
    };
  }
  if (parts[1] === 'folder' && parts[2] && parts[3]) {
    return {
      kind: 'mail_folder',
      accountId: decodeURIComponent(parts[2]),
      mailboxPath: decodeURIComponent(parts[3]),
    };
  }
  if (parts[1] === 'thread' && parts[2] && parts[3] && parts[4]) {
    return {
      kind: 'mail_thread',
      accountId: decodeURIComponent(parts[2]),
      mailboxPath: decodeURIComponent(parts[3]),
      threadId: decodeURIComponent(parts[4]),
    };
  }
  if (parts[1] === 'recent-thread' && parts[2] && parts[3] && parts[4]) {
    return {
      kind: 'mail_recent_thread',
      accountId: decodeURIComponent(parts[2]),
      mailboxPath: decodeURIComponent(parts[3]),
      threadId: decodeURIComponent(parts[4]),
    };
  }
  return null;
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
  const timeDelta =
    Date.parse(right.lastMessageAt ?? '') - Date.parse(left.lastMessageAt ?? '');
  if (timeDelta !== 0) return timeDelta;
  return left.subject.localeCompare(right.subject);
};

const formatFilemakerMailThreadLabel = (thread: FilemakerMailThread): string => {
  const subject = thread.subject.trim();
  if (subject) return subject;
  const participant = thread.participantSummary[0];
  if (participant?.name) return participant.name;
  if (participant?.address) return participant.address;
  return '(no subject)';
};

export const buildFilemakerMailMasterNodes = (input: {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
  threads?: FilemakerMailThread[];
  recentThreads?: FilemakerMailThread[];
}): MasterTreeNode[] => {
  const foldersByAccountId = new Map<string, FilemakerMailFolderSummary[]>();
  const threadsByFolderKey = new Map<string, FilemakerMailThread[]>();
  const recentThreadsByAccountId = new Map<string, FilemakerMailThread[]>();
  input.folders.forEach((folder) => {
    const current = foldersByAccountId.get(folder.accountId) ?? [];
    current.push(folder);
    foldersByAccountId.set(folder.accountId, current);
  });
  (input.threads ?? []).forEach((thread) => {
    const key = `${thread.accountId}::${thread.mailboxPath}`;
    const current = threadsByFolderKey.get(key) ?? [];
    current.push(thread);
    threadsByFolderKey.set(key, current);
  });
  (input.recentThreads ?? []).forEach((thread) => {
    const current = recentThreadsByAccountId.get(thread.accountId) ?? [];
    current.push(thread);
    recentThreadsByAccountId.set(thread.accountId, current);
  });
  const attentionAccounts = input.accounts.filter(
    (account) => account.status !== 'active' || Boolean(account.lastSyncError?.trim())
  );
  const attentionNodes: MasterTreeNode[] =
    attentionAccounts.length > 0
      ? [
          {
            id: toFilemakerMailAttentionNodeId(),
            type: 'folder',
            kind: 'mail_attention',
            parentId: null,
            name: 'Needs Attention',
            path: 'mail/attention',
            sortOrder: -150,
            icon: null,
            metadata: {
              accountCount: attentionAccounts.length,
            },
          },
          ...attentionAccounts
            .slice()
            .sort((left, right) => left.name.localeCompare(right.name))
            .map(
              (account, index): MasterTreeNode => ({
                id: toFilemakerMailAttentionAccountNodeId(account.id),
                type: 'file',
                kind: 'mail_attention_account',
                parentId: toFilemakerMailAttentionNodeId(),
                name: account.name,
                path: `mail/attention/${account.id}`,
                sortOrder: index,
                icon: null,
                metadata: {
                  accountId: account.id,
                  emailAddress: account.emailAddress,
                  status: account.status,
                  lastSyncedAt: account.lastSyncedAt ?? null,
                  lastSyncError: account.lastSyncError ?? null,
                },
              })
            ),
        ]
      : [];

  return [
    ...attentionNodes,
    {
      id: toFilemakerMailSearchNodeId(),
      type: 'folder',
      kind: 'mail_search',
      parentId: null,
      name: 'Search Messages',
      path: 'mail/search',
      sortOrder: -120,
      icon: null,
      metadata: {},
    },
    {
      id: toFilemakerMailNewAccountNodeId(),
      type: 'folder',
      kind: 'mail_new_account',
      parentId: null,
      name: 'Add Mailbox',
      path: 'mail/new',
      sortOrder: -100,
      icon: null,
      metadata: {},
    },
    ...input.accounts
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .flatMap((account, accountIndex): MasterTreeNode[] => {
      const accountNodeId = toFilemakerMailAccountNodeId(account.id);
      const accountComposeNodeId = toFilemakerMailAccountComposeNodeId(account.id);
      const accountSyncNodeId = toFilemakerMailAccountSyncNodeId(account.id);
      const accountStatusToggleNodeId = toFilemakerMailAccountStatusToggleNodeId(account.id);
      const accountRecentNodeId = toFilemakerMailAccountRecentNodeId(account.id);
      const accountSettingsNodeId = toFilemakerMailAccountSettingsNodeId(account.id);
      const folderEntries = (foldersByAccountId.get(account.id) ?? []).slice().sort(compareFolders);
      const recentThreadEntries = (recentThreadsByAccountId.get(account.id) ?? [])
        .slice()
        .sort(compareThreads)
        .slice(0, 5);
      const recentNodes: MasterTreeNode[] =
        recentThreadEntries.length > 0
          ? [
              {
                id: accountRecentNodeId,
                type: 'folder',
                kind: 'mail_account_recent',
                parentId: accountNodeId,
                name: 'Recent',
                path: `${account.emailAddress}/recent`,
                sortOrder: -1.5,
                icon: null,
                metadata: {
                  accountId: account.id,
                  threadCount: recentThreadEntries.length,
                },
              },
              ...recentThreadEntries.map((thread, threadIndex): MasterTreeNode => ({
                id: toFilemakerMailRecentThreadNodeId(account.id, thread.mailboxPath, thread.id),
                type: 'file',
                kind: 'mail_recent_thread',
                parentId: accountRecentNodeId,
                name: formatFilemakerMailThreadLabel(thread),
                path: `${account.emailAddress}/recent/${thread.id}`,
                sortOrder: threadIndex,
                icon: null,
                metadata: {
                  accountId: account.id,
                  mailboxPath: thread.mailboxPath,
                  threadId: thread.id,
                  mailboxRole: thread.mailboxRole,
                  unreadCount: thread.unreadCount,
                  messageCount: thread.messageCount,
                  participantSummary: thread.participantSummary,
                  snippet: thread.snippet ?? null,
                  lastMessageAt: thread.lastMessageAt,
                },
              })),
            ]
          : [];
      const folderNodes = folderEntries.flatMap((folder, folderIndex): MasterTreeNode[] => {
          const folderNodeId = toFilemakerMailFolderNodeId(account.id, folder.mailboxPath);
          const threadNodes = (threadsByFolderKey.get(`${account.id}::${folder.mailboxPath}`) ?? [])
            .slice()
            .sort(compareThreads)
            .map((thread, threadIndex): MasterTreeNode => ({
              id: toFilemakerMailThreadNodeId(account.id, folder.mailboxPath, thread.id),
              type: 'file',
              kind: 'mail_thread',
              parentId: folderNodeId,
              name: formatFilemakerMailThreadLabel(thread),
              path: `${account.emailAddress}/${folder.mailboxPath}/${thread.id}`,
              sortOrder: threadIndex,
              icon: null,
              metadata: {
                accountId: account.id,
                mailboxPath: folder.mailboxPath,
                threadId: thread.id,
                mailboxRole: thread.mailboxRole,
                unreadCount: thread.unreadCount,
                messageCount: thread.messageCount,
                participantSummary: thread.participantSummary,
                snippet: thread.snippet ?? null,
                lastMessageAt: thread.lastMessageAt,
              },
            }));

          return [
            {
              id: folderNodeId,
              type: 'folder',
              kind: 'mail_folder',
              parentId: accountNodeId,
              name: formatFilemakerMailFolderLabel(folder.mailboxPath, folder.mailboxRole),
              path: `${account.emailAddress}/${folder.mailboxPath}`,
              sortOrder: folderIndex,
              icon: null,
              metadata: {
                accountId: account.id,
                mailboxPath: folder.mailboxPath,
                mailboxRole: folder.mailboxRole,
                unreadCount: folder.unreadCount,
                threadCount: folder.threadCount,
                lastMessageAt: folder.lastMessageAt ?? null,
              },
            },
            ...threadNodes,
          ];
        });

        return [
          {
            id: accountNodeId,
            type: 'folder',
            kind: 'mail_account',
            parentId: null,
            name: account.name,
            path: account.emailAddress,
            sortOrder: accountIndex,
            icon: null,
            metadata: {
              accountId: account.id,
              emailAddress: account.emailAddress,
              status: account.status,
              lastSyncedAt: account.lastSyncedAt ?? null,
              lastSyncError: account.lastSyncError ?? null,
              unreadCount: folderEntries.reduce((sum, folder) => sum + folder.unreadCount, 0),
              folderCount: folderEntries.length,
            },
          },
          {
            id: accountComposeNodeId,
            type: 'folder',
            kind: 'mail_account_compose',
            parentId: accountNodeId,
            name: 'Compose',
            path: `${account.emailAddress}/compose`,
            sortOrder: -2,
            icon: null,
            metadata: {
              accountId: account.id,
              emailAddress: account.emailAddress,
              status: account.status,
              lastSyncedAt: account.lastSyncedAt ?? null,
              lastSyncError: account.lastSyncError ?? null,
            },
          },
          {
            id: accountSyncNodeId,
            type: 'folder',
            kind: 'mail_account_sync',
            parentId: accountNodeId,
            name: 'Sync',
            path: `${account.emailAddress}/sync`,
            sortOrder: -1.75,
            icon: null,
            metadata: {
              accountId: account.id,
              emailAddress: account.emailAddress,
              status: account.status,
              lastSyncedAt: account.lastSyncedAt ?? null,
              lastSyncError: account.lastSyncError ?? null,
            },
          },
          {
            id: accountStatusToggleNodeId,
            type: 'folder',
            kind: 'mail_account_status_toggle',
            parentId: accountNodeId,
            name: account.status === 'active' ? 'Pause' : 'Resume',
            path: `${account.emailAddress}/status`,
            sortOrder: -1.6,
            icon: null,
            metadata: {
              accountId: account.id,
              emailAddress: account.emailAddress,
              status: account.status,
              nextStatus: account.status === 'active' ? 'paused' : 'active',
              lastSyncedAt: account.lastSyncedAt ?? null,
              lastSyncError: account.lastSyncError ?? null,
            },
          },
          ...recentNodes,
          {
            id: accountSettingsNodeId,
            type: 'folder',
            kind: 'mail_account_settings',
            parentId: accountNodeId,
            name: 'Settings',
            path: `${account.emailAddress}/settings`,
            sortOrder: -1,
            icon: null,
            metadata: {
              accountId: account.id,
              emailAddress: account.emailAddress,
              status: account.status,
              lastSyncedAt: account.lastSyncedAt ?? null,
              lastSyncError: account.lastSyncError ?? null,
            },
          },
          ...folderNodes,
        ];
      }),
  ];
};
