import React from 'react';

import { SectionHeader } from '@/shared/ui/navigation-and-layout.public';

import type { FilemakerMailAccount, FilemakerMailThread } from '../types';
import type { MailClientDashboardScope } from './AdminFilemakerMailClientPage.helpers';
import { MailClientRecentThreadCard } from './AdminFilemakerMailClientPage.recent-card';
import { MailClientRecentThreadsStatus } from './AdminFilemakerMailClientPage.recent-status';

type MailClientRecentThreadsSectionProps = {
  accounts: FilemakerMailAccount[];
  dashboardAccountId: string;
  dashboardQuery: string;
  dashboardScope: MailClientDashboardScope;
  hasActiveFilter: boolean;
  hasAnyRecentThreads: boolean;
  isLoading: boolean;
  onClearFilter: () => void;
  onRetry: () => Promise<void>;
  recentThreads: FilemakerMailThread[];
  recentThreadsError: string | null;
};

function MailClientRecentThreadsSection({
  accounts,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  hasActiveFilter,
  hasAnyRecentThreads,
  isLoading,
  onClearFilter,
  onRetry,
  recentThreads,
  recentThreadsError,
}: MailClientRecentThreadsSectionProps): React.JSX.Element {
  const accountNamesById = new Map(accounts.map((account) => [account.id, account.name] as const));

  return (
    <section className='space-y-4'>
      <SectionHeader
        title='Recent Activity'
        description='Jump into the latest Filemaker mail threads across all connected mailboxes.'
      />

      <MailClientRecentThreadsStatus
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        hasActiveFilter={hasActiveFilter}
        hasAnyRecentThreads={hasAnyRecentThreads}
        isLoading={isLoading}
        onClearFilter={onClearFilter}
        onRetry={onRetry}
        recentThreads={recentThreads}
        recentThreadsError={recentThreadsError}
      />

      {recentThreads.length > 0 ? (
        <div className='grid gap-3 xl:grid-cols-2'>
          {recentThreads.map((thread) => (
            <MailClientRecentThreadCard
              key={thread.id}
              activeDashboardAccountId={dashboardAccountId}
              accountName={accountNamesById.get(thread.accountId) ?? thread.accountId}
              dashboardQuery={dashboardQuery}
              dashboardScope={dashboardScope}
              thread={thread}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export { MailClientRecentThreadsSection };
