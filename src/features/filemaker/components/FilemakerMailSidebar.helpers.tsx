import {
  Archive,
  CirclePause,
  CirclePlay,
  Clock3,
  Folder,
  Inbox,
  Mail,
  MailPlus,
  RefreshCcw,
  Search,
  Send,
  Settings2,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { formatFilemakerMailFolderLabel } from '../mail-master-tree';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderRole,
  FilemakerMailThread,
} from '../types';

type RecentThreadFilterInput = {
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
};
type MailSearchUrlInput = {
  accountId?: string | null;
  mailboxPath?: string | null;
  originPanel?: 'recent' | 'search' | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentCampaignId?: string | null;
  recentRunId?: string | null;
  recentDeliveryId?: string | null;
  searchContextAccountId?: string | null;
  recentQuery?: string | null;
  searchAccountId?: string | null;
  searchQuery?: string | null;
};

const getFilemakerMailFolderIcon = (
  role: FilemakerMailFolderRole
): React.ComponentType<{ className?: string }> => {
  if (role === 'inbox') return Inbox;
  if (role === 'sent') return Send;
  if (role === 'archive') return Archive;
  if (role === 'spam') return ShieldAlert;
  if (role === 'trash') return Trash2;
  return Folder;
};

const renderFilemakerMailCountBadge = (
  label: string,
  value: number,
  tone: 'default' | 'accent' = 'default'
): React.JSX.Element => (
  <span
    className={cn(
      'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
      tone === 'accent' ? 'bg-sky-500/20 text-sky-200' : 'bg-white/10 text-gray-300'
    )}
  >
    {label}
    {value}
  </span>
);

const formatFilemakerMailThreadParticipantsLabel = (value: unknown): string => {
  if (!Array.isArray(value)) return '';
  return value
    .map((entry: unknown): string => {
      if (entry === null || typeof entry !== 'object') return '';
      const participant = entry as { name?: unknown; address?: unknown };
      if (typeof participant.name === 'string' && participant.name.trim() !== '') {
        return participant.name.trim();
      }
      if (typeof participant.address === 'string' && participant.address.trim() !== '') {
        return participant.address.trim();
      }
      return '';
    })
    .filter((s: string): boolean => s !== '')
    .slice(0, 2)
    .join(', ');
};

const formatFilemakerMailLastSyncedLabel = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    return 'Last sync: Never';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Last sync: Unknown';
  }
  return `Last sync: ${date.toLocaleString()}`;
};

const toFilemakerAccountStatusToggleDraft = (
  account: FilemakerMailAccount,
  nextStatus: 'active' | 'paused'
): FilemakerMailAccount => ({
  id: account.id,
  name: account.name,
  emailAddress: account.emailAddress,
  provider: account.provider,
  status: nextStatus,
  imapHost: account.imapHost,
  imapPort: account.imapPort,
  imapSecure: account.imapSecure,
  imapUser: account.imapUser,
  imapPasswordSettingKey: account.imapPasswordSettingKey,
  smtpHost: account.smtpHost,
  smtpPort: account.smtpPort,
  smtpSecure: account.smtpSecure,
  smtpUser: account.smtpUser,
  smtpPasswordSettingKey: account.smtpPasswordSettingKey,
  fromName: account.fromName ?? null,
  replyToEmail: account.replyToEmail ?? null,
  folderAllowlist: account.folderAllowlist,
  initialSyncLookbackDays: account.initialSyncLookbackDays,
  maxMessagesPerSync: account.maxMessagesPerSync,
});

const hasParamValue = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value !== '';

const setParamIfPresent = (
  search: URLSearchParams,
  key: string,
  value: string | null | undefined
): void => {
  if (hasParamValue(value)) search.set(key, value);
};

const matchesRecentMailboxFilter = (
  thread: FilemakerMailThread,
  filter: string | null | undefined
): boolean => !hasParamValue(filter) || thread.mailboxPath === filter;

const matchesRecentUnreadFilter = (
  thread: FilemakerMailThread,
  unreadOnly: boolean | undefined
): boolean => unreadOnly !== true || thread.unreadCount >= 1;

const matchesFilemakerMailRecentThreadFilters = (
  thread: FilemakerMailThread,
  input: RecentThreadFilterInput
): boolean => {
  if (!matchesRecentMailboxFilter(thread, input.recentMailboxFilter)) return false;
  if (!matchesRecentUnreadFilter(thread, input.recentUnreadOnly)) return false;
  const query = (input.recentQuery?.trim().toLowerCase()) ?? '';
  if (query === '') return true;

  const haystack = [
    thread.subject,
    thread.snippet ?? '',
    thread.mailboxPath,
    ...thread.participantSummary.flatMap((p) => [p.name ?? '', p.address]),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

const setRecentPanelSearchParams = (
  search: URLSearchParams,
  input: MailSearchUrlInput
): void => {
  if (!hasParamValue(input.accountId) || input.originPanel !== 'recent') return;
  search.set('panel', 'recent');
  setParamIfPresent(search, 'recentMailbox', input.recentMailboxFilter);
  if (input.recentUnreadOnly === true) {
    search.set('recentUnread', '1');
  }
  setParamIfPresent(search, 'recentQuery', input.recentQuery);
  setParamIfPresent(search, 'campaignId', input.recentCampaignId);
  setParamIfPresent(search, 'runId', input.recentRunId);
  setParamIfPresent(search, 'deliveryId', input.recentDeliveryId);
};

const setSearchPanelSearchParams = (
  search: URLSearchParams,
  input: MailSearchUrlInput
): void => {
  if (input.originPanel !== 'search') return;
  search.set('panel', 'search');
  setParamIfPresent(search, 'searchQuery', input.searchQuery);
  if (input.searchAccountId === 'all') {
    search.set('searchAccountId', 'all');
  }
  if (
    input.searchAccountId !== 'all' &&
    hasParamValue(input.searchContextAccountId) &&
    input.searchContextAccountId !== input.accountId
  ) {
    search.set('searchContextAccountId', input.searchContextAccountId);
  }
};

const buildCommonSearchUrl = (search: URLSearchParams, input: MailSearchUrlInput): void => {
  setParamIfPresent(search, 'accountId', input.accountId);
  setParamIfPresent(search, 'mailboxPath', input.mailboxPath);
  setRecentPanelSearchParams(search, input);
  setSearchPanelSearchParams(search, input);
};

const buildFilemakerMailComposeHref = (input: MailSearchUrlInput & {
  forwardThreadId?: string | null;
}): string => {
  const search = new URLSearchParams();
  setParamIfPresent(search, 'forwardThreadId', input.forwardThreadId);
  buildCommonSearchUrl(search, input);
  const nextSearch = search.toString();
  return nextSearch !== '' ? `/admin/filemaker/mail-client/compose?${nextSearch}` : '/admin/filemaker/mail-client/compose';
};

const buildFilemakerMailThreadHref = (input: MailSearchUrlInput & {
  threadId: string;
}): string => {
  const search = new URLSearchParams();
  search.set('threadId', input.threadId);
  buildCommonSearchUrl(search, input);
  const nextSearch = search.toString();
  return `/admin/filemaker/mail-client?${nextSearch}`;
};

export {
  buildFilemakerMailComposeHref,
  buildFilemakerMailThreadHref,
  formatFilemakerMailFolderLabel,
  formatFilemakerMailLastSyncedLabel,
  formatFilemakerMailThreadParticipantsLabel,
  getFilemakerMailFolderIcon,
  matchesFilemakerMailRecentThreadFilters,
  renderFilemakerMailCountBadge,
  toFilemakerAccountStatusToggleDraft,
  CirclePause,
  CirclePlay,
  Clock3,
  Mail,
  MailPlus,
  RefreshCcw,
  Search,
  Settings2,
  ShieldAlert,
};
