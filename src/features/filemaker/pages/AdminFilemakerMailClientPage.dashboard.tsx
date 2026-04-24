import React from 'react';

import { MailClientAttentionSection } from './AdminFilemakerMailClientPage.attention';
import {
  type MailClientDashboardActions,
  type MailClientDashboardFilterState,
  type MailClientDashboardProps,
  type MailClientDashboardState,
  useMailClientDashboardFilterState,
} from './AdminFilemakerMailClientPage.dashboard-state';
import { MailClientDashboardFilters } from './AdminFilemakerMailClientPage.filters';
import { MailClientFocusedAccountSection } from './AdminFilemakerMailClientPage.focused';
import { MailClientMailboxSection } from './AdminFilemakerMailClientPage.mailboxes';
import { MailClientRecentThreadsSection } from './AdminFilemakerMailClientPage.recent';
import {
  MailClientQuickActions,
  MailClientSummaryCards,
} from './AdminFilemakerMailClientPage.sections';
import type { FilemakerMailAccount } from '../types';

type MailClientAttentionBlockProps = Pick<
  MailClientDashboardState,
  'accounts' | 'attentionAccounts' | 'firstActiveAccount' | 'foldersByAccount'
> &
  Pick<
    MailClientDashboardFilterState,
    | 'clearDashboardFilters'
    | 'clearDashboardQuery'
    | 'dashboardAccountId'
    | 'dashboardQuery'
    | 'dashboardScope'
    | 'hasActiveDashboardFilter'
    | 'visibleAttentionAccounts'
  > &
  Pick<
    MailClientDashboardActions,
    'syncingAccountId' | 'statusUpdatingAccountId' | 'handleSyncAccount' | 'handleToggleAccountStatus'
  >;

type MailClientWorkspaceBlocksProps = Pick<
  MailClientDashboardState,
  'accounts' | 'foldersByAccount' | 'recentThreads' | 'recentThreadsError' | 'isLoading' | 'loadError' | 'loadMailboxData'
> &
  Pick<
    MailClientDashboardActions,
    'syncingAccountId' | 'statusUpdatingAccountId' | 'handleSyncAccount' | 'handleToggleAccountStatus'
  > &
  Pick<
    MailClientDashboardFilterState,
    | 'clearDashboardFilters'
    | 'clearDashboardQuery'
    | 'dashboardAccountId'
    | 'dashboardQuery'
    | 'dashboardScope'
    | 'hasActiveDashboardFilter'
    | 'visibleAccounts'
    | 'visibleRecentThreads'
  >;

type MailClientDashboardSectionsContentProps = Omit<MailClientDashboardProps, 'loadMailboxData'> & {
  loadMailboxData: MailClientDashboardState['loadMailboxData'];
  filterState: MailClientDashboardFilterState;
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
  clearDashboardFilters,
  clearDashboardQuery,
  visibleAttentionAccounts,
  visibleAccounts,
  visibleRecentThreads,
}: Pick<
  MailClientDashboardState,
  'accounts' | 'folders' | 'activeAccounts' | 'attentionAccounts' | 'firstActiveAccount' | 'recentThreads'
> &
  MailClientDashboardFilterState & {
    focusedAccount: FilemakerMailAccount | null;
  }): React.JSX.Element {
  return (
    <>
      <MailClientSummaryCards
        accountCount={accounts.length}
        attentionCount={attentionAccounts.length}
        dashboardQuery={dashboardQuery}
        focusedAccount={focusedAccount}
        folderCount={folders.length}
        healthyCount={accounts.length - attentionAccounts.length}
      />
      <MailClientQuickActions
        accountCount={accounts.length}
        activeCount={activeAccounts.length}
        attentionCount={attentionAccounts.length}
        dashboardQuery={dashboardQuery}
        firstActiveAccount={firstActiveAccount}
        focusedAccount={focusedAccount}
        healthyCount={accounts.length - attentionAccounts.length}
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

function MailClientAttentionBlock({
  accounts,
  attentionAccounts,
  firstActiveAccount,
  visibleAttentionAccounts,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  hasActiveDashboardFilter,
  clearDashboardFilters,
  clearDashboardQuery,
  foldersByAccount,
  syncingAccountId,
  statusUpdatingAccountId,
  handleSyncAccount,
  handleToggleAccountStatus,
}: MailClientAttentionBlockProps): React.JSX.Element {
  const handleClearFilter =
    dashboardQuery.trim() !== '' ? clearDashboardQuery : clearDashboardFilters;

  return (
    <MailClientAttentionSection
      attentionAccounts={visibleAttentionAccounts}
      accountCount={accounts.length}
      hasActiveFilter={hasActiveDashboardFilter}
      hasAnyAttentionAccounts={attentionAccounts.length > 0}
      dashboardAccountId={dashboardAccountId}
      dashboardQuery={dashboardQuery}
      dashboardScope={dashboardScope}
      firstActiveAccountId={firstActiveAccount?.id ?? null}
      foldersByAccount={foldersByAccount}
      onClearFilter={handleClearFilter}
      onSyncAccount={handleSyncAccount}
      onToggleAccountStatus={handleToggleAccountStatus}
      syncingAccountId={syncingAccountId}
      statusUpdatingAccountId={statusUpdatingAccountId}
    />
  );
}

function MailClientWorkspaceBlocks({
  accounts,
  foldersByAccount,
  recentThreads,
  recentThreadsError,
  isLoading,
  loadError,
  loadMailboxData,
  syncingAccountId,
  statusUpdatingAccountId,
  handleSyncAccount,
  handleToggleAccountStatus,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  clearDashboardFilters,
  clearDashboardQuery,
  hasActiveDashboardFilter,
  visibleAccounts,
  visibleRecentThreads,
}: MailClientWorkspaceBlocksProps): React.JSX.Element {
  const handleClearFilter =
    dashboardQuery.trim() !== '' ? clearDashboardQuery : clearDashboardFilters;

  return (
    <>
      <MailClientRecentThreadsSection
        accounts={accounts}
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        hasActiveFilter={hasActiveDashboardFilter}
        hasAnyRecentThreads={recentThreads.length > 0}
        isLoading={isLoading}
        onClearFilter={handleClearFilter}
        onRetry={loadMailboxData}
        recentThreads={visibleRecentThreads}
        recentThreadsError={recentThreadsError}
      />
      <MailClientMailboxSection
        accounts={visibleAccounts}
        dashboardAccountId={dashboardAccountId}
        dashboardQuery={dashboardQuery}
        dashboardScope={dashboardScope}
        hasConfiguredAccounts={accounts.length > 0}
        hasActiveFilter={hasActiveDashboardFilter}
        foldersByAccount={foldersByAccount}
        isLoading={isLoading}
        loadError={loadError}
        onClearFilter={handleClearFilter}
        onRetry={loadMailboxData}
        onSyncAccount={handleSyncAccount}
        onToggleAccountStatus={handleToggleAccountStatus}
        syncingAccountId={syncingAccountId}
        statusUpdatingAccountId={statusUpdatingAccountId}
      />
    </>
  );
}

export function MailClientDashboardSections(props: MailClientDashboardProps): React.JSX.Element {
  const {
    accounts,
    folders,
    foldersByAccount,
    recentThreads,
    recentThreadsError,
    activeAccounts,
    attentionAccounts,
    firstActiveAccount,
    isLoading,
    loadError,
    loadMailboxData,
    syncingAccountId,
    statusUpdatingAccountId,
    handleSyncAccount,
    handleToggleAccountStatus,
  } = props;
  const filterState = useMailClientDashboardFilterState({
    accounts,
    foldersByAccount,
    recentThreads,
  });

  return (
    <MailClientDashboardSectionsContent
      accounts={accounts}
      folders={folders}
      foldersByAccount={foldersByAccount}
      recentThreads={recentThreads}
      recentThreadsError={recentThreadsError}
      activeAccounts={activeAccounts}
      attentionAccounts={attentionAccounts}
      firstActiveAccount={firstActiveAccount}
      isLoading={isLoading}
      loadError={loadError}
      loadMailboxData={loadMailboxData}
      syncingAccountId={syncingAccountId}
      statusUpdatingAccountId={statusUpdatingAccountId}
      handleSyncAccount={handleSyncAccount}
      handleToggleAccountStatus={handleToggleAccountStatus}
      filterState={filterState}
    />
  );
}

function MailClientDashboardSectionsContent({
  accounts,
  folders,
  foldersByAccount,
  recentThreads,
  recentThreadsError,
  activeAccounts,
  attentionAccounts,
  firstActiveAccount,
  isLoading,
  loadError,
  loadMailboxData,
  syncingAccountId,
  statusUpdatingAccountId,
  handleSyncAccount,
  handleToggleAccountStatus,
  filterState,
}: MailClientDashboardSectionsContentProps): React.JSX.Element {
  const focusedAccount =
    filterState.dashboardAccountId === ''
      ? null
      : accounts.find((account) => account.id === filterState.dashboardAccountId) ?? null;

  return (
    <>
      <MailClientDashboardOverview accounts={accounts} folders={folders} activeAccounts={activeAccounts} attentionAccounts={attentionAccounts} firstActiveAccount={firstActiveAccount} focusedAccount={focusedAccount} recentThreads={recentThreads} {...filterState} />
      <MailClientFocusedAccountSection
        account={focusedAccount}
        dashboardAccountId={filterState.dashboardAccountId}
        dashboardQuery={filterState.dashboardQuery}
        dashboardScope={filterState.dashboardScope}
        fallbackComposeAccountId={firstActiveAccount?.id ?? null}
        folders={focusedAccount !== null ? foldersByAccount.get(focusedAccount.id) ?? [] : []}
        recentThreads={
          focusedAccount !== null
            ? filterState.visibleRecentThreads.filter((thread) => thread.accountId === focusedAccount.id)
            : []
        }
        isSyncing={focusedAccount !== null && syncingAccountId === focusedAccount.id}
        isStatusUpdating={focusedAccount !== null && statusUpdatingAccountId === focusedAccount.id}
        onSyncAccount={handleSyncAccount}
        onToggleAccountStatus={handleToggleAccountStatus}
      />
      <MailClientAttentionBlock
        accounts={accounts}
        attentionAccounts={attentionAccounts}
        firstActiveAccount={firstActiveAccount}
        visibleAttentionAccounts={filterState.visibleAttentionAccounts}
        dashboardAccountId={filterState.dashboardAccountId}
        dashboardQuery={filterState.dashboardQuery}
        dashboardScope={filterState.dashboardScope}
        hasActiveDashboardFilter={filterState.hasActiveDashboardFilter}
        clearDashboardFilters={filterState.clearDashboardFilters}
        foldersByAccount={foldersByAccount}
        syncingAccountId={syncingAccountId}
        statusUpdatingAccountId={statusUpdatingAccountId}
        handleSyncAccount={handleSyncAccount}
        handleToggleAccountStatus={handleToggleAccountStatus}
      />
      <MailClientWorkspaceBlocks
        accounts={accounts}
        foldersByAccount={foldersByAccount}
        recentThreads={recentThreads}
        recentThreadsError={recentThreadsError}
        isLoading={isLoading}
        loadError={loadError}
        loadMailboxData={loadMailboxData}
        syncingAccountId={syncingAccountId}
        statusUpdatingAccountId={statusUpdatingAccountId}
        handleSyncAccount={handleSyncAccount}
        handleToggleAccountStatus={handleToggleAccountStatus}
        {...filterState}
      />
    </>
  );
}
