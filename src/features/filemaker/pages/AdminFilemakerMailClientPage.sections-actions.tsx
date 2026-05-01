import { AlertTriangle, CheckCircle2, Inbox, MailPlus, Search } from 'lucide-react';
import React from 'react';

import {
  NavigationCard,
  NavigationCardGrid,
} from '@/shared/ui/navigation-and-layout.public';
import { Badge } from '@/shared/ui/primitives.public';

import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount } from '../types';
import {
  buildMailClientComposeHref,
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  hasFilemakerMailSyncIssue,
} from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

type MailClientQuickActionsProps = {
  accountCount: number;
  activeCount: number;
  attentionCount: number;
  dashboardQuery: string;
  firstActiveAccount: FilemakerMailAccount | null;
  focusedAccount: FilemakerMailAccount | null;
  healthyCount: number;
};

type MailClientQuickActionContext = {
  activeCount: number;
  attentionCount: number;
  attentionDescription: string;
  attentionHref: string;
  composeDescription: string;
  composeHref: string;
  healthyBadge: string;
  healthyDescription: string;
  healthyHref: string;
  searchBadge: string;
  searchDescription: string;
  searchHref: string;
  workspaceBadge: string;
  workspaceDescription: string;
  workspaceHref: string;
};

type MailClientQuickActionCardProps = {
  ariaLabel: string;
  badge: string;
  className: string;
  description: string;
  href: string;
  icon: React.JSX.Element;
  iconClassName: string;
  title: string;
};

const getFocusedAccountHasSyncIssue = (account: FilemakerMailAccount | null): boolean =>
  account !== null && hasFilemakerMailSyncIssue(account);

const getMailboxCountLabel = (count: number): string => `${count} mailboxes`;

const getFocusedAccountId = (account: FilemakerMailAccount | null): string | null =>
  account?.id ?? null;

const getDashboardScopedAccountId = (
  account: FilemakerMailAccount | null,
  shouldScopeToAccount: boolean
): string => (account !== null && shouldScopeToAccount ? account.id : '');

const getComposeAccount = (
  focusedAccount: FilemakerMailAccount | null,
  firstActiveAccount: FilemakerMailAccount | null
): FilemakerMailAccount | null => {
  if (focusedAccount !== null && focusedAccount.status === 'active') return focusedAccount;
  return firstActiveAccount;
};

const getComposeDescription = (composeAccount: FilemakerMailAccount | null): string =>
  composeAccount !== null
    ? `Start a message from ${composeAccount.name}.`
    : 'Open the composer and choose a mailbox.';

const getAttentionDescription = (attentionCount: number): string =>
  attentionCount > 0
    ? `${attentionCount} mailbox${attentionCount === 1 ? '' : 'es'} need follow-up.`
    : 'All configured mailboxes currently look healthy.';

const getWorkspaceDescription = (focusedAccount: FilemakerMailAccount | null): string =>
  focusedAccount !== null
    ? `Open ${focusedAccount.name} directly in the full workspace.`
    : 'Go directly into folders, recent threads, and account settings.';

const getSearchDescription = (
  trimmedDashboardQuery: string,
  focusedAccount: FilemakerMailAccount | null
): string => {
  if (trimmedDashboardQuery !== '' && focusedAccount !== null) {
    return `Continue searching for "${trimmedDashboardQuery}" inside ${focusedAccount.name}.`;
  }
  if (trimmedDashboardQuery !== '') {
    return `Continue searching for "${trimmedDashboardQuery}" across connected Filemaker mailboxes.`;
  }
  if (focusedAccount !== null) return `Run deep search inside ${focusedAccount.name}.`;
  return 'Run deep search across connected Filemaker mailboxes.';
};

const getSearchBadge = (
  trimmedDashboardQuery: string,
  focusedAccount: FilemakerMailAccount | null
): string => {
  if (trimmedDashboardQuery !== '') return 'Query';
  if (focusedAccount !== null) return 'Focused';
  return 'Global';
};

const getHealthyDescription = (healthyCount: number): string =>
  healthyCount > 0
    ? `${healthyCount} mailbox${healthyCount === 1 ? '' : 'es'} are currently healthy.`
    : 'No mailboxes are currently in a healthy state.';

const getHealthyBadge = (
  focusedAccount: FilemakerMailAccount | null,
  focusedAccountHasSyncIssue: boolean,
  healthyCount: number
): string =>
  focusedAccount !== null && !focusedAccountHasSyncIssue ? 'Focused' : `${healthyCount} healthy`;

function buildMailClientQuickActionContext({
  accountCount,
  activeCount,
  attentionCount,
  dashboardQuery,
  firstActiveAccount,
  focusedAccount,
  healthyCount,
}: MailClientQuickActionsProps): MailClientQuickActionContext {
  const trimmedDashboardQuery = dashboardQuery.trim();
  const composeAccount = getComposeAccount(focusedAccount, firstActiveAccount);
  const focusedAccountId = getFocusedAccountId(focusedAccount);
  const focusedAccountHasSyncIssue = getFocusedAccountHasSyncIssue(focusedAccount);

  return {
    activeCount,
    attentionCount,
    attentionDescription: getAttentionDescription(attentionCount),
    attentionHref: buildMailClientDashboardHref({
      scope: 'attention',
      query: dashboardQuery,
      accountId: getDashboardScopedAccountId(focusedAccount, focusedAccountHasSyncIssue),
    }),
    composeDescription: getComposeDescription(composeAccount),
    composeHref: buildMailClientComposeHref({
      composeAccountId: composeAccount?.id ?? null,
      dashboardQuery,
      focusedAccountId,
    }),
    healthyBadge: getHealthyBadge(focusedAccount, focusedAccountHasSyncIssue, healthyCount),
    healthyDescription: getHealthyDescription(healthyCount),
    healthyHref: buildMailClientDashboardHref({
      scope: 'healthy',
      query: dashboardQuery,
      accountId: getDashboardScopedAccountId(focusedAccount, !focusedAccountHasSyncIssue),
    }),
    searchBadge: getSearchBadge(trimmedDashboardQuery, focusedAccount),
    searchDescription: getSearchDescription(trimmedDashboardQuery, focusedAccount),
    searchHref: buildMailClientSearchHref({ dashboardQuery, focusedAccountId }),
    workspaceBadge: focusedAccount !== null ? 'Focused' : getMailboxCountLabel(accountCount),
    workspaceDescription: getWorkspaceDescription(focusedAccount),
    workspaceHref: buildMailClientWorkspaceHref({ focusedAccountId }),
  };
}

function MailClientQuickActionCard({
  ariaLabel,
  badge,
  className,
  description,
  href,
  icon,
  iconClassName,
  title,
}: MailClientQuickActionCardProps): React.JSX.Element {
  return (
    <NavigationCard
      href={href}
      ariaLabel={ariaLabel}
      linkClassName='group'
      className={className}
      leading={<div className={iconClassName}>{icon}</div>}
      title={title}
      description={description}
      trailing={<Badge variant='outline'>{badge}</Badge>}
    />
  );
}

function MailClientWorkspaceAction({ context }: { context: MailClientQuickActionContext }): React.JSX.Element {
  return (
    <MailClientQuickActionCard
      href={context.workspaceHref}
      ariaLabel='Open Workspace'
      className='border-border/70 bg-card/50 group-hover:border-sky-500/40 group-hover:bg-card/70'
      iconClassName='flex size-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300'
      icon={<Inbox className='size-6' />}
      title='Open Workspace'
      description={context.workspaceDescription}
      badge={context.workspaceBadge}
    />
  );
}

function MailClientAddMailboxAction(): React.JSX.Element {
  return (
    <MailClientQuickActionCard
      href={buildFilemakerMailSelectionHref({ panel: 'settings' })}
      ariaLabel='Add Mailbox'
      className='border-border/70 bg-card/50 group-hover:border-cyan-500/40 group-hover:bg-card/70'
      iconClassName='flex size-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300'
      icon={<MailPlus className='size-6' />}
      title='Add Mailbox'
      description='Create a new mailbox connection and open its setup form immediately.'
      badge='Setup'
    />
  );
}

function MailClientComposeAction({ context }: { context: MailClientQuickActionContext }): React.JSX.Element {
  return (
    <MailClientQuickActionCard
      href={context.composeHref}
      ariaLabel='Compose'
      className='border-border/70 bg-card/50 group-hover:border-emerald-500/40 group-hover:bg-card/70'
      iconClassName='flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300'
      icon={<MailPlus className='size-6' />}
      title='Compose'
      description={context.composeDescription}
      badge={`${context.activeCount} active`}
    />
  );
}

function MailClientSearchAction({ context }: { context: MailClientQuickActionContext }): React.JSX.Element {
  return (
    <MailClientQuickActionCard
      href={context.searchHref}
      ariaLabel='Search Messages'
      className='border-border/70 bg-card/50 group-hover:border-violet-500/40 group-hover:bg-card/70'
      iconClassName='flex size-12 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300'
      icon={<Search className='size-6' />}
      title='Search Messages'
      description={context.searchDescription}
      badge={context.searchBadge}
    />
  );
}

function MailClientHealthyAction({ context }: { context: MailClientQuickActionContext }): React.JSX.Element {
  return (
    <MailClientQuickActionCard
      href={context.healthyHref}
      ariaLabel='Healthy Mailboxes'
      className='border-border/70 bg-card/50 group-hover:border-teal-500/40 group-hover:bg-card/70'
      iconClassName='flex size-12 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300'
      icon={<CheckCircle2 className='size-6' />}
      title='Healthy Mailboxes'
      description={context.healthyDescription}
      badge={context.healthyBadge}
    />
  );
}

function MailClientAttentionAction({ context }: { context: MailClientQuickActionContext }): React.JSX.Element {
  return (
    <MailClientQuickActionCard
      href={context.attentionHref}
      ariaLabel='Needs Attention'
      className='border-border/70 bg-card/50 group-hover:border-amber-500/40 group-hover:bg-card/70'
      iconClassName='flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300'
      icon={<AlertTriangle className='size-6' />}
      title='Needs Attention'
      description={context.attentionDescription}
      badge={`${context.attentionCount} flagged`}
    />
  );
}

function MailClientQuickActions(props: MailClientQuickActionsProps): React.JSX.Element {
  const context = buildMailClientQuickActionContext(props);

  return (
    <NavigationCardGrid className='sm:grid-cols-2 xl:grid-cols-6'>
      <MailClientWorkspaceAction context={context} />
      <MailClientAddMailboxAction />
      <MailClientComposeAction context={context} />
      <MailClientSearchAction context={context} />
      <MailClientHealthyAction context={context} />
      <MailClientAttentionAction context={context} />
    </NavigationCardGrid>
  );
}

export { MailClientQuickActions };
