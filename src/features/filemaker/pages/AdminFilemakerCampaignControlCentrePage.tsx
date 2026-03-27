'use client';

import { ShieldAlert } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { useDeferredValue, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Badge,
  Button,
  InsetPanel,
  PanelHeader,
  SearchInput,
  SectionHeader,
} from '@/shared/ui';

import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import {
  FILEMAKER_DATABASE_KEY,
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_SUPPRESSIONS_KEY,
  parseFilemakerDatabase,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignEventRegistry,
  parseFilemakerEmailCampaignRegistry,
  parseFilemakerEmailCampaignRunRegistry,
  parseFilemakerEmailCampaignSuppressionRegistry,
  summarizeFilemakerEmailCampaignDeliverabilityOverview,
} from '../settings';
import { formatTimestamp, includeQuery } from './filemaker-page-utils';

export function AdminFilemakerCampaignControlCentrePage(): React.JSX.Element {
  const router = useRouter();
  const settingsStore = useSettingsStore();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim());

  const rawDatabase = settingsStore.get(FILEMAKER_DATABASE_KEY);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawRuns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_RUNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const rawEvents = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_EVENTS_KEY);
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
  const eventRegistry = useMemo(
    () => parseFilemakerEmailCampaignEventRegistry(rawEvents),
    [rawEvents]
  );
  const suppressionRegistry = useMemo(
    () => parseFilemakerEmailCampaignSuppressionRegistry(rawSuppressions),
    [rawSuppressions]
  );

  const overview = useMemo(
    () =>
      summarizeFilemakerEmailCampaignDeliverabilityOverview({
        database,
        campaignRegistry,
        runRegistry,
        deliveryRegistry,
        eventRegistry,
        suppressionRegistry,
      }),
    [
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
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.campaignHealth]
  );

  const filteredDomainHealth = useMemo(
    () =>
      overview.domainHealth.filter((domain) =>
        includeQuery([domain.domain, domain.alertLevel], deferredQuery)
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
            issue.message,
          ],
          deferredQuery
        )
      ),
    [deferredQuery, overview.recentDeliveryIssues]
  );

  const atRiskCampaignCount = useMemo(
    () =>
      overview.campaignHealth.filter((campaign) => campaign.alertLevel !== 'healthy').length,
    [overview.campaignHealth]
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

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
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
            Suppression pressure
          </div>
          <div className='text-2xl font-semibold text-white'>
            {overview.suppressionRatePercent}%
          </div>
          <div className='text-sm text-gray-400'>
            {overview.suppressionCount} suppressed addresses. At-risk campaigns: {atRiskCampaignCount}.
          </div>
        </InsetPanel>
      </div>

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
                        router.push(
                          `/admin/filemaker/campaigns/${encodeURIComponent(alert.campaignId ?? '')}`
                        );
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
                      router.push(
                        `/admin/filemaker/campaigns/${encodeURIComponent(campaign.campaignId)}`
                      );
                    }}
                  >
                    Open Campaign
                  </Button>
                </div>
                <div className='mt-4 grid gap-3 md:grid-cols-4'>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </InsetPanel>

      <InsetPanel padding='md' className='space-y-4'>
        <SectionHeader
          title='Domain Health'
          description='This is the fastest way to spot recipient-domain problems when mail is coming back.'
          size='sm'
        />
        {filteredDomainHealth.length === 0 ? (
          <div className='rounded-xl border border-dashed border-border/40 p-4 text-sm text-gray-500'>
            No recipient domains match the current filter.
          </div>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full text-left text-sm'>
              <thead className='text-[11px] uppercase tracking-[0.2em] text-gray-500'>
                <tr>
                  <th className='px-3 py-2'>Domain</th>
                  <th className='px-3 py-2'>Health</th>
                  <th className='px-3 py-2'>Deliveries</th>
                  <th className='px-3 py-2'>Accepted</th>
                  <th className='px-3 py-2'>Failure Rate</th>
                  <th className='px-3 py-2'>Bounce Rate</th>
                  <th className='px-3 py-2'>Suppressed</th>
                  <th className='px-3 py-2'>Latest</th>
                </tr>
              </thead>
              <tbody>
                {filteredDomainHealth.map((domain) => (
                  <tr key={domain.domain} className='border-t border-border/30'>
                    <td className='px-3 py-3 font-medium text-white'>{domain.domain}</td>
                    <td className='px-3 py-3'>
                      <Badge variant='outline' className='text-[10px] uppercase'>
                        {domain.alertLevel}
                      </Badge>
                    </td>
                    <td className='px-3 py-3 text-gray-300'>{domain.totalDeliveries}</td>
                    <td className='px-3 py-3 text-gray-300'>
                      {domain.sentCount} ({domain.deliveryRatePercent}%)
                    </td>
                    <td className='px-3 py-3 text-gray-300'>{domain.failureRatePercent}%</td>
                    <td className='px-3 py-3 text-gray-300'>{domain.bounceRatePercent}%</td>
                    <td className='px-3 py-3 text-gray-300'>{domain.suppressionCount}</td>
                    <td className='px-3 py-3 text-gray-500'>
                      {formatTimestamp(domain.latestDeliveryAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                      router.push(
                        `/admin/filemaker/campaigns/${encodeURIComponent(issue.campaignId)}`
                      );
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
