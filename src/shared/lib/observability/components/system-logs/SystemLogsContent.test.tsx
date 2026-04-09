// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TabsTestContext = React.createContext<{
  value: string;
  onValueChange?: (value: string) => void;
} | null>(null);

const mocks = vi.hoisted(() => ({
  useSystemLogsStateMock: vi.fn(),
  useSystemLogsActionsMock: vi.fn(),
  useAnalyticsEventsMock: vi.fn(),
  usePathnameMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  replaceMock: vi.fn(),
}));

vi.mock('@/features/observability/context/SystemLogsContext', () => ({
  useSystemLogsState: mocks.useSystemLogsStateMock,
  useSystemLogsActions: mocks.useSystemLogsActionsMock,
}));

vi.mock('@/shared/lib/analytics/hooks/useAnalyticsQueries', () => ({
  useAnalyticsEvents: mocks.useAnalyticsEventsMock,
}));

vi.mock('next/navigation', () => ({
  usePathname: mocks.usePathnameMock,
  useRouter: () => ({
    replace: mocks.replaceMock,
  }),
  useSearchParams: mocks.useSearchParamsMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: mocks.usePathnameMock,
  useRouter: () => ({
    replace: mocks.replaceMock,
  }),
  useSearchParams: mocks.useSearchParamsMock,
}));

vi.mock('@/shared/ui/admin.public', () => ({
  AdminSectionBreadcrumbs: ({
    current,
  }: {
    current: string;
  }) => <div>breadcrumbs:{current}</div>,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    className,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} className={className}>
      {children}
    </button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange?: (value: string) => void;
    children?: React.ReactNode;
  }) => (
    <TabsTestContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </TabsTestContext.Provider>
  ),
  TabsList: ({
    children,
  }: {
    children?: React.ReactNode;
  }) => <div>{children}</div>,
  TabsTrigger: ({
    value,
    children,
  }: {
    value: string;
    children?: React.ReactNode;
  }) => {
    const runtime = React.useContext(TabsTestContext);
    return (
      <button
        type='button'
        aria-pressed={runtime?.value === value}
        onClick={() => runtime?.onValueChange?.(value)}
      >
        {children}
      </button>
    );
  },
  TabsContent: ({
    value,
    children,
  }: {
    value: string;
    children?: React.ReactNode;
  }) => {
    const runtime = React.useContext(TabsTestContext);
    return runtime?.value === value ? <div>{children}</div> : null;
  },
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  CopyButton: ({
    children,
    value,
    disabled,
  }: {
    children?: React.ReactNode;
    value: string;
    disabled?: boolean;
  }) => (
    <button type='button' aria-label='Export' data-copy-value={value} disabled={disabled}>
      {children}
    </button>
  ),
  RefreshButton: ({
    onRefresh,
    isRefreshing,
  }: {
    onRefresh?: () => void;
    isRefreshing?: boolean;
  }) => (
    <button
      type='button'
      aria-label='Refresh'
      data-refreshing={String(Boolean(isRefreshing))}
      onClick={onRefresh}
    >
      Refresh
    </button>
  ),
  SearchInput: ({
    value,
    onChange,
    onClear,
    placeholder,
  }: {
    value: string;
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClear?: () => void;
    placeholder?: string;
  }) => (
    <div>
      <input
        type='search'
        aria-label={placeholder ?? 'Search'}
        value={value}
        onChange={onChange}
      />
      {value ? (
        <button type='button' onClick={onClear}>
          Clear search
        </button>
      ) : null}
    </div>
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel ?? 'Select'}
      value={value ?? ''}
      onChange={(event) => onValueChange(event.target.value)}
    >
      <option value=''>Choose logs to wipe</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  ListPanel: ({
    header,
    filters,
    children,
  }: {
    header?: React.ReactNode;
    filters?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid='list-panel'>
      {header}
      {filters}
      {children}
    </div>
  ),
  Pagination: (props: {
    page: number;
    totalPages?: number;
    onPageChange: (page: number) => void;
  }) => {
    const { page, totalPages, onPageChange } = props;
    return (
      <div>
        <button
          type='button'
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous page
        </button>
        <button
          type='button'
          onClick={() => onPageChange(page + 1)}
          disabled={page >= (totalPages ?? 1)}
        >
          Next page
        </button>
        <span>
          pagination:{page}/{totalPages ?? 1}
        </span>
      </div>
    );
  },
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-6',
}));

vi.mock('@/shared/ui/templates/FilterPanel', () => ({
  FilterPanel: ({
    values,
    onFilterChange,
    onReset,
  }: {
    values: Record<string, unknown>;
    onFilterChange: (key: string, value: unknown) => void;
    onReset?: () => void;
  }) => (
    <div>
      <div>filter-panel</div>
      <div data-testid='filter-values'>{JSON.stringify(values)}</div>
      <button type='button' onClick={() => onFilterChange('country', 'PL')}>
        Set mocked country filter
      </button>
      <button type='button' onClick={() => onFilterChange('browser', 'Chrome')}>
        Set mocked browser filter
      </button>
      <button type='button' onClick={() => onFilterChange('source', 'system-log-alerts')}>
        Set mocked source filter
      </button>
      <button type='button' onClick={() => onReset?.()}>
        Reset mocked filters
      </button>
    </div>
  ),
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  ConfirmModal: (props: {
    isOpen: boolean;
    title: string;
    children?: React.ReactNode;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    confirmDisabled?: boolean;
    loading?: boolean;
  }) => {
    const {
      isOpen,
      title,
      children,
      onClose,
      onConfirm,
      confirmText,
      confirmDisabled,
      loading,
    } = props;
    return isOpen ? (
      <div role='dialog' aria-label={title}>
        <div>{title}</div>
        {children}
        <button type='button' onClick={onClose}>
          Close modal
        </button>
        <button
          type='button'
          onClick={() => void onConfirm()}
          disabled={confirmDisabled || loading}
        >
          {confirmText ?? 'Confirm'}
        </button>
      </div>
    ) : null;
  },
}));

vi.mock('./SystemLogs.Context', () => ({
  SystemLogsContextRegistrySource: () => <div>context-registry-source</div>,
}));

vi.mock('./SystemLogs.Presets', () => ({
  LogTriagePresets: () => <div>triage-presets</div>,
}));

vi.mock('./SystemLogs.Diagnostics', () => ({
  LogDiagnostics: () => <div>log-diagnostics</div>,
}));

vi.mock('./SystemLogs.Metrics', () => ({
  LogMetrics: () => <div>log-metrics</div>,
  AiLogInterpreter: () => <div>ai-log-interpreter</div>,
}));

vi.mock('./SystemLogs.Table', () => ({
  EventStreamPanel: ({
    showFooterPagination = true,
  }: {
    showFooterPagination?: boolean;
  }) => <div>event-stream-panel:{showFooterPagination ? 'footer-on' : 'footer-off'}</div>,
}));

vi.mock('./SystemLogs.Settings', () => ({
  ObservationPostSettingsPanel: () => <div>observation-post-settings</div>,
}));

vi.mock('@/shared/lib/analytics/components/AnalyticsEventsTable', () => ({
  __esModule: true,
  default: ({
    title,
    events,
    isLoading,
    showTypeColumn,
  }: {
    title?: string;
    events: Array<Record<string, unknown>>;
    isLoading?: boolean;
    showTypeColumn?: boolean;
  }) => (
    <div
      data-testid='analytics-events-table'
      data-events-count={events.length}
      data-loading={String(Boolean(isLoading))}
      data-show-type-column={String(Boolean(showTypeColumn))}
    >
      <div>{title ?? 'analytics-events-table'}</div>
      <div>analytics-events-table</div>
    </div>
  ),
}));

import { SystemLogsContent } from './SystemLogsContent';

const createConnectionsResult = (
  overrides: Partial<{
    events: Array<Record<string, unknown>>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    range: string;
    scope: string;
    type: string;
    search: string;
    country: string;
    referrerHost: string;
    browser: string;
    device: string;
    bot: string;
  }> = {}
) => ({
  data: {
    events: overrides.events ?? [],
    total: overrides.total ?? 0,
    page: overrides.page ?? 1,
    pageSize: overrides.pageSize ?? 25,
    totalPages: overrides.totalPages ?? 1,
    range: overrides.range ?? '7d',
    scope: overrides.scope ?? 'all',
    type: overrides.type ?? 'pageview',
    search: overrides.search ?? '',
    country: overrides.country ?? '',
    referrerHost: overrides.referrerHost ?? '',
    browser: overrides.browser ?? '',
    device: overrides.device ?? '',
    bot: overrides.bot ?? 'all',
  },
  isLoading: false,
  isFetching: false,
  refetch: vi.fn(),
});

describe('SystemLogsContent', () => {
  const logsRefetchMock = vi.fn();
  const metricsRefetchMock = vi.fn();
  const connectionsRefetchMock = vi.fn();
  const setPageMock = vi.fn();
  const handleFilterChangeMock = vi.fn();
  const handleResetFiltersMock = vi.fn();
  const handleClearLogsMock = vi.fn();

  let connectionsQueryResult = createConnectionsResult();

  const buildState = (overrides: Record<string, unknown> = {}) => ({
    filterFields: [],
    level: 'all',
    query: '',
    source: '',
    service: '',
    method: '',
    statusCode: '',
    minDurationMs: '',
    requestId: '',
    traceId: '',
    correlationId: '',
    userId: '',
    fingerprint: '',
    category: '',
    fromDate: '',
    toDate: '',
    page: 1,
    pageSize: 50,
    logs: [{ id: 'log-1' }],
    total: 75,
    totalPages: 2,
    logsJson: '[\n  {\n    "id": "log-1"\n  }\n]',
    logsQuery: {
      refetch: logsRefetchMock,
      isFetching: false,
    },
    metricsQuery: {
      refetch: metricsRefetchMock,
      isFetching: false,
    },
    clearLogsMutation: {
      isPending: false,
    },
    ConfirmationModal: () => <div>confirmation-modal</div>,
    ...overrides,
  });

  const getLatestConnectionsQuery = () =>
    mocks.useAnalyticsEventsMock.mock.calls.at(-1)?.[0] as Record<string, unknown>;

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    logsRefetchMock.mockReset();
    metricsRefetchMock.mockReset();
    connectionsRefetchMock.mockReset();
    setPageMock.mockReset();
    handleFilterChangeMock.mockReset();
    handleResetFiltersMock.mockReset();
    handleClearLogsMock.mockReset();
    mocks.useSystemLogsStateMock.mockReset();
    mocks.useSystemLogsActionsMock.mockReset();
    mocks.useAnalyticsEventsMock.mockReset();
    mocks.usePathnameMock.mockReset();
    mocks.useSearchParamsMock.mockReset();
    mocks.replaceMock.mockReset();

    connectionsQueryResult = {
      ...createConnectionsResult(),
      refetch: connectionsRefetchMock,
    };

    mocks.usePathnameMock.mockReturnValue('/admin/system/logs');
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams(''));
    mocks.useSystemLogsStateMock.mockReturnValue(buildState());
    mocks.useAnalyticsEventsMock.mockImplementation(() => connectionsQueryResult);
    mocks.useSystemLogsActionsMock.mockReturnValue({
      setPage: setPageMock,
      handleFilterChange: handleFilterChangeMock,
      handleResetFilters: handleResetFiltersMock,
      confirmAction: vi.fn(),
      handleClearLogs: handleClearLogsMock,
    });
  });

  it('renders the overview layout shell and keeps non-overview panels isolated in tabs', () => {
    const { container } = render(<SystemLogsContent />);

    const listPanel = screen.getByTestId('list-panel');
    const heading = screen.getByRole('heading', { level: 1, name: 'Observation Post' });
    const breadcrumbs = screen.getByText('breadcrumbs:Observation Post');
    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    const connectionsTab = screen.getByRole('button', { name: 'Connections' });
    const metricsTab = screen.getByRole('button', { name: 'Metrics' });
    const aiInsightsTab = screen.getByRole('button', { name: 'AI Insights' });
    const indexHealthTab = screen.getByRole('button', { name: 'Index Health' });
    const settingsTab = screen.getByRole('button', { name: 'Settings' });
    const searchInput = screen.getByRole('searchbox', { name: 'Search logs...' });
    const pagination = screen.getByText('pagination:1/2');
    const filtersToggle = screen.getByRole('button', { name: 'Show Filters' });
    const eventStreamPanel = screen.getByText('event-stream-panel:footer-off');

    expect(listPanel).toContainElement(heading);
    expect(getLatestConnectionsQuery()).toMatchObject({
      enabled: false,
      page: 1,
      range: '7d',
      scope: 'all',
      type: 'pageview',
    });
    expect(listPanel).toContainElement(breadcrumbs);
    expect(overviewTab).toBeInTheDocument();
    expect(connectionsTab).toBeInTheDocument();
    expect(metricsTab).toBeInTheDocument();
    expect(aiInsightsTab).toBeInTheDocument();
    expect(indexHealthTab).toBeInTheDocument();
    expect(settingsTab).toBeInTheDocument();
    expect(searchInput).toBeInTheDocument();
    expect(pagination).toBeInTheDocument();
    expect(filtersToggle).toBeInTheDocument();
    expect(screen.queryByText('filter-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('analytics-events-table')).not.toBeInTheDocument();
    expect(screen.queryByText('log-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('ai-log-interpreter')).not.toBeInTheDocument();
    expect(screen.queryByText('log-diagnostics')).not.toBeInTheDocument();

    const nodes = Array.from(container.querySelectorAll('*'));
    const headingIndex = nodes.indexOf(heading);
    const breadcrumbsIndex = nodes.indexOf(breadcrumbs);
    const searchInputIndex = nodes.indexOf(searchInput);
    const paginationIndex = nodes.indexOf(pagination);
    const filtersToggleIndex = nodes.indexOf(filtersToggle);
    const eventStreamPanelIndex = nodes.indexOf(eventStreamPanel);

    expect(headingIndex).toBeLessThan(breadcrumbsIndex);
    expect(searchInputIndex).toBeLessThan(eventStreamPanelIndex);
    expect(paginationIndex).toBeLessThan(filtersToggleIndex);

    fireEvent.click(filtersToggle);

    expect(screen.getByText('filter-panel')).toBeInTheDocument();

    fireEvent.click(connectionsTab);

    const connectionsSearchInput = screen.getByRole('searchbox', {
      name: 'Search connections...',
    });
    const connectionsPagination = screen.getByText('pagination:1/1');
    const connectionsFiltersToggle = screen.getByRole('button', { name: 'Show Filters' });

    expect(screen.getByText('analytics-events-table')).toBeInTheDocument();
    expect(screen.queryByText('Website Connections')).not.toBeInTheDocument();
    expect(connectionsSearchInput).toBeInTheDocument();
    expect(connectionsPagination).toBeInTheDocument();
    expect(connectionsFiltersToggle).toBeInTheDocument();
    expect(screen.queryByText('filter-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel:footer-off')).not.toBeInTheDocument();
    expect(screen.queryByText('log-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('ai-log-interpreter')).not.toBeInTheDocument();
    expect(screen.queryByText('log-diagnostics')).not.toBeInTheDocument();

    const connectionsNodes = Array.from(container.querySelectorAll('*'));
    const connectionsSearchIndex = connectionsNodes.indexOf(connectionsSearchInput);
    const connectionsPaginationIndex = connectionsNodes.indexOf(connectionsPagination);
    const connectionsFiltersToggleIndex = connectionsNodes.indexOf(connectionsFiltersToggle);

    expect(connectionsSearchIndex).toBeLessThan(connectionsPaginationIndex);
    expect(connectionsPaginationIndex).toBeLessThan(connectionsFiltersToggleIndex);

    fireEvent.click(connectionsFiltersToggle);

    expect(screen.getByText('filter-panel')).toBeInTheDocument();

    fireEvent.click(metricsTab);

    expect(screen.getByText('log-metrics')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel:footer-off')).not.toBeInTheDocument();
    expect(screen.queryByText('ai-log-interpreter')).not.toBeInTheDocument();
    expect(screen.queryByText('log-diagnostics')).not.toBeInTheDocument();

    fireEvent.click(aiInsightsTab);

    expect(screen.getByText('ai-log-interpreter')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel:footer-off')).not.toBeInTheDocument();
    expect(screen.queryByText('log-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('log-diagnostics')).not.toBeInTheDocument();

    fireEvent.click(indexHealthTab);

    expect(screen.getByText('log-diagnostics')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel:footer-off')).not.toBeInTheDocument();
    expect(screen.queryByText('log-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('ai-log-interpreter')).not.toBeInTheDocument();

    fireEvent.click(settingsTab);

    expect(screen.getByText('observation-post-settings')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel:footer-off')).not.toBeInTheDocument();
    expect(screen.queryByText('analytics-events-table')).not.toBeInTheDocument();
    expect(mocks.replaceMock).toHaveBeenCalledWith('/admin/system/logs?tab=settings', {
      scroll: false,
    });
  });

  it('refreshes only the active tab data source and swaps export payloads between overview and connections', () => {
    connectionsQueryResult = {
      ...createConnectionsResult({
        events: [{ id: 'visit-1', path: '/pricing' }],
        total: 1,
        totalPages: 1,
      }),
      refetch: connectionsRefetchMock,
    };

    render(<SystemLogsContent />);

    const exportButton = screen.getByRole('button', { name: 'Export' });

    expect(exportButton).toHaveAttribute(
      'data-copy-value',
      '[\n  {\n    "id": "log-1"\n  }\n]'
    );
    expect(exportButton).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(logsRefetchMock).toHaveBeenCalledTimes(1);
    expect(metricsRefetchMock).not.toHaveBeenCalled();
    expect(connectionsRefetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Connections' }));

    expect(getLatestConnectionsQuery()).toMatchObject({ enabled: true });
    expect(mocks.replaceMock).toHaveBeenCalledWith('/admin/system/logs?tab=connections', {
      scroll: false,
    });
    expect(screen.getByRole('button', { name: 'Export' })).toHaveAttribute(
      'data-copy-value',
      JSON.stringify([{ id: 'visit-1', path: '/pricing' }], null, 2)
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(logsRefetchMock).toHaveBeenCalledTimes(1);
    expect(metricsRefetchMock).not.toHaveBeenCalled();
    expect(connectionsRefetchMock).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Metrics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    expect(logsRefetchMock).toHaveBeenCalledTimes(1);
    expect(metricsRefetchMock).toHaveBeenCalledTimes(1);
    expect(connectionsRefetchMock).toHaveBeenCalledTimes(1);
  });

  it('debounces overview log search and clears it immediately when requested', () => {
    vi.useFakeTimers();

    render(<SystemLogsContent />);

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search logs...' }), {
      target: { value: 'timeout' },
    });

    expect(handleFilterChangeMock).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(401);
    });

    expect(handleFilterChangeMock).toHaveBeenCalledWith('query', 'timeout');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(handleFilterChangeMock).toHaveBeenCalledWith('query', '');
  });

  it('keeps overview as the fallback tab and syncs tab changes into the URL', () => {
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=unknown'));

    render(<SystemLogsContent />);

    expect(screen.getByText('event-stream-panel:footer-off')).toBeInTheDocument();
    expect(screen.queryByText('observation-post-settings')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Metrics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Overview' }));

    expect(mocks.replaceMock).toHaveBeenNthCalledWith(1, '/admin/system/logs?tab=metrics', {
      scroll: false,
    });
    expect(mocks.replaceMock).toHaveBeenNthCalledWith(2, '/admin/system/logs', {
      scroll: false,
    });
  });

  it('opens the settings tab from the URL query parameter', () => {
    mocks.useSearchParamsMock.mockReturnValue(new URLSearchParams('tab=settings'));

    render(<SystemLogsContent />);

    expect(screen.getByText('observation-post-settings')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel:footer-off')).not.toBeInTheDocument();
    expect(screen.queryByText('analytics-events-table')).not.toBeInTheDocument();
  });

  it('opens a wipe modal with selectable log targets, resets on close, and forwards the chosen target', () => {
    render(<SystemLogsContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Wipe Logs' }));

    const logTargetSelect = screen.getByRole('combobox', { name: 'Choose log type to wipe' });
    const confirmButton = screen.getByRole('button', { name: 'Wipe Selected Logs' });

    expect(logTargetSelect).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Error logs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Info events' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Activity logs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Page Access logs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All logs' })).toBeInTheDocument();
    expect(confirmButton).toBeDisabled();

    fireEvent.change(logTargetSelect, {
      target: { value: 'info_logs' },
    });

    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Close modal' }));

    fireEvent.click(screen.getByRole('button', { name: 'Wipe Logs' }));

    expect(screen.getByRole('combobox', { name: 'Choose log type to wipe' })).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Wipe Selected Logs' })).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Choose log type to wipe' }), {
      target: { value: 'activity_logs' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Wipe Selected Logs' }));

    expect(handleClearLogsMock).toHaveBeenCalledWith('activity_logs');
  });

  it('debounces connections search and keeps connection filter/query state in sync with the analytics request', async () => {
    vi.useFakeTimers();
    connectionsQueryResult = {
      ...createConnectionsResult({
        events: [{ id: 'visit-1', path: '/pricing' }],
        total: 90,
        totalPages: 4,
      }),
      refetch: connectionsRefetchMock,
    };

    render(<SystemLogsContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Connections' }));

    expect(getLatestConnectionsQuery()).toMatchObject({
      enabled: true,
      page: 1,
      search: '',
      country: '',
      browser: '',
      scope: 'all',
      range: '7d',
    });

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search connections...' }), {
      target: { value: 'checkout' },
    });

    expect(getLatestConnectionsQuery()).toMatchObject({ search: '' });

    act(() => {
      vi.advanceTimersByTime(401);
    });

    expect(getLatestConnectionsQuery()).toMatchObject({
      page: 1,
      search: 'checkout',
    });

    vi.useRealTimers();

    await act(async () => {
      // Let React flush state/effect work before the next assertions.
    });

    fireEvent.click(screen.getByRole('button', { name: 'Show Filters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Set mocked country filter' }));

    await waitFor(() => {
      expect(getLatestConnectionsQuery()).toMatchObject({
        page: 1,
        search: 'checkout',
        country: 'PL',
      });
    });

    let connectionsFiltersToggle = screen.getByRole('button', { name: /Hide Filters/ });
    expect(connectionsFiltersToggle).toHaveTextContent('(1)');

    fireEvent.click(screen.getByRole('button', { name: 'Set mocked browser filter' }));

    await waitFor(() => {
      expect(getLatestConnectionsQuery()).toMatchObject({
        page: 1,
        search: 'checkout',
        country: 'PL',
        browser: 'Chrome',
      });
    });

    connectionsFiltersToggle = screen.getByRole('button', { name: /Hide Filters/ });
    expect(connectionsFiltersToggle).toHaveTextContent('(2)');

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));

    await waitFor(() => {
      expect(getLatestConnectionsQuery()).toMatchObject({
        page: 2,
        country: 'PL',
        browser: 'Chrome',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Reset mocked filters' }));

    await waitFor(() => {
      expect(getLatestConnectionsQuery()).toMatchObject({
        page: 1,
        search: 'checkout',
        country: '',
        browser: '',
        scope: 'all',
        range: '7d',
      });
    });

    connectionsFiltersToggle = screen.getByRole('button', { name: /Hide Filters/ });
    expect(connectionsFiltersToggle).not.toHaveTextContent(/\(\d+\)/);
  });

  it('keeps the connections query disabled until the connections tab is active', () => {
    render(<SystemLogsContent />);

    expect(getLatestConnectionsQuery()).toMatchObject({
      enabled: false,
      page: 1,
      range: '7d',
      scope: 'all',
      type: 'pageview',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Connections' }));

    expect(getLatestConnectionsQuery()).toMatchObject({
      enabled: true,
      page: 1,
      range: '7d',
      scope: 'all',
      type: 'pageview',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Metrics' }));

    expect(getLatestConnectionsQuery()).toMatchObject({
      enabled: false,
      page: 1,
      range: '7d',
      scope: 'all',
      type: 'pageview',
    });
  });
});
