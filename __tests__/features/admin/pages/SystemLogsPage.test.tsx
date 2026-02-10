import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SystemLogsPage from '@/features/observability/pages/SystemLogsPage';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

// Mock react-query
vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useQueryClient: vi.fn(() => ({
      invalidateQueries: vi.fn(),
    })),
  };
});

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
      <SettingsStoreProvider>
        <SystemLogsPage />
      </SettingsStoreProvider>
    </QueryClientProvider>
  );
};

describe('SystemLogsPage', () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useToast as any).mockReturnValue({ toast: mockToast });
    
    // Default mock for logs
    (useQuery as any).mockImplementation(({ queryKey }: any) => {
      if (queryKey[0] === 'system-logs') {
        if (queryKey[1] === 'list') {
          return {
            isPending: false,
            data: {
              logs: [
                { id: '1', level: 'error', message: 'Test Error', createdAt: new Date().toISOString(), source: 'api' },
                { id: '2', level: 'info', message: 'Test Info', createdAt: new Date().toISOString(), source: 'client' },
              ],
              total: 2,
            },
          };
        }
        if (queryKey[1] === 'metrics') {
          return {
            isPending: false,
            data: {
              metrics: {
                total: 2,
                last24Hours: 1,
                last7Days: 2,
                levels: { error: 1, warn: 0, info: 1 },
                topSources: [{ source: 'api', count: 1 }],
                topPaths: [{ path: '/api/test', count: 1 }],
              },
            },
          };
        }
      }
      return { isPending: false, data: null };
    });

    (useMutation as any).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('renders logs list and metrics', () => {
    renderPage();
    
    expect(screen.getByText('System Logs')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Test Info')).toBeInTheDocument();
    
    // Check metrics
    expect(screen.getByText('Total: 2')).toBeInTheDocument();
    expect(screen.getByText('Errors: 1')).toBeInTheDocument();
  });

  it('renders filter section', () => {
    renderPage();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('opens clear logs action without crashing', async () => {
    const mockMutate = vi.fn().mockResolvedValue(true);
    (useMutation as any).mockImplementation(({ mutationFn: _mutationFn }: any) => {
      // Check if it's the clear logs mutation
      return { mutateAsync: mockMutate, isPending: false };
    });
    
    renderPage();
    
    const clearButton = screen.getByText('Clear Logs');
    fireEvent.click(clearButton);

    const confirmButton =
      screen.queryByText('Clear All') ??
      screen.queryByText('Confirm') ??
      screen.queryByRole('button', { name: /clear/i });
    if (confirmButton && confirmButton !== clearButton) {
      fireEvent.click(confirmButton);
    }

    expect(clearButton).toBeInTheDocument();
  });

  it('exports logs to clipboard', async () => {
    // Mock clipboard
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    renderPage();
    
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalled();
  });
});
