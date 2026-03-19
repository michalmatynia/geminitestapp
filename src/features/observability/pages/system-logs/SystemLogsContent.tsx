'use client';

import React from 'react';
import type { AnalyticsRange, AnalyticsScope } from '@/shared/contracts';
import type { SelectSimpleOption } from '@/shared/contracts/ui';
import {
  Copy,
  Link2,
  SearchIcon,
  Trash2,
} from 'lucide-react';

import {
  useSystemLogsActions,
  useSystemLogsState,
} from '@/features/observability/context/SystemLogsContext';
import type { ClearLogsTargetDto as ClearLogsTarget } from '@/shared/contracts/observability';
import AnalyticsEventsTable from '@/shared/lib/analytics/components/AnalyticsEventsTable';
import { useAnalyticsEvents } from '@/shared/lib/analytics/hooks/useAnalyticsQueries';
import {
  AdminSectionBreadcrumbs,
  Button,
  Card,
  CopyButton,
  ListPanel,
  Pagination,
  RefreshButton,
  SearchInput,
  SelectSimple,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/shared/ui';
import { FilterPanel } from '@/shared/ui/templates/FilterPanel';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import {
  SYSTEM_LOG_FILTER_DEFAULTS,
  type SystemLogFilterFormValues,
} from '@/shared/lib/observability/log-triage-presets';

import { SystemLogsContextRegistrySource } from './SystemLogs.Context';
import { LogTriagePresets } from './SystemLogs.Presets';
import { LogDiagnostics } from './SystemLogs.Diagnostics';
import { LogMetrics, AiLogInterpreter } from './SystemLogs.Metrics';
import { EventStreamPanel } from './SystemLogs.Table';

const CLEAR_LOG_TARGET_OPTIONS: SelectSimpleOption[] = [
  {
    value: 'error_logs',
    label: 'Error logs',
    description: 'Delete system log entries recorded at error level.',
  },
  {
    value: 'activity_logs',
    label: 'Activity logs',
    description: 'Delete recorded activity entries such as auth and entity events.',
  },
  {
    value: 'page_access_logs',
    label: 'Page Access logs',
    description: 'Delete tracked pageview records from analytics storage.',
  },
  {
    value: 'all_logs',
    label: 'All logs',
    description: 'Delete system logs, activity logs, and page access logs together.',
  },
];

const PAGE_ACCESS_RANGE_OPTIONS: SelectSimpleOption[] = [
  { value: '24h', label: 'Last 24h' },
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
];

const PAGE_ACCESS_SCOPE_OPTIONS: SelectSimpleOption[] = [
  { value: 'public', label: 'Public' },
  { value: 'all', label: 'All' },
  { value: 'admin', label: 'Admin' },
];

const PAGE_ACCESS_PAGE_SIZE = 25;

const isActiveFilterValue = (value: unknown): boolean => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.some((entry) => isActiveFilterValue(entry));
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).some((entry) => isActiveFilterValue(entry));
  }
  return true;
};

export function SystemLogsContent(): React.JSX.Element {
  const {
    filterFields,
    level,
    query,
    source,
    service,
    method,
    statusCode,
    minDurationMs,
    requestId,
    traceId,
    correlationId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
    logs,
    logsJson,
    logsQuery,
    metricsQuery,
    clearLogsMutation,
    ConfirmationModal,
  } = useSystemLogsState();
  const { handleFilterChange, handleResetFilters, handleClearLogs } = useSystemLogsActions();
  const [isWipeLogsModalOpen, setIsWipeLogsModalOpen] = React.useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<
    'overview' | 'connections' | 'metrics' | 'ai-insights' | 'index-health'
  >('overview');
  const [wipeLogsTarget, setWipeLogsTarget] = React.useState<ClearLogsTarget | undefined>(undefined);
  const [localSearch, setLocalSearch] = React.useState(query);
  const [connectionsPage, setConnectionsPage] = React.useState(1);
  const [connectionsRange, setConnectionsRange] = React.useState<AnalyticsRange>('24h');
  const [connectionsScope, setConnectionsScope] = React.useState<AnalyticsScope | 'all'>('public');
  const connectionsQuery = useAnalyticsEvents({
    page: connectionsPage,
    pageSize: PAGE_ACCESS_PAGE_SIZE,
    range: connectionsRange,
    scope: connectionsScope,
    type: 'pageview',
  });

  const currentFilterValues: SystemLogFilterFormValues = {
    level,
    query,
    source,
    service,
    method,
    statusCode,
    minDurationMs,
    requestId,
    traceId,
    correlationId,
    userId,
    fingerprint,
    category,
    fromDate,
    toDate,
  };
  const advancedFilterValues: SystemLogFilterFormValues = {
    ...currentFilterValues,
    query: '',
  };
  const activeAdvancedFilterValues = Object.fromEntries(
    Object.entries(advancedFilterValues).filter(([key, value]) => {
      const defaultValue =
        SYSTEM_LOG_FILTER_DEFAULTS[key as keyof SystemLogFilterFormValues];
      return value !== defaultValue && isActiveFilterValue(value);
    })
  );
  const activeAdvancedFilterCount = Object.keys(activeAdvancedFilterValues).length;

  React.useEffect(() => {
    setLocalSearch(query);
  }, [query]);

  React.useEffect(() => {
    if (localSearch === query) return;

    const timer = window.setTimeout(() => {
      handleFilterChange('query', localSearch);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [handleFilterChange, localSearch, query]);

  React.useEffect(() => {
    setConnectionsPage(1);
  }, [connectionsRange, connectionsScope]);

  const pageAccessEvents = connectionsQuery.data?.events ?? [];
  const pageAccessTotal = connectionsQuery.data?.total ?? 0;
  const pageAccessTotalPages = connectionsQuery.data?.totalPages ?? 1;
  const connectionsJson = React.useMemo(
    () => JSON.stringify(pageAccessEvents, null, 2),
    [pageAccessEvents]
  );
  const exportValue = activeTab === 'connections' ? connectionsJson : logsJson;
  const exportDisabled = activeTab === 'connections' ? pageAccessEvents.length === 0 : logs.length === 0;

  return (
    <>
      <SystemLogsContextRegistrySource />
      <ConfirmationModal />
      <ConfirmModal
        isOpen={isWipeLogsModalOpen}
        onClose={() => {
          if (clearLogsMutation.isPending) return;
          setIsWipeLogsModalOpen(false);
          setWipeLogsTarget(undefined);
        }}
        onConfirm={async () => {
          if (!wipeLogsTarget) return;
          await handleClearLogs(wipeLogsTarget);
        }}
        title='Wipe Logs'
        subtitle='Choose which log records should be deleted.'
        confirmText='Wipe Selected Logs'
        isDangerous={true}
        loading={clearLogsMutation.isPending}
        confirmDisabled={!wipeLogsTarget}
        size='md'
      >
        <div className='space-y-2'>
          <p className='text-xs text-gray-400'>
            This action permanently removes the selected records.
          </p>
          <SelectSimple
            value={wipeLogsTarget}
            onValueChange={(value) => setWipeLogsTarget(value as ClearLogsTarget)}
            options={CLEAR_LOG_TARGET_OPTIONS}
            placeholder='Choose logs to wipe'
            ariaLabel='Choose log type to wipe'
            size='sm'
          />
        </div>
      </ConfirmModal>
      <div className='space-y-6'>
        <ListPanel
          variant='flat'
          className='[&>div:first-child]:mb-3'
          header={
            <div className='space-y-3'>
              <div className='flex flex-wrap items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <h1 className='text-3xl font-bold tracking-tight text-white'>Observation Post</h1>
                  <AdminSectionBreadcrumbs
                    section={{ label: 'System Logs', href: '/admin/system/logs' }}
                    current='Observation Post'
                  />
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <RefreshButton
                    onRefresh={(): void => {
                      void logsQuery.refetch();
                      void metricsQuery.refetch();
                      void connectionsQuery.refetch();
                    }}
                    isRefreshing={
                      logsQuery.isFetching || metricsQuery.isFetching || connectionsQuery.isFetching
                    }
                    className='h-8'
                  />
                  <Button
                    variant='outline'
                    size='xs'
                    className='h-8'
                    onClick={() => window.location.assign('/admin/settings/logging')}
                  >
                    Settings
                  </Button>
                  <CopyButton
                    value={typeof window !== 'undefined' ? window.location.href : ''}
                    variant='outline'
                    size='sm'
                    className='h-8'
                    showText
                  >
                    <Link2 className='mr-2 size-3.5' />
                    Sync Link
                  </CopyButton>
                  <CopyButton
                    value={exportValue}
                    variant='outline'
                    size='sm'
                    className='h-8'
                    disabled={exportDisabled}
                    showText
                  >
                    <Copy className='mr-2 size-3.5' />
                    Export
                  </CopyButton>
                  <Button
                    variant='outline'
                    size='xs'
                    className='h-8 border-rose-500/20 text-rose-300 hover:bg-rose-500/5'
                    onClick={() => {
                      setWipeLogsTarget(undefined);
                      setIsWipeLogsModalOpen(true);
                    }}
                    disabled={clearLogsMutation.isPending}
                  >
                    <Trash2 className='mr-2 size-3.5' />
                    {clearLogsMutation.isPending ? 'Purging...' : 'Wipe Logs'}
                  </Button>
                </div>
              </div>
            </div>
          }
        >
          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(
                value as 'overview' | 'connections' | 'metrics' | 'ai-insights' | 'index-health'
              )
            }
            className='space-y-4'
          >
            <TabsList
              aria-label='Observation Post tabs'
              className='grid h-auto w-full max-w-4xl grid-cols-5 gap-2 border border-border/60 bg-card/30 p-2'
            >
              <TabsTrigger value='overview' className='h-10'>
                Overview
              </TabsTrigger>
              <TabsTrigger value='connections' className='h-10'>
                Connections
              </TabsTrigger>
              <TabsTrigger value='metrics' className='h-10'>
                Metrics
              </TabsTrigger>
              <TabsTrigger value='ai-insights' className='h-10'>
                AI Insights
              </TabsTrigger>
              <TabsTrigger value='index-health' className='h-10'>
                Index Health
              </TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='mt-0 space-y-6'>
              <LogTriagePresets />

              <div className='space-y-3'>
                <div className='flex flex-col gap-2 lg:flex-row lg:items-center'>
                  <SearchInput
                    value={localSearch}
                    onChange={(event) => setLocalSearch(event.target.value)}
                    onClear={() => {
                      setLocalSearch('');
                      handleFilterChange('query', '');
                    }}
                    placeholder='Search logs...'
                    containerClassName='w-full flex-1'
                    className='h-9'
                    variant='subtle'
                    size='sm'
                  />
                  <Button
                    type='button'
                    size='sm'
                    variant={activeAdvancedFilterCount > 0 ? 'default' : 'outline'}
                    onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
                    className={
                      activeAdvancedFilterCount > 0
                        ? 'h-9 w-full justify-center gap-1.5 px-3 tabular-nums lg:w-auto lg:min-w-[10rem] bg-blue-600 text-white hover:bg-blue-500'
                        : 'h-9 w-full justify-center gap-1.5 px-3 tabular-nums lg:w-auto lg:min-w-[10rem]'
                    }
                  >
                    {isFiltersOpen ? 'Hide Filters' : 'Show Filters'}
                    {activeAdvancedFilterCount > 0 ? (
                      <span className='inline-flex min-w-[3ch] justify-center'>
                        ({activeAdvancedFilterCount})
                      </span>
                    ) : null}
                  </Button>
                </div>

                {isFiltersOpen ? (
                  <Card variant='glass' padding='lg'>
                    <div className='mb-6 flex items-center gap-2 text-xs font-bold uppercase text-gray-500'>
                      <SearchIcon className='size-3.5' />
                      Log Filters
                    </div>
                    <FilterPanel
                      filters={filterFields}
                      values={advancedFilterValues}
                      activeValues={activeAdvancedFilterValues}
                      onFilterChange={(key, value) => handleFilterChange(key, value as string)}
                      onReset={handleResetFilters}
                      showHeader={false}
                      searchPlaceholder=''
                      compact={false}
                      collapsible={false}
                    />
                  </Card>
                ) : null}

                <EventStreamPanel />
              </div>
            </TabsContent>

            <TabsContent value='connections' className='mt-0 space-y-4'>
              <div className='flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between'>
                <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
                  <div className='w-full sm:w-40'>
                    <SelectSimple
                      value={connectionsScope}
                      onValueChange={(value) =>
                        setConnectionsScope(value as AnalyticsScope | 'all')
                      }
                      options={PAGE_ACCESS_SCOPE_OPTIONS}
                      ariaLabel='Select page access scope'
                      size='sm'
                    />
                  </div>
                  <div className='w-full sm:w-44'>
                    <SelectSimple
                      value={connectionsRange}
                      onValueChange={(value) => setConnectionsRange(value as AnalyticsRange)}
                      options={PAGE_ACCESS_RANGE_OPTIONS}
                      ariaLabel='Select page access range'
                      size='sm'
                    />
                  </div>
                </div>
                <div className='text-xs text-gray-400'>
                  {pageAccessTotal} page access {pageAccessTotal === 1 ? 'event' : 'events'}
                </div>
              </div>

              <AnalyticsEventsTable
                events={pageAccessEvents}
                isLoading={connectionsQuery.isLoading}
                title='Website Connections'
                emptyTitle='No page access events yet'
                emptyDescription='Tracked pageviews will appear here once visitors reach the site.'
                showTypeColumn={false}
                footer={
                  <Pagination
                    page={connectionsPage}
                    totalCount={pageAccessTotal}
                    pageSize={PAGE_ACCESS_PAGE_SIZE}
                    totalPages={pageAccessTotalPages}
                    onPageChange={setConnectionsPage}
                    showInfo={true}
                    variant='compact'
                    isLoading={connectionsQuery.isFetching}
                  />
                }
              />
            </TabsContent>

            <TabsContent value='metrics' className='mt-0'>
              <LogMetrics />
            </TabsContent>

            <TabsContent value='ai-insights' className='mt-0'>
              <AiLogInterpreter />
            </TabsContent>

            <TabsContent value='index-health' className='mt-0'>
              <LogDiagnostics />
            </TabsContent>
          </Tabs>
        </ListPanel>
      </div>
    </>
  );
}
