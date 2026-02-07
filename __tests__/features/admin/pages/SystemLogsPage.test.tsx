import { QueryClient, QueryClientProvider, useQuery, useMutation } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import SystemLogsPage from '@/features/observability/pages/SystemLogsPage';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

// ... (keep mocks)

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

  it('filters logs by level', () => {
    renderPage();
    
    const levelSelect = screen.getByRole('combobox');
    fireEvent.change(levelSelect, { target: { value: 'error' } });
    
    expect(levelSelect).toHaveValue('error');
  });

  it('calls clear logs mutation when button is clicked', async () => {
    const mockMutate = vi.fn().mockResolvedValue(true);
    (useMutation as any).mockImplementation(({ mutationFn }: any) => {
      if (mutationFn) return { mutateAsync: mockMutate, isPending: false };
      return { mutateAsync: vi.fn(), isPending: false };
    });
    
    // Mock confirm
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderPage();
    
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

    renderPage();
    
    const copyButton = screen.getByText('Copy');
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith('Logs copied to clipboard.', { variant: 'success' });
    });
  });
});
