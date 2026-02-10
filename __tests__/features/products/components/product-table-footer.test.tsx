import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Table } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { ProductTableFooter } from '@/features/products/components/list/ProductTableFooter';
import { ToastProvider } from '@/shared/ui/toast';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } }
});

describe('ProductTableFooter Component', () => {
  const mockTable = {
    getFilteredSelectedRowModel: () => ({ rows: [] }),
    getFilteredRowModel: () => ({ rows: { length: 100 } }),
    getSelectedRowModel: () => ({ rows: [] }),
    setRowSelection: vi.fn(),
  } as unknown as Table<object>;

  const mockProps = {
    table: mockTable,
    setRefreshTrigger: vi.fn(),
    setActionError: vi.fn(),
  };

  const renderWithProviders = (ui: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          {ui}
        </ToastProvider>
      </QueryClientProvider>
    );
  };

  it('renders selection count', () => {
    renderWithProviders(<ProductTableFooter {...mockProps} />);
    expect(screen.getByText((_content, element) => {
      return element?.textContent === '0 of 100 row(s) selected.';
    })).toBeInTheDocument();
  });

  it('disables delete button when no selection', () => {
    renderWithProviders(<ProductTableFooter {...mockProps} />);
    const deleteButton = screen.getByRole('button', { name: /Delete Selected/i });
    expect(deleteButton).toBeDisabled();
  });

  it('enables delete button when there is a selection', () => {
    const tableWithSelection = {
      ...mockTable,
      getFilteredSelectedRowModel: () => ({ rows: [{}, {}] }),
    } as unknown as Table<object>;

    renderWithProviders(<ProductTableFooter {...mockProps} table={tableWithSelection} />);
    const deleteButton = screen.getByRole('button', { name: /Delete Selected/i });
    expect(deleteButton).not.toBeDisabled();
  });
});