'use client';

import { ActionMenu, Badge, DropdownMenuItem } from '@/shared/ui';
import { Megaphone } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';
import {
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  resolveFilemakerEmailCampaignAudiencePreview,
  summarizeFilemakerEmailCampaignRunDeliveries,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';

import type { FilemakerEmailCampaign, FilemakerEmailCampaignRun } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

type CampaignRow = {
  campaign: FilemakerEmailCampaign;
  previewCount: number;
  isLaunchReady: boolean;
  latestRun: FilemakerEmailCampaignRun | null;
};

export function AdminFilemakerCampaignsPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);

  const database = useMemo(() => parseFilemakerDatabase(rawDatabase), [rawDatabase]);
  const campaignRegistry = useMemo(
    () => parseFilemakerEmailCampaignRegistry(rawCampaigns),
    [rawCampaigns]
  );
  const runRegistry = useMemo(
    () => parseFilemakerEmailCampaignRunRegistry(rawRuns),
    [rawRuns]
  );
  const deliveryRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries),
    [rawDeliveries]
  );

  const latestRunByCampaignId = useMemo(() => {
    const map = new Map<string, FilemakerEmailCampaignRun>();
    runRegistry.runs.forEach((run: FilemakerEmailCampaignRun): void => {
      const current = map.get(run.campaignId);
      if (!current) {
        map.set(run.campaignId, run);
        return;
      }
      const currentTime = Date.parse(current.createdAt ?? '');
      const nextTime = Date.parse(run.createdAt ?? '');
      if ((Number.isNaN(currentTime) ? 0 : currentTime) < (Number.isNaN(nextTime) ? 0 : nextTime)) {
        map.set(run.campaignId, run);
      }
    });
    return map;
  }, [runRegistry.runs]);

  const rows = useMemo<CampaignRow[]>(
    () =>
      campaignRegistry.campaigns
        .map((campaign: FilemakerEmailCampaign): CampaignRow => {
          const preview = resolveFilemakerEmailCampaignAudiencePreview(database, campaign.audience);
          const launch = evaluateFilemakerEmailCampaignLaunch(campaign, preview);
          return {
            campaign,
            previewCount: preview.recipients.length,
            isLaunchReady: launch.isEligible,
            latestRun: latestRunByCampaignId.get(campaign.id) ?? null,
          };
        })
        .filter((row: CampaignRow): boolean =>
          includeQuery(
            [
              row.campaign.name,
              row.campaign.subject,
              row.campaign.status,
              row.latestRun?.status ?? '',
            ],
            deferredQuery
          )
        )
        .sort((left: CampaignRow, right: CampaignRow) =>
          left.campaign.name.localeCompare(right.campaign.name)
        ),
    [campaignRegistry.campaigns, database, deferredQuery, latestRunByCampaignId]
  );

  const columns = useMemo<ColumnDef<CampaignRow>[]>(
    () => [
      {
        id: 'campaign',
        header: 'Campaign',
        cell: ({ row }) => (
          <div className='min-w-0 flex-1 space-y-1'>
            <div className='text-sm font-semibold text-white'>{row.original.campaign.name}</div>
            <div className='text-[11px] text-gray-500'>{row.original.campaign.subject || 'No subject yet'}</div>
          </div>
        ),
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className='space-y-1'>
            <Badge variant='outline' className='text-[10px] capitalize'>
              {row.original.campaign.status}
            </Badge>
            <div className='text-[11px] text-gray-500'>
              {row.original.isLaunchReady ? 'Ready to launch' : 'Blocked by launch conditions'}
            </div>
          </div>
        ),
      },
      {
        id: 'audience',
        header: 'Audience',
        cell: ({ row }) => (
          <div className='space-y-0.5'>
            <div className='text-[11px] text-gray-500'>
              Preview recipients: {row.original.previewCount}
            </div>
            <div className='text-[11px] text-gray-500'>
              Min audience: {row.original.campaign.launch.minAudienceSize}
            </div>
          </div>
        ),
      },
      {
        id: 'latest-run',
        header: 'Latest Run',
        cell: ({ row }) => {
          if (!row.original.latestRun) {
            return <span className='text-[11px] text-gray-500'>No runs yet</span>;
          }
          const deliveries = getFilemakerEmailCampaignDeliveriesForRun(
            deliveryRegistry,
            row.original.latestRun.id
          );
          const metrics =
            deliveries.length > 0
              ? summarizeFilemakerEmailCampaignRunDeliveries(deliveries)
              : {
                  recipientCount: row.original.latestRun.recipientCount,
                  deliveredCount: row.original.latestRun.deliveredCount,
                  failedCount: row.original.latestRun.failedCount,
                  skippedCount: row.original.latestRun.skippedCount,
                };
          return (
            <div className='space-y-0.5'>
              <div className='text-[11px] capitalize text-gray-300'>
                {row.original.latestRun.status}
              </div>
              <div className='text-[11px] text-gray-500'>
                {metrics.deliveredCount + metrics.failedCount + metrics.skippedCount}/
                {metrics.recipientCount} processed
              </div>
            </div>
          );
        },
      },
      {
        accessorFn: (row) => row.campaign.updatedAt ?? row.campaign.createdAt ?? '',
        id: 'updated',
        header: 'Updated',
        cell: ({ row }) => (
          <span className='text-[10px] text-gray-600'>
            {formatTimestamp(row.original.campaign.updatedAt ?? row.original.campaign.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end'>
            <ActionMenu ariaLabel={`Actions for campaign ${row.original.campaign.name}`}>
              {row.original.latestRun ? (
                <DropdownMenuItem
                  onSelect={(event: Event): void => {
                    event.preventDefault();
                    router.push(
                      `/admin/filemaker/campaigns/runs/${encodeURIComponent(
                        row.original.latestRun!.id
                      )}`
                    );
                  }}
                >
                  Open Run Monitor
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  router.push(
                    `/admin/filemaker/campaigns/${encodeURIComponent(row.original.campaign.id)}`
                  );
                }}
              >
                Edit Campaign
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [deliveryRegistry, router]
  );

  const launchReadyCount = rows.filter((row: CampaignRow): boolean => row.isLaunchReady).length;

  return (
    <FilemakerEntityTablePage
      title='Filemaker Campaigns'
      description='Build campaign content, configure launch conditions, preview the audience, and monitor delivery runs.'
      icon={<Megaphone className='size-4' />}
      actions={[
        {
          key: 'create',
          label: 'New Campaign',
          icon: <Megaphone className='size-4' />,
          onClick: (): void => {
            router.push('/admin/filemaker/campaigns/new');
          },
        },
        ...buildFilemakerNavActions(router, 'campaigns'),
      ]}
      badges={
        <>
          <Badge variant='outline' className='text-[10px]'>
            Campaigns: {rows.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Runs: {runRegistry.runs.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Ready: {launchReadyCount}
          </Badge>
        </>
      }
      query={query}
      onQueryChange={setQuery}
      queryPlaceholder='Search campaign name, subject, or status...'
      columns={columns}
      data={rows}
      isLoading={settingsStore.isLoading}
      emptyTitle={query ? 'No campaigns found' : 'No campaigns yet'}
      emptyDescription={
        query
          ? 'Try adjusting your search terms.'
          : 'Create your first Filemaker email campaign to start previewing audiences and monitoring runs.'
      }
    />
  );
}
