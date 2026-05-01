import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from './types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';
import {
  toFilemakerMailAttentionAccountNodeId,
  toFilemakerMailAttentionNodeId,
  toFilemakerMailNewAccountNodeId,
  toFilemakerMailSearchNodeId,
} from './mail-master-tree.ids';
import { buildAccountNodes } from './mail-master-tree.account-nodes';

type BuildFilemakerMailMasterNodesInput = {
  accounts: FilemakerMailAccount[];
  folders: FilemakerMailFolderSummary[];
  threads?: FilemakerMailThread[];
  recentThreads?: FilemakerMailThread[];
};

export type MailTreeIndex = {
  foldersByAccountId: Map<string, FilemakerMailFolderSummary[]>;
  threadsByFolderKey: Map<string, FilemakerMailThread[]>;
  recentThreadsByAccountId: Map<string, FilemakerMailThread[]>;
};

const folderKey = (accountId: string, mailboxPath: string): string => `${accountId}::${mailboxPath}`;

const pushGroupedValue = <TValue>(
  target: Map<string, TValue[]>,
  key: string,
  value: TValue
): void => {
  const current = target.get(key) ?? [];
  current.push(value);
  target.set(key, current);
};

const buildMailTreeIndex = (input: BuildFilemakerMailMasterNodesInput): MailTreeIndex => {
  const foldersByAccountId = new Map<string, FilemakerMailFolderSummary[]>();
  const threadsByFolderKey = new Map<string, FilemakerMailThread[]>();
  const recentThreadsByAccountId = new Map<string, FilemakerMailThread[]>();
  input.folders.forEach((folder) => {
    pushGroupedValue(foldersByAccountId, folder.accountId, folder);
  });
  (input.threads ?? []).forEach((thread) => {
    pushGroupedValue(threadsByFolderKey, folderKey(thread.accountId, thread.mailboxPath), thread);
  });
  (input.recentThreads ?? []).forEach((thread) => {
    pushGroupedValue(recentThreadsByAccountId, thread.accountId, thread);
  });
  return { foldersByAccountId, threadsByFolderKey, recentThreadsByAccountId };
};

const accountMetadata = (account: FilemakerMailAccount): Record<string, unknown> => ({
  accountId: account.id,
  emailAddress: account.emailAddress,
  status: account.status,
  lastSyncedAt: account.lastSyncedAt ?? null,
  lastSyncError: account.lastSyncError ?? null,
});

const isAttentionAccount = (account: FilemakerMailAccount): boolean =>
  account.status !== 'active' || (account.lastSyncError?.trim() ?? '').length > 0;

const buildAttentionAccountNode = (
  account: FilemakerMailAccount,
  index: number
): MasterTreeNode => ({
  id: toFilemakerMailAttentionAccountNodeId(account.id),
  type: 'file',
  kind: 'mail_attention_account',
  parentId: toFilemakerMailAttentionNodeId(),
  name: account.name,
  path: `mail/attention/${account.id}`,
  sortOrder: index,
  icon: null,
  metadata: accountMetadata(account),
});

const buildAttentionNodes = (accounts: FilemakerMailAccount[]): MasterTreeNode[] => {
  const attentionAccounts = accounts.filter(isAttentionAccount);
  if (attentionAccounts.length === 0) return [];
  return [
    {
      id: toFilemakerMailAttentionNodeId(),
      type: 'folder',
      kind: 'mail_attention',
      parentId: null,
      name: 'Needs Attention',
      path: 'mail/attention',
      sortOrder: -150,
      icon: null,
      metadata: { accountCount: attentionAccounts.length },
    },
    ...attentionAccounts
      .slice()
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(buildAttentionAccountNode),
  ];
};

const buildStaticNodes = (): MasterTreeNode[] => [
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
];

export const buildFilemakerMailMasterNodes = (
  input: BuildFilemakerMailMasterNodesInput
): MasterTreeNode[] => {
  const index = buildMailTreeIndex(input);
  const accountNodes = input.accounts
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name))
    .flatMap((account, accountIndex) => buildAccountNodes(account, accountIndex, index));
  return [...buildAttentionNodes(input.accounts), ...buildStaticNodes(), ...accountNodes];
};
