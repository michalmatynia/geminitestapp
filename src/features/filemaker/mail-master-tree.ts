import type { FilemakerMailAccount, FilemakerMailFolderRole, FilemakerMailFolderSummary } from './types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

export type FilemakerMailMasterNode =
  | { kind: 'mail_account'; accountId: string }
  | { kind: 'mail_account_settings'; accountId: string }
  | { kind: 'mail_folder'; accountId: string; mailboxPath: string };

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

export const toFilemakerMailAccountNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account:${encodeURIComponent(accountId)}`;

export const toFilemakerMailAccountSettingsNodeId = (accountId: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:account-settings:${encodeURIComponent(accountId)}`;

export const toFilemakerMailFolderNodeId = (accountId: string, mailboxPath: string): string =>
  `${FILEMAKER_MAIL_NODE_PREFIX}:folder:${encodeURIComponent(accountId)}:${encodeURIComponent(mailboxPath)}`;

export const parseFilemakerMailMasterNodeId = (
  nodeId: string | null | undefined
): FilemakerMailMasterNode | null => {
  if (!nodeId?.startsWith(`${FILEMAKER_MAIL_NODE_PREFIX}:`)) return null;
  const parts = nodeId.split(':');
  if (parts.length < 3) return null;
  if (parts[1] === 'account' && parts[2]) {
    return {
      kind: 'mail_account',
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

export const buildFilemakerMailMasterNodes = (input: {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
}): MasterTreeNode[] => {
  const foldersByAccountId = new Map<string, FilemakerMailFolderSummary[]>();
  input.folders.forEach((folder) => {
    const current = foldersByAccountId.get(folder.accountId) ?? [];
    current.push(folder);
    foldersByAccountId.set(folder.accountId, current);
  });

  return input.accounts
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((account, accountIndex): MasterTreeNode[] => {
      const accountNodeId = toFilemakerMailAccountNodeId(account.id);
      const accountSettingsNodeId = toFilemakerMailAccountSettingsNodeId(account.id);
      const folderNodes = (foldersByAccountId.get(account.id) ?? [])
        .slice()
        .sort(compareFolders)
        .map((folder, folderIndex): MasterTreeNode => ({
          id: toFilemakerMailFolderNodeId(account.id, folder.mailboxPath),
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
        }));

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
            unreadCount: folderNodes.reduce((sum, folder) => {
              const unreadCount =
                typeof folder.metadata?.['unreadCount'] === 'number'
                  ? folder.metadata['unreadCount']
                  : 0;
              return sum + unreadCount;
            }, 0),
            folderCount: folderNodes.length,
          },
        },
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
          },
        },
        ...folderNodes,
      ];
    });
};
