'use client';

import { LayoutDashboard, Mail, RefreshCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React from 'react';

import { useAdminLayoutActions, useAdminLayoutState } from '@/shared/providers/AdminLayoutProvider';
import { AdminFilemakerBreadcrumbs } from '@/shared/ui/admin.public';
import { AdminTitleBreadcrumbHeader } from '@/shared/ui/admin-title-breadcrumb-header';
import { Button } from '@/shared/ui/button';
import { FocusModeTogglePortal } from '@/shared/ui/navigation-and-layout.public';
import { Alert, Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';

import { useAdminFilemakerMailClientPageActions } from './AdminFilemakerMailClientPage.actions';
import { MailClientDashboardSections } from './AdminFilemakerMailClientPage.dashboard';
import { buildMailClientComposeHref } from './AdminFilemakerMailClientPage.helpers';
import { useAdminFilemakerMailClientPageState } from './AdminFilemakerMailClientPage.hooks';
import { normalizeMailClientDashboardAccountId } from './AdminFilemakerMailClientPage.route';
import { MailClientWorkspace } from './AdminFilemakerMailClientPage.workspace';

type MailClientPageTab = 'client' | 'overview';

const parseMailClientPageTab = (rawTab: string | null): MailClientPageTab =>
  rawTab === 'overview' ? 'overview' : 'client';

const setSearchParamIfPresent = (
  search: URLSearchParams,
  key: string,
  value: string | null
): void => {
  if (typeof value === 'string' && value.trim() !== '') search.set(key, value.trim());
};

const buildMailClientTabHref = (
  tab: MailClientPageTab,
  params: {
    accountId: string | null;
    mailboxPath: string | null;
    query: string | null;
    scope: string | null;
    threadId: string | null;
  }
): string => {
  const search = new URLSearchParams();
  if (tab === 'overview') search.set('tab', 'overview');
  setSearchParamIfPresent(search, 'accountId', params.accountId);
  if (tab === 'client') {
    setSearchParamIfPresent(search, 'mailboxPath', params.mailboxPath);
    setSearchParamIfPresent(search, 'threadId', params.threadId);
  } else {
    setSearchParamIfPresent(search, 'scope', params.scope);
    setSearchParamIfPresent(search, 'query', params.query);
  }
  const nextSearch = search.toString();
  return nextSearch === '' ? '/admin/filemaker/mail-client' : `/admin/filemaker/mail-client?${nextSearch}`;
};

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

function MailClientPageTabs({
  actions,
  activeTab,
  state,
  onTabChange,
}: {
  actions: ReturnType<typeof useAdminFilemakerMailClientPageActions>;
  activeTab: MailClientPageTab;
  state: ReturnType<typeof useAdminFilemakerMailClientPageState>;
  onTabChange: (value: string) => void;
}): React.JSX.Element {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className='space-y-4'>
      <TabsList aria-label='Filemaker email client tabs' className='bg-card/40'>
        <TabsTrigger value='client' className='gap-2'>
          <Mail className='size-4' />
          Email Client
        </TabsTrigger>
        <TabsTrigger value='overview' className='gap-2'>
          <LayoutDashboard className='size-4' />
          Overview
        </TabsTrigger>
      </TabsList>
      <TabsContent value='client' className='m-0 outline-none'>
        <MailClientWorkspace {...state} />
      </TabsContent>
      <TabsContent value='overview' className='m-0 space-y-6 outline-none'>
        <MailClientDashboardSections {...state} {...actions} />
      </TabsContent>
    </Tabs>
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
  const actions = useAdminFilemakerMailClientPageActions({
    onReload: loadMailboxData,
  });
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
  const activeTab = parseMailClientPageTab(searchParams.get('tab'));
  const tabRouteParams = React.useMemo(
    () => ({
      accountId: searchParams.get('accountId'),
      mailboxPath: searchParams.get('mailboxPath'),
      query: searchParams.get('query'),
      scope: searchParams.get('scope'),
      threadId: searchParams.get('threadId'),
    }),
    [searchParams]
  );
  const handleTabChange = React.useCallback(
    (value: string): void => {
      const nextTab = parseMailClientPageTab(value);
      router.replace(buildMailClientTabHref(nextTab, tabRouteParams));
    },
    [router, tabRouteParams]
  );

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
      <MailClientPageTabs
        actions={actions}
        activeTab={activeTab}
        state={state}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
