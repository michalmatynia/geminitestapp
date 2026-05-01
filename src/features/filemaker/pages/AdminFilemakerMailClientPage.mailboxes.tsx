import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/primitives.public';

import {
  formatFilemakerMailFolderLabel,
  formatFilemakerMailLastSyncedLabel,
} from '../components/FilemakerMailSidebar.helpers';
import type { FilemakerMailAccount, FilemakerMailFolderSummary } from '../types';
import {
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
  MailClientEmptyStateCard,
  MailClientFilteredEmptyStateCard,
  MailClientLoadingCard,
  MailClientLoadErrorCard,
  MailClientMailboxFolderStatus,
  MailClientMailboxSyncStatus,
} from './AdminFilemakerMailClientPage.mailboxes-status';

type MailClientMailboxSectionProps = {
  accounts: FilemakerMailAccount[];
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  hasConfiguredAccounts: boolean;
  hasActiveFilter: boolean;
  foldersByAccount: Map<string, FilemakerMailFolderSummary[]>;
  isLoading: boolean;
  loadError: string | null;
  onClearFilter: () => void;
  onRetry: () => Promise<void>;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  syncingAccountId: string | null;
  statusUpdatingAccountId: string | null;
};

type MailClientMailboxCardProps = {
  account: FilemakerMailAccount;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  folders: FilemakerMailFolderSummary[];
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  isSyncing: boolean;
  isStatusUpdating: boolean;
};

type MailClientMailboxGridProps = Pick<
  MailClientMailboxSectionProps,
  | 'accounts'
  | 'dashboardAccountId'
  | 'dashboardQuery'
  | 'dashboardScope'
  | 'foldersByAccount'
  | 'onSyncAccount'
  | 'onToggleAccountStatus'
  | 'syncingAccountId'
  | 'statusUpdatingAccountId'
>;

type MailClientMailboxContentProps = {
  account: FilemakerMailAccount;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  folders: FilemakerMailFolderSummary[];
  primaryFolder: FilemakerMailFolderSummary | null;
  syncErrorMessage: string | null;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  isSyncing: boolean;
  isStatusUpdating: boolean;
};

function MailClientMailboxGrid({
  accounts,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  foldersByAccount,
  onSyncAccount,
  onToggleAccountStatus,
  syncingAccountId,
  statusUpdatingAccountId,
}: MailClientMailboxGridProps): React.JSX.Element {
  return (
    <div className='grid gap-4 xl:grid-cols-2'>
      {accounts.map((account) => (
        <MailClientMailboxCard
          key={account.id}
          account={account}
          dashboardAccountId={dashboardAccountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
          folders={foldersByAccount.get(account.id) ?? []}
          onSyncAccount={onSyncAccount}
          onToggleAccountStatus={onToggleAccountStatus}
          isSyncing={syncingAccountId === account.id}
          isStatusUpdating={statusUpdatingAccountId === account.id}
        />
      ))}
    </div>
  );
}

function MailClientMailboxSectionContent(props: MailClientMailboxSectionProps): React.JSX.Element {
  if (props.loadError !== null) {
    return (
      <MailClientLoadErrorCard
        dashboardAccountId={props.dashboardAccountId}
        dashboardQuery={props.dashboardQuery}
        loadError={props.loadError}
        onRetry={props.onRetry}
      />
    );
  }

  if (props.isLoading) {
    return (
      <MailClientLoadingCard
        dashboardAccountId={props.dashboardAccountId}
        dashboardQuery={props.dashboardQuery}
      />
    );
  }

  if (props.accounts.length === 0 && props.hasConfiguredAccounts && props.hasActiveFilter) {
    return (
      <MailClientFilteredEmptyStateCard
        dashboardAccountId={props.dashboardAccountId}
        dashboardQuery={props.dashboardQuery}
        onClearFilter={props.onClearFilter}
      />
    );
  }

  if (props.accounts.length === 0) return <MailClientEmptyStateCard />;

  return <MailClientMailboxGrid {...props} />;
}

function MailClientMailboxSection(props: MailClientMailboxSectionProps): React.JSX.Element {
  return (
    <section className='space-y-4'>
      <SectionHeader
        title='Mailboxes'
        description='Open a mailbox directly from Filemaker without landing in the full workspace first.'
      />
      <MailClientMailboxSectionContent {...props} />
    </section>
  );
}

function MailClientMailboxCard({
  account,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  folders,
  onSyncAccount,
  onToggleAccountStatus,
  isSyncing,
  isStatusUpdating,
}: MailClientMailboxCardProps): React.JSX.Element {
  const primaryFolder = getFilemakerMailPrimaryFolder(folders);
  const unreadCount = folders.reduce((sum, folder) => sum + folder.unreadCount, 0);
  const syncErrorMessage = hasText(account.lastSyncError) ? account.lastSyncError : null;

  return (
    <Card
      data-testid={`mail-client-account-${account.id}`}
      variant={hasFilemakerMailSyncIssue(account) ? 'warning' : 'subtle'}
      className='border-border/70'
    >
      <MailClientMailboxHeader
        account={account}
        folders={folders}
        unreadCount={unreadCount}
        primaryFolder={primaryFolder}
      />
      <MailClientMailboxContent
        account={account}
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        folders={folders}
        primaryFolder={primaryFolder}
        syncErrorMessage={syncErrorMessage}
        onSyncAccount={onSyncAccount}
        onToggleAccountStatus={onToggleAccountStatus}
        isSyncing={isSyncing}
        isStatusUpdating={isStatusUpdating}
      />
    </Card>
  );
}

function MailClientMailboxHeader({
  account,
  folders,
  unreadCount,
  primaryFolder,
}: {
  account: FilemakerMailAccount;
  folders: FilemakerMailFolderSummary[];
  unreadCount: number;
  primaryFolder: FilemakerMailFolderSummary | null;
}): React.JSX.Element {
  return (
    <CardHeader className='space-y-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='space-y-1'>
          <CardTitle className='text-lg text-white'>{account.name}</CardTitle>
          <div className='text-sm text-gray-400'>{account.emailAddress}</div>
        </div>
        <Badge variant='outline' className='capitalize'>
          {getFilemakerMailAccountStatusLabel(account)}
        </Badge>
      </div>

      <div className='flex flex-wrap gap-2'>
        <Badge variant='outline'>Folders: {folders.length}</Badge>
        <Badge variant='outline'>Unread: {unreadCount}</Badge>
        {primaryFolder !== null ? (
          <Badge variant='outline'>
            Primary: {formatFilemakerMailFolderLabel(primaryFolder.mailboxPath)}
          </Badge>
        ) : null}
      </div>
    </CardHeader>
  );
}

function MailClientMailboxContent({
  account,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  folders,
  primaryFolder,
  syncErrorMessage,
  onSyncAccount,
  onToggleAccountStatus,
  isSyncing,
  isStatusUpdating,
}: MailClientMailboxContentProps): React.JSX.Element {
  return (
    <CardContent className='space-y-4'>
      <div className='text-sm text-gray-400'>
        {formatFilemakerMailLastSyncedLabel(account.lastSyncedAt)}
      </div>

      {syncErrorMessage !== null ? (
        <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100'>
          {syncErrorMessage}
        </div>
      ) : (
        <MailClientMailboxSyncStatus
          account={account}
          dashboardQuery={dashboardQuery}
        />
      )}

      <MailClientMailboxActions
        account={account}
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        primaryFolder={primaryFolder}
        onSyncAccount={onSyncAccount}
        onToggleAccountStatus={onToggleAccountStatus}
        isSyncing={isSyncing}
        isStatusUpdating={isStatusUpdating}
      />
      {folders.length > 0 ? (
        <MailClientMailboxShortcuts accountId={account.id} folders={folders} />
      ) : (
        <MailClientMailboxFolderStatus
          accountId={account.id}
          dashboardAccountId={dashboardAccountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
        />
      )}
    </CardContent>
  );
}

export { MailClientMailboxSection };
