// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const TabsTestContext = React.createContext<{
  value: string;
  onValueChange?: (value: string) => void;
} | null>(null);

const mocks = vi.hoisted(() => ({
  useSystemLogsStateMock: vi.fn(),
  useSystemLogsActionsMock: vi.fn(),
  useAnalyticsEventsMock: vi.fn(),
}));

vi.mock('@/features/observability/context/SystemLogsContext', () => ({
  useSystemLogsState: mocks.useSystemLogsStateMock,
  useSystemLogsActions: mocks.useSystemLogsActionsMock,
}));

vi.mock('@/shared/lib/analytics/hooks/useAnalyticsQueries', () => ({
  useAnalyticsEvents: mocks.useAnalyticsEventsMock,
}));

vi.mock('@/shared/ui', () => ({
  AdminSectionBreadcrumbs: ({
    current,
  }: {
    current: string;
  }) => <div>breadcrumbs:{current}</div>,
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CopyButton: ({ children }: { children?: React.ReactNode }) => <button>{children}</button>,
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
  RefreshButton: ({
    onRefresh,
  }: {
    onRefresh?: () => void;
  }) => <button onClick={onRefresh}>Refresh</button>,
  Pagination: ({
    page,
    totalPages,
    onPageChange,
  }: {
    page: number;
    totalPages?: number;
    onPageChange: (page: number) => void;
  }) => (
    <div>
      <button type='button' onClick={() => onPageChange(page + 1)}>
        Next page
      </button>
      <span>
        pagination:{page}/{totalPages ?? 1}
      </span>
    </div>
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
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
  }) => (
    <select
      aria-label='Choose log type to wipe'
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
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-6',
}));

vi.mock('@/shared/ui/templates/FilterPanel', () => ({
  FilterPanel: () => <div>filter-panel</div>,
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  ConfirmModal: ({
    isOpen,
    title,
    children,
    onConfirm,
    confirmText,
    confirmDisabled,
  }: {
    isOpen: boolean;
    title: string;
    children?: React.ReactNode;
    onConfirm: () => void | Promise<void>;
    confirmText?: string;
    confirmDisabled?: boolean;
  }) =>
    isOpen ? (
      <div>
        <div>{title}</div>
        {children}
        <button type='button' onClick={() => void onConfirm()} disabled={confirmDisabled}>
          {confirmText ?? 'Confirm'}
        </button>
      </div>
    ) : null,
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
  EventStreamPanel: () => <div>event-stream-panel</div>,
}));

vi.mock('@/shared/lib/analytics/components/AnalyticsEventsTable', () => ({
  __esModule: true,
  default: ({
    title,
    footer,
  }: {
    title?: string;
    footer?: React.ReactNode;
  }) => (
    <div>
      <div>{title ?? 'analytics-events-table'}</div>
      <div>analytics-events-table</div>
      {footer}
    </div>
  ),
}));

import { SystemLogsContent } from './SystemLogsContent';

describe('SystemLogsContent', () => {
  beforeEach(() => {
    mocks.useSystemLogsStateMock.mockReset();
    mocks.useSystemLogsActionsMock.mockReset();
    mocks.useAnalyticsEventsMock.mockReset();

    mocks.useSystemLogsStateMock.mockReturnValue({
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
      logs: [],
      logsJson: '[]',
      logsQuery: {
        refetch: vi.fn(),
        isFetching: false,
      },
      metricsQuery: {
        refetch: vi.fn(),
        isFetching: false,
      },
      clearLogsMutation: {
        isPending: false,
      },
      ConfirmationModal: () => <div>confirmation-modal</div>,
    });
    mocks.useAnalyticsEventsMock.mockReturnValue({
      data: {
        events: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 1,
        range: '24h',
        scope: 'public',
        type: 'pageview',
      },
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    });

    mocks.useSystemLogsActionsMock.mockReturnValue({
      handleFilterChange: vi.fn(),
      handleResetFilters: vi.fn(),
      confirmAction: vi.fn(),
      handleClearLogs: vi.fn(),
    });
  });

  it('renders overview controls above the event stream and moves secondary observability panels into separate tabs', () => {
    const { container } = render(<SystemLogsContent />);

    const listPanel = screen.getByTestId('list-panel');
    const heading = screen.getByRole('heading', { level: 1, name: 'Observation Post' });
    const breadcrumbs = screen.getByText('breadcrumbs:Observation Post');
    const overviewTab = screen.getByRole('button', { name: 'Overview' });
    const connectionsTab = screen.getByRole('button', { name: 'Connections' });
    const metricsTab = screen.getByRole('button', { name: 'Metrics' });
    const aiInsightsTab = screen.getByRole('button', { name: 'AI Insights' });
    const indexHealthTab = screen.getByRole('button', { name: 'Index Health' });
    const searchInput = screen.getByRole('searchbox', { name: 'Search logs...' });
    const filtersToggle = screen.getByRole('button', { name: 'Show Filters' });
    const eventStreamPanel = screen.getByText('event-stream-panel');

    expect(listPanel).toContainElement(heading);
    expect(listPanel).toContainElement(breadcrumbs);
    expect(overviewTab).toBeInTheDocument();
    expect(connectionsTab).toBeInTheDocument();
    expect(metricsTab).toBeInTheDocument();
    expect(aiInsightsTab).toBeInTheDocument();
    expect(indexHealthTab).toBeInTheDocument();
    expect(searchInput).toBeInTheDocument();
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
    const eventStreamPanelIndex = nodes.indexOf(eventStreamPanel);

    expect(headingIndex).toBeLessThan(breadcrumbsIndex);
    expect(searchInputIndex).toBeLessThan(eventStreamPanelIndex);
    expect(eventStreamPanel).toBeInTheDocument();

    fireEvent.click(filtersToggle);

    expect(screen.getByText('filter-panel')).toBeInTheDocument();

    fireEvent.click(connectionsTab);

    expect(screen.getByText('analytics-events-table')).toBeInTheDocument();
    expect(screen.getByText('Website Connections')).toBeInTheDocument();
    expect(screen.getByText('pagination:1/1')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('log-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('ai-log-interpreter')).not.toBeInTheDocument();
    expect(screen.queryByText('log-diagnostics')).not.toBeInTheDocument();

    fireEvent.click(metricsTab);

    expect(screen.getByText('log-metrics')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('ai-log-interpreter')).not.toBeInTheDocument();
    expect(screen.queryByText('log-diagnostics')).not.toBeInTheDocument();

    fireEvent.click(aiInsightsTab);

    expect(screen.getByText('ai-log-interpreter')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('log-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('log-diagnostics')).not.toBeInTheDocument();

    fireEvent.click(indexHealthTab);

    expect(screen.getByText('log-diagnostics')).toBeInTheDocument();
    expect(screen.queryByText('event-stream-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('log-metrics')).not.toBeInTheDocument();
    expect(screen.queryByText('ai-log-interpreter')).not.toBeInTheDocument();
  });

  it('opens a wipe modal with selectable log targets and forwards the chosen target', () => {
    const handleClearLogs = vi.fn();
    mocks.useSystemLogsActionsMock.mockReturnValue({
      handleFilterChange: vi.fn(),
      handleResetFilters: vi.fn(),
      confirmAction: vi.fn(),
      handleClearLogs,
    });

    render(<SystemLogsContent />);

    fireEvent.click(screen.getByRole('button', { name: 'Wipe Logs' }));

    expect(screen.getByRole('combobox', { name: 'Choose log type to wipe' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Error logs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Activity logs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Page Access logs' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'All logs' })).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Wipe Selected Logs' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByRole('combobox', { name: 'Choose log type to wipe' }), {
      target: { value: 'activity_logs' },
    });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);

    expect(handleClearLogs).toHaveBeenCalledWith('activity_logs');
  });
});
