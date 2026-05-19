import Link from 'next/link';
import React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/primitives.public';

import type { FilemakerMailAccount } from '../types';
import {
  buildMailClientWorkspaceHref,
  hasFilemakerMailSyncIssue,
} from './AdminFilemakerMailClientPage.helpers';
import { buildMailClientDashboardHref } from './AdminFilemakerMailClientPage.route';

type MailClientSummaryCardsProps = {
  accountCount: number;
  attentionCount: number;
  campaignsSummaryCard?: React.ReactNode;
  dashboardQuery: string;
  focusedAccount: FilemakerMailAccount | null;
  folderCount: number;
  healthyCount: number;
};

type MailClientSummaryCardModel = {
  description: string;
  href: string;
  id: string;
  label: string;
  value: number;
};

const getFocusedAccountHasSyncIssue = (account: FilemakerMailAccount | null): boolean =>
  account !== null && hasFilemakerMailSyncIssue(account);

const getFocusedAccountId = (account: FilemakerMailAccount | null): string =>
  account?.id ?? '';

const getHealthySummaryAccountId = (
  account: FilemakerMailAccount | null,
  hasSyncIssue: boolean
): string => (account !== null && !hasSyncIssue ? account.id : '');

const getAttentionSummaryAccountId = (
  account: FilemakerMailAccount | null,
  hasSyncIssue: boolean
): string => (account !== null && hasSyncIssue ? account.id : '');

function buildMailClientSummaryCardModels({
  accountCount,
  attentionCount,
  dashboardQuery,
  focusedAccount,
  folderCount,
  healthyCount,
}: MailClientSummaryCardsProps): MailClientSummaryCardModel[] {
  const focusedAccountHasSyncIssue = getFocusedAccountHasSyncIssue(focusedAccount);

  return [
    {
      description: 'Configured Filemaker mailbox connections.',
      href: buildMailClientDashboardHref({
        scope: 'all',
        query: dashboardQuery,
        accountId: getFocusedAccountId(focusedAccount),
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
        accountId: getHealthySummaryAccountId(focusedAccount, focusedAccountHasSyncIssue),
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
        accountId: getAttentionSummaryAccountId(focusedAccount, focusedAccountHasSyncIssue),
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
  ];
}

function MailClientSummaryCard({ card }: { card: MailClientSummaryCardModel }): React.JSX.Element {
  return (
    <Link
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
  );
}

function MailClientSummaryCards(props: MailClientSummaryCardsProps): React.JSX.Element {
  const cards = buildMailClientSummaryCardModels(props);
  const hasCampaignsSlot = props.campaignsSummaryCard !== undefined;

  return (
    <div className={`grid gap-3 sm:grid-cols-2 ${hasCampaignsSlot ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
      {cards.map((card) => (
        <MailClientSummaryCard key={card.id} card={card} />
      ))}
      {props.campaignsSummaryCard}
    </div>
  );
}

export { MailClientSummaryCards };
