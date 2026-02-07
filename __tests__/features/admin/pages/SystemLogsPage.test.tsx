import { useQuery, useMutation } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SystemLogsPage from '@/features/observability/pages/SystemLogsPage';
import { useToast } from '@/shared/ui';

// Mock react-query
vi.mock('@tanstack/react-query', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useQueryClient: vi.fn(() => ({
    invalidateQueries: vi.fn(),
  })),
}));

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
vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<any>('@/shared/ui');
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
    render(<SystemLogsPage />);
    
    expect(screen.getByText('System Logs')).toBeInTheDocument();
    expect(screen.getByText('Test Error')).toBeInTheDocument();
    expect(screen.getByText('Test Info')).toBeInTheDocument();
    
    // Check metrics
    expect(screen.getByText('Total: 2')).toBeInTheDocument();
    expect(screen.getByText('Errors: 1')).toBeInTheDocument();
  });

  it('filters logs by level', () => {
    render(<SystemLogsPage />);
    
    const levelSelect = screen.getByRole('combobox');
    fireEvent.change(levelSelect, { target: { value: 'error' } });
    
    // useQuery should be called again with updated level
    // In this unit test we just check if it renders. 
    // Real filtering happens in queryFn params.
    expect(levelSelect).toHaveValue('error');
  });

  it('calls clear logs mutation when button is clicked', async () => {
    const mockMutate = vi.fn().mockResolvedValue(true);
    (useMutation as any).mockReturnValue({
      mutateAsync: mockMutate,
      isPending: false,
    });
    
    // Mock confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<SystemLogsPage />);
    
    const clearButton = screen.getByText('Clear Logs');
    fireEvent.click(clearButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockMutate).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('System logs cleared.', { variant: 'success' });
    });
  });

  it('exports logs to clipboard', async () => {
    // Mock clipboard
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      configurable: true,
    });

    render(<SystemLogsPage />);
    
    const copyButton = screen.getByText('Copy JSON');
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Logs copied to clipboard.', { variant: 'success' });
    });
  });
});
