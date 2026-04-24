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
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  getFilemakerMailAccountStatusLabel,
  getFilemakerMailPrimaryFolder,
  hasFilemakerMailSyncIssue,
  hasText,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import {
  MailClientMailboxActions,
  MailClientDashboardFocusButton,
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
    content = (
      <MailClientLoadErrorCard
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        loadError={loadError}
        onRetry={onRetry}
      />
    );
  } else if (isLoading) {
    content = (
      <MailClientLoadingCard
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
      />
    );
  } else if (accounts.length === 0 && hasConfiguredAccounts && hasActiveFilter) {
    content = (
      <MailClientFilteredEmptyStateCard
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        onClearFilter={onClearFilter}
      />
    );
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

function MailClientMailboxSyncStatus({
  account,
  dashboardQuery,
}: {
  account: FilemakerMailAccount;
  dashboardQuery: string;
}): React.JSX.Element {
  const isHealthy = account.status === 'active';
  const href = buildMailClientDashboardHref({
    accountId: account.id,
    query: dashboardQuery,
    scope: isHealthy ? 'healthy' : 'attention',
  });

  return (
    <div
      data-testid={`mail-client-mailbox-sync-status-${account.id}`}
      className='flex flex-wrap items-center justify-between gap-3 rounded-md border border-border/70 bg-card/50 px-3 py-2'
    >
      <div className='text-sm text-gray-400'>
        {isHealthy ? 'Mailbox looks healthy. No sync errors recorded.' : 'This mailbox is currently paused.'}
      </div>
      <Button asChild variant='outline' size='sm'>
        <Link href={href}>{isHealthy ? 'Healthy Mailboxes' : 'Needs Attention'}</Link>
      </Button>
    </div>
  );
}

function MailClientMailboxFolderStatus({
  accountId,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
}: {
  accountId: string;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
}): React.JSX.Element {
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: accountId,
  });
  const workspaceHref = buildMailClientWorkspaceHref({
    focusedAccountId: accountId,
  });
  const searchLabel = dashboardQuery.trim() !== '' ? 'Continue Search' : 'Search Mailbox';

  return (
    <div
      data-testid={`mail-client-mailbox-folder-status-${accountId}`}
      className='space-y-3 rounded-lg border border-border/70 bg-card/50 p-3'
    >
      <div className='text-sm text-gray-400'>
        No tracked folders are available for this mailbox yet.
      </div>
      <div className='flex flex-wrap gap-2'>
        <Button asChild variant='outline' size='sm'>
          <Link href={searchHref}>{searchLabel}</Link>
        </Button>
        <Button asChild variant='outline' size='sm'>
          <Link href={workspaceHref}>Open Workspace</Link>
        </Button>
        <MailClientDashboardFocusButton
          activeDashboardAccountId={dashboardAccountId}
          accountId={accountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
        />
      </div>
    </div>
  );
}

function MailClientLoadErrorCard({
  dashboardAccountId,
  dashboardQuery,
  loadError,
  onRetry,
}: {
  dashboardAccountId: string;
  dashboardQuery: string;
  loadError: string;
  onRetry: () => Promise<void>;
}): React.JSX.Element {
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: dashboardAccountId === '' ? null : dashboardAccountId,
  });
  const workspaceHref = buildMailClientWorkspaceHref({
    focusedAccountId: dashboardAccountId === '' ? null : dashboardAccountId,
  });

  return (
    <Card data-testid='mail-client-mailboxes-status' variant='warning' padding='md'>
      <div className='flex flex-col gap-3'>
        <div>
          <div className='text-sm font-semibold text-amber-50'>Mail client data could not be loaded.</div>
          <div className='text-sm text-amber-100/80'>{loadError}</div>
        </div>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={() => { void onRetry(); }}>
            Retry
          </Button>
          <Button asChild variant='outline'>
            <Link href={workspaceHref}>Open Workspace</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href={searchHref}>Search Messages</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MailClientLoadingCard({
  dashboardAccountId,
  dashboardQuery,
}: {
  dashboardAccountId: string;
  dashboardQuery: string;
}): React.JSX.Element {
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: dashboardAccountId === '' ? null : dashboardAccountId,
  });
  const workspaceHref = buildMailClientWorkspaceHref({
    focusedAccountId: dashboardAccountId === '' ? null : dashboardAccountId,
  });

  return (
    <Card
      data-testid='mail-client-mailboxes-status'
      variant='subtle'
      padding='md'
      className='border-border/70 bg-card/50'
    >
      <div className='space-y-3'>
        <div className='text-sm text-gray-400'>Loading Filemaker mailboxes...</div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline'>
            <Link href={workspaceHref}>Open Workspace</Link>
          </Button>
          <Button asChild variant='outline'>
            <Link href={searchHref}>Search Messages</Link>
          </Button>
        </div>
      </div>
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
  dashboardAccountId,
  dashboardQuery,
  onClearFilter,
}: {
  dashboardAccountId: string;
  dashboardQuery: string;
  onClearFilter: () => void;
}): React.JSX.Element {
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: dashboardAccountId === '' ? null : dashboardAccountId,
  });

  return (
    <Card
      data-testid='mail-client-mailboxes-status'
      variant='subtle'
      padding='md'
      className='border-border/70 bg-card/50'
    >
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No mailboxes match the current filter.</div>
        <p className='text-sm text-gray-400'>
          Clear the mailbox finder query to bring the full account list back.
        </p>
        <div className='flex flex-wrap gap-2'>
          <Button type='button' variant='outline' onClick={onClearFilter}>
            Clear Filter
          </Button>
          <Button asChild variant='outline'>
            <Link href={searchHref}>Search Messages</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export { MailClientMailboxSection };
