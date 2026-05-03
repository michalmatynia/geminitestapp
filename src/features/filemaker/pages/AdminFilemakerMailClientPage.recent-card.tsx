import Link from 'next/link';
import React from 'react';

import { Badge, Button, Card, CardContent } from '@/shared/ui/primitives.public';

import {
  buildFilemakerMailThreadHref,
  formatFilemakerMailThreadParticipantsLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailThread } from '../types';
import {
  buildMailClientSearchHref,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import { MailClientDashboardFocusButton } from './AdminFilemakerMailClientPage.mailbox-actions';
import { FilemakerCampaignContextLinks } from './FilemakerCampaignMailLinks';

type MailClientRecentThreadCardProps = {
  activeDashboardAccountId: string;
  accountName: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  thread: FilemakerMailThread;
};

const formatThreadTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown activity';
  return new Date(parsed).toLocaleString();
};

function RecentThreadHeader({ thread }: { thread: FilemakerMailThread }): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-semibold text-white'>{thread.subject}</div>
        <div className='truncate text-xs text-gray-400'>
          {formatFilemakerMailThreadParticipantsLabel(thread.participantSummary)}
        </div>
      </div>
      <Badge variant='outline'>Unread: {thread.unreadCount}</Badge>
    </div>
  );
}

function RecentThreadMetadata({
  accountName,
  thread,
}: {
  accountName: string;
  thread: FilemakerMailThread;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
      <Badge variant='outline'>{accountName}</Badge>
      <Badge variant='outline'>{thread.mailboxPath}</Badge>
      <Badge variant='outline'>{formatThreadTimestamp(thread.lastMessageAt)}</Badge>
      {thread.campaignContext ? (
        <FilemakerCampaignContextLinks
          context={thread.campaignContext}
          className='flex flex-wrap gap-2'
        />
      ) : null}
    </div>
  );
}

function RecentThreadActions({
  activeDashboardAccountId,
  dashboardQuery,
  dashboardScope,
  isSearchHandoff,
  mailboxHref,
  searchHref,
  thread,
  threadHref,
}: {
  activeDashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  isSearchHandoff: boolean;
  mailboxHref: string;
  searchHref: string;
  thread: FilemakerMailThread;
  threadHref: string;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2'>
      <Button asChild variant='outline' size='sm'>
        <Link href={threadHref}>Open Thread</Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={mailboxHref}>Open Mailbox</Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={searchHref}>{isSearchHandoff ? 'Continue Search' : 'Search Mailbox'}</Link>
      </Button>
      <MailClientDashboardFocusButton
        activeDashboardAccountId={activeDashboardAccountId}
        accountId={thread.accountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        label={activeDashboardAccountId === thread.accountId ? 'Show All' : 'Focus Mailbox'}
      />
    </div>
  );
}

export function MailClientRecentThreadCard({
  activeDashboardAccountId,
  accountName,
  dashboardQuery,
  dashboardScope,
  thread,
}: MailClientRecentThreadCardProps): React.JSX.Element {
  const trimmedDashboardQuery = dashboardQuery.trim();
  const isSearchHandoff = trimmedDashboardQuery !== '';
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: thread.accountId,
  });
  const threadHref = buildFilemakerMailThreadHref({
    threadId: thread.id,
    accountId: thread.accountId,
    mailboxPath: thread.mailboxPath,
    originPanel: isSearchHandoff ? 'search' : null,
    searchAccountId: isSearchHandoff && activeDashboardAccountId === '' ? 'all' : null,
    searchQuery: trimmedDashboardQuery,
  });
  const mailboxHref = buildFilemakerMailSelectionHref({
    accountId: thread.accountId,
    mailboxPath: thread.mailboxPath,
  });

  return (
    <Card
      key={thread.id}
      data-testid={`mail-client-recent-thread-${thread.id}`}
      variant='subtle'
      className='border-border/70 bg-card/50'
    >
      <CardContent className='space-y-3 p-4'>
        <RecentThreadHeader thread={thread} />
        <div className='line-clamp-2 text-sm text-gray-400'>
          {thread.snippet ?? 'No preview available.'}
        </div>
        <RecentThreadMetadata accountName={accountName} thread={thread} />
        <RecentThreadActions
          activeDashboardAccountId={activeDashboardAccountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
          isSearchHandoff={isSearchHandoff}
          mailboxHref={mailboxHref}
          searchHref={searchHref}
          thread={thread}
          threadHref={threadHref}
        />
      </CardContent>
    </Card>
  );
}
