import React from 'react';

import { MailClientAttentionSection } from './AdminFilemakerMailClientPage.attention';
import {
  type MailClientDashboardActions,
  type MailClientDashboardFilterState,
  type MailClientDashboardProps,
  type MailClientDashboardState,
  useMailClientDashboardFilterState,
} from './AdminFilemakerMailClientPage.dashboard-state';
import { MailClientDashboardOverview } from './AdminFilemakerMailClientPage.dashboard-overview';
import { MailClientFocusedAccountSection } from './AdminFilemakerMailClientPage.focused';
import { MailClientMailboxSection } from './AdminFilemakerMailClientPage.mailboxes';
import { MailClientRecentThreadsSection } from './AdminFilemakerMailClientPage.recent';
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

type MailClientFocusedAccountBlockProps = Pick<
  MailClientDashboardState,
  'firstActiveAccount' | 'foldersByAccount'
> &
  Pick<
    MailClientDashboardActions,
    'syncingAccountId' | 'statusUpdatingAccountId' | 'handleSyncAccount' | 'handleToggleAccountStatus'
  > &
  MailClientDashboardFilterState & {
    focusedAccount: FilemakerMailAccount | null;
  };

const resolveMailClientFocusedAccount = (
  accounts: FilemakerMailAccount[],
  dashboardAccountId: string
): FilemakerMailAccount | null =>
  dashboardAccountId === ''
    ? null
    : accounts.find((account) => account.id === dashboardAccountId) ?? null;

function MailClientFocusedAccountBlock({
  focusedAccount,
  firstActiveAccount,
  foldersByAccount,
  dashboardAccountId,
  dashboardQuery,
  dashboardScope,
  visibleRecentThreads,
  syncingAccountId,
  statusUpdatingAccountId,
  handleSyncAccount,
  handleToggleAccountStatus,
}: MailClientFocusedAccountBlockProps): React.JSX.Element {
  const folders = focusedAccount !== null
    ? foldersByAccount.get(focusedAccount.id) ?? []
    : [];
  const recentThreads = focusedAccount !== null
    ? visibleRecentThreads.filter((thread) => thread.accountId === focusedAccount.id)
    : [];
  const isSyncing = focusedAccount !== null && syncingAccountId === focusedAccount.id;
  const isStatusUpdating = focusedAccount !== null && statusUpdatingAccountId === focusedAccount.id;

  return (
    <MailClientFocusedAccountSection
      account={focusedAccount}
      dashboardAccountId={dashboardAccountId}
      dashboardQuery={dashboardQuery}
      dashboardScope={dashboardScope}
      fallbackComposeAccountId={firstActiveAccount?.id ?? null}
      folders={folders}
      recentThreads={recentThreads}
      isSyncing={isSyncing}
      isStatusUpdating={isStatusUpdating}
      onSyncAccount={handleSyncAccount}
      onToggleAccountStatus={handleToggleAccountStatus}
    />
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

function MailClientDashboardSectionsContent(
  props: MailClientDashboardSectionsContentProps
): React.JSX.Element {
  const { accounts, filterState } = props;
  const focusedAccount = resolveMailClientFocusedAccount(accounts, filterState.dashboardAccountId);

  return (
    <>
      <MailClientDashboardOverview {...props} {...filterState} focusedAccount={focusedAccount} />
      <MailClientFocusedAccountBlock {...props} {...filterState} focusedAccount={focusedAccount} />
      <MailClientAttentionBlock {...props} {...filterState} />
      <MailClientWorkspaceBlocks {...props} {...filterState} />
    </>
  );
}
