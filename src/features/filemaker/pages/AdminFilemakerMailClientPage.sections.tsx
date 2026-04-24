import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Inbox, MailPlus, Search } from 'lucide-react';
import React from 'react';

import {
  NavigationCard,
  NavigationCardGrid,
} from '@/shared/ui/navigation-and-layout.public';
import { Badge, Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/primitives.public';

import { buildFilemakerMailSelectionHref } from '../mail-ui-helpers';
import type { FilemakerMailAccount } from '../types';
import {
  buildMailClientComposeHref,
  buildMailClientSearchHref,
  buildMailClientWorkspaceHref,
  hasFilemakerMailSyncIssue,
} from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

type MailClientSummaryCardsProps = {
  accountCount: number;
  attentionCount: number;
  dashboardQuery: string;
  focusedAccount: FilemakerMailAccount | null;
  folderCount: number;
  healthyCount: number;
};

type MailClientQuickActionsProps = {
  accountCount: number;
  activeCount: number;
  attentionCount: number;
  dashboardQuery: string;
  firstActiveAccount: FilemakerMailAccount | null;
  focusedAccount: FilemakerMailAccount | null;
  healthyCount: number;
};

function MailClientSummaryCards({
  accountCount,
  attentionCount,
  dashboardQuery,
  focusedAccount,
  folderCount,
  healthyCount,
}: MailClientSummaryCardsProps): React.JSX.Element {
  const focusedAccountHasSyncIssue =
    focusedAccount !== null ? hasFilemakerMailSyncIssue(focusedAccount) : false;
  const cards = [
    {
      description: 'Configured Filemaker mailbox connections.',
      href: buildMailClientDashboardHref({
        scope: 'all',
        query: dashboardQuery,
        accountId: focusedAccount?.id ?? '',
      }),
      id: 'mailboxes',
      label: 'Mailboxes',
      value: accountCount,
    },
    {
      description: 'Mailboxes currently healthy and ready for daily use.',
      href: buildMailClientDashboardHref({
        scope: 'healthy',
        query: dashboardQuery,
        accountId:
          focusedAccount !== null && !focusedAccountHasSyncIssue ? focusedAccount.id : '',
      }),
      id: 'healthy',
      label: 'Healthy',
      value: healthyCount,
    },
    {
      description: 'Mailboxes paused or reporting sync errors.',
      href: buildMailClientDashboardHref({
        scope: 'attention',
        query: dashboardQuery,
        accountId:
          focusedAccount !== null && focusedAccountHasSyncIssue ? focusedAccount.id : '',
      }),
      id: 'attention',
      label: 'Attention',
      value: attentionCount,
    },
    {
      description: 'Indexed mailbox folders across all accounts.',
      href: buildMailClientWorkspaceHref({
        focusedAccountId: focusedAccount?.id ?? null,
      }),
      id: 'folders',
      label: 'Folders',
      value: folderCount,
    },
  ] as const;

  return (
    <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          aria-label={`${card.label} Summary`}
          className='block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
          data-testid={`mail-client-summary-${card.id}`}
        >
          <Card
            variant='subtle'
            className='border-border/70 bg-card/60 transition-colors hover:border-border hover:bg-card/70'
          >
            <CardHeader className='space-y-1 pb-2'>
              <div className='text-xs uppercase tracking-[0.22em] text-gray-500'>{card.label}</div>
              <CardTitle className='text-3xl text-white'>{card.value}</CardTitle>
            </CardHeader>
            <CardContent className='pt-0 text-sm text-gray-400'>{card.description}</CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

function MailClientQuickActions({
  accountCount,
  activeCount,
  attentionCount,
  dashboardQuery,
  firstActiveAccount,
  focusedAccount,
  healthyCount,
}: MailClientQuickActionsProps): React.JSX.Element {
  const trimmedDashboardQuery = dashboardQuery.trim();
  const composeAccount =
    focusedAccount?.status === 'active' ? focusedAccount : firstActiveAccount;
  const composeHref = buildMailClientComposeHref({
    composeAccountId: composeAccount?.id ?? null,
    dashboardQuery,
    focusedAccountId: focusedAccount?.id ?? null,
  });
  const composeDescription =
    composeAccount !== null
      ? `Start a message from ${composeAccount.name}.`
      : 'Open the composer and choose a mailbox.';
  const attentionDescription =
    attentionCount > 0
      ? `${attentionCount} mailbox${attentionCount === 1 ? '' : 'es'} need follow-up.`
      : 'All configured mailboxes currently look healthy.';
  const workspaceHref = buildMailClientWorkspaceHref({
    focusedAccountId: focusedAccount?.id ?? null,
  });
  const workspaceDescription =
    focusedAccount !== null
      ? `Open ${focusedAccount.name} directly in the full workspace.`
      : 'Go directly into folders, recent threads, and account settings.';
  const workspaceBadge = focusedAccount !== null ? 'Focused' : `${accountCount} mailboxes`;
  const searchHref = buildMailClientSearchHref({
    dashboardQuery,
    focusedAccountId: focusedAccount?.id ?? null,
  });
  const searchDescription =
    trimmedDashboardQuery !== ''
      ? focusedAccount !== null
        ? `Continue searching for "${trimmedDashboardQuery}" inside ${focusedAccount.name}.`
        : `Continue searching for "${trimmedDashboardQuery}" across connected Filemaker mailboxes.`
      : focusedAccount !== null
        ? `Run deep search inside ${focusedAccount.name}.`
        : 'Run deep search across connected Filemaker mailboxes.';
  const searchBadge =
    trimmedDashboardQuery !== '' ? 'Query' : focusedAccount !== null ? 'Focused' : 'Global';
  const focusedAccountHasSyncIssue =
    focusedAccount !== null ? hasFilemakerMailSyncIssue(focusedAccount) : false;
  const healthyHref = buildMailClientDashboardHref({
    scope: 'healthy',
    query: dashboardQuery,
    accountId:
      focusedAccount !== null && !focusedAccountHasSyncIssue ? focusedAccount.id : '',
  });
  const healthyDescription =
    healthyCount > 0
      ? `${healthyCount} mailbox${healthyCount === 1 ? '' : 'es'} are currently healthy.`
      : 'No mailboxes are currently in a healthy state.';
  const healthyBadge =
    focusedAccount !== null && !focusedAccountHasSyncIssue ? 'Focused' : `${healthyCount} healthy`;
  const attentionHref = buildMailClientDashboardHref({
    scope: 'attention',
    query: dashboardQuery,
    accountId:
      focusedAccount !== null && hasFilemakerMailSyncIssue(focusedAccount) ? focusedAccount.id : '',
  });

  return (
    <NavigationCardGrid className='sm:grid-cols-2 xl:grid-cols-6'>
      <NavigationCard
        href={workspaceHref}
        ariaLabel='Open Workspace'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-sky-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-sky-500/10 text-sky-300'><Inbox className='size-6' /></div>}
        title='Open Workspace'
        description={workspaceDescription}
        trailing={<Badge variant='outline'>{workspaceBadge}</Badge>}
      />
      <NavigationCard
        href={buildFilemakerMailSelectionHref({ panel: 'settings' })}
        ariaLabel='Add Mailbox'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-cyan-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-300'><MailPlus className='size-6' /></div>}
        title='Add Mailbox'
        description='Create a new mailbox connection and open its setup form immediately.'
        trailing={<Badge variant='outline'>Setup</Badge>}
      />
      <NavigationCard
        href={composeHref}
        ariaLabel='Compose'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-emerald-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-300'><MailPlus className='size-6' /></div>}
        title='Compose'
        description={composeDescription}
        trailing={<Badge variant='outline'>{activeCount} active</Badge>}
      />
      <NavigationCard
        href={searchHref}
        ariaLabel='Search Messages'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-violet-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-violet-500/10 text-violet-300'><Search className='size-6' /></div>}
        title='Search Messages'
        description={searchDescription}
        trailing={<Badge variant='outline'>{searchBadge}</Badge>}
      />
      <NavigationCard
        href={healthyHref}
        ariaLabel='Healthy Mailboxes'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-teal-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-teal-500/10 text-teal-300'><CheckCircle2 className='size-6' /></div>}
        title='Healthy Mailboxes'
        description={healthyDescription}
        trailing={<Badge variant='outline'>{healthyBadge}</Badge>}
      />
      <NavigationCard
        href={attentionHref}
        ariaLabel='Needs Attention'
        linkClassName='group'
        className='border-border/70 bg-card/50 group-hover:border-amber-500/40 group-hover:bg-card/70'
        leading={<div className='flex size-12 items-center justify-center rounded-lg bg-amber-500/10 text-amber-300'><AlertTriangle className='size-6' /></div>}
        title='Needs Attention'
        description={attentionDescription}
        trailing={<Badge variant='outline'>{attentionCount} flagged</Badge>}
      />
    </NavigationCardGrid>
  );
}

export {
  MailClientQuickActions,
  MailClientSummaryCards,
};
