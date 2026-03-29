'use client';

import React from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { AnalyticsEventFilterBot, AnalyticsRange, AnalyticsScope } from '@/shared/contracts';
import type { FilterField, SelectSimpleOption } from '@/shared/contracts/ui';
import {
  Copy,
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
import { ObservationPostSettingsPanel } from './SystemLogs.Settings';
import { EventStreamPanel } from './SystemLogs.Table';

const OBSERVATION_POST_TABS = [
  'overview',
  'connections',
  'metrics',
  'ai-insights',
  'index-health',
  'settings',
] as const;

type ObservationPostTab = (typeof OBSERVATION_POST_TABS)[number];

const isObservationPostTab = (value: string | null): value is ObservationPostTab =>
  value !== null &&
  (OBSERVATION_POST_TABS as readonly string[]).includes(value);

const CLEAR_LOG_TARGET_OPTIONS: SelectSimpleOption[] = [
  {
    value: 'error_logs',
    label: 'Error logs',
    description: 'Delete system log entries recorded at error level.',
  },
  {
    value: 'info_logs',
    label: 'Info events',
    description: 'Delete system log entries recorded at info level.',
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

const PAGE_ACCESS_DEVICE_OPTIONS: SelectSimpleOption[] = [
  { value: 'all', label: 'All devices' },
  { value: 'desktop', label: 'Desktop' },
  { value: 'mobile', label: 'Mobile' },
  { value: 'tablet', label: 'Tablet' },
  { value: 'bot', label: 'Bot' },
];

const PAGE_ACCESS_BOT_OPTIONS: SelectSimpleOption[] = [
  { value: 'all', label: 'All traffic' },
  { value: 'humans', label: 'Human traffic' },
  { value: 'bots', label: 'Bot traffic' },
];

const PAGE_ACCESS_FILTER_DEFAULTS = {
  range: '7d' as AnalyticsRange,
  scope: 'all' as AnalyticsScope | 'all',
  country: '',
  referrerHost: '',
  browser: '',
  device: 'all',
  bot: 'all' as AnalyticsEventFilterBot,
};

const PAGE_ACCESS_FILTER_FIELDS: FilterField[] = [
  {
    key: 'scope',
    label: 'Scope',
    type: 'select',
    options: PAGE_ACCESS_SCOPE_OPTIONS,
  },
  {
    key: 'range',
    label: 'Range',
    type: 'select',
    options: PAGE_ACCESS_RANGE_OPTIONS,
  },
  {
    key: 'country',
    label: 'Country',
    type: 'text',
    placeholder: 'Country code or name...',
  },
  {
    key: 'referrerHost',
    label: 'Referrer Host',
    type: 'text',
    placeholder: 'google.com',
  },
  {
    key: 'browser',
    label: 'Browser',
    type: 'text',
    placeholder: 'Chrome, Safari...',
  },
  {
    key: 'device',
    label: 'Device',
    type: 'select',
    options: PAGE_ACCESS_DEVICE_OPTIONS,
  },
  {
    key: 'bot',
    label: 'Traffic',
    type: 'select',
    options: PAGE_ACCESS_BOT_OPTIONS,
  },
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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
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
    page,
    totalPages,
    logs,
    logsJson,
    logsQuery,
    metricsQuery,
    clearLogsMutation,
    ConfirmationModal,
  } = useSystemLogsState();
  const { setPage, handleFilterChange, handleResetFilters, handleClearLogs } =
    useSystemLogsActions();
  const [isWipeLogsModalOpen, setIsWipeLogsModalOpen] = React.useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);
  const resolvedTab: ObservationPostTab = (() => {
    const tabParam = searchParams.get('tab');
    return isObservationPostTab(tabParam) ? tabParam : 'overview';
  })();
  const [activeTab, setActiveTab] = React.useState<ObservationPostTab>(resolvedTab);
  const pendingTabRef = React.useRef<ObservationPostTab | null>(null);
  const [wipeLogsTarget, setWipeLogsTarget] = React.useState<ClearLogsTarget | undefined>(undefined);
  const [localSearch, setLocalSearch] = React.useState(query);
  const [connectionsPage, setConnectionsPage] = React.useState(1);
  const [connectionsFiltersOpen, setConnectionsFiltersOpen] = React.useState(false);
  const [connectionsSearch, setConnectionsSearch] = React.useState('');
  const [localConnectionsSearch, setLocalConnectionsSearch] = React.useState('');
  const [connectionsRange, setConnectionsRange] = React.useState<AnalyticsRange>('7d');
  const [connectionsScope, setConnectionsScope] = React.useState<AnalyticsScope | 'all'>('all');
  const [connectionsCountry, setConnectionsCountry] = React.useState('');
  const [connectionsReferrerHost, setConnectionsReferrerHost] = React.useState('');
  const [connectionsBrowser, setConnectionsBrowser] = React.useState('');
  const [connectionsDevice, setConnectionsDevice] = React.useState('all');
  const [connectionsBot, setConnectionsBot] = React.useState<AnalyticsEventFilterBot>('all');
  const connectionsQuery = useAnalyticsEvents({
    page: connectionsPage,
    pageSize: PAGE_ACCESS_PAGE_SIZE,
    range: connectionsRange,
    scope: connectionsScope,
    type: 'pageview',
    search: connectionsSearch,
    country: connectionsCountry,
    referrerHost: connectionsReferrerHost,
    browser: connectionsBrowser,
    device: connectionsDevice,
    bot: connectionsBot,
    enabled: activeTab === 'connections',
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
  const pageAccessFilterValues = {
    range: connectionsRange,
    scope: connectionsScope,
    country: connectionsCountry,
    referrerHost: connectionsReferrerHost,
    browser: connectionsBrowser,
    device: connectionsDevice,
    bot: connectionsBot,
  };
  const activePageAccessFilterValues = Object.fromEntries(
    Object.entries(pageAccessFilterValues).filter(([key, value]) => {
      const defaultValue =
        PAGE_ACCESS_FILTER_DEFAULTS[key as keyof typeof PAGE_ACCESS_FILTER_DEFAULTS];
      return value !== defaultValue && isActiveFilterValue(value);
    })
  );
  const activePageAccessFilterCount = Object.keys(activePageAccessFilterValues).length;

  React.useEffect(() => {
    setLocalSearch(query);
  }, [query]);

  React.useEffect(() => {
    setLocalConnectionsSearch(connectionsSearch);
  }, [connectionsSearch]);

  React.useEffect(() => {
    if (localSearch === query) return;

    const timer = window.setTimeout(() => {
      handleFilterChange('query', localSearch);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [handleFilterChange, localSearch, query]);

  React.useEffect(() => {
    if (localConnectionsSearch === connectionsSearch) return;

    const timer = window.setTimeout(() => {
      setConnectionsSearch(localConnectionsSearch);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [connectionsSearch, localConnectionsSearch]);

  React.useEffect(() => {
    setConnectionsPage(1);
  }, [
    connectionsRange,
    connectionsScope,
    connectionsSearch,
    connectionsCountry,
    connectionsReferrerHost,
    connectionsBrowser,
    connectionsDevice,
    connectionsBot,
  ]);

  const pageAccessEvents = connectionsQuery.data?.events ?? [];
  const pageAccessTotal = connectionsQuery.data?.total ?? 0;
  const pageAccessTotalPages = connectionsQuery.data?.totalPages ?? 1;
  const handleRefresh = React.useCallback((): void => {
    if (activeTab === 'overview') {
      void logsQuery.refetch();
      return;
    }

    if (activeTab === 'connections') {
      void connectionsQuery.refetch();
      return;
    }

    if (activeTab === 'metrics') {
      void metricsQuery.refetch();
    }
  }, [activeTab, connectionsQuery, logsQuery, metricsQuery]);
  const isRefreshingActiveTab =
    activeTab === 'overview'
      ? logsQuery.isFetching
      : activeTab === 'connections'
        ? connectionsQuery.isFetching
        : activeTab === 'metrics'
          ? metricsQuery.isFetching
          : false;
  const handlePageAccessFilterChange = React.useCallback((key: string, value: string): void => {
    if (key === 'scope') setConnectionsScope(value as AnalyticsScope | 'all');
    if (key === 'range') setConnectionsRange(value as AnalyticsRange);
    if (key === 'country') setConnectionsCountry(value);
    if (key === 'referrerHost') setConnectionsReferrerHost(value);
    if (key === 'browser') setConnectionsBrowser(value);
    if (key === 'device') setConnectionsDevice(value);
    if (key === 'bot') setConnectionsBot(value as AnalyticsEventFilterBot);
  }, []);
  const handleResetPageAccessFilters = React.useCallback((): void => {
    setConnectionsRange(PAGE_ACCESS_FILTER_DEFAULTS.range);
    setConnectionsScope(PAGE_ACCESS_FILTER_DEFAULTS.scope);
    setConnectionsCountry(PAGE_ACCESS_FILTER_DEFAULTS.country);
    setConnectionsReferrerHost(PAGE_ACCESS_FILTER_DEFAULTS.referrerHost);
    setConnectionsBrowser(PAGE_ACCESS_FILTER_DEFAULTS.browser);
    setConnectionsDevice(PAGE_ACCESS_FILTER_DEFAULTS.device);
    setConnectionsBot(PAGE_ACCESS_FILTER_DEFAULTS.bot);
  }, []);
  const connectionsJson = React.useMemo(
    () => JSON.stringify(pageAccessEvents, null, 2),
    [pageAccessEvents]
  );
  const exportValue = activeTab === 'connections' ? connectionsJson : logsJson;
  const exportDisabled = activeTab === 'connections' ? pageAccessEvents.length === 0 : logs.length === 0;

  React.useEffect(() => {
    if (pendingTabRef.current && pendingTabRef.current !== resolvedTab) return;
    pendingTabRef.current = null;
    if (activeTab === resolvedTab) return;
    setActiveTab(resolvedTab);
  }, [activeTab, resolvedTab]);

  const handleTabChange = React.useCallback(
    (value: string): void => {
      if (!isObservationPostTab(value)) return;
      setActiveTab(value);
      pendingTabRef.current = value;
      const nextParams = new URLSearchParams(searchParams.toString());
      if (value === 'overview') nextParams.delete('tab');
      else nextParams.set('tab', value);
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

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
                    onRefresh={handleRefresh}
                    isRefreshing={isRefreshingActiveTab}
                    className='h-8'
                  />
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
            onValueChange={handleTabChange}
            className='space-y-4'
          >
            <TabsList
              aria-label='Observation Post tabs'
              className='grid h-auto w-full max-w-5xl grid-cols-3 gap-2 border border-border/60 bg-card/30 p-2 md:grid-cols-6'
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
              <TabsTrigger value='settings' className='h-10'>
                Settings
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
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-none'>
                    <Pagination
                      page={page}
                      totalPages={totalPages}
                      onPageChange={setPage}
                      variant='compact'
                      isLoading={logsQuery.isFetching}
                      className='sm:w-auto sm:flex-none'
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

                <EventStreamPanel showFooterPagination={false} />
              </div>
            </TabsContent>

            <TabsContent value='connections' className='mt-0 space-y-4'>
              <div className='space-y-3'>
                <div className='flex flex-col gap-2 lg:flex-row lg:items-center'>
                  <SearchInput
                    value={localConnectionsSearch}
                    onChange={(event) => setLocalConnectionsSearch(event.target.value)}
                    onClear={() => {
                      setLocalConnectionsSearch('');
                      setConnectionsSearch('');
                    }}
                    placeholder='Search connections...'
                    containerClassName='w-full flex-1'
                    className='h-9'
                    variant='subtle'
                    size='sm'
                  />
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center lg:flex-none'>
                    <Pagination
                      page={connectionsPage}
                      totalPages={pageAccessTotalPages}
                      totalCount={pageAccessTotal}
                      pageSize={PAGE_ACCESS_PAGE_SIZE}
                      onPageChange={setConnectionsPage}
                      variant='compact'
                      isLoading={connectionsQuery.isFetching}
                      className='sm:w-auto sm:flex-none'
                    />
                    <Button
                      type='button'
                      size='sm'
                      variant={activePageAccessFilterCount > 0 ? 'default' : 'outline'}
                      onClick={() => setConnectionsFiltersOpen((currentValue) => !currentValue)}
                      className={
                        activePageAccessFilterCount > 0
                          ? 'h-9 w-full justify-center gap-1.5 px-3 tabular-nums lg:w-auto lg:min-w-[10rem] bg-blue-600 text-white hover:bg-blue-500'
                          : 'h-9 w-full justify-center gap-1.5 px-3 tabular-nums lg:w-auto lg:min-w-[10rem]'
                      }
                    >
                      {connectionsFiltersOpen ? 'Hide Filters' : 'Show Filters'}
                      {activePageAccessFilterCount > 0 ? (
                        <span className='inline-flex min-w-[3ch] justify-center'>
                          ({activePageAccessFilterCount})
                        </span>
                      ) : null}
                    </Button>
                  </div>
                </div>

                {connectionsFiltersOpen ? (
                  <Card variant='glass' padding='lg'>
                    <div className='mb-6 flex items-center gap-2 text-xs font-bold uppercase text-gray-500'>
                      <SearchIcon className='size-3.5' />
                      Connection Filters
                    </div>
                    <FilterPanel
                      filters={PAGE_ACCESS_FILTER_FIELDS}
                      values={pageAccessFilterValues}
                      activeValues={activePageAccessFilterValues}
                      onFilterChange={(key, value) => handlePageAccessFilterChange(key, value as string)}
                      onReset={handleResetPageAccessFilters}
                      showHeader={false}
                      searchPlaceholder=''
                      compact={false}
                      collapsible={false}
                    />
                  </Card>
                ) : null}
                <AnalyticsEventsTable
                  events={pageAccessEvents}
                  isLoading={connectionsQuery.isLoading}
                  title=''
                  emptyTitle='No page access events in this range'
                  emptyDescription='No tracked pageviews matched the current time range or filters. Try 30d or clear filters.'
                  showTypeColumn={false}
                />
              </div>
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

            <TabsContent value='settings' className='mt-0'>
              <ObservationPostSettingsPanel />
            </TabsContent>
          </Tabs>
        </ListPanel>
      </div>
    </>
  );
}
