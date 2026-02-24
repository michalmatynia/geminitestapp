import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useSystemLogsContext } from '@/features/observability/context/SystemLogsContext';
import SystemLogsPage from '@/features/observability/pages/SystemLogsPage';

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
  const actual = await importOriginal<any>();
  return {
    ...actual,
    SystemLogsProvider: ({ children }: any) => children,
    useSystemLogsContext: vi.fn(),
  };
});

// Mock SettingsStoreProvider to avoid react-query issues in provider
vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({ children }: any) => children,
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
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useToast: vi.fn(() => ({ toast: vi.fn() })),
    Button: ({ children, onClick, disabled, className }: any) => (
      <button onClick={onClick} disabled={disabled} className={className}>{children}</button>
    ),
    Input: ({ value, onChange, placeholder, type }: any) => (
      <input value={value} onChange={onChange} placeholder={placeholder} type={type} />
    ),
    Select: ({ children, value, onValueChange }: any) => (
      <select value={value} onChange={(e) => onValueChange(e.target.value)}>{children}</select>
    ),
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    Label: ({ children }: any) => <label>{children}</label>,
    SectionHeader: ({ title, description, actions }: any) => (
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
        <div>{actions}</div>
      </div>
    ),
    SectionPanel: ({ children }: any) => <div>{children}</div>,
    ListPanel: ({ children, header, filters }: any) => (
      <div>
        {header}
        {filters}
        {children}
      </div>
    ),
    StandardDataTablePanel: ({ data, columns }: any) => (
      <div>
        {data.map((row: any, i: number) => (
          <div key={i}>
            {columns.map((col: any) => {
              if (col.cell && typeof col.cell === 'function') {
                return <div key={col.accessorKey || col.id}>{col.cell({ row: { original: row } })}</div>;
              }
              return <div key={col.accessorKey || col.id}>{row[col.accessorKey]}</div>;
            })}
          </div>
        ))}
      </div>
    ),
  };
});

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const renderPage = () => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <SystemLogsPage />
    </QueryClientProvider>
  );
};

describe('SystemLogsPage', () => {
  const mockConfirmAction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default context mock
    (useSystemLogsContext as any).mockReturnValue({
      logsQuery: { isPending: false, isFetching: false, refetch: vi.fn() },
      metricsQuery: { isPending: false, isFetching: false, refetch: vi.fn() },
      insightsQuery: { isLoading: false, data: { insights: [] } },
      mongoDiagnosticsQuery: { isLoading: false, data: { collections: [] }, refetch: vi.fn() },
      runInsightMutation: { isPending: false, mutate: vi.fn() },
      interpretLogMutation: { isPending: false },
      clearLogsMutation: { isPending: false },
      confirmAction: mockConfirmAction,
      ConfirmationModal: () => null,
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
    });
  });

  it('renders logs list and metrics', () => {
    renderPage();
    
    expect(screen.getByText('Observation Post')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Test Info')).toBeInTheDocument();
    
    // Check metrics using flexible matchers for PropertyRow labels
    expect(screen.getByText(/^Total Logs:/i)).toBeInTheDocument();
    expect(screen.getByText(/^Errors:/i)).toBeInTheDocument();
  });

  it('renders filter section', () => {
    renderPage();
    // In our mock PageLayout/DynamicFilters might not render "Filters" text exactly, 
    // let's check for "Log Filters" which is in SystemLogsPage.tsx
    expect(screen.getByText(/Log Filters/i)).toBeInTheDocument();
  });

  it('opens clear logs action without crashing', async () => {
    const user = userEvent.setup();
    renderPage();
    
    const clearButton = screen.getByText('Wipe Logs');
    await user.click(clearButton);

    expect(mockConfirmAction).toHaveBeenCalled();
  });

  it('exports logs to clipboard', async () => {
    const user = userEvent.setup();
    // Mock clipboard
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    renderPage();
    
    const copyButton = screen.getByText('Export');
    await user.click(copyButton);
    
    // CopyButton component internally calls navigator.clipboard.writeText
    expect(mockWriteText).toHaveBeenCalled();
  });
});
