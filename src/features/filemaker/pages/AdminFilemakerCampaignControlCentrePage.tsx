'use client';

import { ShieldAlert, Activity } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, { useDeferredValue, useMemo, useState, startTransition } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { InsetPanel, SectionHeader } from '@/shared/ui/navigation-and-layout.public';
import { PanelHeader, StandardDataTablePanel } from '@/shared/ui/templates.public';
import { SearchInput } from '@/shared/ui/forms-and-actions.public';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { AdminFilemakerCampaignSuppressionSignalsPanel } from './AdminFilemakerCampaignSuppressionSignalsPanel';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERY_ATTEMPTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SCHEDULER_STATUS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryAttemptRegistry,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSchedulerStatus,
  parseFilemakerEmailCampaignSuppressionRegistry,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERABILITY_DECISION_EVENT_LABEL,
  isFilemakerEmailCampaignDeliverabilityDecisionEvent,
  resolveFilemakerEmailCampaignNextAutomationAt,
  summarizeFilemakerEmailCampaignDeliverabilityOverview,
  type FilemakerEmailCampaignDomainDeliverability,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';
import type { ColumnDef } from '@tanstack/react-table';
import type {
  FilemakerEmailCampaignEvent,
  FilemakerEmailCampaignEventRegistry,
} from '../types';

export function AdminFilemakerCampaignControlCentrePage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
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

  const campaignNameById = useMemo<Map<string, string>>(() => {
    const map = new Map<string, string>();
    campaignRegistry.campaigns.forEach((campaign) => {
      map.set(campaign.id, campaign.name);
    });
    return map;
  }, [campaignRegistry.campaigns]);

  const overview = useMemo(
    () =>
      summarizeFilemakerEmailCampaignDeliverabilityOverview({
        database,
        campaignRegistry,
        runRegistry,
        deliveryRegistry,
        attemptRegistry,
        eventRegistry,
        suppressionRegistry,
      }),
    [
      attemptRegistry,
      campaignRegistry,
      database,
      deliveryRegistry,
      eventRegistry,
      runRegistry,
      suppressionRegistry,
    ]
  );

  const filteredAlerts = useMemo(
    () =>
      overview.alerts.filter((alert) =>
        includeQuery(
          [
            alert.title,
            alert.message,
            alert.campaignName ?? '',
            alert.domain ?? '',
            alert.code,
            alert.level,
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.alerts]
  );

  const filteredCampaignHealth = useMemo(
    () =>
      overview.campaignHealth.filter((campaign) =>
        includeQuery(
          [
            campaign.campaignName,
            campaign.alertLevel,
            campaign.status,
            campaign.latestRunStatus ?? '',
            String(campaign.pendingRetryCount),
            String(campaign.overdueRetryCount),
            String(campaign.rateLimitedRetryCount),
            campaign.nextScheduledRetryAt ?? '',
            campaign.oldestOverdueRetryAt ?? '',
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.campaignHealth]
  );

  const filteredDomainHealth = useMemo(
    () =>
      overview.domainHealth.filter((domain) =>
        includeQuery(
          [
            domain.domain,
            domain.alertLevel,
            String(domain.pendingRetryCount),
            String(domain.overdueRetryCount),
            String(domain.rateLimitedRetryCount),
            domain.nextScheduledRetryAt ?? '',
            domain.oldestOverdueRetryAt ?? '',
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.domainHealth]
  );

  const filteredDeliveryIssues = useMemo(
    () =>
      overview.recentDeliveryIssues.filter((issue) =>
        includeQuery(
          [
            issue.campaignName ?? '',
            issue.emailAddress,
            issue.domain,
            issue.status,
            issue.provider ?? '',
            issue.failureCategory ?? '',
            issue.message,
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.recentDeliveryIssues]
  );

  const filteredRecentAttempts = useMemo(
    () =>
      overview.recentAttempts.filter((attempt) =>
        includeQuery(
          [
            attempt.campaignName ?? '',
            attempt.emailAddress,
            attempt.domain,
            attempt.status,
            attempt.provider ?? '',
            attempt.failureCategory ?? '',
            attempt.message,
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.recentAttempts]
  );
  const filteredScheduledRetries = useMemo(
    () =>
      overview.scheduledRetries.filter((retry) =>
        includeQuery(
          [
            retry.campaignName ?? '',
            retry.emailAddress,
            retry.domain,
            retry.failureCategory ?? '',
            retry.status,
            retry.runId,
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.scheduledRetries]
  );

  const atRiskCampaignCount = useMemo(
    () =>
      overview.campaignHealth.filter((campaign) => campaign.alertLevel !== 'healthy').length,
    [overview.campaignHealth]
  );
  const automationSchedule = useMemo(
    () =>
      campaignRegistry.campaigns
        .map((campaign) => ({
          campaignId: campaign.id,
          campaignName: campaign.name,
          nextAutomationAt: resolveFilemakerEmailCampaignNextAutomationAt(campaign),
        }))
        .filter(
          (entry): entry is { campaignId: string; campaignName: string; nextAutomationAt: string } =>
            entry.nextAutomationAt != null
        )
        .sort(
          (left, right) =>
            Date.parse(left.nextAutomationAt) - Date.parse(right.nextAutomationAt)
        ),
    [campaignRegistry.campaigns]
  );
  const nextAutomation = automationSchedule[0] ?? null;
  const filteredSchedulerFailures = useMemo(
    () =>
      schedulerStatus.launchFailures.filter((failure) =>
        includeQuery(
          [
            campaignRegistry.campaigns.find((campaign) => campaign.id === failure.campaignId)?.name ?? '',
            failure.campaignId,
            failure.message,
          ],
          deferredQuery
        )
      ),
    [campaignRegistry.campaigns, deferredQuery, schedulerStatus.launchFailures]
  );

  const domainColumns = useMemo<ColumnDef<FilemakerEmailCampaignDomainDeliverability>[]>(
    () => [
      {
        accessorKey: 'domain',
        header: 'Domain',
        cell: ({ row }) => <span className='font-medium text-white'>{row.original.domain}</span>,
      },
      {
        accessorKey: 'alertLevel',
        header: 'Health',
        cell: ({ row }) => (
          <Badge variant='outline' className='text-[10px] uppercase'>
            {row.original.alertLevel}
          </Badge>
        ),
      },
      {
        accessorKey: 'totalDeliveries',
        header: 'Deliveries',
      },
      {
        id: 'accepted',
        header: 'Accepted',
        cell: ({ row }) => (
          <span>
            {row.original.sentCount} ({row.original.deliveryRatePercent}%)
          </span>
        ),
      },
      {
        accessorKey: 'failureRatePercent',
        header: 'Failure Rate',
        cell: ({ row }) => <span>{row.original.failureRatePercent}%</span>,
      },
      {
        accessorKey: 'bounceRatePercent',
        header: 'Bounce Rate',
        cell: ({ row }) => <span>{row.original.bounceRatePercent}%</span>,
      },
      {
        id: 'pendingRetries',
        header: 'Pending Retries',
        cell: ({ row }) => {
          const domain = row.original;
          return (
            <div className='space-y-0.5'>
              <div>{domain.pendingRetryCount}</div>
              {domain.rateLimitedRetryCount > 0 && (
                <div className='text-[10px] text-amber-300'>
                  {domain.rateLimitedRetryCount} rate-limited
                </div>
              )}
              {domain.overdueRetryCount > 0 && (
                <div className='text-[10px] text-rose-400'>{domain.overdueRetryCount} overdue</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'suppressionCount',
        header: 'Suppressed',
      },
      {
        accessorKey: 'latestDeliveryAt',
        header: 'Latest',
        cell: ({ row }) => (
          <span className='text-gray-500'>{formatTimestamp(row.original.latestDeliveryAt)}</span>
        ),
      },
    ],
    []
  );

  return (
    <div className='page-section-compact space-y-6'>
      <PanelHeader
        title='Filemaker Email Control Centre'
        description='Measure deliverability, spot bounce and failure spikes, and inspect domain-level email health across all Filemaker campaigns.'
        icon={<ShieldAlert className='size-4' />}
        actions={buildFilemakerNavActions(router, 'control-centre')}
      />

      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge variant='outline' className='text-[10px]'>
            Campaigns: {overview.campaignCount}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Live Runs: {overview.liveRunCount}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Alerts: {overview.alerts.length}
          </Badge>
          <Badge variant='outline' className='text-[10px]'>
            Domains: {overview.domainHealth.length}
          </Badge>
        </div>
        <div className='w-full max-w-sm'>
          <SearchInput
            value={query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>): void => {
              setQuery(event.target.value);
            }}
            onClear={() => setQuery('')}
            placeholder='Search alerts, campaigns, domains, or addresses...'
            aria-label='Search alerts, campaigns, domains, or addresses...'
            size='sm'
          />
        </div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-6'>
        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
            Accepted delivery
          </div>
          <div className='text-2xl font-semibold text-white'>
            {overview.deliveryRatePercent}%
          </div>
          <div className='text-sm text-gray-400'>
            {overview.acceptedCount} accepted out of {overview.totalRecipients} deliveries.
          </div>
        </InsetPanel>

        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
            Bounce and failure pressure
          </div>
          <div className='text-2xl font-semibold text-white'>
            {overview.bounceRatePercent}% / {overview.failureRatePercent}%
          </div>
          <div className='text-sm text-gray-400'>
            {overview.bouncedCount} bounced and {overview.failedCount} failed.
          </div>
        </InsetPanel>

        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
            Queue backlog
          </div>
          <div className='text-2xl font-semibold text-white'>{overview.queuedCount}</div>
          <div className='text-sm text-gray-400'>
            {overview.oldestQueuedAgeMinutes != null
              ? `Oldest queued delivery is ${overview.oldestQueuedAgeMinutes} minutes old.`
              : 'No queued deliveries right now.'}
          </div>
        </InsetPanel>

        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
            Attempts and retries
          </div>
          <div className='text-2xl font-semibold text-white'>{overview.totalAttempts}</div>
          <div className='text-sm text-gray-400'>
            {overview.retriedDeliveryCount} retried deliveries, {overview.recoveredAfterRetryCount} recovered after retry.
            {' '}
            {overview.retryEligibleCount} retryable now, {overview.retryExhaustedCount} exhausted.
            {' '}
            {overview.rateLimitedRetryCount > 0
              ? `${overview.rateLimitedRetryCount} rate-limited. `
              : ''}
            {overview.overdueRetryCount > 0
              ? `${overview.overdueRetryCount} overdue. `
              : ''}
            {overview.oldestOverdueRetryAgeMinutes != null
              ? `Oldest overdue retry is ${overview.oldestOverdueRetryAgeMinutes} minutes late. `
              : ''}
            {overview.nextScheduledRetryAt
              ? `Next retry ${formatTimestamp(overview.nextScheduledRetryAt)}.`
              : 'No retry window is currently scheduled.'}
          </div>
        </InsetPanel>

        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
            Suppression pressure
          </div>
          <div className='text-2xl font-semibold text-white'>
            {overview.suppressionRatePercent}%
          </div>
          <div className='text-sm text-gray-400'>
            {overview.suppressionCount} suppressed addresses. At-risk campaigns: {atRiskCampaignCount}.
          </div>
        </InsetPanel>

        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
            Automation tick
          </div>
          <div className='text-2xl font-semibold text-white'>
            {schedulerStatus.lastCompletedAt ? formatTimestamp(schedulerStatus.lastCompletedAt) : 'Pending'}
          </div>
          <div className='text-sm text-gray-400'>
            {schedulerStatus.lastCompletedAt
              ? `${schedulerStatus.launchedRuns.length} launches after evaluating ${schedulerStatus.evaluatedCampaignCount} campaigns.`
              : 'The scheduler has not completed a tick yet.'}
            {' '}
            {nextAutomation
              ? `Next automation: ${nextAutomation.campaignName} at ${formatTimestamp(nextAutomation.nextAutomationAt)}.`
              : 'No future automation windows are currently scheduled.'}
          </div>
        </InsetPanel>
      </div>

      <AdminFilemakerCampaignSuppressionSignalsPanel
        overview={overview}
        onOpenSuppressions={(): void => {
          startTransition(() => {
            router.push('/admin/filemaker/campaigns/suppressions');
          });
        }}
      />

      <RuntimeDecisionsPanel
        eventRegistry={eventRegistry}
        campaignNameById={campaignNameById}
        onOpenRun={(runId: string): void => {
          startTransition(() => {
            router.push(`/admin/filemaker/campaigns/runs/${encodeURIComponent(runId)}`);
          });
        }}
      />

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Automation Scheduler'
          description='Monitor the campaign scheduler, upcoming automated launches, and launch failures caught on the last tick.'
          size='sm'
        />
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
          <InsetPanel padding='md' className='space-y-2'>
            <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>Last success</div>
            <div className='text-lg font-semibold text-white'>
              {formatTimestamp(schedulerStatus.lastSuccessfulAt)}
            </div>
          </InsetPanel>
          <InsetPanel padding='md' className='space-y-2'>
            <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>Due campaigns</div>
            <div className='text-lg font-semibold text-white'>{schedulerStatus.dueCampaignCount}</div>
          </InsetPanel>
          <InsetPanel padding='md' className='space-y-2'>
            <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>Queued dispatches</div>
            <div className='text-lg font-semibold text-white'>{schedulerStatus.queuedDispatchCount}</div>
          </InsetPanel>
          <InsetPanel padding='md' className='space-y-2'>
            <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>Inline dispatches</div>
            <div className='text-lg font-semibold text-white'>{schedulerStatus.inlineDispatchCount}</div>
          </InsetPanel>
        </div>
        {filteredSchedulerFailures.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No scheduler launch failures match the current filter.
          </div>
        ) : (
          <div className='grid gap-3 lg:grid-cols-2'>
            {filteredSchedulerFailures.map((failure) => {
              const campaignName =
                campaignRegistry.campaigns.find((campaign) => campaign.id === failure.campaignId)?.name ??
                failure.campaignId;
              return (
                <div
                  key={`${failure.campaignId}-${failure.message}`}
                  className='rounded-xl border border-border/50 bg-background/30 p-4 space-y-3'
                >
                  <div className='flex flex-wrap items-center gap-2'>
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      launch failure
                    </Badge>
                  </div>
                  <div className='space-y-1'>
                    <div className='text-sm font-medium text-white'>{campaignName}</div>
                    <div className='text-sm leading-6 text-gray-300'>{failure.message}</div>
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={(): void => {
                      startTransition(() => { router.push(
                                                `/admin/filemaker/campaigns/${encodeURIComponent(failure.campaignId)}`
                                              ); });
                    }}
                  >
                    Open Campaign
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </InsetPanel>

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Failure Classification'
          description='Break failures down into bounce, rejection, timeout, and rate-limit categories so deliverability issues are diagnosable.'
          size='sm'
        />
        {overview.failureCategoryBreakdown.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No classified failures yet.
          </div>
        ) : (
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            {overview.failureCategoryBreakdown.map((entry) => (
              <InsetPanel key={entry.category} padding='md' className='space-y-2'>
                <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
                  {entry.category.replaceAll('_', ' ')}
                </div>
                <div className='text-2xl font-semibold text-white'>{entry.count}</div>
              </InsetPanel>
            ))}
          </div>
        )}
      </InsetPanel>

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Provider Paths'
          description='Compare SMTP and webhook attempt volume and see where failures are concentrating.'
          size='sm'
        />
        {overview.providerBreakdown.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No provider-level delivery attempts have been recorded yet.
          </div>
        ) : (
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
            {overview.providerBreakdown.map((entry) => (
              <InsetPanel key={entry.provider} padding='md' className='space-y-2'>
                <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>
                  {entry.provider}
                </div>
                <div className='text-2xl font-semibold text-white'>{entry.attemptCount}</div>
                <div className='text-sm text-gray-400'>
                  {entry.sentCount} sent • {entry.failedCount} failed • {entry.bouncedCount} bounced
                </div>
              </InsetPanel>
            ))}
          </div>
        )}
      </InsetPanel>

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Scheduled Retries'
          description='These deliveries are waiting for the next retry window based on the backoff policy.'
          size='sm'
        />
        {filteredScheduledRetries.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No deliveries are currently waiting for a scheduled retry.
          </div>
        ) : (
          <div className='grid gap-3 lg:grid-cols-2'>
            {filteredScheduledRetries.map((retry) => (
              <div
                key={retry.deliveryId}
                className='rounded-xl border border-border/50 bg-background/30 p-4 space-y-3'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    {retry.status}
                  </Badge>
                  {retry.failureCategory ? (
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      {retry.failureCategory.replaceAll('_', ' ')}
                    </Badge>
                  ) : null}
                  {Date.parse(retry.nextRetryAt) <= Date.now() ? (
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      overdue
                    </Badge>
                  ) : null}
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    attempt {retry.attemptCount}
                  </Badge>
                </div>
                <div className='space-y-1'>
                  <div className='text-sm font-medium text-white'>{retry.emailAddress}</div>
                  <div className='text-[11px] text-gray-500'>
                    {retry.campaignName ?? retry.campaignId} • {retry.domain}
                  </div>
                  <div className='text-[11px] text-gray-500'>
                    Next retry: {formatTimestamp(retry.nextRetryAt)}
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={(): void => {
                      startTransition(() => { router.push(
                                                `/admin/filemaker/campaigns/${encodeURIComponent(retry.campaignId)}`
                                              ); });
                    }}
                  >
                    Open Campaign
                  </Button>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={(): void => {
                      startTransition(() => { router.push(
                                                `/admin/filemaker/campaigns/runs/${encodeURIComponent(retry.runId)}`
                                              ); });
                    }}
                  >
                    Open Run
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </InsetPanel>

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Active Alerts'
          description='Alerts highlight campaigns, domains, or queue states that need operator attention.'
          size='sm'
        />
        {filteredAlerts.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No deliverability alerts match the current filter.
          </div>
        ) : (
          <div className='grid gap-3 lg:grid-cols-2'>
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className='rounded-xl border border-border/50 bg-background/30 p-4 space-y-3'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    {alert.level}
                  </Badge>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    {alert.code.replaceAll('_', ' ')}
                  </Badge>
                  {alert.domain ? (
                    <Badge variant='outline' className='text-[10px]'>
                      {alert.domain}
                    </Badge>
                  ) : null}
                </div>
                <div className='space-y-1'>
                  <div className='text-sm font-medium text-white'>{alert.title}</div>
                  <div className='text-sm leading-6 text-gray-300'>{alert.message}</div>
                </div>
                {alert.campaignId ? (
                  <div>
                    <Button
                      type='button'
                      size='sm'
                      variant='outline'
                      onClick={(): void => {
                        startTransition(() => { router.push(
                                                    `/admin/filemaker/campaigns/${encodeURIComponent(alert.campaignId ?? '')}`
                                                  ); });
                      }}
                    >
                      Open Campaign
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </InsetPanel>

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Campaign Health'
          description='Use this view to identify campaigns that are accepting mail cleanly versus campaigns generating bounces or failures.'
          size='sm'
        />
        {filteredCampaignHealth.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No campaigns match the current filter.
          </div>
        ) : (
          <div className='grid gap-3'>
            {filteredCampaignHealth.map((campaign) => (
              <div
                key={campaign.campaignId}
                className='rounded-xl border border-border/50 bg-background/30 p-4'
              >
                <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
                  <div className='space-y-1'>
                    <div className='flex flex-wrap items-center gap-2'>
                      <div className='text-sm font-semibold text-white'>{campaign.campaignName}</div>
                      <Badge variant='outline' className='text-[10px] uppercase'>
                        {campaign.alertLevel}
                      </Badge>
                      <Badge variant='outline' className='text-[10px] capitalize'>
                        {campaign.status}
                      </Badge>
                      {campaign.latestRunStatus ? (
                        <Badge variant='outline' className='text-[10px] capitalize'>
                          latest run: {campaign.latestRunStatus}
                        </Badge>
                      ) : null}
                    </div>
                    <div className='text-[11px] text-gray-500'>
                      Latest run: {formatTimestamp(campaign.latestRunAt)}
                    </div>
                  </div>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={(): void => {
                      startTransition(() => { router.push(
                                                `/admin/filemaker/campaigns/${encodeURIComponent(campaign.campaignId)}`
                                              ); });
                    }}
                  >
                    Open Campaign
                  </Button>
                </div>
                <div className='mt-4 grid gap-3 md:grid-cols-5'>
                  <div>
                    <div className='text-[11px] text-gray-500'>Accepted</div>
                    <div className='text-sm text-white'>
                      {campaign.sentCount} ({campaign.deliveryRatePercent}%)
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] text-gray-500'>Failed/Bounced</div>
                    <div className='text-sm text-white'>
                      {campaign.failedCount + campaign.bouncedCount} ({campaign.failureRatePercent}%)
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] text-gray-500'>Bounce Rate</div>
                    <div className='text-sm text-white'>{campaign.bounceRatePercent}%</div>
                  </div>
                  <div>
                    <div className='text-[11px] text-gray-500'>Queued / Suppressed</div>
                    <div className='text-sm text-white'>
                      {campaign.queuedCount} queued • {campaign.suppressionImpactCount} suppressed
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] text-gray-500'>Pending Retries</div>
                    <div className='text-sm text-white'>
                      {campaign.pendingRetryCount}
                      {campaign.overdueRetryCount > 0
                        ? ` • ${campaign.overdueRetryCount} overdue`
                        : ''}
                      {campaign.rateLimitedRetryCount > 0
                        ? ` • ${campaign.rateLimitedRetryCount} rate-limited`
                        : ''}
                      {campaign.oldestOverdueRetryAt
                        ? ` • oldest overdue ${formatTimestamp(campaign.oldestOverdueRetryAt)}`
                        : ''}
                      {campaign.nextScheduledRetryAt
                        ? ` • next ${formatTimestamp(campaign.nextScheduledRetryAt)}`
                        : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </InsetPanel>

      <StandardDataTablePanel
        title='Domain Health'
        description='This is the fastest way to spot recipient-domain problems when mail is coming back.'
        headerActions={<Activity className='size-4 text-gray-500' />}
        columns={domainColumns}
        data={filteredDomainHealth}
        isLoading={settingsStore.isLoading}
        variant='flat'
        emptyState={
          <div className='p-8 text-center text-sm text-gray-500'>
            No recipient domains match the current filter.
          </div>
        }
      />

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Recent Delivery Attempts'
          description='Each attempt is logged so retry and recovery patterns are visible, not just the final delivery state.'
          size='sm'
        />
        {filteredRecentAttempts.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No recent delivery attempts match the current filter.
          </div>
        ) : (
          <div className='grid gap-3'>
            {filteredRecentAttempts.map((attempt) => (
              <div
                key={attempt.attemptId}
                className='rounded-xl border border-border/50 bg-background/30 p-4'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    attempt {attempt.attemptNumber}
                  </Badge>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    {attempt.status}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    {attempt.domain}
                  </Badge>
                  {attempt.provider ? (
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      {attempt.provider}
                    </Badge>
                  ) : null}
                  {attempt.failureCategory ? (
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      {attempt.failureCategory.replaceAll('_', ' ')}
                    </Badge>
                  ) : null}
                  <div className='text-[11px] text-gray-500'>
                    {formatTimestamp(attempt.attemptedAt)}
                  </div>
                </div>
                <div className='mt-2 text-sm font-medium text-white'>{attempt.emailAddress}</div>
                <div className='mt-1 text-[12px] text-gray-400'>
                  {attempt.campaignName ?? attempt.campaignId}
                </div>
                <div className='mt-2 text-sm leading-6 text-gray-300'>{attempt.message}</div>
              </div>
            ))}
          </div>
        )}
      </InsetPanel>

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Recent Delivery Issues'
          description='Recent failed and bounced deliveries make it easier to see exactly what is coming back.'
          size='sm'
        />
        {filteredDeliveryIssues.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No recent failed or bounced deliveries match the current filter.
          </div>
        ) : (
          <div className='grid gap-3'>
            {filteredDeliveryIssues.map((issue) => (
              <div
                key={issue.deliveryId}
                className='rounded-xl border border-border/50 bg-background/30 p-4'
              >
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge variant='outline' className='text-[10px] uppercase'>
                    {issue.status}
                  </Badge>
                  <Badge variant='outline' className='text-[10px]'>
                    {issue.domain}
                  </Badge>
                  {issue.provider ? (
                    <Badge variant='outline' className='text-[10px] uppercase'>
                      {issue.provider}
                    </Badge>
                  ) : null}
                  {issue.failureCategory ? (
                    <Badge variant='outline' className='text-[10px] capitalize'>
                      {issue.failureCategory.replaceAll('_', ' ')}
                    </Badge>
                  ) : null}
                  <div className='text-[11px] text-gray-500'>{formatTimestamp(issue.updatedAt)}</div>
                </div>
                <div className='mt-2 text-sm font-medium text-white'>{issue.emailAddress}</div>
                <div className='mt-1 text-[12px] text-gray-400'>
                  {issue.campaignName ?? issue.campaignId}
                </div>
                <div className='mt-2 text-sm leading-6 text-gray-300'>{issue.message}</div>
                <div className='mt-3'>
                  <Button
                    type='button'
                    size='sm'
                    variant='outline'
                    onClick={(): void => {
                      startTransition(() => { router.push(
                                                `/admin/filemaker/campaigns/${encodeURIComponent(issue.campaignId)}`
                                              ); });
                    }}
                  >
                    Open Campaign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </InsetPanel>
    </div>
  );
}

function RuntimeDecisionsPanel({
  eventRegistry,
  campaignNameById,
  onOpenRun,
}: {
  eventRegistry: FilemakerEmailCampaignEventRegistry;
  campaignNameById: Map<string, string>;
  onOpenRun: (runId: string) => void;
}): React.JSX.Element {
  const decisionEvents = useMemo<FilemakerEmailCampaignEvent[]>(
    () => eventRegistry.events.filter(isFilemakerEmailCampaignDeliverabilityDecisionEvent),
    [eventRegistry.events]
  );

  const totalsByType = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = {
      delivery_deferred_domain: 0,
      delivery_deferred_warmup: 0,
      run_paused_circuit_breaker: 0,
    };
    decisionEvents.forEach((event) => {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    });
    return counts;
  }, [decisionEvents]);

  const topCampaigns = useMemo<Array<{ campaignId: string; name: string; count: number }>>(() => {
    const counts = new Map<string, number>();
    decisionEvents.forEach((event) => {
      counts.set(event.campaignId, (counts.get(event.campaignId) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([campaignId, count]) => ({
        campaignId,
        name: campaignNameById.get(campaignId) ?? `Deleted campaign (${campaignId})`,
        count,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);
  }, [decisionEvents, campaignNameById]);

  const recent = useMemo<FilemakerEmailCampaignEvent[]>(
    () =>
      decisionEvents
        .slice()
        .sort((left, right) => {
          const leftAt = Date.parse(left.createdAt ?? '');
          const rightAt = Date.parse(right.createdAt ?? '');
          const safeLeft = Number.isFinite(leftAt) ? leftAt : 0;
          const safeRight = Number.isFinite(rightAt) ? rightAt : 0;
          return safeRight - safeLeft;
        })
        .slice(0, 6),
    [decisionEvents]
  );

  return (
    <InsetPanel padding='md' className='space-y-4'>
      <SectionHeader
        title='Runtime deliverability decisions'
        description='Defers, throttles, and circuit-breaker pauses applied automatically to protect sender reputation.'
        size='sm'
      />
      <div className='grid gap-3 md:grid-cols-3'>
        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>Domain throttle</div>
          <div className='text-2xl font-semibold text-white'>
            {totalsByType['delivery_deferred_domain'] ?? 0}
          </div>
          <div className='text-sm text-gray-400'>
            Deliveries deferred because the recipient domain was already failing in this run.
          </div>
        </InsetPanel>
        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>Warm-up cap</div>
          <div className='text-2xl font-semibold text-white'>
            {totalsByType['delivery_deferred_warmup'] ?? 0}
          </div>
          <div className='text-sm text-gray-400'>
            Deliveries deferred because the sender hit the daily warm-up cap.
          </div>
        </InsetPanel>
        <InsetPanel padding='md' className='space-y-2'>
          <div className='text-[11px] uppercase tracking-[0.24em] text-gray-500'>Circuit breaker</div>
          <div className='text-2xl font-semibold text-white'>
            {totalsByType['run_paused_circuit_breaker'] ?? 0}
          </div>
          <div className='text-sm text-gray-400'>
            Runs halted mid-flight because the bounce-rate threshold was exceeded.
          </div>
        </InsetPanel>
      </div>

      {topCampaigns.length > 0 ? (
        <div>
          <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
            Most affected campaigns
          </div>
          <ul className='space-y-1 text-xs text-gray-300'>
            {topCampaigns.map((entry) => (
              <li
                key={entry.campaignId}
                className='flex items-center justify-between gap-2 rounded border border-border/40 bg-card/20 px-2 py-1.5'
              >
                <span className='truncate'>{entry.name}</span>
                <Badge variant='outline' className='text-[10px]'>
                  {entry.count} decision{entry.count === 1 ? '' : 's'}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {recent.length > 0 ? (
        <div>
          <div className='mb-2 text-[10px] font-semibold uppercase tracking-wide text-gray-400'>
            Most recent decisions
          </div>
          <ul className='space-y-1 text-xs text-gray-300'>
            {recent.map((event) => (
              <li
                key={event.id}
                className='flex flex-wrap items-center justify-between gap-2 rounded border border-border/40 bg-card/20 px-2 py-1.5'
              >
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <Badge variant='outline' className='text-[10px]'>
                      {FILEMAKER_EMAIL_CAMPAIGN_DELIVERABILITY_DECISION_EVENT_LABEL[event.type] ?? event.type}
                    </Badge>
                    <span className='text-[10px] text-gray-500'>
                      {formatTimestamp(event.createdAt)}
                    </span>
                  </div>
                  <div className='mt-1 truncate text-[11px] text-gray-400'>{event.message}</div>
                </div>
                {event.runId ? (
                  <Button
                    type='button'
                    size='sm'
                    variant='ghost'
                    className='h-6 px-2 text-[10px]'
                    onClick={(): void => {
                      const runId = event.runId;
                      if (runId) onOpenRun(runId);
                    }}
                  >
                    Open run
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {decisionEvents.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/40 p-3 text-xs text-gray-500'>
          No runtime deliverability decisions logged yet.
        </div>
      ) : null}
    </InsetPanel>
  );
}
