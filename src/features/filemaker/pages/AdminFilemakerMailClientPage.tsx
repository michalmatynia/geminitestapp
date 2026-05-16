'use client';

import { Mail, RefreshCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React from 'react';

import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin-filemaker-breadcrumbs';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { FocusModeTogglePortal } from '@/shared/ui/FocusModeTogglePortal';

import { buildMailClientComposeHref } from './AdminFilemakerMailClientPage.helpers';
import { useAdminFilemakerMailClientPageState } from './AdminFilemakerMailClientPage.hooks';
import { normalizeMailClientDashboardAccountId } from './AdminFilemakerMailClientPage.route';
import type { MailClientWorkspaceProps } from './AdminFilemakerMailClientPage.workspace-model';

const MailClientWorkspace = dynamic<MailClientWorkspaceProps>(
  () => import('./AdminFilemakerMailClientPage.workspace').then((mod) => mod.MailClientWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className='min-h-[calc(100vh-13rem)] border border-border/60 bg-card/15 p-4 text-sm text-muted-foreground'>
        Loading mail workspace...
      </div>
    ),
  }
);

function MailClientHeaderActions({
  router,
  composeHref,
  onRefresh,
}: {
  router: ReturnType<typeof useRouter>;
  composeHref: string;
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
      <Button
        variant='outline'
        size='sm'
        className='h-7 border border-white/20 bg-transparent text-white transition-colors hover:border-white/40 hover:bg-white/10'
        onClick={() => router.push(composeHref)}
      >
        <Mail className='mr-1 h-3 w-3' />
        Compose Email
      </Button>
    </div>
  );
}

function MailClientPageLoadAlert({
  loadError,
}: {
  loadError: string | null;
}): React.JSX.Element | null {
  if (loadError === null) return null;

  return (
    <Alert
      variant='warning'
      title='Email client data is unavailable'
      description={loadError}
    />
  );
}

export function AdminFilemakerMailClientPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isMenuHidden } = useAdminLayoutState();
  const { setIsMenuHidden } = useAdminLayoutActions();
  const state = useAdminFilemakerMailClientPageState();
  const { accounts, firstActiveAccount, loadMailboxData } = state;
  const focusedAccountId = normalizeMailClientDashboardAccountId(searchParams.get('accountId'));
  const focusedAccount = React.useMemo(
    () => accounts.find((account) => account.id === focusedAccountId) ?? null,
    [accounts, focusedAccountId]
  );
  const composeAccount =
    focusedAccount?.status === 'active' ? focusedAccount : firstActiveAccount;
  const composeHref = buildMailClientComposeHref({
    composeAccountId: composeAccount?.id ?? null,
    dashboardQuery: searchParams.get('query') ?? '',
    focusedAccountId: focusedAccount?.id ?? null,
  });

  return (
    <div className='space-y-4'>
      <FocusModeTogglePortal
        isFocusMode={isMenuHidden === false}
        onToggleFocusMode={() => { setIsMenuHidden(isMenuHidden === false); }}
      />
      <AdminTitleBreadcrumbHeader
        title={<h1 className='text-3xl font-bold tracking-tight text-white'>Mail Client</h1>}
        breadcrumb={<AdminFilemakerBreadcrumbs current='Mail Client' />}
        titleStackClassName='shrink-0 min-w-max'
        actions={
          <MailClientHeaderActions
            router={router}
            composeHref={composeHref}
            onRefresh={loadMailboxData}
          />
        }
        actionsClassName='relative z-0 min-w-0 flex-1 justify-end'
      />
      <MailClientPageLoadAlert loadError={state.loadError} />
      <MailClientWorkspace {...state} />
    </div>
  );
}
