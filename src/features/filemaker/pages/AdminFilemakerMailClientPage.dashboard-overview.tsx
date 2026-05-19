import React from 'react';

import type { FilemakerMailAccount } from '../types';
import {
  type MailClientDashboardFilterState,
  type MailClientDashboardState,
} from './AdminFilemakerMailClientPage.dashboard-state';
import { MailClientDashboardFilters } from './AdminFilemakerMailClientPage.filters';
import {
  MailClientQuickActions,
  MailClientSummaryCards,
} from './AdminFilemakerMailClientPage.sections';
import { MailClientCampaignsSummaryCard } from './AdminFilemakerMailClientPage.account-campaigns';

type MailClientDashboardOverviewProps = Pick<
  MailClientDashboardState,
  'accounts' | 'folders' | 'activeAccounts' | 'attentionAccounts' | 'firstActiveAccount' | 'recentThreads'
> &
  Omit<MailClientDashboardFilterState, 'clearDashboardFilters'> & {
    focusedAccount: FilemakerMailAccount | null;
  };

function MailClientDashboardOverview({
  accounts,
  folders,
  activeAccounts,
  attentionAccounts,
  firstActiveAccount,
  focusedAccount,
  recentThreads,
  dashboardAccountId,
  dashboardScope,
  dashboardQuery,
  setDashboardAccountId,
  setDashboardQuery,
  setDashboardScope,
  clearDashboardQuery,
  visibleAttentionAccounts,
  visibleAccounts,
  visibleRecentThreads,
}: MailClientDashboardOverviewProps): React.JSX.Element {
  const healthyCount = accounts.length - attentionAccounts.length;

  return (
    <>
      <MailClientSummaryCards
        accountCount={accounts.length}
        attentionCount={attentionAccounts.length}
        campaignsSummaryCard={<MailClientCampaignsSummaryCard />}
        dashboardQuery={dashboardQuery}
        focusedAccount={focusedAccount}
        folderCount={folders.length}
        healthyCount={healthyCount}
      />
      <MailClientQuickActions
        accountCount={accounts.length}
        activeCount={activeAccounts.length}
        attentionCount={attentionAccounts.length}
        dashboardQuery={dashboardQuery}
        firstActiveAccount={firstActiveAccount}
        focusedAccount={focusedAccount}
        healthyCount={healthyCount}
      />
      <MailClientDashboardFilters
        accountId={dashboardAccountId}
        accounts={accounts}
        query={dashboardQuery}
        scope={dashboardScope}
        onAccountIdChange={setDashboardAccountId}
        onQueryChange={setDashboardQuery}
        onScopeChange={setDashboardScope}
        onClearQuery={clearDashboardQuery}
        visibleAccountCount={visibleAccounts.length}
        visibleAttentionCount={visibleAttentionAccounts.length}
        totalAccountCount={accounts.length}
        totalAttentionCount={attentionAccounts.length}
        visibleRecentThreadCount={visibleRecentThreads.length}
        totalRecentThreadCount={recentThreads.length}
      />
    </>
  );
}

export { MailClientDashboardOverview };
