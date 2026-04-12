import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

import {
  useSystemLogsActions,
  useSystemLogsState,
} from '@/shared/lib/observability/context/SystemLogsContext';
import SystemLogsPage from '@/shared/lib/observability/components/system-logs/SystemLogsPage';

vi.mock('@/shared/ui/list-panel', () => ({
  ListPanel: ({
    header,
    children,
  }: {
    header?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div data-testid='mock-list-panel'>
      {header}
      {children}
    </div>
  ),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

vi.mock('nextjs-toploader/app', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock SystemLogsContext
vi.mock('@/shared/lib/observability/context/SystemLogsContext', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    SystemLogsProvider: ({ children }) => <>{children}</>,
    useSystemLogsState: vi.fn(),
    useSystemLogsActions: vi.fn(),
  };
});

// Mock SettingsStoreProvider
vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({ children }) => <>{children}</>,
  useSettingsStore: vi.fn(() => ({
    get: vi.fn(),
    getBoolean: vi.fn(() => false),
    getNumber: vi.fn(),
    map: new Map(),
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })),
}));

// Mock UI components (match SystemLogsContent barrels)
vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    useToast: vi.fn(() => ({ toast: vi.fn() })),
    Tabs: ({ children }) => <div data-testid='mock-tabs'>{children}</div>,
    TabsList: ({ children }) => <div data-testid='mock-tabs-list'>{children}</div>,
    TabsTrigger: ({ children, value }) => <button role='tab' data-value={value}>{children}</button>,
    TabsContent: ({ children, value }) => <div data-testid={'mock-tabs-content-' + value}>{children}</div>,
  };
});

vi.mock('@/shared/ui/navigation-and-layout.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/navigation-and-layout.public')>();
  return {
    ...actual,
    ListPanel: ({
      header,
      children,
    }: {
      header?: React.ReactNode;
      children?: React.ReactNode;
    }) => (
      <div data-testid='mock-list-panel'>
        {header}
        {children}
      </div>
    ),
  };
});

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

const renderPage = () => {
  const queryClient = createTestQueryClient();
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <QueryClientProvider client={queryClient}>
        <SystemLogsPage />
      </QueryClientProvider>
    )
  };
};

describe('SystemLogsPage', () => {
  const mockConfirmAction = vi.fn();
  let mockHandleClearLogs;
  const MockConfirmationModal = () => <div data-testid='confirm-modal' />;

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleClearLogs = vi.fn();
    
    const mockValue = {
      logsQuery: { isPending: false, isFetching: false, refetch: vi.fn() },
      metricsQuery: { isPending: false, isFetching: false, refetch: vi.fn() },
      insightsQuery: { isLoading: false, data: { insights: [] } },
      mongoDiagnosticsQuery: { isLoading: false, data: { collections: [] }, refetch: vi.fn() },
      runInsightMutation: { isPending: false, mutate: vi.fn() },
      interpretLogMutation: { isPending: false },
      clearLogsMutation: { isPending: false },
      rebuildIndexesMutation: { isPending: false },
      confirmAction: mockConfirmAction,
      ConfirmationModal: MockConfirmationModal,
      handleClearLogs: mockHandleClearLogs,
      handleRebuildMongoIndexes: vi.fn(),
      handleRunInsight: vi.fn(),
      handleInterpretLog: vi.fn(),
      isClearLogsConfirmOpen: false,
      setIsClearLogsConfirmOpen: vi.fn(),
      isRebuildIndexesConfirmOpen: false,
      setIsRebuildIndexesConfirmOpen: vi.fn(),
      toast: vi.fn(),
      logs: [
        { id: '1', level: 'error', message: 'Test Error', createdAt: new Date().toISOString(), source: 'api' },
        { id: '2', level: 'info', message: 'Test Info', createdAt: new Date().toISOString(), source: 'client' },
      ],
      metrics: {
        total: 2,
        last24Hours: 1,
        last7Days: 2,
        levels: { error: 1, warn: 0, info: 1 },
        topSources: [{ source: 'api', count: 1 }],
        topPaths: [{ path: '/api/test', count: 1 }],
        generatedAt: new Date().toISOString(),
      },
      levels: { error: 1, warn: 0, info: 1 },
      total: 2,
      totalPages: 1,
      page: 1,
      pageSize: 50,
      setPage: vi.fn(),
      filterFields: [],
      level: 'all',
      query: '',
      source: '',
      method: '',
      statusCode: '',
      requestId: '',
      userId: '',
      service: '',
      traceId: '',
      correlationId: '',
      fingerprint: '',
      category: '',
      fromDate: '',
      toDate: '',
      handleFilterChange: vi.fn(),
      handleResetFilters: vi.fn(),
      logsJson: '[]',
      diagnostics: [],
      diagnosticsUpdatedAt: null,
      logInterpretations: {},
    };

    vi.mocked(useSystemLogsState).mockReturnValue(mockValue);
    vi.mocked(useSystemLogsActions).mockReturnValue(mockValue);
  });

  it('renders logs list and metrics', async () => {
    const { user } = renderPage();
    expect(screen.getByRole('heading', { name: 'Observation Post' })).toBeInTheDocument();
    expect(screen.getAllByTestId('mock-list-panel').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Overview/i })).toBeInTheDocument();
    
    // Switch to Metrics tab
    const metricsTab = screen.getByRole('tab', { name: /Metrics/i });
    await user.click(metricsTab);
    expect(metricsTab).toBeInTheDocument();
    expect(screen.getByTestId('mock-tabs')).toBeInTheDocument();
  });

  it('renders filter section', async () => {
    const { user } = renderPage();
    const showFiltersButton = screen.getAllByRole('button', { name: /Show Filters/i })[0];
    await user.click(showFiltersButton);
    expect(screen.getByText(/Log Filters/i)).toBeInTheDocument();
  });

  it('opens clear logs action without crashing', async () => {
    const { user } = renderPage();
    const clearButton = screen.getByRole('button', { name: /Wipe Logs/i });
    await user.click(clearButton);
    expect(screen.getByRole('heading', { name: 'Wipe Logs' })).toBeInTheDocument();
  });

  it('renders confirmation modal mount point', () => {
    renderPage();
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  it('exports logs to clipboard', async () => {
    renderPage();
    const copyButton = screen.getByText('Export').closest('button');
    expect(copyButton).not.toBeNull();

    fireEvent.click(copyButton as HTMLButtonElement);

    await waitFor(() =>
      expect(copyButton).toHaveAttribute('title', 'Copied!')
    );
  });
});
