import Link from 'next/link';
import React from 'react';

import { Badge, Button, Card, CardContent } from '@/shared/ui/primitives.public';

import {
  formatFilemakerMailFolderLabel,
  formatFilemakerMailLastSyncedLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount, FilemakerMailFolderSummary } from '../types';
import {
  buildMailClientComposeHref,
  buildMailClientSearchHref,
  getFilemakerMailPrimaryFolder,
  hasText,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import {
  MailClientDashboardFocusButton,
  MailClientStatusButton,
  MailClientSyncButton,
} from './AdminFilemakerMailClientPage.mailbox-actions';

type MailClientAttentionAccountCardProps = {
  account: FilemakerMailAccount;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  firstActiveAccountId: string | null;
  folders: FilemakerMailFolderSummary[];
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  isSyncing: boolean;
  isStatusUpdating: boolean;
};

type MailClientAttentionAccountActionsProps = Omit<
  MailClientAttentionAccountCardProps,
  'folders'
> & {
  primaryFolder: FilemakerMailFolderSummary | null;
};

type MailClientAttentionAccountLinkActionsProps = {
  accountId: string;
  composeHref: string;
  primaryFolder: FilemakerMailFolderSummary | null;
  searchHref: string;
  searchLabel: string;
};

const buildAttentionMailboxHref = (
  accountId: string,
  primaryFolder: FilemakerMailFolderSummary | null
): string =>
  primaryFolder !== null
    ? buildFilemakerMailSelectionHref({
        accountId,
        mailboxPath: primaryFolder.mailboxPath,
      })
    : buildFilemakerMailSelectionHref({ accountId, panel: 'settings' });

function MailClientAttentionAccountHeader({
  account,
  unreadCount,
}: {
  account: FilemakerMailAccount;
  unreadCount: number;
}): React.JSX.Element {
  return (
    <div className='flex flex-wrap items-start justify-between gap-3'>
      <div className='space-y-1'>
        <div className='text-sm font-semibold text-white'>{account.name}</div>
        <div className='text-xs text-gray-400'>{account.emailAddress}</div>
      </div>
      <div className='flex flex-wrap gap-2'>
        {account.status !== 'active' ? (
          <Badge variant='outline' className='capitalize'>
            {account.status}
          </Badge>
        ) : null}
        {hasText(account.lastSyncError) ? <Badge variant='outline'>Sync error</Badge> : null}
        <Badge variant='outline'>Unread: {unreadCount}</Badge>
      </div>
    </div>
  );
}

function MailClientAttentionAccountDetails({
  account,
  allowlistLabel,
  folderCount,
  primaryFolder,
}: {
  account: FilemakerMailAccount;
  allowlistLabel: string;
  folderCount: number;
  primaryFolder: FilemakerMailFolderSummary | null;
}): React.JSX.Element {
  return (
    <div className='grid gap-2 text-xs text-gray-400 md:grid-cols-2'>
      <div>{formatFilemakerMailLastSyncedLabel(account.lastSyncedAt)}</div>
      <div>Allowlist: {allowlistLabel}</div>
      <div>
        Primary folder:{' '}
        {primaryFolder !== null
          ? formatFilemakerMailFolderLabel(primaryFolder.mailboxPath, primaryFolder.mailboxRole)
          : 'Not set'}
      </div>
      <div>Tracked folders: {folderCount}</div>
    </div>
  );
}

function MailClientAttentionAccountLinkActions({
  accountId,
  composeHref,
  primaryFolder,
  searchHref,
  searchLabel,
}: MailClientAttentionAccountLinkActionsProps): React.JSX.Element {
  return (
    <>
      <Button asChild variant='outline' size='sm'>
        <Link href={buildAttentionMailboxHref(accountId, primaryFolder)}>Open Mailbox</Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={searchHref}>{searchLabel}</Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={buildFilemakerMailSelectionHref({ accountId, panel: 'settings' })}>
          Open Settings
        </Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link href={composeHref}>Compose</Link>
      </Button>
    </>
  );
}

function MailClientAttentionAccountActions({
  account,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  firstActiveAccountId,
  primaryFolder,
  onSyncAccount,
  onToggleAccountStatus,
  isSyncing,
  isStatusUpdating,
}: MailClientAttentionAccountActionsProps): React.JSX.Element {
  const composeHref = buildMailClientComposeHref({
    composeAccountId: account.status === 'active' ? account.id : firstActiveAccountId,
    dashboardQuery,
    focusedAccountId: account.id,
  });
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: account.id,
  });
  const searchLabel = dashboardQuery.trim() !== '' ? 'Continue Search' : 'Search Mailbox';

  return (
    <div className='flex flex-wrap gap-2'>
      <MailClientSyncButton
        accountId={account.id}
        isSyncing={isSyncing}
        isStatusUpdating={isStatusUpdating}
        onSyncAccount={onSyncAccount}
      />
      {account.status !== 'active' ? (
        <MailClientStatusButton
          account={account}
          isSyncing={isSyncing}
          isStatusUpdating={isStatusUpdating}
          onToggleAccountStatus={onToggleAccountStatus}
        />
      ) : null}
      <MailClientAttentionAccountLinkActions
        accountId={account.id}
        composeHref={composeHref}
        primaryFolder={primaryFolder}
        searchHref={searchHref}
        searchLabel={searchLabel}
      />
      <MailClientDashboardFocusButton
        activeDashboardAccountId={dashboardAccountId}
        accountId={account.id}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
      />
    </div>
  );
}

function MailClientAttentionAccountCard({
  account,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  firstActiveAccountId,
  folders,
  onSyncAccount,
  onToggleAccountStatus,
  isSyncing,
  isStatusUpdating,
}: MailClientAttentionAccountCardProps): React.JSX.Element {
  const primaryFolder = getFilemakerMailPrimaryFolder(folders);
  const unreadCount = folders.reduce((sum, folder) => sum + folder.unreadCount, 0);
  const allowlistLabel =
    account.folderAllowlist.length > 0
      ? formatFilemakerMailboxAllowlist(account.folderAllowlist)
      : 'Auto';

  return (
    <Card
      data-testid={`mail-client-attention-account-${account.id}`}
      variant='warning'
      className='border-amber-500/30 bg-amber-500/5'
    >
      <CardContent className='space-y-4 p-4'>
        <MailClientAttentionAccountHeader account={account} unreadCount={unreadCount} />
        <MailClientAttentionAccountDetails
          account={account}
          allowlistLabel={allowlistLabel}
          folderCount={folders.length}
          primaryFolder={primaryFolder}
        />
        {hasText(account.lastSyncError) ? (
          <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100'>
            {account.lastSyncError}
          </div>
        ) : null}
        <MailClientAttentionAccountActions
          account={account}
          dashboardAccountId={dashboardAccountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
          firstActiveAccountId={firstActiveAccountId}
          primaryFolder={primaryFolder}
          onSyncAccount={onSyncAccount}
          onToggleAccountStatus={onToggleAccountStatus}
          isSyncing={isSyncing}
          isStatusUpdating={isStatusUpdating}
        />
      </CardContent>
    </Card>
  );
}

export { MailClientAttentionAccountCard };
