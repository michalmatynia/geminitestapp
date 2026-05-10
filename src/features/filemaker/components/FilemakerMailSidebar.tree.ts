import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

import {
  toFilemakerMailAccountComposeNodeId,
  toFilemakerMailAccountNodeId,
  toFilemakerMailAccountRecentNodeId,
  toFilemakerMailAccountStatusToggleNodeId,
  toFilemakerMailAccountSyncNodeId,
  toFilemakerMailAttentionNodeId,
  toFilemakerMailFolderNodeId,
  toFilemakerMailNewAccountNodeId,
  toFilemakerMailSearchNodeId,
  toFilemakerMailThreadNodeId,
} from '../mail-master-tree';
import { isPresentString } from './FilemakerMailSidebar.selection';
import type {
  FilemakerMailSidebarData,
  FilemakerMailSidebarSelection,
} from './FilemakerMailSidebar.types';

type SelectedNodeInput = {
  originPanel: FilemakerMailSidebarSelection['originPanel'];
  selectedAccountId: string | null;
  selectedMailboxPath: string | null;
  selectedPanel: FilemakerMailSidebarSelection['panel'];
  selectedThreadId: string | null;
  statusUpdatingAccountId: string | null;
  syncingAccountId: string | null;
  treeNodes: MasterTreeNode[];
};

type AccountSelectedNodeInput = SelectedNodeInput & {
  selectedAccountId: string;
};

const findTreeNode = (
  treeNodes: MasterTreeNode[],
  predicate: (node: MasterTreeNode) => boolean
): MasterTreeNode | null => treeNodes.find(predicate) ?? null;

const resolveRecentThreadNodeId = (
  treeNodes: MasterTreeNode[],
  selectedAccountId: string,
  selectedThreadId: string
): string | null => {
  const recentMatch = findTreeNode(
    treeNodes,
    (node) =>
      node.kind === 'mail_recent_thread' &&
      node.metadata['accountId'] === selectedAccountId &&
      node.metadata['threadId'] === selectedThreadId
  );
  return recentMatch?.id ?? null;
};

const resolveFolderNodeId = (
  treeNodes: MasterTreeNode[],
  selectedAccountId: string,
  selectedMailboxPath: string
): string | null => {
  const match = findTreeNode(
    treeNodes,
    (node) =>
      node.kind === 'mail_folder' &&
      node.metadata['accountId'] === selectedAccountId &&
      node.metadata['mailboxPath'] === selectedMailboxPath
  );
  return match?.id ?? null;
};

const isImplicitSearchSelection = (
  selectedPanel: FilemakerMailSidebarSelection['panel'],
  originPanel: FilemakerMailSidebarSelection['originPanel']
): boolean => selectedPanel === null && originPanel === 'search';

const isRecentSelection = (
  selectedPanel: FilemakerMailSidebarSelection['panel'],
  originPanel: FilemakerMailSidebarSelection['originPanel']
): boolean => selectedPanel === 'recent' || (selectedPanel === null && originPanel === 'recent');

const resolvePanelSelectedNodeId = (input: SelectedNodeInput): string | null => {
  if (input.selectedPanel === 'search' || isImplicitSearchSelection(input.selectedPanel, input.originPanel)) {
    return toFilemakerMailSearchNodeId();
  }
  if (input.selectedPanel === 'attention') return toFilemakerMailAttentionNodeId();
  return null;
};

const resolveRecentSelectedNodeId = (input: AccountSelectedNodeInput): string | null => {
  if (!isRecentSelection(input.selectedPanel, input.originPanel)) return null;
  const recentNodeId = toFilemakerMailAccountRecentNodeId(input.selectedAccountId);
  if (input.selectedThreadId === null) return recentNodeId;
  return resolveRecentThreadNodeId(input.treeNodes, input.selectedAccountId, input.selectedThreadId) ?? recentNodeId;
};

const resolveMailboxSelectedNodeId = (input: AccountSelectedNodeInput): string | null => {
  if (input.selectedMailboxPath === null) return null;
  if (input.selectedThreadId !== null) {
    return toFilemakerMailThreadNodeId(
      input.selectedAccountId,
      input.selectedMailboxPath,
      input.selectedThreadId
    );
  }
  return (
    resolveFolderNodeId(input.treeNodes, input.selectedAccountId, input.selectedMailboxPath) ??
    toFilemakerMailFolderNodeId(input.selectedAccountId, input.selectedMailboxPath)
  );
};

const resolveAccountActivityNodeId = (input: AccountSelectedNodeInput): string | null => {
  if (input.syncingAccountId === input.selectedAccountId) {
    return toFilemakerMailAccountSyncNodeId(input.selectedAccountId);
  }
  if (input.statusUpdatingAccountId === input.selectedAccountId) {
    return toFilemakerMailAccountStatusToggleNodeId(input.selectedAccountId);
  }
  return null;
};

const resolveAccountSelectedNodeId = (input: AccountSelectedNodeInput): string => {
  if (input.selectedPanel === 'compose') return toFilemakerMailAccountComposeNodeId(input.selectedAccountId);
  const recentNodeId = resolveRecentSelectedNodeId(input);
  if (recentNodeId !== null) return recentNodeId;
  const mailboxNodeId = resolveMailboxSelectedNodeId(input);
  if (mailboxNodeId !== null) return mailboxNodeId;
  const activityNodeId = resolveAccountActivityNodeId(input);
  if (activityNodeId !== null) return activityNodeId;
  return toFilemakerMailAccountNodeId(input.selectedAccountId);
};

export const resolveSelectedNodeId = (input: SelectedNodeInput): string => {
  const panelNodeId = resolvePanelSelectedNodeId(input);
  if (panelNodeId !== null) return panelNodeId;
  if (input.selectedAccountId === null) return toFilemakerMailNewAccountNodeId();
  return resolveAccountSelectedNodeId({
    ...input,
    selectedAccountId: input.selectedAccountId,
  });
};

export const resolveInitiallyExpandedNodeIds = (input: {
  accounts: FilemakerMailSidebarData['accounts'];
  selectedAccountId: string | null;
  selectedMailboxPath: string | null;
  visibleRecentCount: number;
}): string[] => {
  const nodeIds = input.accounts.map((account) => toFilemakerMailAccountNodeId(account.id));
  const hasAttentionAccounts = input.accounts.some(
    (account) => account.status !== 'active' || isPresentString(account.lastSyncError)
  );
  if (hasAttentionAccounts) nodeIds.push(toFilemakerMailAttentionNodeId());
  if (input.selectedAccountId !== null && input.selectedMailboxPath !== null) {
    nodeIds.push(toFilemakerMailFolderNodeId(input.selectedAccountId, input.selectedMailboxPath));
  }
  if (input.selectedAccountId !== null && input.visibleRecentCount > 0) {
    nodeIds.push(toFilemakerMailAccountRecentNodeId(input.selectedAccountId));
  }
  return nodeIds;
};
