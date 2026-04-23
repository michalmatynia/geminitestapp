'use client';

import { Inbox, Mail, MailPlus, RefreshCcw } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React from 'react';

import { PanelHeader } from '@/shared/ui/templates.public';

import { buildFilemakerMailComposeHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { useAdminFilemakerMailClientPageActions } from './AdminFilemakerMailClientPage.actions';
import { MailClientDashboardSections } from './AdminFilemakerMailClientPage.dashboard';
import { useAdminFilemakerMailClientPageState } from './AdminFilemakerMailClientPage.hooks';

const buildMailClientHeaderActions = (
  router: ReturnType<typeof useRouter>,
  firstActiveAccountId: string | null,
  onRefresh: () => Promise<void>
): Parameters<typeof PanelHeader>[0]['actions'] => [
  {
    key: 'workspace',
    label: 'Open Workspace',
    icon: <Inbox className='size-4' />,
    variant: 'outline' as const,
    onClick: () => { router.push('/admin/filemaker/mail'); },
  },
  {
    key: 'compose',
    label: 'Compose',
    icon: <MailPlus className='size-4' />,
    variant: 'outline' as const,
    onClick: () => {
      router.push(buildFilemakerMailComposeHref({ accountId: firstActiveAccountId }));
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

export function AdminFilemakerMailClientPage(): React.JSX.Element {
  const router = useRouter();
  const state = useAdminFilemakerMailClientPageState();
  const { firstActiveAccount, loadMailboxData } = state;
  const actions = useAdminFilemakerMailClientPageActions({
    onReload: loadMailboxData,
  });

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Email Client'
        description='Monitor mailbox health, open the mail workspace, and jump straight into inboxes or settings.'
        icon={<Mail className='size-4' />}
        actions={buildMailClientHeaderActions(router, firstActiveAccount?.id ?? null, loadMailboxData)}
      />
      <MailClientDashboardSections {...state} {...actions} />
    </div>
  );
}
