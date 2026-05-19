import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Card, CardContent } from '@/shared/ui/primitives.public';
import {
  formatFilemakerMailFolderLabel,
  formatFilemakerMailLastSyncedLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';
import type {
  FilemakerMailAccount,
  FilemakerMailFolderSummary,
  FilemakerMailThread,
} from '../types';
import {
  buildMailClientComposeHref,
  getFilemakerMailAccountStatusLabel,
  getFilemakerMailPrimaryFolder,
  hasFilemakerMailSyncIssue,
  hasText,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import {
  MailClientMailboxActions,
  MailClientMailboxShortcuts,
} from './AdminFilemakerMailClientPage.mailbox-actions';
import {
  getFocusedFolderSnapshot,
  MailClientFocusedFolderSnapshot,
  MailClientFocusedFolderStatus,
} from './AdminFilemakerMailClientPage.focused-folders';
import {
  getFocusedRecentThreads,
  MailClientFocusedRecentThreads,
} from './AdminFilemakerMailClientPage.focused-recent';
import { MailClientFocusedSyncStatus } from './AdminFilemakerMailClientPage.focused-sync';
import { MailClientAccountCampaignsPanel } from './AdminFilemakerMailClientPage.account-campaigns';

type MailClientFocusedAccountSectionProps = {
  account: FilemakerMailAccount | null;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  fallbackComposeAccountId: string | null;
  folders: FilemakerMailFolderSummary[];
  recentThreads: FilemakerMailThread[];
  isSyncing: boolean;
  isStatusUpdating: boolean;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
};

type MailClientFocusedAccountCardProps = Omit<
  MailClientFocusedAccountSectionProps,
  'account'
> & {
  account: FilemakerMailAccount;
};

function MailClientFocusedAccountSummary({
  account,
  folders,
  primaryFolder,
  unreadCount,
  allowlistLabel,
}: {
  account: FilemakerMailAccount;
  folders: FilemakerMailFolderSummary[];
  primaryFolder: FilemakerMailFolderSummary | null;
  unreadCount: number;
  allowlistLabel: string;
}): React.JSX.Element {
  return (
    <>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <div className='text-base font-semibold text-white'>{account.name}</div>
          <div className='text-sm text-gray-400'>{account.emailAddress}</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Badge variant='outline'>Focused mailbox</Badge>
          <Badge variant='outline' className='capitalize'>
            {getFilemakerMailAccountStatusLabel(account)}
          </Badge>
          <Badge variant='outline'>Unread: {unreadCount}</Badge>
        </div>
      </div>

      <div className='grid gap-2 text-sm text-gray-400 md:grid-cols-2'>
        <div>{formatFilemakerMailLastSyncedLabel(account.lastSyncedAt)}</div>
        <div>Tracked folders: {folders.length}</div>
        <div>
          Primary folder:{' '}
          {primaryFolder !== null
            ? formatFilemakerMailFolderLabel(primaryFolder.mailboxPath, primaryFolder.mailboxRole)
            : 'Not set'}
        </div>
        <div>Allowlist: {allowlistLabel}</div>
      </div>
    </>
  );
}

function MailClientFocusedFolderPanel({
  accountId,
  dashboardQuery,
  dashboardScope,
  folders,
  folderSnapshot,
  primaryFolder,
}: {
  accountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  folders: FilemakerMailFolderSummary[];
  folderSnapshot: FilemakerMailFolderSummary[];
  primaryFolder: FilemakerMailFolderSummary | null;
}): React.JSX.Element {
  return folders.length > 0 ? (
    <MailClientFocusedFolderSnapshot
      accountId={accountId}
      folders={folderSnapshot}
      primaryFolder={primaryFolder}
    />
  ) : (
    <MailClientFocusedFolderStatus
      accountId={accountId}
      dashboardQuery={dashboardQuery}
      dashboardScope={dashboardScope}
    />
  );
}

function MailClientFocusedAccountControls({
  account,
  composeHref,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  primaryFolder,
  syncErrorMessage,
  onSyncAccount,
  onToggleAccountStatus,
  isSyncing,
  isStatusUpdating,
}: {
  account: FilemakerMailAccount;
  composeHref: string;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  primaryFolder: FilemakerMailFolderSummary | null;
  syncErrorMessage: string | null;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  isSyncing: boolean;
  isStatusUpdating: boolean;
}): React.JSX.Element {
  return (
    <>
      {syncErrorMessage !== null ? (
        <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100'>
          {syncErrorMessage}
        </div>
      ) : (
        <MailClientFocusedSyncStatus account={account} dashboardQuery={dashboardQuery} />
      )}
      <MailClientMailboxActions
        account={account}
        composeHref={composeHref}
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        primaryFolder={primaryFolder}
        onSyncAccount={onSyncAccount}
        onToggleAccountStatus={onToggleAccountStatus}
        isSyncing={isSyncing}
        isStatusUpdating={isStatusUpdating}
      />
    </>
  );
}

function MailClientFocusedAccountRelatedContent({
  accountId,
  dashboardQuery,
  dashboardScope,
  folders,
  folderSnapshot,
  focusedRecentThreads,
  primaryFolder,
}: {
  accountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  folders: FilemakerMailFolderSummary[];
  folderSnapshot: FilemakerMailFolderSummary[];
  focusedRecentThreads: FilemakerMailThread[];
  primaryFolder: FilemakerMailFolderSummary | null;
}): React.JSX.Element {
  return (
    <>
      <MailClientFocusedRecentThreads
        accountId={accountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        recentThreads={focusedRecentThreads}
      />
      <MailClientFocusedFolderPanel
        accountId={accountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        folders={folders}
        folderSnapshot={folderSnapshot}
        primaryFolder={primaryFolder}
      />
      {folders.length > 0 ? <MailClientMailboxShortcuts accountId={accountId} folders={folders} /> : null}
      <MailClientAccountCampaignsPanel accountId={accountId} />
    </>
  );
}

function MailClientFocusedAccountCard(
  props: MailClientFocusedAccountCardProps
): React.JSX.Element {
  const { account, dashboardQuery, fallbackComposeAccountId, folders, recentThreads } = props;
  const primaryFolder = getFilemakerMailPrimaryFolder(folders);
  const folderSnapshot = getFocusedFolderSnapshot(folders);
  const focusedRecentThreads = getFocusedRecentThreads(recentThreads);
  const unreadCount = folders.reduce((sum, folder) => sum + folder.unreadCount, 0);
  const allowlistLabel = account.folderAllowlist.length > 0
    ? formatFilemakerMailboxAllowlist(account.folderAllowlist)
    : 'Auto';
  const composeHref = buildMailClientComposeHref({
    composeAccountId: account.status === 'active' ? account.id : fallbackComposeAccountId,
    dashboardQuery,
    focusedAccountId: account.id,
  });
  const syncErrorMessage = hasText(account.lastSyncError) ? account.lastSyncError : null;

  return (
    <Card
      data-testid={`mail-client-focused-account-${account.id}`}
      variant={hasFilemakerMailSyncIssue(account) ? 'warning' : 'subtle'}
      className='border-border/70'
    >
      <CardContent className='space-y-4 p-4'>
        <MailClientFocusedAccountSummary
          account={account}
          folders={folders}
          primaryFolder={primaryFolder}
          unreadCount={unreadCount}
          allowlistLabel={allowlistLabel}
        />
        <MailClientFocusedAccountControls
          {...props}
          composeHref={composeHref}
          primaryFolder={primaryFolder}
          syncErrorMessage={syncErrorMessage}
        />
        <MailClientFocusedAccountRelatedContent
          {...props}
          accountId={account.id}
          folderSnapshot={folderSnapshot}
          focusedRecentThreads={focusedRecentThreads}
          primaryFolder={primaryFolder}
        />
      </CardContent>
    </Card>
  );
}

function MailClientFocusedAccountSection(
  props: MailClientFocusedAccountSectionProps
): React.JSX.Element | null {
  if (props.account === null) return null;

  return (
    <section className='space-y-4'>
      <SectionHeader
        title='Focused Mailbox'
        description='The dashboard is scoped to a single mailbox. Review connection health here or jump back to the full view.'
      />
      <MailClientFocusedAccountCard {...props} account={props.account} />
    </section>
  );
}

export { MailClientFocusedAccountSection };
