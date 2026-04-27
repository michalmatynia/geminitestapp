'use client';

import { ActionMenu } from '@/shared/ui/forms-and-actions.public';
import { Badge, DropdownMenuItem, useToast } from '@/shared/ui/primitives.public';
import { Megaphone } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useDeferredValue, useMemo, useState, startTransition } from 'react';

import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { FilemakerEntityTablePage } from '../components/shared/FilemakerEntityTablePage';
import {
  evaluateFilemakerEmailCampaignLaunch,
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  getFilemakerEmailCampaignDeliveriesForRun,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSchedulerStatus,
  parseFilemakerEmailCampaignSuppressionRegistry,
  isFilemakerEmailCampaignDeliverabilityDecisionEvent,
  resolveFilemakerEmailCampaignNextAutomationAt,
  resolveFilemakerEmailCampaignAudiencePreview,
  summarizeFilemakerEmailCampaignAnalytics,
  summarizeFilemakerEmailCampaignRunDeliveries,
  toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry,
  toPersistedFilemakerEmailCampaignDeliveryRegistry,
  toPersistedFilemakerEmailCampaignEventRegistry,
  toPersistedFilemakerEmailCampaignRegistry,
  toPersistedFilemakerEmailCampaignRunRegistry,
  toPersistedFilemakerEmailCampaignSchedulerStatus,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import {
  createDuplicatedCampaignDraft,
  removeCampaignArtifacts,
} from './AdminFilemakerCampaignEditPage.utils';

import type { FilemakerEmailCampaign, FilemakerEmailCampaignRun } from '../types';
import type { ColumnDef } from '@tanstack/react-table';

type CampaignRow = {
  campaign: FilemakerEmailCampaign;
  previewCount: number;
  isLaunchReady: boolean;
  latestRun: FilemakerEmailCampaignRun | null;
  analytics: ReturnType<typeof summarizeFilemakerEmailCampaignAnalytics>;
  nextAutomationAt: string | null;
  schedulerFailureMessage: string | null;
  deliverabilityDecisionCount: number;
  coldSuppressionCount: number;
};

const formatCampaignSenderAccountLabel = (mailAccountId: string | null | undefined): string => {
  const normalized = mailAccountId?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'Not assigned';
};

export function AdminFilemakerCampaignsPage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawAttempts = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
  const rawSchedulerStatus = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY);
  const rawSuppressions = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY);

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
  const attemptRegistry = useMemo(
    () => parseFilemakerEmailCampaignDeliveryAttemptRegistry(rawAttempts),
    [rawAttempts]
  );
  const eventRegistry = useMemo(
    () => parseFilemakerEmailCampaignEventRegistry(rawEvents),
    [rawEvents]
  );
  const suppressionRegistry = useMemo(
    () => parseFilemakerEmailCampaignSuppressionRegistry(rawSuppressions),
    [rawSuppressions]
  );
  const schedulerStatus = useMemo(
    () => parseFilemakerEmailCampaignSchedulerStatus(rawSchedulerStatus),
    [rawSchedulerStatus]
  );
  const latestSchedulerFailureByCampaignId = useMemo(() => {
    const map = new Map<string, string>();
    schedulerStatus.launchFailures.forEach((failure) => {
      if (!map.has(failure.campaignId)) {
        map.set(failure.campaignId, failure.message);
      }
    });
    return map;
  }, [schedulerStatus.launchFailures]);

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

  const persistCampaignRegistry = async (
    nextCampaigns: FilemakerEmailCampaign[]
  ): Promise<void> => {
    await updateSetting.mutateAsync({
      key: FILEMAKER_EMAIL_CAMPAIGNS_KEY,
      value: JSON.stringify(
        toPersistedFilemakerEmailCampaignRegistry({
          version: 1,
          campaigns: nextCampaigns,
        })
      ),
    });
  };

  const persistCampaignDeletion = async (campaignId: string, nextCampaigns: FilemakerEmailCampaign[]) => {
    const cleaned = removeCampaignArtifacts({
      campaignId,
      runRegistry,
      deliveryRegistry,
      attemptRegistry,
      eventRegistry,
      schedulerStatus,
    });

    await updateSetting.mutateAsync({
      key: FILEMAKER_EMAIL_CAMPAIGNS_KEY,
      value: JSON.stringify(
        toPersistedFilemakerEmailCampaignRegistry({
          version: 1,
          campaigns: nextCampaigns,
        })
      ),
    });
    await updateSetting.mutateAsync({
      key: FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
      value: JSON.stringify(toPersistedFilemakerEmailCampaignRunRegistry(cleaned.runRegistry)),
    });
    await updateSetting.mutateAsync({
      key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
      value: JSON.stringify(
        toPersistedFilemakerEmailCampaignDeliveryRegistry(cleaned.deliveryRegistry)
      ),
    });
    await updateSetting.mutateAsync({
      key: FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
      value: JSON.stringify(
        toPersistedFilemakerEmailCampaignDeliveryAttemptRegistry(cleaned.attemptRegistry)
      ),
    });
    await updateSetting.mutateAsync({
      key: FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
      value: JSON.stringify(toPersistedFilemakerEmailCampaignEventRegistry(cleaned.eventRegistry)),
    });
    await updateSetting.mutateAsync({
      key: FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
      value: JSON.stringify(
        toPersistedFilemakerEmailCampaignSchedulerStatus(cleaned.schedulerStatus)
      ),
    });
  };

  const handleDuplicateCampaign = async (campaign: FilemakerEmailCampaign): Promise<void> => {
    const duplicatedCampaign = createDuplicatedCampaignDraft({
      campaign,
      existingCampaigns: campaignRegistry.campaigns,
    });

    try {
      await persistCampaignRegistry(
        campaignRegistry.campaigns
          .concat(duplicatedCampaign)
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      toast(`Campaign duplicated as ${duplicatedCampaign.name}.`, { variant: 'success' });
      startTransition(() => { router.push(`/admin/filemaker/campaigns/${encodeURIComponent(duplicatedCampaign.id)}`); });
      settingsStore.refetch();
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to duplicate campaign.', {
        variant: 'error',
      });
    }
  };

  const handleToggleArchiveCampaign = async (campaign: FilemakerEmailCampaign): Promise<void> => {
    const nextCampaign = {
      ...campaign,
      status: campaign.status === 'archived' ? 'draft' : 'archived',
      approvalGrantedAt: campaign.status === 'archived' ? campaign.approvalGrantedAt : null,
      approvedBy: campaign.status === 'archived' ? campaign.approvedBy : null,
      updatedAt: new Date().toISOString(),
    } as FilemakerEmailCampaign;

    try {
      await persistCampaignRegistry(
        campaignRegistry.campaigns
          .filter((entry) => entry.id !== campaign.id)
          .concat(nextCampaign)
          .sort((left, right) => left.name.localeCompare(right.name))
      );
      toast(campaign.status === 'archived' ? 'Campaign restored to draft.' : 'Campaign archived.', {
        variant: 'success',
      });
      settingsStore.refetch();
    } catch (error: unknown) {
      logClientError(error);
      toast(error instanceof Error ? error.message : 'Failed to update campaign status.', {
        variant: 'error',
      });
    }
  };

  const handleDeleteCampaign = (campaign: FilemakerEmailCampaign): void => {
    confirm({
      title: 'Delete campaign?',
      message:
        'This will remove the campaign and its run history, delivery records, attempt history, events, and scheduler traces.',
      confirmText: 'Delete campaign',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await persistCampaignDeletion(
            campaign.id,
            campaignRegistry.campaigns.filter((entry) => entry.id !== campaign.id)
          );
          toast('Campaign deleted.', { variant: 'success' });
          settingsStore.refetch();
        } catch (error: unknown) {
          logClientError(error);
          toast(error instanceof Error ? error.message : 'Failed to delete campaign.', {
            variant: 'error',
          });
        }
      },
    });
  };

  const decisionCountByCampaignId = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    eventRegistry.events.forEach((event) => {
      if (isFilemakerEmailCampaignDeliverabilityDecisionEvent(event)) {
        map.set(event.campaignId, (map.get(event.campaignId) ?? 0) + 1);
      }
    });
    return map;
  }, [eventRegistry.events]);

  const coldCountByCampaignId = useMemo<Map<string, number>>(() => {
    const map = new Map<string, number>();
    suppressionRegistry.entries.forEach((entry) => {
      if (entry.reason === 'cold' && entry.campaignId) {
        map.set(entry.campaignId, (map.get(entry.campaignId) ?? 0) + 1);
      }
    });
    return map;
  }, [suppressionRegistry.entries]);

  const rows = useMemo<CampaignRow[]>(
    () =>
      campaignRegistry.campaigns
        .map((campaign: FilemakerEmailCampaign): CampaignRow => {
          const preview = resolveFilemakerEmailCampaignAudiencePreview(
            database,
            campaign.audience,
            suppressionRegistry
          );
          const launch = evaluateFilemakerEmailCampaignLaunch(campaign, preview, {
            senderAssignment: {
              requireAssignedMailAccount: true,
            },
          });
          return {
            campaign,
            previewCount: preview.recipients.length,
            isLaunchReady: launch.isEligible,
            latestRun: latestRunByCampaignId.get(campaign.id) ?? null,
            analytics: summarizeFilemakerEmailCampaignAnalytics({
              campaign,
              database,
              runRegistry,
              deliveryRegistry,
              eventRegistry,
              suppressionRegistry,
            }),
            nextAutomationAt: resolveFilemakerEmailCampaignNextAutomationAt(campaign),
            schedulerFailureMessage: latestSchedulerFailureByCampaignId.get(campaign.id) ?? null,
            deliverabilityDecisionCount: decisionCountByCampaignId.get(campaign.id) ?? 0,
            coldSuppressionCount: coldCountByCampaignId.get(campaign.id) ?? 0,
          };
        })
        .filter((row: CampaignRow): boolean =>
          includeQuery(
            [
              row.campaign.name,
              row.campaign.subject,
              row.campaign.status,
              row.latestRun?.status ?? '',
              row.campaign.launch.mode,
              row.nextAutomationAt ?? '',
              row.schedulerFailureMessage ?? '',
            ],
            deferredQuery
          )
        )
        .sort((left: CampaignRow, right: CampaignRow) =>
          left.campaign.name.localeCompare(right.campaign.name)
        ),
    [
      campaignRegistry.campaigns,
      coldCountByCampaignId,
      database,
      decisionCountByCampaignId,
      deferredQuery,
      deliveryRegistry,
      eventRegistry,
      latestSchedulerFailureByCampaignId,
      latestRunByCampaignId,
      runRegistry,
      suppressionRegistry,
    ]
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
            <div className='text-[11px] text-gray-500'>
              Sender: {formatCampaignSenderAccountLabel(row.original.campaign.mailAccountId)}
            </div>
            <div className='text-[11px] text-gray-500 capitalize'>
              Automation: {row.original.campaign.launch.mode}
            </div>
            <div className='text-[11px] text-gray-500'>
              Next due:{' '}
              {row.original.nextAutomationAt
                ? formatTimestamp(row.original.nextAutomationAt)
                : 'Manual only'}
            </div>
            <div className='text-[11px] text-gray-500'>
              Last checked: {formatTimestamp(row.original.campaign.lastEvaluatedAt)}
            </div>
            {row.original.schedulerFailureMessage ? (
              <div className='text-[11px] text-rose-400'>
                Scheduler failure: {row.original.schedulerFailureMessage}
              </div>
            ) : null}
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
            <div className='text-[11px] text-gray-500'>
              Suppressed in preview: {row.original.analytics.suppressionImpactCount}
            </div>
          </div>
        ),
      },
      {
        id: 'performance',
        header: 'Performance',
        cell: ({ row }) => (
          <div className='space-y-0.5'>
            <div className='text-[11px] text-gray-300'>
              Delivery rate: {row.original.analytics.deliveryRatePercent}%
            </div>
            <div className='text-[11px] text-gray-500'>
              Open rate: {row.original.analytics.openRatePercent}% • unique {row.original.analytics.uniqueOpenRatePercent}%
            </div>
            <div className='text-[11px] text-gray-500'>
              Click rate: {row.original.analytics.clickRatePercent}% • unique {row.original.analytics.uniqueClickRatePercent}%
            </div>
            <div className='text-[11px] text-gray-500'>
              Replies: {row.original.analytics.replyCount} ({row.original.analytics.replyRatePercent}%)
            </div>
            {row.original.analytics.topClickedLinks[0] ? (
              <div className='text-[11px] text-gray-500 break-all'>
                Top link: {row.original.analytics.topClickedLinks[0].clickCount} clicks
              </div>
            ) : null}
            <div
              className={
                row.original.analytics.bounceRatePercent > 5
                  ? 'text-[11px] font-medium text-red-300'
                  : row.original.analytics.bounceRatePercent > 1
                  ? 'text-[11px] text-amber-300'
                  : 'text-[11px] text-gray-500'
              }
            >
              Bounce rate: {row.original.analytics.bounceRatePercent}%
              {row.original.analytics.bounceRatePercent > 5 ? ' (deliverability risk)' : ''}
            </div>
            {row.original.deliverabilityDecisionCount > 0 ? (
              <div className='text-[11px] text-amber-300'>
                Deliverability decisions: {row.original.deliverabilityDecisionCount} (defers, throttles, circuit breaker)
              </div>
            ) : null}
            {row.original.coldSuppressionCount > 0 ? (
              <div className='text-[11px] text-gray-400'>
                Auto-suppressed (cold): {row.original.coldSuppressionCount}
              </div>
            ) : null}
            <div className='text-[11px] text-gray-500'>
              Opt-outs: {row.original.analytics.unsubscribeCount} ({row.original.analytics.unsubscribeRatePercent}%)
            </div>
            <div className='text-[11px] text-gray-500'>
              Restored: {row.original.analytics.resubscribeCount} ({row.original.analytics.resubscribeRatePercent}%)
            </div>
            <div className='text-[11px] text-gray-500'>
              Net opt-outs: {row.original.analytics.netUnsubscribeCount} ({row.original.analytics.netUnsubscribeRatePercent}%)
            </div>
            <div className='text-[11px] text-gray-500'>
              Runs: {row.original.analytics.totalRuns}
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
                    startTransition(() => { router.push(
                                                      `/admin/filemaker/campaigns/runs/${encodeURIComponent(
                                                        row.original.latestRun!.id
                                                      )}`
                                                    ); });
                  }}
                >
                  Open Run Monitor
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  startTransition(() => { router.push(
                                                `/admin/filemaker/campaigns/${encodeURIComponent(row.original.campaign.id)}`
                                              ); });
                }}
              >
                Edit Campaign
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  void handleDuplicateCampaign(row.original.campaign);
                }}
              >
                Duplicate Campaign
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  void handleToggleArchiveCampaign(row.original.campaign);
                }}
              >
                {row.original.campaign.status === 'archived' ? 'Restore Draft' : 'Archive Campaign'}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(event: Event): void => {
                  event.preventDefault();
                  handleDeleteCampaign(row.original.campaign);
                }}
              >
                Delete Campaign
              </DropdownMenuItem>
            </ActionMenu>
          </div>
        ),
      },
    ],
    [
      deliveryRegistry,
      handleDeleteCampaign,
      handleDuplicateCampaign,
      handleToggleArchiveCampaign,
      router,
    ]
  );

  const launchReadyCount = rows.filter((row: CampaignRow): boolean => row.isLaunchReady).length;

  const deliverabilitySummary = useMemo(() => {
    const highBounceCampaigns = rows.filter(
      (row) => row.analytics.bounceRatePercent > 5
    );
    const totalDecisions = rows.reduce(
      (sum, row) => sum + row.deliverabilityDecisionCount,
      0
    );
    const totalCold = rows.reduce((sum, row) => sum + row.coldSuppressionCount, 0);

    const activeRowsWithSendHistory = rows.filter(
      (row) =>
        row.campaign.status === 'active' && row.analytics.sentCount + row.analytics.bouncedCount > 0
    );
    const sumBounceRate = activeRowsWithSendHistory.reduce(
      (sum, row) => sum + row.analytics.bounceRatePercent,
      0
    );
    const sumOpenRate = activeRowsWithSendHistory.reduce(
      (sum, row) => sum + row.analytics.openRatePercent,
      0
    );
    const avgBounceRatePercent =
      activeRowsWithSendHistory.length === 0
        ? null
        : Math.round((sumBounceRate * 10) / activeRowsWithSendHistory.length) / 10;
    const avgOpenRatePercent =
      activeRowsWithSendHistory.length === 0
        ? null
        : Math.round((sumOpenRate * 10) / activeRowsWithSendHistory.length) / 10;

    return {
      highBounceCampaigns,
      totalDecisions,
      totalCold,
      avgBounceRatePercent,
      avgOpenRatePercent,
      activeWithHistoryCount: activeRowsWithSendHistory.length,
    };
  }, [rows]);

  const showDeliverabilityBanner =
    deliverabilitySummary.highBounceCampaigns.length > 0 ||
    deliverabilitySummary.totalDecisions > 0 ||
    deliverabilitySummary.totalCold > 0 ||
    deliverabilitySummary.activeWithHistoryCount > 0;
  const bannerSeverityIsError = deliverabilitySummary.highBounceCampaigns.length > 0;
  const bannerSeverityIsAmber =
    !bannerSeverityIsError &&
    (deliverabilitySummary.totalDecisions > 0 || deliverabilitySummary.totalCold > 0);

  return (
    <>
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
              startTransition(() => { router.push('/admin/filemaker/campaigns/new'); });
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
        headerSlot={
          showDeliverabilityBanner ? (
            <div
              role='status'
              className={
                bannerSeverityIsError
                  ? 'rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200'
                  : bannerSeverityIsAmber
                  ? 'rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200'
                  : 'rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200'
              }
            >
              <div className='flex flex-wrap items-center justify-between gap-2'>
                <span className='font-medium'>
                  {bannerSeverityIsError
                    ? 'Deliverability watch — action recommended'
                    : bannerSeverityIsAmber
                    ? 'Deliverability watch'
                    : 'Deliverability summary'}
                </span>
                {deliverabilitySummary.activeWithHistoryCount > 0 ? (
                  <span className='text-[10px] opacity-80'>
                    Across {deliverabilitySummary.activeWithHistoryCount} active campaign
                    {deliverabilitySummary.activeWithHistoryCount === 1 ? '' : 's'} with send history:{' '}
                    avg open {deliverabilitySummary.avgOpenRatePercent ?? 0}% • avg bounce{' '}
                    {deliverabilitySummary.avgBounceRatePercent ?? 0}%
                  </span>
                ) : null}
              </div>
              <ul className='mt-1 list-disc pl-4'>
                {deliverabilitySummary.highBounceCampaigns.length > 0 ? (
                  <li>
                    {deliverabilitySummary.highBounceCampaigns.length} campaign
                    {deliverabilitySummary.highBounceCampaigns.length === 1 ? '' : 's'} over 5% bounce rate:{' '}
                    {deliverabilitySummary.highBounceCampaigns.slice(0, 3).map((row, index) => (
                      <React.Fragment key={row.campaign.id}>
                        {index > 0 ? ', ' : null}
                        <button
                          type='button'
                          onClick={(): void => {
                            startTransition(() => {
                              router.push(
                                `/admin/filemaker/campaigns/${encodeURIComponent(row.campaign.id)}`
                              );
                            });
                          }}
                          className='underline-offset-2 hover:underline focus:underline focus:outline-none'
                        >
                          {row.campaign.name} ({row.analytics.bounceRatePercent}%)
                        </button>
                      </React.Fragment>
                    ))}
                    {deliverabilitySummary.highBounceCampaigns.length > 3 ? ', …' : ''}
                  </li>
                ) : null}
                {deliverabilitySummary.totalDecisions > 0 ? (
                  <li>
                    {deliverabilitySummary.totalDecisions} runtime deliverability decision
                    {deliverabilitySummary.totalDecisions === 1 ? '' : 's'} (defers, throttles, circuit
                    breaker) — open the run page to investigate.
                  </li>
                ) : null}
                {deliverabilitySummary.totalCold > 0 ? (
                  <li>
                    {deliverabilitySummary.totalCold} address
                    {deliverabilitySummary.totalCold === 1 ? '' : 'es'} auto-suppressed for low engagement
                    (cold).
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null
        }
      />
      <ConfirmationModal />
    </>
  );
}
