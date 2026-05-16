import Link from 'next/link';
import React from 'react';

import { Button, Card } from '@/shared/ui/primitives.public';

import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount } from '../types';
import {
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import { MailClientDashboardFocusButton } from './AdminFilemakerMailClientPage.mailbox-actions';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

function MailClientMailboxSyncStatus({
  account,
  dashboardQuery,
}: {
  account: FilemakerMailAccount;
  dashboardQuery: string;
}): React.JSX.Element {
  const isHealthy = account.status === 'active';
  const href = buildMailClientDashboardHref({
    accountId: account.id,
    query: dashboardQuery,
    scope: isHealthy ? 'healthy' : 'attention',
  });

  return (
    <div
      data-testid={`mail-client-mailbox-sync-status-${account.id}`}
      className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card/50 px-3 py-2'
    >
      <div className='text-sm text-gray-400'>
        {isHealthy ? 'Mailbox looks healthy. No sync errors recorded.' : 'This mailbox is currently paused.'}
      </div>
      <Button asChild variant='outline' size='sm'>
        <Link href={href}>{isHealthy ? 'Healthy Mailboxes' : 'Needs Attention'}</Link>
      </Button>
    </div>
  );
}

function MailClientMailboxFolderStatus({
  accountId,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
}: {
  accountId: string;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
}): React.JSX.Element {
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: accountId,
  });
  const workspaceHref = buildMailClientWorkspaceHref({
    focusedAccountId: accountId,
  });
  const searchLabel = dashboardQuery.trim() !== '' ? 'Continue Search' : 'Search Mailbox';

  return (
    <div
      data-testid={`mail-client-mailbox-folder-status-${accountId}`}
      className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
    >
      <div className='text-sm text-gray-400'>
        No tracked folders are available for this mailbox yet.
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button asChild variant='outline' size='sm'>
          <Link href={searchHref}>{searchLabel}</Link>
        </Button>
        <Button asChild variant='outline' size='sm'>
          <Link href={workspaceHref}>Open Workspace</Link>
        </Button>
        <MailClientDashboardFocusButton
          activeDashboardAccountId={dashboardAccountId}
          accountId={accountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
        />
      </div>
    </div>
  );
}

function MailClientLoadErrorCard({
  dashboardAccountId,
  dashboardQuery,
  loadError,
  onRetry,
}: {
  dashboardAccountId: string;
  dashboardQuery: string;
  loadError: string;
  onRetry: () => Promise<void>;
}): React.JSX.Element {
  const focusedAccountId = dashboardAccountId === '' ? null : dashboardAccountId;
  const searchHref = buildMailClientSearchHref({ dashboardQuery, focusedAccountId });
  const workspaceHref = buildMailClientWorkspaceHref({ focusedAccountId });

  return (
    <Card data-testid='mail-client-mailboxes-status' variant='warning' padding='md'>
      <div className='flex flex-col gap-3'>
        <div>
          <div className='text-sm font-semibold text-amber-50'>Mail client data could not be loaded.</div>
          <div className='text-sm text-amber-100/80'>{loadError}</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={() => { void onRetry(); }}>
            Retry
          </Button>
          <Button asChild variant='outline'>
            <Link href={workspaceHref}>Open Workspace</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href={searchHref}>Search Messages</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MailClientLoadingCard({
  dashboardAccountId,
  dashboardQuery,
}: {
  dashboardAccountId: string;
  dashboardQuery: string;
}): React.JSX.Element {
  const focusedAccountId = dashboardAccountId === '' ? null : dashboardAccountId;
  const searchHref = buildMailClientSearchHref({ dashboardQuery, focusedAccountId });
  const workspaceHref = buildMailClientWorkspaceHref({ focusedAccountId });

  return (
    <Card
      data-testid='mail-client-mailboxes-status'
      variant='subtle'
      padding='md'
      className='border-border/70 bg-card/50'
    >
      <div className='space-y-3'>
        <div className='text-sm text-gray-400'>Loading Filemaker mailboxes...</div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link href={workspaceHref}>Open Workspace</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href={searchHref}>Search Messages</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MailClientEmptyStateCard(): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/70 bg-card/50'>
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No mailboxes configured yet.</div>
        <p className='text-sm text-gray-400'>
          Create the first Filemaker mailbox from setup, then return here to monitor sync health and activity.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link href={buildFilemakerMailSelectionHref({ panel: 'settings' })}>Add Mailbox</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/admin/filemaker/mail-client'>Open Workspace</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MailClientFilteredEmptyStateCard({
  dashboardAccountId,
  dashboardQuery,
  onClearFilter,
}: {
  dashboardAccountId: string;
  dashboardQuery: string;
  onClearFilter: () => void;
}): React.JSX.Element {
  const focusedAccountId = dashboardAccountId === '' ? null : dashboardAccountId;
  const searchHref = buildMailClientSearchHref({ dashboardQuery, focusedAccountId });

  return (
    <Card
      data-testid='mail-client-mailboxes-status'
      variant='subtle'
      padding='md'
      className='border-border/70 bg-card/50'
    >
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No mailboxes match the current filter.</div>
        <p className='text-sm text-gray-400'>
          Clear the mailbox finder query to bring the full account list back.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={onClearFilter}>
            Clear Filter
          </Button>
          <Button asChild variant='outline'>
            <Link href={searchHref}>Search Messages</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export {
  MailClientEmptyStateCard,
  MailClientFilteredEmptyStateCard,
  MailClientLoadingCard,
  MailClientLoadErrorCard,
  MailClientMailboxFolderStatus,
  MailClientMailboxSyncStatus,
};
