'use client';

import { LayoutDashboard, Mail, MailPlus, RefreshCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React from 'react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/primitives.public';
import { PanelHeader } from '@/shared/ui/templates.public';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
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

const buildMailClientHeaderActions = (
  router: ReturnType<typeof useRouter>,
  composeHref: string,
  onRefresh: () => Promise<void>
): Parameters<typeof PanelHeader>[0]['actions'] => [
  {
    key: 'add-mailbox',
    label: 'Add Mailbox',
    icon: <MailPlus className='size-4' />,
    variant: 'outline' as const,
    onClick: () => {
      router.push(buildFilemakerMailSelectionHref({ panel: 'settings' }));
    },
  },
  {
    key: 'compose',
    label: 'Compose',
    icon: <MailPlus className='size-4' />,
    variant: 'outline' as const,
    onClick: () => {
      router.push(composeHref);
    },
  },
  {
    key: 'refresh',
    label: 'Refresh',
    icon: <RefreshCcw className='size-4' />,
    variant: 'outline' as const,
    onClick: () => {
      void onRefresh();
    },
  },
  ...buildFilemakerNavActions(router, 'mail'),
];

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

export function AdminFilemakerMailClientPage(): React.JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    <div className='page-section-compact space-y-4'>
      <PanelHeader
        title='Filemaker Email Client'
        description='Browse accounts, scan synced email lists, and reply from the reader/editor workspace.'
        icon={<Mail className='size-4' />}
        actions={buildMailClientHeaderActions(
          router,
          composeHref,
          loadMailboxData
        )}
      />
      <MailClientPageTabs
        actions={actions}
        activeTab={activeTab}
        state={state}
        onTabChange={handleTabChange}
      />
    </div>
  );
}
