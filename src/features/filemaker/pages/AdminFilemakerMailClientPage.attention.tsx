import Link from 'next/link';
import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, Card, CardContent } from '@/shared/ui/primitives.public';

import {
  formatFilemakerMailFolderLabel,
  formatFilemakerMailLastSyncedLabel,
} from '../components/FilemakerMailSidebar.helpers';
import { formatFilemakerMailboxAllowlist } from '../mail-utils';
import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount, FilemakerMailFolderSummary } from '../types';
import {
  getFilemakerMailPrimaryFolder,
  hasText,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import {
  MailClientDashboardFocusButton,
  MailClientStatusButton,
  MailClientSyncButton,
} from './AdminFilemakerMailClientPage.mailbox-actions';

type MailClientAttentionSectionProps = {
  attentionAccounts: FilemakerMailAccount[];
  accountCount: number;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  hasActiveFilter: boolean;
  hasAnyAttentionAccounts: boolean;
  foldersByAccount: Map<string, FilemakerMailFolderSummary[]>;
  onClearFilter: () => void;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  syncingAccountId: string | null;
  statusUpdatingAccountId: string | null;
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

function MailClientHealthyAttentionCard(): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/70 bg-card/50'>
      <div className='text-sm text-gray-400'>All connected mailboxes currently look healthy.</div>
    </Card>
  );
}

function MailClientFilteredAttentionCard({
  onClearFilter,
}: {
  onClearFilter: () => void;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border/70 bg-card/50'>
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No attention mailboxes match the current filter.</div>
        <p className='text-sm text-gray-400'>
          Clear the dashboard filter to review every paused mailbox and sync failure again.
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
        {primaryFolder !== null ? formatFilemakerMailFolderLabel(primaryFolder.mailboxPath) : 'Not set'}
      </div>
      <div>Tracked folders: {folderCount}</div>
    </div>
  );
}

function MailClientAttentionAccountActions({
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
      <Button asChild variant='outline' size='sm'>
        <Link href={buildAttentionMailboxHref(account.id, primaryFolder)}>Open Mailbox</Link>
      </Button>
      <Button asChild variant='outline' size='sm'>
        <Link
          href={buildFilemakerMailSelectionHref({
            accountId: account.id,
            panel: 'settings',
          })}
        >
          Open Settings
        </Link>
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

function MailClientAttentionAccountCard({
  account,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  folders,
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
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  isSyncing: boolean;
  isStatusUpdating: boolean;
}): React.JSX.Element {
  const primaryFolder = getFilemakerMailPrimaryFolder(folders);
  const unreadCount = folders.reduce((sum, folder) => sum + folder.unreadCount, 0);
  const allowlistLabel = account.folderAllowlist.length > 0 ? formatFilemakerMailboxAllowlist(account.folderAllowlist) : 'Auto';

  return (
    <Card data-testid={`mail-client-attention-account-${account.id}`} variant='warning' className='border-amber-500/30 bg-amber-500/5'>
      <CardContent className='space-y-4 p-4'>
        <MailClientAttentionAccountHeader account={account} unreadCount={unreadCount} />
        <MailClientAttentionAccountDetails account={account} allowlistLabel={allowlistLabel} folderCount={folders.length} primaryFolder={primaryFolder} />
        {hasText(account.lastSyncError) ? <div className='rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100'>{account.lastSyncError}</div> : null}

        <MailClientAttentionAccountActions
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
      </CardContent>
    </Card>
  );
}

function MailClientAttentionSection({
  attentionAccounts,
  accountCount,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  hasActiveFilter,
  hasAnyAttentionAccounts,
  foldersByAccount,
  onClearFilter,
  onSyncAccount,
  onToggleAccountStatus,
  syncingAccountId,
  statusUpdatingAccountId,
}: MailClientAttentionSectionProps): React.JSX.Element | null {
  if (accountCount === 0) return null;

  let content: React.JSX.Element;
  if (attentionAccounts.length === 0 && hasAnyAttentionAccounts && hasActiveFilter) {
    content = <MailClientFilteredAttentionCard onClearFilter={onClearFilter} />;
  } else if (attentionAccounts.length === 0) {
    content = <MailClientHealthyAttentionCard />;
  } else {
    content = (
      <div className='grid gap-3 xl:grid-cols-2'>
        {attentionAccounts.map((account) => (
          <MailClientAttentionAccountCard
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
        title='Needs Attention'
        description='Review paused mailboxes and sync failures directly from the standalone mail client.'
      />
      {content}
    </section>
  );
}

export { MailClientAttentionSection };
