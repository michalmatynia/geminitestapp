'use client';

import React from 'react';

import type { AnalyticsScope } from '@/shared/contracts/analytics';
import type { AiInsightRecord } from '@/shared/contracts/ai-insights';
import type { LabeledOptionDto } from '@/shared/contracts/base';

import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import {
  buildAnalyticsWorkspaceContextBundle,
  ANALYTICS_CONTEXT_ROOT_IDS,
} from '@/shared/lib/analytics/context-registry/workspace';
import { Button, Card } from '@/shared/ui/primitives.public';
import { DataTable, StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection, Hint, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { MetadataItem, Pagination, SectionHeader, UI_GRID_RELAXED_CLASSNAME, UI_GRID_ROOMY_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { type AnalyticsRange } from '../api';
import AnalyticsEventsTable from '../components/AnalyticsEventsTable';
import {
  AnalyticsProvider,
  useAnalyticsFilters,
  useAnalyticsInsightsData,
  useAnalyticsSummaryData,
} from '../context/AnalyticsContext';
import { useAnalyticsEvents } from '../hooks/useAnalyticsQueries';

const formatCount = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch (error) {
    logClientCatch(error, {
      source: 'analytics.admin-page',
      action: 'formatCount',
      value,
    });
    return String(value);
  }
};

const ANALYTICS_RANGES: Array<LabeledOptionDto<AnalyticsRange>> = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const ANALYTICS_SCOPES: Array<LabeledOptionDto<AnalyticsScope | 'all'>> = [
  { value: 'all', label: 'All' },
  { value: 'public', label: 'Public' },
  { value: 'admin', label: 'Admin' },
];

function AnalyticsMetricsGrid(): React.JSX.Element {
  const { summaryQuery } = useAnalyticsSummaryData();
  const summary = summaryQuery.data;

  const metrics = [
    { label: 'Pageviews', value: summary?.totals.pageviews ?? 0 },
    { label: 'Events', value: summary?.totals.events ?? 0 },
    { label: 'Visitors', value: summary?.visitors ?? 0 },
    { label: 'Sessions', value: summary?.sessions ?? 0 },
  ] as const;

  return (
    <div className={`${UI_GRID_RELAXED_CLASSNAME} sm:grid-cols-2 lg:grid-cols-4`}>
      {metrics.map((metric) => (
        <MetadataItem
          key={metric.label}
          label={metric.label}
          value={formatCount(metric.value)}
          valueClassName='text-2xl font-semibold text-white mt-1'
          className='p-4'
        />
      ))}
    </div>
  );
}

type AnalyticsStatCardProps = {
  title: string;
  rows: Array<{ key: string; left: string; right: string }>;
  emptyLabel: string;
};

function AnalyticsStatCard({
  title,
  rows,
  emptyLabel,
}: AnalyticsStatCardProps): React.JSX.Element {
  const sectionTitle = React.useMemo(() => title, [title]);

  return (
    <FormSection title={sectionTitle}>
      {rows.length === 0 ? (
        <Hint size='xs' italic className='py-4 text-center'>
          {emptyLabel}
        </Hint>
      ) : (
        <div className='rounded border border-white/5 bg-black/20 overflow-hidden'>
          <DataTable
            columns={[
              {
                accessorKey: 'left',
                header: 'Value',
                cell: ({ row }) => (
                  <span className='text-xs text-gray-300 truncate block max-w-[200px]'>
                    {row.original.left}
                  </span>
                ),
              },
              {
                accessorKey: 'right',
                header: () => <div className='text-right'>Count</div>,
                cell: ({ row }) => (
                  <div className='text-right font-mono text-xs text-blue-400'>
                    {row.original.right}
                  </div>
                ),
              },
            ]}
            data={rows}
          />
        </div>
      )}
    </FormSection>
  );
}

function AnalyticsTopStats(): React.JSX.Element {
  const { summaryQuery } = useAnalyticsSummaryData();
  const summary = summaryQuery.data;

  return (
    <div className={`${UI_GRID_ROOMY_CLASSNAME} mt-6 lg:grid-cols-2`}>
      <AnalyticsStatCard
        title='Top Pages'
        rows={(summary?.topPages ?? []).map((item) => ({
          key: item.path,
          left: item.path,
          right: formatCount(item.count),
        }))}
        emptyLabel='No pageviews yet.'
      />

      <AnalyticsStatCard
        title='Top Referrers'
        rows={(summary?.topReferrers ?? []).map((item) => ({
          key: item.referrer,
          left: item.referrer,
          right: formatCount(item.count),
        }))}
        emptyLabel='No referrers yet.'
      />

      <AnalyticsStatCard
        title='Top Languages'
        rows={(summary?.topLanguages ?? []).map((item) => ({
          key: item.language,
          left: item.language,
          right: formatCount(item.count),
        }))}
        emptyLabel='No language data yet.'
      />

      <AnalyticsStatCard
        title='Top Countries'
        rows={(summary?.topCountries ?? []).map((item) => ({
          key: item.country,
          left: item.country,
          right: formatCount(item.count),
        }))}
        emptyLabel='No geo data yet.'
      />
    </div>
  );
}

function AnalyticsDashboardHeader(): React.JSX.Element {
  const { range, setRange, scope, setScope } = useAnalyticsFilters();
  const { summaryQuery, fromToLabel } = useAnalyticsSummaryData();

  return (
    <>
      <SectionHeader
        title='Page Analytics'
        description='Traffic, referrers, languages, and recent activity.'
        className='mb-6'
        actions={
          <>
            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-400'>Scope</span>
              <SelectSimple
                size='sm'
                value={scope}
                onValueChange={(val: string): void => setScope(val as AnalyticsScope | 'all')}
                options={ANALYTICS_SCOPES}
                triggerClassName='h-9 w-25 border-border bg-gray-900/40 text-sm text-white'
                ariaLabel='Select option'
                title='Select option'
              />
            </div>

            <div className='flex items-center gap-2'>
              <span className='text-xs text-gray-400'>Range</span>
              <SelectSimple
                size='sm'
                value={range}
                onValueChange={(val: string): void => setRange(val as AnalyticsRange)}
                options={ANALYTICS_RANGES}
                triggerClassName='h-9 w-32.5 border-border bg-gray-900/40 text-sm text-white'
                ariaLabel='Select option'
                title='Select option'
              />
            </div>

            <Button
              variant='outline'
              size='sm'
              onClick={(): void => {
                void summaryQuery.refetch();
              }}
              disabled={summaryQuery.isFetching}
            >
              {summaryQuery.isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
          </>
        }
      />

      <div className='mb-6'>
        {summaryQuery.isLoading ? (
          <p className='text-sm text-gray-500'>Loading analytics…</p>
        ) : summaryQuery.error ? (
          <p className='text-sm text-red-400'>{summaryQuery.error.message}</p>
        ) : fromToLabel ? (
          <p className='text-xs text-gray-500'>Window: {fromToLabel}</p>
        ) : null}
      </div>
    </>
  );
}

function AnalyticsAiInsights(): React.JSX.Element {
  const { insightsQuery, runInsightMutation } = useAnalyticsInsightsData();

  return (
    <FormSection
      title='AI Insights'
      description='Automated overview of interactions and possible issues.'
      className='mb-6 p-4'
      actions={
        <Button
          variant='outline'
          size='sm'
          onClick={() => runInsightMutation.mutate()}
          disabled={runInsightMutation.isPending}
        >
          {runInsightMutation.isPending ? 'Running...' : 'Run AI Insight'}
        </Button>
      }
    >
      {insightsQuery.isLoading ? (
        <Hint className='mt-1'>Loading AI insights…</Hint>
      ) : insightsQuery.error ? (
        <Hint variant='danger' className='mt-1'>
          {insightsQuery.error.message}
        </Hint>
      ) : (insightsQuery.data?.insights?.length ?? 0) === 0 ? (
        <Hint className='mt-1' italic>
          No insights yet.
        </Hint>
      ) : (
        <div className='mt-1 space-y-3'>
          {insightsQuery.data?.insights.map((insight: AiInsightRecord) => {
            const warnings = (insight.warnings as string[]) ?? [];
            return (
              <Card
                key={insight.id}
                variant='subtle-compact'
                padding='sm'
                className='border-border/60 bg-card/40 text-xs text-gray-300'
              >
                <div className='flex items-center justify-between gap-2'>
                  <span className='text-[10px] uppercase text-gray-500'>
                    {new Date(insight.createdAt || 0).toLocaleString()}
                  </span>
                  <StatusBadge status={insight.status} />
                </div>
                <div className='mt-2 text-sm text-white'>{insight.summary}</div>
                {warnings.length > 0 ? (
                  <Card variant='warning' padding='sm' className='mt-3 border-amber-500/20'>
                    <div className='mb-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-200/70'>
                      Warnings
                    </div>
                    <ul className='list-disc space-y-1 pl-4 text-[11px] text-amber-200'>
                      {warnings.map((warning: string, index: number) => (
                        <li key={`${insight.id}-warn-${index}`}>{warning}</li>
                      ))}
                    </ul>
                  </Card>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </FormSection>
  );
}

const ANALYTICS_EVENTS_PAGE_SIZE = 25;

function WebsiteConnectionsTable(): React.JSX.Element {
  const { range, scope } = useAnalyticsFilters();
  const [page, setPage] = React.useState(1);
  const eventsQuery = useAnalyticsEvents({
    page,
    pageSize: ANALYTICS_EVENTS_PAGE_SIZE,
    range,
    scope,
    type: 'pageview',
  });

  React.useEffect(() => {
    setPage(1);
  }, [range, scope]);

  return (
    <div className='space-y-3'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end'>
        <Pagination
          page={page}
          totalPages={eventsQuery.data?.totalPages ?? 1}
          totalCount={eventsQuery.data?.total ?? 0}
          pageSize={ANALYTICS_EVENTS_PAGE_SIZE}
          onPageChange={setPage}
          variant='compact'
          isLoading={eventsQuery.isFetching}
          className='sm:w-auto sm:flex-none'
        />
      </div>
      <AnalyticsEventsTable
        events={eventsQuery.data?.events ?? []}
        isLoading={eventsQuery.isLoading}
        title=''
        emptyTitle='No page access events yet'
        emptyDescription='Tracked pageviews will appear here once visitors reach the site.'
        showTypeColumn={false}
      />
    </div>
  );
}

function AnalyticsContextRegistrySource(): React.JSX.Element {
  const { range, scope } = useAnalyticsFilters();
  const { summaryQuery, fromToLabel } = useAnalyticsSummaryData();
  const { insightsQuery, runInsightMutation } = useAnalyticsInsightsData();

  const registrySource = React.useMemo(
    () => ({
      label: 'Analytics Workspace State',
      resolved: buildAnalyticsWorkspaceContextBundle({
        range,
        scope,
        fromToLabel,
        summary: summaryQuery.data,
        insights: insightsQuery.data?.insights ?? [],
        latestInsightStatus: insightsQuery.data?.insights?.[0]?.status ?? null,
      }),
    }),
    [fromToLabel, insightsQuery.data?.insights, range, scope, summaryQuery.data]
  );

  useRegisterContextRegistryPageSource('analytics-workspace-state', registrySource);

  useRegisterContextRegistryPageSource('analytics-insight-run-state', {
    label: 'Analytics Insight Run State',
    rootNodeIds: runInsightMutation.isPending ? ['action:analytics-generate-insight'] : [],
  });

  return <></>;
}

function AnalyticsPageContent(): React.JSX.Element {
  return (
    <div className='page-section'>
      <AnalyticsContextRegistrySource />
      <AnalyticsDashboardHeader />
      <AnalyticsAiInsights />
      <AnalyticsMetricsGrid />
      <AnalyticsTopStats />

      <FormSection className='mt-6'>
        <WebsiteConnectionsTable />
      </FormSection>
    </div>
  );
}

export default function AdminAnalyticsPage(): React.JSX.Element {
  return (
    <ContextRegistryPageProvider
      pageId='admin:analytics'
      title='Analytics Dashboard'
      rootNodeIds={[...ANALYTICS_CONTEXT_ROOT_IDS]}
    >
      <AnalyticsProvider>
        <AnalyticsPageContent />
      </AnalyticsProvider>
    </ContextRegistryPageProvider>
  );
}
