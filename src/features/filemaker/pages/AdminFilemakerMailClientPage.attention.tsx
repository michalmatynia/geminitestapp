import Link from 'next/link';
import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { Button, Card } from '@/shared/ui/primitives.public';

import type { FilemakerMailAccount, FilemakerMailFolderSummary } from '../types';
import {
  buildMailClientWorkspaceHref,
  buildMailClientSearchHref,
  type MailClientDashboardScope,
} from './AdminFilemakerMailClientPage.helpers';
import { MailClientAttentionAccountCard } from './AdminFilemakerMailClientPage.attention-accounts';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

type MailClientAttentionSectionProps = {
  attentionAccounts: FilemakerMailAccount[];
  accountCount: number;
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  firstActiveAccountId: string | null;
  hasActiveFilter: boolean;
  hasAnyAttentionAccounts: boolean;
  foldersByAccount: Map<string, FilemakerMailFolderSummary[]>;
  onClearFilter: () => void;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
  syncingAccountId: string | null;
  statusUpdatingAccountId: string | null;
};

function MailClientHealthyAttentionCard({
  dashboardAccountId,
  dashboardQuery,
}: {
  dashboardAccountId: string;
  dashboardQuery: string;
}): React.JSX.Element {
  const focusedAccountId = dashboardAccountId === '' ? null : dashboardAccountId;
  const healthyHref = buildMailClientDashboardHref({
    accountId: dashboardAccountId,
    query: dashboardQuery,
    scope: 'healthy',
  });
  const workspaceHref = buildMailClientWorkspaceHref({
    focusedAccountId,
  });
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId,
  });
  const searchLabel = dashboardQuery.trim() !== '' ? 'Continue Search' : 'Search Messages';

  return (
    <Card
      data-testid='mail-client-attention-healthy-status'
      variant='subtle'
      padding='md'
      className='border-border/70 bg-card/50'
    >
      <div className='space-y-3'>
        <div className='text-sm text-gray-400'>All connected mailboxes currently look healthy.</div>
        <div className='flex flex-wrap gap-2'>
          <Button asChild variant='outline' size='sm'>
            <Link href={healthyHref}>Healthy Mailboxes</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href={workspaceHref}>Open Workspace</Link>
          </Button>
          <Button asChild variant='outline' size='sm'>
            <Link href={searchHref}>{searchLabel}</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}

function MailClientFilteredAttentionCard({
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
      data-testid='mail-client-attention-status'
      variant='subtle'
      padding='md'
      className='border-border/70 bg-card/50'
    >
      <div className='space-y-3'>
        <div className='text-base font-semibold text-white'>No attention mailboxes match the current filter.</div>
        <p className='text-sm text-gray-400'>
          Clear the dashboard filter to review every paused mailbox and sync failure again.
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

function MailClientAttentionAccountsGrid({
  attentionAccounts,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  firstActiveAccountId,
  foldersByAccount,
  onSyncAccount,
  onToggleAccountStatus,
  syncingAccountId,
  statusUpdatingAccountId,
}: {
  attentionAccounts: FilemakerMailAccount[];
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  firstActiveAccountId: string | null;
  foldersByAccount: Map<string, FilemakerMailFolderSummary[]>;
  onSyncAccount: (accountId: string) => Promise<void>;
  onToggleAccountStatus: (account: FilemakerMailAccount) => Promise<void>;
}): React.JSX.Element {
  return (
    <div className='grid gap-3 xl:grid-cols-2'>
      {attentionAccounts.map((account) => (
        <MailClientAttentionAccountCard
          key={account.id}
          account={account}
          dashboardAccountId={dashboardAccountId}
          dashboardQuery={dashboardQuery}
          dashboardScope={dashboardScope}
          firstActiveAccountId={firstActiveAccountId}
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

function renderMailClientAttentionContent({
  attentionAccounts,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  firstActiveAccountId,
  hasActiveFilter,
  hasAnyAttentionAccounts,
  foldersByAccount,
  onClearFilter,
  onSyncAccount,
  onToggleAccountStatus,
  syncingAccountId,
  statusUpdatingAccountId,
}: MailClientAttentionSectionProps): React.JSX.Element | null {
  if (attentionAccounts.length === 0 && hasAnyAttentionAccounts && hasActiveFilter) {
    return (
      <MailClientFilteredAttentionCard
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        onClearFilter={onClearFilter}
      />
    );
  }

  if (attentionAccounts.length === 0) {
    return (
      <MailClientHealthyAttentionCard
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
      />
    );
  }

  return (
    <MailClientAttentionAccountsGrid
      attentionAccounts={attentionAccounts}
      dashboardAccountId={dashboardAccountId}
      dashboardQuery={dashboardQuery}
      dashboardScope={dashboardScope}
      firstActiveAccountId={firstActiveAccountId}
      foldersByAccount={foldersByAccount}
      onSyncAccount={onSyncAccount}
      onToggleAccountStatus={onToggleAccountStatus}
      syncingAccountId={syncingAccountId}
      statusUpdatingAccountId={statusUpdatingAccountId}
    />
  );
}

function MailClientAttentionSection(props: MailClientAttentionSectionProps): React.JSX.Element | null {
  if (props.accountCount === 0) return null;

  return (
    <section className='space-y-4'>
      <SectionHeader
        title='Needs Attention'
        description='Review paused mailboxes and sync failures directly from the standalone mail client.'
      />
      {renderMailClientAttentionContent(props)}
    </section>
  );
}

export { MailClientAttentionSection };
