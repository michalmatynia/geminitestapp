import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  useSystemLogsActions,
  useSystemLogsState,
} from '@/features/observability/context/SystemLogsContext';
import SystemLogsPage from '@/features/observability/pages/SystemLogsPage';
import type { SystemLogRecordDto as SystemLogRecord } from '@/shared/contracts/observability';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
  usePathname: vi.fn(() => '/'),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  })),
}));

// Mock SystemLogsContext (override global mock from vitest.setup.ts if needed)
vi.mock('@/features/observability/context/SystemLogsContext', async (importOriginal) => {
  const actual = (await importOriginal());
  return {
    ...actual,
    SystemLogsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useSystemLogsState: vi.fn(),
    useSystemLogsActions: vi.fn(),
  };
});

// Mock SettingsStoreProvider to avoid react-query issues in provider
vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
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

// Mock useToast and UI components
vi.mock('@/shared/ui', async (importOriginal) => {
  const actual = (await importOriginal());
  return {
    ...actual,
    useToast: vi.fn(() => ({ toast: vi.fn() })),
    Button: ({
      children,
      onClick,
      disabled,
      className,
    }: {
      children: React.ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      className?: string;
    }) => (
      <button onClick={onClick} disabled={disabled} className={className}>
        {children}
      </button>
    ),
    Input: ({
      value,
      onChange,
      placeholder,
      type,
    }: {
      value: string;
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
      placeholder?: string;
      type?: string;
    }) => <input value={value} onChange={onChange} placeholder={placeholder} type={type} />,
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: React.ReactNode;
      value: string;
      onValueChange: (val: string) => void;
    }) => <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder}</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <option value={value}>{children}</option>
    ),
    Label: ({ children }: { children: React.ReactNode }) => <label>{children}</label>,
    SectionHeader: ({
      title,
      description,
      actions,
    }: {
      title: string;
      description?: string;
      actions?: React.ReactNode;
    }) => (
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div>{actions}</div>
      </div>
    ),
    SectionPanel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    ListPanel: ({
      children,
      header,
      filters,
    }: {
      children: React.ReactNode;
      header?: React.ReactNode;
      filters?: React.ReactNode;
    }) => (
      <div>
        {header}
        {filters}
        {children}
      </div>
    ),
    StandardDataTablePanel: ({
      data,
      columns,
    }: {
      data: SystemLogRecord[];
      columns: Array<{
        accessorKey?: keyof SystemLogRecord | string;
        id?: string;
        cell?: (props: { row: { original: SystemLogRecord } }) => React.ReactNode;
      }>;
    }) => (
      <div>
        {data.map((row, i) => (
          <div key={i}>
            {columns.map((col) => {
              if (col.cell && typeof col.cell === 'function') {
                return (
                  <div key={col.accessorKey || col.id}>{col.cell({ row: { original: row } })}</div>
                );
              }
              return (
                <div key={col.accessorKey || col.id}>
                  {String(row[col.accessorKey as keyof SystemLogRecord] ?? '')}
                </div>
              );
            })}
          </div>
        ))}
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
  let mockHandleClearLogs: ReturnType<typeof vi.fn>;
  const MockConfirmationModal = () => <div data-testid='confirm-modal' />;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default context mock
    mockHandleClearLogs = vi.fn();
    const mockSystemLogsValue = {
      logsQuery: { isPending: false, isFetching: false, refetch: vi.fn() } as unknown as any,
      metricsQuery: { isPending: false, isFetching: false, refetch: vi.fn() } as unknown as any,
      insightsQuery: { isLoading: false, data: { insights: [] } } as unknown as any,
      mongoDiagnosticsQuery: {
        isLoading: false,
        data: { collections: [] },
        refetch: vi.fn(),
      } as unknown as any,
      runInsightMutation: { isPending: false, mutate: vi.fn() } as unknown as any,
      interpretLogMutation: { isPending: false } as unknown as any,
      clearLogsMutation: { isPending: false } as unknown as any,
      rebuildIndexesMutation: { isPending: false } as unknown as any,
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
        {
          id: '1',
          level: 'error',
          message: 'Test Error',
          createdAt: new Date().toISOString(),
          source: 'api',
        },
        {
          id: '2',
          level: 'info',
          message: 'Test Info',
          createdAt: new Date().toISOString(),
          source: 'client',
        },
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
    } as any;

    vi.mocked(useSystemLogsState).mockReturnValue(mockSystemLogsValue);
    vi.mocked(useSystemLogsActions).mockReturnValue(mockSystemLogsValue);
  });

  it('renders logs list and metrics', async () => {
    const { user } = renderPage();

    expect(screen.getByRole('heading', { name: 'Observation Post' })).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Test Info')).toBeInTheDocument();

    // Switch to Metrics tab
    const metricsTab = screen.getByRole('tab', { name: /Metrics/i });
    await user.click(metricsTab);

    // Check metrics
    expect(screen.getByText('Total Logs')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
  });
it('renders filter section', async () => {
  const { user } = renderPage();

  const showFiltersButton = screen.getByRole('button', { name: /Show Filters/i });
  await user.click(showFiltersButton);

  // In our mock PageLayout/DynamicFilters might not render "Filters" text exactly,
  // let's check for "Log Filters" which is in SystemLogsPage.tsx
  expect(screen.getByText(/Log Filters/i)).toBeInTheDocument();
});

  it('opens clear logs action without crashing', async () => {
    const user = userEvent.setup();
    renderPage();

    const clearButton = screen.getByRole('button', { name: /Wipe Logs/i });
    await user.click(clearButton);

    expect(screen.getByRole('heading', { name: 'Wipe Logs' })).toBeInTheDocument();
    expect(screen.getByText('Choose which log records should be deleted.')).toBeInTheDocument();
  });

  it('renders confirmation modal mount point', () => {
    renderPage();

    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
  });

  it('exports logs to clipboard', async () => {
    // Mock clipboard
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    const { user } = renderPage();

    const copyButton = screen.getByText('Export');
    await user.click(copyButton);

    // CopyButton component internally calls navigator.clipboard.writeText
    expect(mockWriteText).toHaveBeenCalled();
  });
});
