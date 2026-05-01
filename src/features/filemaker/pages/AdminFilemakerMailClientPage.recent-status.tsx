import Link from 'next/link';
import React from 'react';

import { Button, Card } from '@/shared/ui/primitives.public';

import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailThread } from '../types';
import {
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
} from './AdminFilemakerMailClientPage.helpers';

export type MailClientRecentThreadsStatusProps = {
  dashboardAccountId: string;
  dashboardQuery: string;
  hasActiveFilter: boolean;
  hasAnyRecentThreads: boolean;
  isLoading: boolean;
  onClearFilter: () => void;
  onRetry: () => Promise<void>;
  recentThreads: FilemakerMailThread[];
  recentThreadsError: string | null;
};

type RecentStatusHrefSet = {
  searchHref: string;
  workspaceHref: string;
};

function RecentStatusBase({
  children,
  variant = 'subtle',
}: {
  children: React.ReactNode;
  variant?: 'subtle' | 'warning';
}): React.JSX.Element {
  return (
    <Card
      data-testid='mail-client-recent-status'
      variant={variant}
      padding='md'
      className={variant === 'subtle' ? 'border-border/70 bg-card/50' : undefined}
    >
      <div className='space-y-3'>{children}</div>
    </Card>
  );
}

function RecentStatusLinks({
  searchHref,
  workspaceHref,
}: RecentStatusHrefSet): React.JSX.Element {
  return (
    <>
      <Button asChild variant='outline' size='sm'>
        <Link href={workspaceHref}>Open Workspace</Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={searchHref}>Search Messages</Link>
      </Button>
    </>
  );
}

function RecentErrorStatus({
  hrefs,
  onRetry,
  recentThreadsError,
}: {
  hrefs: RecentStatusHrefSet;
  onRetry: () => Promise<void>;
  recentThreadsError: string;
}): React.JSX.Element {
  return (
    <RecentStatusBase variant='warning'>
      <div className='text-sm text-amber-100'>{recentThreadsError}</div>
      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={() => { void onRetry(); }}>
          Retry Recent Activity
        </Button>
        <RecentStatusLinks searchHref={hrefs.searchHref} workspaceHref={hrefs.workspaceHref} />
      </div>
    </RecentStatusBase>
  );
}

function RecentLoadingStatus({ hrefs }: { hrefs: RecentStatusHrefSet }): React.JSX.Element {
  return (
    <RecentStatusBase>
      <div className='text-sm text-gray-400'>Loading recent activity...</div>
      <div className='flex flex-wrap gap-2'>
        <RecentStatusLinks searchHref={hrefs.searchHref} workspaceHref={hrefs.workspaceHref} />
      </div>
    </RecentStatusBase>
  );
}

function RecentFilteredEmptyStatus({
  onClearFilter,
  searchHref,
}: {
  onClearFilter: () => void;
  searchHref: string;
}): React.JSX.Element {
  return (
    <RecentStatusBase>
      <div className='text-base font-semibold text-white'>No recent threads match the current filter.</div>
      <p className='text-sm text-gray-400'>
        Clear the mailbox finder query to bring recent activity back into view.
      </p>
      <div className='flex flex-wrap gap-2'>
        <Button type='button' variant='outline' size='sm' onClick={onClearFilter}>
          Clear Filter
        </Button>
        <Button asChild variant='outline' size='sm'>
          <Link href={searchHref}>Search Messages</Link>
        </Button>
      </div>
    </RecentStatusBase>
  );
}

function RecentEmptyStatus({ hrefs }: { hrefs: RecentStatusHrefSet }): React.JSX.Element {
  return (
    <RecentStatusBase>
      <div className='text-base font-semibold text-white'>No recent threads yet.</div>
      <p className='text-sm text-gray-400'>
        Sync a mailbox or open the workspace to start building recent mail activity.
      </p>
      <div className='flex flex-wrap gap-2'>
        <Button asChild variant='outline' size='sm'>
          <Link href={buildFilemakerMailSelectionHref({ panel: 'settings' })}>Add Mailbox</Link>
        </Button>
        <RecentStatusLinks searchHref={hrefs.searchHref} workspaceHref={hrefs.workspaceHref} />
      </div>
    </RecentStatusBase>
  );
}

export function MailClientRecentThreadsStatus({
  dashboardAccountId,
  dashboardQuery,
  hasActiveFilter,
  hasAnyRecentThreads,
  isLoading,
  onClearFilter,
  onRetry,
  recentThreads,
  recentThreadsError,
}: MailClientRecentThreadsStatusProps): React.JSX.Element | null {
  const focusedAccountId = dashboardAccountId === '' ? null : dashboardAccountId;
  const hrefs = {
    searchHref: buildMailClientSearchHref({ dashboardQuery, focusedAccountId }),
    workspaceHref: buildMailClientWorkspaceHref({ focusedAccountId }),
  };

  if (recentThreadsError !== null) {
    return (
      <RecentErrorStatus
        hrefs={hrefs}
        onRetry={onRetry}
        recentThreadsError={recentThreadsError}
      />
    );
  }

  if (recentThreads.length > 0) return null;
  if (isLoading) return <RecentLoadingStatus hrefs={hrefs} />;
  if (hasAnyRecentThreads && hasActiveFilter) {
    return <RecentFilteredEmptyStatus onClearFilter={onClearFilter} searchHref={hrefs.searchHref} />;
  }
  return <RecentEmptyStatus hrefs={hrefs} />;
}
