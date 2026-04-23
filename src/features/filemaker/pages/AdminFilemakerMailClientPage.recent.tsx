import Link from 'next/link';
import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Card, CardContent } from '@/shared/ui/primitives.public';

import {
  buildFilemakerMailThreadHref,
  formatFilemakerMailThreadParticipantsLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount, FilemakerMailThread } from '../types';
import type { MailClientDashboardScope } from './AdminFilemakerMailClientPage.helpers';
import { MailClientDashboardFocusButton } from './AdminFilemakerMailClientPage.mailbox-actions';

type MailClientRecentThreadsSectionProps = {
  accounts: FilemakerMailAccount[];
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  hasActiveFilter: boolean;
  hasAnyRecentThreads: boolean;
  onClearFilter: () => void;
  recentThreads: FilemakerMailThread[];
  recentThreadsError: string | null;
};

const formatThreadTimestamp = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return 'Unknown activity';
  return new Date(parsed).toLocaleString();
};

function MailClientRecentThreadsStatus({
  hasActiveFilter,
  hasAnyRecentThreads,
  onClearFilter,
  recentThreads,
  recentThreadsError,
}: Pick<
  MailClientRecentThreadsSectionProps,
  'hasActiveFilter' | 'hasAnyRecentThreads' | 'onClearFilter' | 'recentThreads' | 'recentThreadsError'
>): React.JSX.Element | null {
  if (recentThreadsError !== null) {
    return (
      <Card variant='warning' padding='md'>
        <div className='text-sm text-amber-100'>{recentThreadsError}</div>
      </Card>
    );
  }

  if (recentThreads.length > 0) return null;

  if (hasAnyRecentThreads && hasActiveFilter) {
    return (
      <Card variant='subtle' padding='md' className='border-border/70 bg-card/50'>
        <div className='space-y-3'>
          <div className='text-base font-semibold text-white'>No recent threads match the current filter.</div>
          <p className='text-sm text-gray-400'>
            Clear the mailbox finder query to bring recent activity back into view.
          </p>
          <div className='flex flex-wrap gap-2'>
            <Button type='button' variant='outline' size='sm' onClick={onClearFilter}>
              Clear Filter
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card variant='subtle' padding='md' className='border-border/70 bg-card/50'>
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No recent threads yet.</div>
        <p className='text-sm text-gray-400'>
          Sync a mailbox or open the workspace to start building recent mail activity.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline' size='sm'>
            <Link href='/admin/filemaker/mail'>Open Workspace</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href={buildFilemakerMailSelectionHref({ panel: 'search' })}>Search Messages</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MailClientRecentThreadCard({
  activeDashboardAccountId,
  accountName,
  dashboardQuery,
  dashboardScope,
  thread,
}: {
  activeDashboardAccountId: string;
  accountName: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  thread: FilemakerMailThread;
}): React.JSX.Element {
  return (
    <Card key={thread.id} variant='subtle' className='border-border/70 bg-card/50'>
      <CardContent className='space-y-3 p-4'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-semibold text-white'>{thread.subject}</div>
            <div className='truncate text-xs text-gray-400'>
              {formatFilemakerMailThreadParticipantsLabel(thread.participantSummary)}
            </div>
          </div>
          <Badge variant='outline'>Unread: {thread.unreadCount}</Badge>
        </div>
        <div className='line-clamp-2 text-sm text-gray-400'>{thread.snippet ?? 'No preview available.'}</div>
        <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
          <Badge variant='outline'>{accountName}</Badge>
          <Badge variant='outline'>{thread.mailboxPath}</Badge>
          <Badge variant='outline'>{formatThreadTimestamp(thread.lastMessageAt)}</Badge>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline' size='sm'>
            <Link href={buildFilemakerMailThreadHref({ threadId: thread.id, accountId: thread.accountId, mailboxPath: thread.mailboxPath })}>Open Thread</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href={buildFilemakerMailSelectionHref({ accountId: thread.accountId, mailboxPath: thread.mailboxPath })}>Open Mailbox</Link>
          </Button>
          <MailClientDashboardFocusButton
            activeDashboardAccountId={activeDashboardAccountId}
            accountId={thread.accountId}
            dashboardQuery={dashboardQuery}
            dashboardScope={dashboardScope}
            label={activeDashboardAccountId === thread.accountId ? 'Show All' : 'Focus Mailbox'}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function MailClientRecentThreadsSection({
  accounts,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  hasActiveFilter,
  hasAnyRecentThreads,
  onClearFilter,
  recentThreads,
  recentThreadsError,
}: MailClientRecentThreadsSectionProps): React.JSX.Element {
  const accountNamesById = new Map(accounts.map((account) => [account.id, account.name] as const));

  return (
    <section className='space-y-4'>
      <SectionHeader
        title='Recent Activity'
        description='Jump into the latest Filemaker mail threads across all connected mailboxes.'
      />

      <MailClientRecentThreadsStatus
        hasActiveFilter={hasActiveFilter}
        hasAnyRecentThreads={hasAnyRecentThreads}
        onClearFilter={onClearFilter}
        recentThreads={recentThreads}
        recentThreadsError={recentThreadsError}
      />

      {recentThreads.length > 0 ? (
        <div className='grid gap-3 xl:grid-cols-2'>
          {recentThreads.map((thread) => (
            <MailClientRecentThreadCard
              key={thread.id}
              activeDashboardAccountId={dashboardAccountId}
              accountName={accountNamesById.get(thread.accountId) ?? thread.accountId}
              dashboardQuery={dashboardQuery}
              dashboardScope={dashboardScope}
              thread={thread}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export { MailClientRecentThreadsSection };
