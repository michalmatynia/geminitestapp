'use client';

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

import { cn } from '@/shared/utils';

import { formatFilemakerMailFolderLabel } from '../mail-master-tree';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderRole,
  FilemakerMailThread,
} from '../types';

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
) => (
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
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return '';
      const participant = entry as { name?: unknown; address?: unknown };
      if (typeof participant.name === 'string' && participant.name.trim()) {
        return participant.name.trim();
      }
      if (typeof participant.address === 'string' && participant.address.trim()) {
        return participant.address.trim();
      }
      return '';
    })
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
};

const formatFilemakerMailLastSyncedLabel = (value: unknown): string => {
  if (typeof value !== 'string' || !value.trim()) {
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
) => ({
  id: account.id,
  name: account.name,
  emailAddress: account.emailAddress,
  status: nextStatus,
  imapHost: account.imapHost,
  imapPort: account.imapPort,
  imapSecure: account.imapSecure,
  imapUser: account.imapUser,
  imapPassword: '',
  smtpHost: account.smtpHost,
  smtpPort: account.smtpPort,
  smtpSecure: account.smtpSecure,
  smtpUser: account.smtpUser,
  smtpPassword: '',
  fromName: account.fromName ?? null,
  replyToEmail: account.replyToEmail ?? null,
  folderAllowlist: account.folderAllowlist,
  initialSyncLookbackDays: account.initialSyncLookbackDays,
  maxMessagesPerSync: account.maxMessagesPerSync,
});

const matchesFilemakerMailRecentThreadFilters = (
  thread: FilemakerMailThread,
  input: {
    recentMailboxFilter?: string | null;
    recentUnreadOnly?: boolean;
    recentQuery?: string | null;
  }
): boolean => {
  if (input.recentMailboxFilter && thread.mailboxPath !== input.recentMailboxFilter) {
    return false;
  }
  if (input.recentUnreadOnly && thread.unreadCount < 1) {
    return false;
  }
  const query = input.recentQuery?.trim().toLowerCase();
  if (!query) return true;
  const haystack = [
    thread.subject,
    thread.snippet ?? '',
    thread.mailboxPath,
    ...thread.participantSummary.flatMap((participant) => [
      participant.name ?? '',
      participant.address,
    ]),
  ]
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
};

const buildFilemakerMailComposeHref = (input: {
  accountId?: string | null;
  mailboxPath?: string | null;
  originPanel?: 'recent' | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
}): string => {
  const search = new URLSearchParams();
  if (input.accountId) search.set('accountId', input.accountId);
  if (input.mailboxPath) search.set('mailboxPath', input.mailboxPath);
  if (input.accountId && input.originPanel === 'recent') search.set('panel', 'recent');
  if (input.accountId && input.recentMailboxFilter) {
    search.set('recentMailbox', input.recentMailboxFilter);
  }
  if (input.accountId && input.recentUnreadOnly) {
    search.set('recentUnread', '1');
  }
  if (input.accountId && input.originPanel === 'recent' && input.recentQuery) {
    search.set('recentQuery', input.recentQuery);
  }
  const nextSearch = search.toString();
  return nextSearch ? `/admin/filemaker/mail/compose?${nextSearch}` : '/admin/filemaker/mail/compose';
};

const buildFilemakerMailThreadHref = (input: {
  threadId: string;
  accountId?: string | null;
  mailboxPath?: string | null;
  originPanel?: 'recent' | null;
  recentMailboxFilter?: string | null;
  recentUnreadOnly?: boolean;
  recentQuery?: string | null;
}): string => {
  const search = new URLSearchParams();
  if (input.accountId) search.set('accountId', input.accountId);
  if (input.mailboxPath) search.set('mailboxPath', input.mailboxPath);
  if (input.accountId && input.originPanel === 'recent') search.set('panel', 'recent');
  if (input.accountId && input.recentMailboxFilter) {
    search.set('recentMailbox', input.recentMailboxFilter);
  }
  if (input.accountId && input.recentUnreadOnly) {
    search.set('recentUnread', '1');
  }
  if (input.accountId && input.originPanel === 'recent' && input.recentQuery) {
    search.set('recentQuery', input.recentQuery);
  }
  const nextSearch = search.toString();
  const base = `/admin/filemaker/mail/threads/${encodeURIComponent(input.threadId)}`;
  return nextSearch ? `${base}?${nextSearch}` : base;
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
