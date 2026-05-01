import type { ComponentType } from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import type { FilemakerMailFolderRole } from '@/shared/contracts/filemaker-mail';

import {
  formatFilemakerMailFolderLabel,
  parseFilemakerMailMasterNodeId,
  type FilemakerMailMasterNode,
} from '../mail-master-tree';
import {
  CirclePause,
  CirclePlay,
  Clock3,
  formatFilemakerMailLastSyncedLabel as formatLastSyncedLabel,
  formatFilemakerMailThreadParticipantsLabel as formatThreadParticipantsLabel,
  getFilemakerMailFolderIcon as getFolderIcon,
  Mail,
  MailPlus,
  RefreshCcw,
  Search,
  Settings2,
  ShieldAlert,
} from './FilemakerMailSidebar.helpers';

type SidebarNodeIcon = ComponentType<{ className?: string }>;

export type FilemakerMailSidebarNodeSecondaryLabel = {
  className: string;
  text: string;
};

export type FilemakerMailSidebarNodeModel = {
  accountId: string | null;
  icon: SidebarNodeIcon;
  isAccountStatusToggle: boolean;
  isFolder: boolean;
  isThread: boolean;
  messageCount: number;
  nodeLabel: string;
  parsed: FilemakerMailMasterNode | null;
  secondaryLabels: FilemakerMailSidebarNodeSecondaryLabel[];
  threadCount: number;
  unreadCount: number;
};

type BuildFilemakerMailSidebarNodeModelInput = {
  input: FolderTreeViewportRenderNodeInput;
  syncingAccountId: string | null;
  statusUpdatingAccountId: string | null;
};

type SecondaryLabelResolver = (
  input: FolderTreeViewportRenderNodeInput,
  folderRole: FilemakerMailFolderRole,
  nodeStatus: string | null,
  parsed: FilemakerMailMasterNode
) => FilemakerMailSidebarNodeSecondaryLabel | null;

const readNumberMetadata = (
  input: FolderTreeViewportRenderNodeInput,
  key: string
): number => {
  const value = input.node.metadata?.[key];
  return typeof value === 'number' ? value : 0;
};

const readStringMetadata = (
  input: FolderTreeViewportRenderNodeInput,
  key: string
): string => {
  const value = input.node.metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
};

const readNullableStringMetadata = (
  input: FolderTreeViewportRenderNodeInput,
  key: string
): string | null => {
  const value = readStringMetadata(input, key);
  return value.length > 0 ? value : null;
};

const readFolderRole = (input: FolderTreeViewportRenderNodeInput): FilemakerMailFolderRole => {
  const value = input.node.metadata?.['mailboxRole'];
  return typeof value === 'string' ? (value as FilemakerMailFolderRole) : 'custom';
};

const getNodeAccountId = (parsed: FilemakerMailMasterNode | null): string | null => {
  if (parsed === null) return null;
  if ('accountId' in parsed) return parsed.accountId;
  return null;
};

const getNodeStatus = (input: FolderTreeViewportRenderNodeInput): string | null =>
  readNullableStringMetadata(input, 'status');

const resolveThreadFolderLabel = (
  parsed: FilemakerMailMasterNode | null,
  input: FolderTreeViewportRenderNodeInput,
  folderRole: FilemakerMailFolderRole
): string => {
  const mailboxPath = readStringMetadata(input, 'mailboxPath');
  if (parsed?.kind !== 'mail_recent_thread' || mailboxPath.length === 0) return '';
  return formatFilemakerMailFolderLabel(mailboxPath, folderRole);
};

const resolveThreadSecondaryLabel = (
  parsed: FilemakerMailMasterNode | null,
  input: FolderTreeViewportRenderNodeInput,
  folderRole: FilemakerMailFolderRole
): string => {
  const folderLabel = resolveThreadFolderLabel(parsed, input, folderRole);
  const snippet = readStringMetadata(input, 'snippet');
  const participants = formatThreadParticipantsLabel(input.node.metadata?.['participantSummary']);
  const baseLabel = snippet.length > 0 ? snippet : participants;
  if (folderLabel.length === 0) return baseLabel;
  if (baseLabel.length === 0) return folderLabel;
  return `${folderLabel} • ${baseLabel}`;
};

const resolveAccountSecondaryLabel = (
  input: FolderTreeViewportRenderNodeInput,
  nodeStatus: string | null
): string => {
  const emailAddress = readStringMetadata(input, 'emailAddress');
  const lastSyncError = readStringMetadata(input, 'lastSyncError');
  const lastSyncedAt = input.node.metadata?.['lastSyncedAt'];
  if (emailAddress.length === 0) {
    return nodeStatus !== null && nodeStatus !== 'active' ? `Status: ${nodeStatus}` : '';
  }
  if (nodeStatus !== null && nodeStatus !== 'active') return `${emailAddress} • Status: ${nodeStatus}`;
  if (lastSyncError.length > 0) return `${emailAddress} • Sync error`;
  return `${emailAddress} • ${formatLastSyncedLabel(lastSyncedAt)}`;
};

const resolveAttentionSecondaryLabel = (
  input: FolderTreeViewportRenderNodeInput,
  nodeStatus: string | null
): string => {
  const lastSyncError = readStringMetadata(input, 'lastSyncError');
  const lastSyncedAt = input.node.metadata?.['lastSyncedAt'];
  if (lastSyncError.length > 0) return `Sync error: ${lastSyncError}`;
  if (nodeStatus !== null && nodeStatus !== 'active') return `Status: ${nodeStatus}`;
  return formatLastSyncedLabel(lastSyncedAt);
};

const resolveManagementSecondaryLabel = (
  parsed: FilemakerMailMasterNode | null,
  input: FolderTreeViewportRenderNodeInput,
  nodeStatus: string | null
): string => {
  if (parsed?.kind === 'mail_account_status_toggle') {
    return `Current status: ${nodeStatus ?? 'active'}`;
  }
  const lastSyncError = readStringMetadata(input, 'lastSyncError');
  const lastSyncedAt = input.node.metadata?.['lastSyncedAt'];
  if (lastSyncError.length > 0) return `Sync error: ${lastSyncError}`;
  return formatLastSyncedLabel(lastSyncedAt);
};

const toSecondaryLabel = (
  text: string,
  className: string
): FilemakerMailSidebarNodeSecondaryLabel | null => {
  if (text.length === 0) return null;
  return { text, className };
};

const resolveThreadSecondary = (
  input: FolderTreeViewportRenderNodeInput,
  folderRole: FilemakerMailFolderRole,
  _nodeStatus: string | null,
  parsed: FilemakerMailMasterNode
): FilemakerMailSidebarNodeSecondaryLabel | null =>
  toSecondaryLabel(resolveThreadSecondaryLabel(parsed, input, folderRole), 'text-gray-500');

const resolveAccountSecondary = (
  input: FolderTreeViewportRenderNodeInput,
  _folderRole: FilemakerMailFolderRole,
  nodeStatus: string | null
): FilemakerMailSidebarNodeSecondaryLabel | null =>
  toSecondaryLabel(resolveAccountSecondaryLabel(input, nodeStatus), 'text-gray-500');

const resolveAttentionAccountSecondary = (
  input: FolderTreeViewportRenderNodeInput,
  _folderRole: FilemakerMailFolderRole,
  nodeStatus: string | null
): FilemakerMailSidebarNodeSecondaryLabel | null =>
  toSecondaryLabel(resolveAttentionSecondaryLabel(input, nodeStatus), 'text-amber-300/80');

const resolveManagementSecondary = (
  input: FolderTreeViewportRenderNodeInput,
  _folderRole: FilemakerMailFolderRole,
  nodeStatus: string | null,
  parsed: FilemakerMailMasterNode
): FilemakerMailSidebarNodeSecondaryLabel | null =>
  toSecondaryLabel(resolveManagementSecondaryLabel(parsed, input, nodeStatus), 'text-amber-300/80');

const resolveStatusToggleSecondary = (
  input: FolderTreeViewportRenderNodeInput,
  _folderRole: FilemakerMailFolderRole,
  nodeStatus: string | null,
  parsed: FilemakerMailMasterNode
): FilemakerMailSidebarNodeSecondaryLabel | null =>
  toSecondaryLabel(resolveManagementSecondaryLabel(parsed, input, nodeStatus), 'text-gray-500');

const SECONDARY_LABEL_RESOLVERS: Partial<
  Record<FilemakerMailMasterNode['kind'], SecondaryLabelResolver>
> = {
  mail_account: resolveAccountSecondary,
  mail_account_settings: resolveManagementSecondary,
  mail_account_status_toggle: resolveStatusToggleSecondary,
  mail_account_sync: resolveManagementSecondary,
  mail_attention_account: resolveAttentionAccountSecondary,
  mail_recent_thread: resolveThreadSecondary,
  mail_thread: resolveThreadSecondary,
};

const buildSecondaryLabels = (
  parsed: FilemakerMailMasterNode | null,
  input: FolderTreeViewportRenderNodeInput,
  folderRole: FilemakerMailFolderRole,
  nodeStatus: string | null
): FilemakerMailSidebarNodeSecondaryLabel[] => {
  if (parsed === null) return [];
  const label = SECONDARY_LABEL_RESOLVERS[parsed.kind]?.(input, folderRole, nodeStatus, parsed);
  return label === null || label === undefined ? [] : [label];
};

const STATIC_ICON_BY_KIND: Partial<Record<FilemakerMailMasterNode['kind'], SidebarNodeIcon>> = {
  mail_account: Mail,
  mail_account_compose: MailPlus,
  mail_account_recent: Clock3,
  mail_account_settings: Settings2,
  mail_account_sync: RefreshCcw,
  mail_attention: ShieldAlert,
  mail_attention_account: Settings2,
  mail_new_account: MailPlus,
  mail_recent_thread: Mail,
  mail_search: Search,
  mail_thread: Mail,
};

const resolveNodeIcon = (
  parsed: FilemakerMailMasterNode | null,
  folderRole: FilemakerMailFolderRole,
  nodeStatus: string | null
): SidebarNodeIcon => {
  if (parsed?.kind === 'mail_account_status_toggle') {
    return nodeStatus === 'active' ? CirclePause : CirclePlay;
  }
  if (parsed === null || parsed.kind === 'mail_folder') return getFolderIcon(folderRole);
  return STATIC_ICON_BY_KIND[parsed.kind] ?? getFolderIcon(folderRole);
};

const resolveNodeLabel = (
  input: BuildFilemakerMailSidebarNodeModelInput,
  parsed: FilemakerMailMasterNode | null,
  nodeStatus: string | null
): string => {
  const accountId = getNodeAccountId(parsed);
  if (parsed?.kind === 'mail_account_sync' && input.syncingAccountId === accountId) return 'Syncing...';
  if (parsed?.kind !== 'mail_account_status_toggle') return input.input.node.name;
  if (input.statusUpdatingAccountId !== accountId) return input.input.node.name;
  return nodeStatus === 'active' ? 'Pausing...' : 'Resuming...';
};

export const buildFilemakerMailSidebarNodeModel = (
  input: BuildFilemakerMailSidebarNodeModelInput
): FilemakerMailSidebarNodeModel => {
  const parsed = parseFilemakerMailMasterNodeId(input.input.node.id);
  const folderRole = readFolderRole(input.input);
  const nodeStatus = getNodeStatus(input.input);
  return {
    accountId: getNodeAccountId(parsed),
    icon: resolveNodeIcon(parsed, folderRole, nodeStatus),
    isAccountStatusToggle: parsed?.kind === 'mail_account_status_toggle',
    isFolder: parsed?.kind === 'mail_folder',
    isThread: parsed?.kind === 'mail_thread' || parsed?.kind === 'mail_recent_thread',
    messageCount: readNumberMetadata(input.input, 'messageCount'),
    nodeLabel: resolveNodeLabel(input, parsed, nodeStatus),
    parsed,
    secondaryLabels: buildSecondaryLabels(parsed, input.input, folderRole, nodeStatus),
    threadCount: readNumberMetadata(input.input, 'threadCount'),
    unreadCount: readNumberMetadata(input.input, 'unreadCount'),
  };
};
