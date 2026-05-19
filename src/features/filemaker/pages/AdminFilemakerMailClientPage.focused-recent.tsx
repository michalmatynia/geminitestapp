import Link from 'next/link';
import React from 'react';

import { Badge, Button } from '@/shared/ui/primitives.public';

import {
  buildFilemakerMailThreadHref,
  formatFilemakerMailThreadParticipantsLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailThread } from '../types';
import {
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';
import { FilemakerCampaignContextLinks } from './FilemakerCampaignMailLinks';

const FOCUSED_RECENT_THREAD_LIMIT = 2;

const getFocusedRecentThreads = (threads: FilemakerMailThread[]): FilemakerMailThread[] =>
  threads
    .slice()
    .sort((left, right) => {
      const leftTimestamp = Date.parse(left.lastMessageAt);
      const rightTimestamp = Date.parse(right.lastMessageAt);
      const normalizedLeft = Number.isNaN(leftTimestamp) ? 0 : leftTimestamp;
      const normalizedRight = Number.isNaN(rightTimestamp) ? 0 : rightTimestamp;
      if (normalizedLeft !== normalizedRight) return normalizedRight - normalizedLeft;
      return left.subject.localeCompare(right.subject);
    })
    .slice(0, FOCUSED_RECENT_THREAD_LIMIT);

const buildFocusedThreadHref = (
  thread: FilemakerMailThread,
  trimmedDashboardQuery: string
): string =>
  buildFilemakerMailThreadHref({
    threadId: thread.id,
    accountId: thread.accountId,
    mailboxPath: thread.mailboxPath,
    originPanel: trimmedDashboardQuery !== '' ? 'search' : null,
    searchQuery: trimmedDashboardQuery,
  });

function MailClientFocusedLatestThreadButton({
  latestThread,
  trimmedDashboardQuery,
}: {
  latestThread: FilemakerMailThread | null;
  trimmedDashboardQuery: string;
}): React.JSX.Element | null {
  if (latestThread === null) return null;

  return (
    <Button asChild variant='outline' size='sm'>
      <Link href={buildFocusedThreadHref(latestThread, trimmedDashboardQuery)}>
        Open Latest Thread
      </Link>
    </Button>
  );
}

function MailClientFocusedThreadCard({
  accountId,
  thread,
  trimmedDashboardQuery,
}: {
  accountId: string;
  thread: FilemakerMailThread;
  trimmedDashboardQuery: string;
}): React.JSX.Element {
  return (
    <div
      data-testid={`mail-client-focused-thread-${thread.id}`}
      className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
    >
      <div className='space-y-1'>
        <div className='text-sm font-semibold text-white'>{thread.subject}</div>
        <div className='text-xs text-gray-400'>
          {formatFilemakerMailThreadParticipantsLabel(thread.participantSummary)}
        </div>
      </div>
      <div className='line-clamp-2 text-sm text-gray-400'>
        {thread.snippet ?? 'No preview available.'}
      </div>
      <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
        <Badge variant='outline'>{thread.mailboxPath}</Badge>
        <Badge variant='outline'>Unread: {thread.unreadCount}</Badge>
      </div>
      {thread.campaignContext != null ? (
        <FilemakerCampaignContextLinks context={thread.campaignContext} className='flex flex-wrap gap-2' />
      ) : null}
      <div className='flex flex-wrap gap-2'>
        <Button asChild variant='outline' size='sm'>
          <Link href={buildFocusedThreadHref(thread, trimmedDashboardQuery)}>Open Thread</Link>
        </Button>
        <Button asChild variant='outline' size='sm'>
          <Link
            href={buildFilemakerMailSelectionHref({
              accountId,
              mailboxPath: thread.mailboxPath,
            })}
          >
            Open Mailbox
          </Link>
        </Button>
      </div>
    </div>
  );
}

function MailClientFocusedRecentThreadsEmptyState({
  accountId,
  dashboardQuery,
  dashboardScope,
}: {
  accountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
}): React.JSX.Element {
  const searchHref = buildMailClientSearchHref({ dashboardQuery, focusedAccountId: accountId });
  const workspaceHref = buildMailClientWorkspaceHref({ focusedAccountId: accountId });
  const showAllHref = buildMailClientDashboardHref({
    accountId: '',
    query: dashboardQuery,
    scope: dashboardScope,
  });
  const searchLabel = dashboardQuery.trim() !== '' ? 'Continue Search' : 'Search Mailbox';

  return (
    <div
      data-testid='mail-client-focused-recent-status'
      className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
    >
      <div className='text-sm text-gray-400'>
        No recent threads match the current dashboard view for this mailbox.
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button asChild variant='outline' size='sm'>
          <Link href={searchHref}>{searchLabel}</Link>
        </Button>
        <Button asChild variant='outline' size='sm'>
          <Link href={workspaceHref}>Open Workspace</Link>
        </Button>
        <Button asChild variant='outline' size='sm'>
          <Link href={showAllHref}>Show All</Link>
        </Button>
      </div>
    </div>
  );
}

function MailClientFocusedRecentThreadGrid({
  accountId,
  recentThreads,
  trimmedDashboardQuery,
}: {
  accountId: string;
  recentThreads: FilemakerMailThread[];
  trimmedDashboardQuery: string;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 xl:grid-cols-2'>
      {recentThreads.map((thread) => (
        <MailClientFocusedThreadCard
          key={thread.id}
          accountId={accountId}
          thread={thread}
          trimmedDashboardQuery={trimmedDashboardQuery}
        />
      ))}
    </div>
  );
}

function MailClientFocusedRecentThreads({
  accountId,
  dashboardQuery,
  dashboardScope,
  recentThreads,
}: {
  accountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  recentThreads: FilemakerMailThread[];
}): React.JSX.Element {
  const latestThread = recentThreads[0] ?? null;
  const trimmedDashboardQuery = dashboardQuery.trim();
  const hasRecentThreads = recentThreads.length > 0;

  return (
    <div className='space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='space-y-1'>
          <div className='text-xs uppercase tracking-[0.18em] text-gray-500'>Latest Threads</div>
          <div className='text-xs text-gray-500'>
            Most recent activity for this mailbox in the current dashboard view.
          </div>
        </div>
        <MailClientFocusedLatestThreadButton
          latestThread={latestThread}
          trimmedDashboardQuery={trimmedDashboardQuery}
        />
      </div>
      {hasRecentThreads ? (
        <MailClientFocusedRecentThreadGrid
          accountId={accountId}
          recentThreads={recentThreads}
          trimmedDashboardQuery={trimmedDashboardQuery}
        />
      ) : (
        <MailClientFocusedRecentThreadsEmptyState
          accountId={accountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
        />
      )}
    </div>
  );
}

export {
  getFocusedRecentThreads,
  MailClientFocusedRecentThreads,
};
