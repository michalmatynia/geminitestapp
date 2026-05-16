'use client';

import { RefreshCcw } from 'lucide-react';
import React from 'react';

import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Button } from '@/shared/ui/button';
import { Alert } from '@/shared/ui/primitives.public';

import { useAdminFilemakerMailClientPageActions } from './AdminFilemakerMailClientPage.actions';
import { MailClientDashboardSections } from './AdminFilemakerMailClientPage.dashboard';
import { useAdminFilemakerMailClientPageState } from './AdminFilemakerMailClientPage.hooks';

function EmailDashboardHeaderActions({
  onRefresh,
}: {
  onRefresh: () => Promise<void>;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-center gap-1'>
      <Button
        onClick={() => { void onRefresh(); }}
        variant='outline'
        aria-label='Refresh'
        title='Refresh'
        className='h-7 w-7 rounded-full border border-white/20 bg-transparent p-0 text-white transition-colors hover:border-white/40 hover:bg-white/10'
      >
        <RefreshCcw className='h-3 w-3' />
      </Button>
    </div>
  );
}

export function AdminFilemakerEmailDashboardPage(): React.JSX.Element {
  const state = useAdminFilemakerMailClientPageState();
  const actions = useAdminFilemakerMailClientPageActions({ onReload: state.loadMailboxData });

  return (
    <div className='space-y-4'>
      <AdminTitleBreadcrumbHeader
        title={<h1 className='text-3xl font-bold tracking-tight text-white'>Email Dashboard</h1>}
        breadcrumb={<AdminFilemakerBreadcrumbs current='Email Dashboard' />}
        titleStackClassName='shrink-0 min-w-max'
        actions={<EmailDashboardHeaderActions onRefresh={state.loadMailboxData} />}
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end'
      />
      {state.loadError !== null && (
        <Alert
          variant='warning'
          title='Email dashboard data is unavailable'
          description={state.loadError}
        />
      )}
      <MailClientDashboardSections {...state} {...actions} />
    </div>
  );
}
