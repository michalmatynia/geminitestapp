import Link from 'next/link';
import React from 'react';
import { CirclePause, CirclePlay, RefreshCcw } from 'lucide-react';

import { Button } from '@/shared/ui/primitives.public';

import { buildFilemakerMailComposeHref, formatFilemakerMailFolderLabel } from '../components/FilemakerMailSidebar.helpers';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount, FilemakerMailFolderSummary } from '../types';
import type { MailClientDashboardScope } from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

const MAILBOX_SHORTCUT_LIMIT = 4;

const buildPrimaryMailboxHref = (
  accountId: string,
  primaryFolder: FilemakerMailFolderSummary | null
): string =>
  primaryFolder !== null
    ? buildFilemakerMailSelectionHref({
        accountId,
        mailboxPath: primaryFolder.mailboxPath,
      })
    : buildFilemakerMailSelectionHref({ accountId, panel: 'settings' });

function MailClientMailboxActions({
  account,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  primaryFolder,
  onSyncAccount,
  onToggleAccountStatus,
  isSyncing,
  isStatusUpdating,
}: {
  account: FilemakerMailAccount;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  primaryFolder: FilemakerMailFolderSummary | null;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  isSyncing: boolean;
  isStatusUpdating: boolean;
}): React.JSX.Element {
  const settingsHref = buildFilemakerMailSelectionHref({
    accountId: account.id,
    panel: 'settings',
  });

  return (
    <div className='flex flex-wrap gap-2'>
      <MailClientSyncButton
        accountId={account.id}
        isSyncing={isSyncing}
        isStatusUpdating={isStatusUpdating}
        onSyncAccount={onSyncAccount}
      />
      <MailClientStatusButton
        account={account}
        isSyncing={isSyncing}
        isStatusUpdating={isStatusUpdating}
        onToggleAccountStatus={onToggleAccountStatus}
      />
      <Button asChild variant='outline' size='sm'>
        <Link href={buildPrimaryMailboxHref(account.id, primaryFolder)}>
          {primaryFolder !== null ? 'Open Inbox' : 'Open Settings'}
        </Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={settingsHref}>Settings</Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={buildFilemakerMailComposeHref({ accountId: account.id })}>Compose</Link>
      </Button>
      <MailClientDashboardFocusButton
        activeDashboardAccountId={dashboardAccountId}
        accountId={account.id}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
      />
    </div>
  );
}

function MailClientDashboardFocusButton({
  activeDashboardAccountId,
  accountId,
  dashboardQuery,
  dashboardScope,
  label,
}: {
  activeDashboardAccountId: string;
  accountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  label?: string;
}): React.JSX.Element {
  const isFocused = activeDashboardAccountId === accountId;
  const href = buildMailClientDashboardHref({
    accountId: isFocused ? '' : accountId,
    query: dashboardQuery,
    scope: dashboardScope,
  });

  return (
    <Button asChild variant='outline' size='sm'>
      <Link href={href}>{label ?? (isFocused ? 'Show All' : 'Focus')}</Link>
    </Button>
  );
}

function MailClientSyncButton({
  accountId,
  isSyncing,
  isStatusUpdating,
  onSyncAccount,
}: {
  accountId: string;
  isSyncing: boolean;
  isStatusUpdating: boolean;
  onSyncAccount: (accountId: string) => Promise<void>;
}): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      icon={<RefreshCcw className='size-3.5' />}
      loading={isSyncing}
      disabled={isStatusUpdating}
      onClick={() => { void onSyncAccount(accountId); }}
    >
      Sync
    </Button>
  );
}

function MailClientStatusButton({
  account,
  isSyncing,
  isStatusUpdating,
  onToggleAccountStatus,
}: {
  account: FilemakerMailAccount;
  isSyncing: boolean;
  isStatusUpdating: boolean;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
}): React.JSX.Element {
  const isActive = account.status === 'active';

  return (
    <Button
      type='button'
      variant='outline'
      size='sm'
      icon={isActive ? <CirclePause className='size-3.5' /> : <CirclePlay className='size-3.5' />}
      loading={isStatusUpdating}
      disabled={isSyncing}
      onClick={() => { void onToggleAccountStatus(account); }}
    >
      {isActive ? 'Pause' : 'Resume'}
    </Button>
  );
}

function MailClientMailboxShortcuts({
  accountId,
  folders,
}: {
  accountId: string;
  folders: FilemakerMailFolderSummary[];
}): React.JSX.Element {
  const visibleFolders = folders
    .slice()
    .sort((left, right) => left.mailboxPath.localeCompare(right.mailboxPath))
    .slice(0, MAILBOX_SHORTCUT_LIMIT);

  return (
    <div className='space-y-2'>
      <div className='text-xs uppercase tracking-[0.18em] text-gray-500'>Folder Shortcuts</div>
      <div className='flex flex-wrap gap-2'>
        {visibleFolders.map((folder) => (
          <Button key={folder.id} asChild variant='outline' size='sm'>
            <Link
              href={buildFilemakerMailSelectionHref({
                accountId,
                mailboxPath: folder.mailboxPath,
              })}
            >
              {formatFilemakerMailFolderLabel(folder.mailboxPath)}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}

export {
  MailClientMailboxActions,
  MailClientMailboxShortcuts,
  MailClientDashboardFocusButton,
  MailClientStatusButton,
  MailClientSyncButton,
};
