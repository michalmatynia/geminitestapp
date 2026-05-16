'use client';

import { RefreshCcw, Star } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import type { FilemakerMailAccount, FilemakerMailThread } from '../types';
import {
  formatDateTime,
  formatThreadParticipants,
  hasText,
} from './AdminFilemakerMailClientPage.workspace-model';
import { MailClientStatusLine } from './AdminFilemakerMailClientPage.workspace-shared';

const getThreadListTitle = (account: FilemakerMailAccount | null): string =>
  account === null ? 'Emails' : account.name;

const getThreadListSubtitle = (
  account: FilemakerMailAccount | null,
  mailboxPath: string | null
): string => {
  if (account === null) return 'Select a mailbox account';
  if (mailboxPath === null) return account.emailAddress;
  return `${account.emailAddress} / ${mailboxPath}`;
};

function ThreadListHeader({
  account,
  mailboxPath,
  threadCount,
  onRefresh,
}: {
  account: FilemakerMailAccount | null;
  mailboxPath: string | null;
  threadCount: number;
  onRefresh: () => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center justify-between gap-3 border-b border-border/60 px-4 py-3'>
      <div className='min-w-0'>
        <h2 className='truncate text-sm font-semibold text-foreground'>
          {getThreadListTitle(account)}
        </h2>
        <p className='truncate text-xs text-muted-foreground'>
          {getThreadListSubtitle(account, mailboxPath)}
        </p>
      </div>
      <div className='flex shrink-0 items-center gap-2'>
        <Badge variant='outline'>{threadCount} shown</Badge>
        <Button type='button' variant='outline' size='sm' onClick={onRefresh}>
          <RefreshCcw className='mr-2 size-4' />
          Refresh
        </Button>
      </div>
    </div>
  );
}

const getThreadListStatus = ({
  account,
  error,
  isLoading,
}: {
  account: FilemakerMailAccount | null;
  error: string | null;
  isLoading: boolean;
}): React.JSX.Element | null => {
  if (error !== null) return <MailClientStatusLine tone='error'>{error}</MailClientStatusLine>;
  if (isLoading) return <MailClientStatusLine>Loading emails...</MailClientStatusLine>;
  if (account === null) return <MailClientStatusLine>Select an account to load emails.</MailClientStatusLine>;
  return null;
};

function ThreadRow({
  isSelected,
  isStarred,
  thread,
  onSelectThread,
  onToggleStar,
}: {
  isSelected: boolean;
  isStarred: boolean;
  thread: FilemakerMailThread;
  onSelectThread: (thread: FilemakerMailThread) => void;
  onToggleStar: (threadId: string) => void;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid w-full grid-cols-[auto_minmax(0,1fr)_auto] gap-2 px-3 py-3 text-left transition',
        isSelected ? 'bg-sky-500/10 ring-1 ring-inset ring-sky-400/30' : 'hover:bg-foreground/5'
      )}
    >
      <button
        type='button'
        aria-pressed={isStarred}
        aria-label={isStarred ? 'Remove from favourites' : 'Add to favourites'}
        onClick={(e): void => { e.stopPropagation(); onToggleStar(thread.id); }}
        className='flex size-6 shrink-0 items-center justify-center self-center rounded text-muted-foreground/50 transition hover:text-amber-400'
      >
        <Star className={cn('size-3.5', isStarred && 'fill-amber-400 text-amber-400')} />
      </button>
      <button
        type='button'
        aria-pressed={isSelected}
        className='grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-left'
        onClick={(): void => onSelectThread(thread)}
      >
        <ThreadRowMain thread={thread} />
        <ThreadRowMeta thread={thread} />
      </button>
    </div>
  );
}

function ThreadRowMain({ thread }: { thread: FilemakerMailThread }): React.JSX.Element {
  return (
    <span className='min-w-0 space-y-1'>
      <span className='flex min-w-0 items-center gap-2'>
        {thread.unreadCount > 0 ? (
          <span className='size-2 rounded-full bg-sky-400' aria-hidden='true' />
        ) : null}
        <span className='truncate text-xs font-medium text-muted-foreground'>
          {formatThreadParticipants(thread.participantSummary)}
        </span>
      </span>
      <span className='block truncate text-sm font-semibold text-foreground'>
        {hasText(thread.subject) ? thread.subject : '(no subject)'}
      </span>
      <span className='block truncate text-xs text-muted-foreground'>
        {thread.snippet ?? 'No preview available'}
      </span>
    </span>
  );
}

function ThreadRowMeta({ thread }: { thread: FilemakerMailThread }): React.JSX.Element {
  return (
    <span className='flex shrink-0 flex-col items-end gap-1 text-right'>
      <span className='text-[11px] text-muted-foreground'>
        {formatDateTime(thread.lastMessageAt)}
      </span>
      <span className='flex gap-1'>
        <Badge variant='outline'>{thread.messageCount}</Badge>
        {thread.unreadCount > 0 ? <Badge variant='default'>{thread.unreadCount}</Badge> : null}
      </span>
    </span>
  );
}

function ThreadRows({
  selectedThreadId,
  starredThreadIds,
  threads,
  onSelectThread,
  onToggleStar,
}: {
  selectedThreadId: string | null;
  starredThreadIds: Set<string>;
  threads: FilemakerMailThread[];
  onSelectThread: (thread: FilemakerMailThread) => void;
  onToggleStar: (threadId: string) => void;
}): React.JSX.Element {
  return (
    <div className='divide-y divide-border/60'>
      {threads.map((thread) => (
        <ThreadRow
          key={thread.id}
          thread={thread}
          isSelected={thread.id === selectedThreadId}
          isStarred={starredThreadIds.has(thread.id)}
          onSelectThread={onSelectThread}
          onToggleStar={onToggleStar}
        />
      ))}
    </div>
  );
}

function ThreadListContent({
  account,
  error,
  isLoading,
  selectedThreadId,
  starredThreadIds,
  threads,
  onSelectThread,
  onToggleStar,
}: {
  account: FilemakerMailAccount | null;
  error: string | null;
  isLoading: boolean;
  selectedThreadId: string | null;
  starredThreadIds: Set<string>;
  threads: FilemakerMailThread[];
  onSelectThread: (thread: FilemakerMailThread) => void;
  onToggleStar: (threadId: string) => void;
}): React.JSX.Element {
  const status = getThreadListStatus({ account, error, isLoading });
  if (status !== null) return <div className='p-4'>{status}</div>;
  if (threads.length === 0) {
    return <div className='p-4'><MailClientStatusLine>No synced emails found for this selection.</MailClientStatusLine></div>;
  }
  return (
    <ThreadRows
      threads={threads}
      selectedThreadId={selectedThreadId}
      starredThreadIds={starredThreadIds}
      onSelectThread={onSelectThread}
      onToggleStar={onToggleStar}
    />
  );
}

export function MailClientThreadList({
  account,
  error,
  isLoading,
  mailboxPath,
  selectedThreadId,
  threads,
  onRefresh,
  onSelectThread,
}: {
  account: FilemakerMailAccount | null;
  error: string | null;
  isLoading: boolean;
  mailboxPath: string | null;
  selectedThreadId: string | null;
  threads: FilemakerMailThread[];
  onRefresh: () => void;
  onSelectThread: (thread: FilemakerMailThread) => void;
}): React.JSX.Element {
  const [starredThreadIds, setStarredThreadIds] = useState<Set<string>>(new Set());
  const handleToggleStar = useCallback((threadId: string): void => {
    setStarredThreadIds((prev) => {
      const next = new Set(prev);
      if (next.has(threadId)) {
        next.delete(threadId);
      } else {
        next.add(threadId);
      }
      return next;
    });
  }, []);

  return (
    <section className='flex min-h-0 flex-col border-b border-border/60'>
      <ThreadListHeader
        account={account}
        mailboxPath={mailboxPath}
        threadCount={threads.length}
        onRefresh={onRefresh}
      />
      <div className='min-h-0 flex-1 overflow-auto'>
        <ThreadListContent
          account={account}
          error={error}
          isLoading={isLoading}
          selectedThreadId={selectedThreadId}
          starredThreadIds={starredThreadIds}
          threads={threads}
          onSelectThread={onSelectThread}
          onToggleStar={handleToggleStar}
        />
      </div>
    </section>
  );
}
