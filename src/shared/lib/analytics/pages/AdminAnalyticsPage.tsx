'use client';

import React from 'react';

import type { AnalyticsScope, AnalyticsSummary, AiInsightRecord } from '@/shared/contracts';
import type { LabeledOptionDto } from '@/shared/contracts/base';

import {
  ContextRegistryPageProvider,
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';
import {
  buildAnalyticsWorkspaceContextBundle,
  ANALYTICS_CONTEXT_ROOT_IDS,
} from '@/shared/lib/analytics/context-registry/workspace';
import {
  Button,
  Card,
  CompactEmptyState,
  DataTable,
  FormSection,
  Hint,
  MetadataItem,
  SectionHeader,
  SelectSimple,
  StandardDataTablePanel,
  StatusBadge,
} from '@/shared/ui';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { type AnalyticsRange } from '../api';
import {
  AnalyticsProvider,
  useAnalyticsFilters,
  useAnalyticsInsightsData,
  useAnalyticsSummaryData,
} from '../context/AnalyticsContext';

import type { ColumnDef } from '@tanstack/react-table';

const formatCount = (value: number): string => {
  try {
    return value.toLocaleString();
  } catch (error) {
    logClientError(error);
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
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
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
    <div className='mt-6 grid gap-6 lg:grid-cols-2'>
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

type AnalyticsEvent = NonNullable<AnalyticsSummary['recent']>[number];
type AnalyticsEventDetailsProps = {
  event: AnalyticsEvent;
};

function AnalyticsEventDetails({ event }: AnalyticsEventDetailsProps): React.JSX.Element {
  const screenValue = event.screen
    ? `${event.screen.width}×${event.screen.height} @ ${event.screen.dpr}x`
    : '—';
  const viewportValue = event.viewport ? `${event.viewport.width}×${event.viewport.height}` : '—';
  const languageValue = event.languages?.length
    ? event.languages.join(', ')
    : (event.language ?? '—');
  const connectionValue = event.connection
    ? `${event.connection.effectiveType ?? 'n/a'} • ${event.connection.downlink ?? '?'} Mbps • ${event.connection.rtt ?? '?'} ms`
    : '—';
  const ipDisplay = event.ip ?? event.ipMasked ?? event.ipHash ?? '—';
  const detailItems: Array<LabeledOptionDto<string>> = [
    { label: 'IP Address', value: ipDisplay },
    { label: 'User Agent', value: event.userAgent ?? '—' },
    { label: 'Visitor ID', value: event.visitorId },
    { label: 'Session ID', value: event.sessionId },
    { label: 'Client Timestamp', value: event.clientTs ?? '—' },
    { label: 'Timezone', value: event.timeZone ?? '—' },
    { label: 'Languages', value: languageValue },
    { label: 'Viewport', value: viewportValue },
    { label: 'Screen', value: screenValue },
    { label: 'Connection', value: connectionValue },
    { label: 'Region', value: event.region ?? '—' },
    { label: 'City', value: event.city ?? '—' },
    { label: 'UTM Parameters', value: event.utm ? JSON.stringify(event.utm, null, 2) : '—' },
    { label: 'Metadata', value: event.meta ? JSON.stringify(event.meta, null, 2) : '—' },
  ];

  return (
    <div className='grid gap-4 text-xs text-gray-300 md:grid-cols-2 lg:grid-cols-3'>
      {detailItems.map((detail) => (
        <DetailItem key={detail.label} label={detail.label} value={detail.value} />
      ))}
    </div>
  );
}

function DetailItem(props: LabeledOptionDto<string>): React.JSX.Element {
  return (
    <div className='flex flex-col gap-1 p-2 rounded bg-white/5 border border-white/5'>
      <span className='text-[10px] uppercase tracking-wide text-gray-500 font-semibold'>
        {props.label}
      </span>
      <span className='break-all text-gray-200 font-mono text-[11px]'>{props.value}</span>
    </div>
  );
}

function RecentEventsTable(): React.JSX.Element {
  const { summaryQuery } = useAnalyticsSummaryData();
  const summary = summaryQuery.data;
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const events = React.useMemo(() => summary?.recent ?? [], [summary]);

  const columns = React.useMemo<ColumnDef<AnalyticsEvent>[]>(
    () => [
      {
        accessorKey: 'ts',
        header: 'Time',
        cell: ({ row }) => {
          try {
            return (
              <span className='text-xs text-gray-300'>
                {new Date(row.original.ts).toLocaleString()}
              </span>
            );
          } catch (error) {
            logClientError(error);
            return <span className='text-xs text-gray-300'>{row.original.ts}</span>;
          }
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => <span className='text-xs text-gray-300'>{row.original.type}</span>,
      },
      {
        accessorKey: 'scope',
        header: 'Scope',
        cell: ({ row }) => <span className='text-xs text-gray-300'>{row.original.scope}</span>,
      },
      {
        accessorKey: 'path',
        header: 'Path',
        cell: ({ row }) => <span className={cn('text-xs text-gray-200')}>{row.original.path}</span>,
      },
      {
        accessorKey: 'referrer',
        header: 'Referrer',
        cell: ({ row }) => (
          <span
            className='text-xs text-gray-400 max-w-[150px] truncate block'
            title={row.original.referrer || ''}
          >
            {row.original.referrer ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'country',
        header: 'Country',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>{row.original.country ?? '—'}</span>
        ),
      },
      {
        accessorKey: 'ip',
        header: 'IP',
        cell: ({ row }) => {
          const ipDisplay = row.original.ip ?? row.original.ipMasked ?? row.original.ipHash ?? '—';
          return <span className='text-xs text-gray-400 font-mono'>{ipDisplay}</span>;
        },
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Details</div>,
        cell: ({ row }) => (
          <div className='text-right'>
            <Button
              variant='ghost'
              size='xs'
              onClick={() => setExpandedId(expandedId === row.original.id ? null : row.original.id)}
            >
              {expandedId === row.original.id ? 'Hide' : 'View'}
            </Button>
          </div>
        ),
      },
    ],
    [expandedId]
  );

  return (
    <StandardDataTablePanel
      title='Recent Events'
      columns={columns}
      data={events}
      isLoading={summaryQuery.isLoading}
      variant='flat'
      maxHeight='60vh'
      enableVirtualization={true}
      emptyState={
        <CompactEmptyState
          title='No events yet'
          description='Visitor activity will appear here once tracked.'
        />
      }
      renderRowDetails={({ row }) => {
        if (expandedId !== row.original.id) return null;
        return (
          <div className='bg-black/40 px-4 py-4 border-t border-white/5'>
            <AnalyticsEventDetails event={row.original} />
          </div>
        );
      }}
    />
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

      <FormSection title='Recent Events' className='mt-6'>
        <RecentEventsTable />
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
