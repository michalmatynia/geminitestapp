import Link from 'next/link';
import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/primitives.public';

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
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import {
  MailClientMailboxActions,
  MailClientMailboxShortcuts,
} from './AdminFilemakerMailClientPage.mailbox-actions';

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

function MailClientMailboxSection({
  accounts,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  hasConfiguredAccounts,
  hasActiveFilter,
  foldersByAccount,
  isLoading,
  loadError,
  onClearFilter,
  onRetry,
  onSyncAccount,
  onToggleAccountStatus,
  syncingAccountId,
  statusUpdatingAccountId,
}: MailClientMailboxSectionProps): React.JSX.Element {
  let content: React.JSX.Element;

  if (loadError !== null) {
    content = <MailClientLoadErrorCard loadError={loadError} onRetry={onRetry} />;
  } else if (isLoading) {
    content = <MailClientLoadingCard />;
  } else if (accounts.length === 0 && hasConfiguredAccounts && hasActiveFilter) {
    content = <MailClientFilteredEmptyStateCard onClearFilter={onClearFilter} />;
  } else if (accounts.length === 0) {
    content = <MailClientEmptyStateCard />;
  } else {
    content = (
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

  return (
    <section className='space-y-4'>
      <SectionHeader
        title='Mailboxes'
        description='Open a mailbox directly from Filemaker without landing in the full workspace first.'
      />
      {content}
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
}: {
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
}): React.JSX.Element {
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
        <div className='text-sm text-gray-500'>No sync errors recorded.</div>
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
      {folders.length > 0 ? <MailClientMailboxShortcuts accountId={account.id} folders={folders} /> : null}
    </CardContent>
  );
}

function MailClientLoadErrorCard({
  loadError,
  onRetry,
}: {
  loadError: string;
  onRetry: () => Promise<void>;
}): React.JSX.Element {
  return (
    <Card variant='warning' padding='md'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <div className='text-sm font-semibold text-amber-50'>Mail client data could not be loaded.</div>
          <div className='text-sm text-amber-100/80'>{loadError}</div>
        </div>
        <Button type='button' variant='outline' onClick={() => { void onRetry(); }}>
          Retry
        </Button>
      </div>
    </Card>
  );
}

function MailClientLoadingCard(): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/70 bg-card/50 text-sm text-gray-400'>
      Loading Filemaker mailboxes...
    </Card>
  );
}

function MailClientEmptyStateCard(): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/70 bg-card/50'>
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No mailboxes configured yet.</div>
        <p className='text-sm text-gray-400'>
          Create the first Filemaker mailbox from setup, then return here to monitor sync health and activity.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link href={buildFilemakerMailSelectionHref({ panel: 'settings' })}>Add Mailbox</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href='/admin/filemaker/mail'>Open Workspace</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MailClientFilteredEmptyStateCard({
  onClearFilter,
}: {
  onClearFilter: () => void;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/70 bg-card/50'>
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No mailboxes match the current filter.</div>
        <p className='text-sm text-gray-400'>
          Clear the mailbox finder query to bring the full account list back.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={onClearFilter}>
            Clear Filter
          </Button>
        </div>
      </div>
    </Card>
  );
}

export { MailClientMailboxSection };
