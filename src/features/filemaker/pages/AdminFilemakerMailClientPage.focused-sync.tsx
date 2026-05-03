import Link from 'next/link';
import React from 'react';

import { Button } from '@/shared/ui/primitives.public';

import type { FilemakerMailAccount } from '../types';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

function MailClientFocusedSyncStatus({
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
      data-testid='mail-client-focused-sync-status'
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

export { MailClientFocusedSyncStatus };
