'use client';

import { Inbox, Mail, MailPlus, RefreshCcw } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'nextjs-toploader/app';
import React from 'react';

import { PanelHeader } from '@/shared/ui/templates.public';

import { buildFilemakerMailComposeHref } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import { useAdminFilemakerMailClientPageActions } from './AdminFilemakerMailClientPage.actions';
import { MailClientDashboardSections } from './AdminFilemakerMailClientPage.dashboard';
import { useAdminFilemakerMailClientPageState } from './AdminFilemakerMailClientPage.hooks';
import { normalizeMailClientDashboardAccountId } from './AdminFilemakerMailClientPage.route';

const buildMailClientHeaderActions = (
  router: ReturnType<typeof useRouter>,
  composeAccountId: string | null,
  focusedAccountId: string | null,
  onRefresh: () => Promise<void>
): Parameters<typeof PanelHeader>[0]['actions'] => [
  {
    key: 'workspace',
    label: 'Open Workspace',
    icon: <Inbox className='size-4' />,
    variant: 'outline' as const,
    onClick: () => {
      router.push(
        focusedAccountId !== null
          ? buildFilemakerMailSelectionHref({
              accountId: focusedAccountId,
              panel: 'settings',
            })
          : '/admin/filemaker/mail'
      );
    },
  },
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
      router.push(buildFilemakerMailComposeHref({ accountId: composeAccountId }));
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

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Email Client'
        description='Monitor mailbox health, open the mail workspace, and jump straight into inboxes or settings.'
        icon={<Mail className='size-4' />}
        actions={buildMailClientHeaderActions(
          router,
          composeAccount?.id ?? null,
          focusedAccount?.id ?? null,
          loadMailboxData
        )}
      />
      <MailClientDashboardSections {...state} {...actions} />
    </div>
  );
}
