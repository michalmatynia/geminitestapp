'use client';

import Link from 'next/link';
import { Megaphone, Plus } from 'lucide-react';
import React, { useMemo } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button } from '@/shared/ui/primitives.public';

import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
} from '../settings';
import type { FilemakerEmailCampaign, FilemakerEmailCampaignRun } from '../types';
import { buildMailClientCreateCampaignHref } from './AdminFilemakerMailClientPage.helpers';
import { formatTimestamp } from './filemaker-page-utils';

const useAccountCampaignCount = (accountId: string): number => {
  const settingsStore = useSettingsStore();
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  return useMemo(
    () =>
      parseFilemakerEmailCampaignRegistry(rawCampaigns).campaigns.filter(
        (c) => c.mailAccountId === accountId
      ).length,
    [rawCampaigns, accountId]
  );
};

export function MailClientMailboxCampaignsBadge({
  accountId,
}: {
  accountId: string;
}): React.JSX.Element | null {
  const count = useAccountCampaignCount(accountId);
  if (count === 0) return null;
  return (
    <Badge variant='outline' className='gap-1'>
      <Megaphone className='size-3' />
      {count} {count === 1 ? 'campaign' : 'campaigns'}
    </Badge>
  );
}

export function MailClientCampaignsSummaryCard(): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const { totalCount, activeCount } = useMemo(() => {
    const campaigns = parseFilemakerEmailCampaignRegistry(rawCampaigns).campaigns;
    return {
      totalCount: campaigns.length,
      activeCount: campaigns.filter((c) => c.status === 'active').length,
    };
  }, [rawCampaigns]);

  return (
    <Link
      href='/admin/filemaker/campaigns'
      aria-label='Campaigns Summary'
      className='block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background'
      data-testid='mail-client-summary-campaigns'
    >
      <div className='rounded-lg border border-border/70 bg-card/60 transition-colors hover:border-border hover:bg-card/70'>
        <div className='space-y-1 p-4 pb-2'>
          <div className='text-xs uppercase tracking-[0.22em] text-gray-500'>Campaigns</div>
          <div className='text-3xl font-bold text-white'>{totalCount}</div>
        </div>
        <div className='px-4 pb-4 pt-0 text-sm text-gray-400'>
          {activeCount > 0
            ? `${activeCount} active — sending from connected mailboxes.`
            : 'No active campaigns sending from these mailboxes.'}
        </div>
      </div>
    </Link>
  );
}

const useLatestRunByCampaignId = (): Map<string, FilemakerEmailCampaignRun> => {
  const settingsStore = useSettingsStore();
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  return useMemo(() => {
    const map = new Map<string, FilemakerEmailCampaignRun>();
    parseFilemakerEmailCampaignRunRegistry(rawRuns).runs.forEach((run) => {
      const current = map.get(run.campaignId);
      const runAt = Date.parse(run.createdAt ?? '');
      const currentAt = Date.parse(current?.createdAt ?? '');
      const safeRunAt = Number.isFinite(runAt) ? runAt : 0;
      const safeCurrentAt = Number.isFinite(currentAt) ? currentAt : 0;
      if (current === undefined || safeRunAt > safeCurrentAt) {
        map.set(run.campaignId, run);
      }
    });
    return map;
  }, [rawRuns]);
};

type AccountCampaignRowProps = {
  campaign: FilemakerEmailCampaign;
  latestRun: FilemakerEmailCampaignRun | null;
};

const getCampaignStatusVariant = (
  status: FilemakerEmailCampaign['status']
): 'default' | 'outline' | 'secondary' => {
  if (status === 'active') return 'default';
  if (status === 'paused') return 'secondary';
  return 'outline';
};

function AccountCampaignRow({ campaign, latestRun }: AccountCampaignRowProps): React.JSX.Element {
  return (
    <div className='rounded-md border border-border/60 bg-card/25 transition hover:border-border/80 hover:bg-card/40'>
      <Link
        href={`/admin/filemaker/campaigns/${encodeURIComponent(campaign.id)}`}
        className='flex min-h-10 items-center gap-3 px-3 py-2 text-sm'
      >
        <Megaphone className='size-4 shrink-0 text-muted-foreground' />
        <span className='min-w-0 flex-1 truncate font-medium text-foreground'>{campaign.name}</span>
        <Badge variant={getCampaignStatusVariant(campaign.status)} className='shrink-0 capitalize text-[10px]'>
          {campaign.status}
        </Badge>
        <Badge variant='outline' className='shrink-0 text-[10px] capitalize'>
          {campaign.launch.mode}
        </Badge>
      </Link>
      {latestRun !== null ? (
        <div className='flex items-center justify-between border-t border-border/40 px-3 py-1.5'>
          <span className='text-[10px] text-muted-foreground'>
            Last run: {formatTimestamp(latestRun.createdAt)} — {latestRun.status}
          </span>
          <Link
            href={`/admin/filemaker/campaigns/runs/${encodeURIComponent(latestRun.id)}`}
            className='text-[10px] text-sky-400 underline-offset-2 hover:text-sky-300 hover:underline'
          >
            View Run
          </Link>
        </div>
      ) : (
        <div className='border-t border-border/40 px-3 py-1.5 text-[10px] text-muted-foreground/60'>
          No runs yet
        </div>
      )}
    </div>
  );
}

function MailClientAccountCampaignsList({
  campaigns,
  latestRunByCampaignId,
}: {
  campaigns: FilemakerEmailCampaign[];
  latestRunByCampaignId: Map<string, FilemakerEmailCampaignRun>;
}): React.JSX.Element | null {
  if (campaigns.length === 0) return null;

  return (
    <div className='space-y-1.5'>
      {campaigns.map((campaign) => (
        <AccountCampaignRow
          key={campaign.id}
          campaign={campaign}
          latestRun={latestRunByCampaignId.get(campaign.id) ?? null}
        />
      ))}
    </div>
  );
}

export function MailClientAccountCampaignsPanel({
  accountId,
}: {
  accountId: string;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const allCampaigns = useMemo(
    () => parseFilemakerEmailCampaignRegistry(rawCampaigns).campaigns,
    [rawCampaigns]
  );
  const accountCampaigns = useMemo(
    () =>
      allCampaigns
        .filter((c) => c.mailAccountId === accountId)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [allCampaigns, accountId]
  );
  const latestRunByCampaignId = useLatestRunByCampaignId();
  const createHref = buildMailClientCreateCampaignHref({ accountId });

  return (
    <div className='space-y-2'>
      <div className='flex items-center justify-between'>
        <div className='text-xs uppercase tracking-[0.18em] text-gray-500'>
          Campaigns ({accountCampaigns.length})
        </div>
        <Button asChild variant='outline' size='sm'>
          <Link href={createHref}>
            <Plus className='mr-1 size-3' />
            Start Campaign
          </Link>
        </Button>
      </div>
      {accountCampaigns.length > 0 ? (
        <MailClientAccountCampaignsList
          campaigns={accountCampaigns}
          latestRunByCampaignId={latestRunByCampaignId}
        />
      ) : (
        <div className='rounded-md border border-dashed border-border/40 px-3 py-4 text-center text-xs text-muted-foreground'>
          No campaigns use this account as sender yet.{' '}
          <Link href={createHref} className='text-sky-400 underline underline-offset-2 hover:text-sky-300'>
            Start one now.
          </Link>
        </div>
      )}
    </div>
  );
}
