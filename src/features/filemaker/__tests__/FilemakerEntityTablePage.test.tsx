import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactElement } from 'react';

import { FilemakerEntityTablePage } from '@/features/filemaker/components/shared/FilemakerEntityTablePage';

import type { ColumnDef } from '@tanstack/react-table';

type RowData = {
  id: string;
  name: string;
};

const columns: ColumnDef<RowData>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
  },
];

const renderWithQueryClient = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

describe('FilemakerEntityTablePage', () => {
  it('renders shared header/table UI and wires actions + search callbacks', () => {
    const onQueryChange = vi.fn();
    const onAction = vi.fn();

    renderWithQueryClient(
      <FilemakerEntityTablePage<RowData>
        title='Entities'
        description='Entity list'
        icon={<span>ICON</span>}
        actions={[{ key: 'action', label: 'Do Action', onClick: onAction }]}
        badges={<span>Badge: 1</span>}
        query='seed'
        onQueryChange={onQueryChange}
        queryPlaceholder='Search entities...'
        columns={columns}
        data={[{ id: '1', name: 'Acme' }]}
        isLoading={false}
        emptyTitle='No rows'
        emptyDescription='No entities yet.'
      />
    );

    expect(screen.getByText('Entities')).toBeInTheDocument();
    expect(screen.getByText('Entity list')).toBeInTheDocument();
    expect(screen.getByText('Badge: 1')).toBeInTheDocument();
    expect(screen.getByText('Acme')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Do Action' }));
    expect(onAction).toHaveBeenCalledTimes(1);

    fireEvent.change(screen.getByPlaceholderText('Search entities...'), {
      target: { value: 'updated-query' },
    });
    expect(onQueryChange).toHaveBeenCalledWith('updated-query');

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }));
    expect(onQueryChange).toHaveBeenCalledWith('');
  });

  it('renders the empty state when no data is available', () => {
    renderWithQueryClient(
      <FilemakerEntityTablePage<RowData>
        title='Entities'
        description='Entity list'
        icon={<span>ICON</span>}
        actions={[]}
        badges={<span>Badge: 0</span>}
        query=''
        onQueryChange={vi.fn()}
        queryPlaceholder='Search entities...'
        columns={columns}
        data={[]}
        isLoading={false}
        emptyTitle='No rows'
        emptyDescription='No entities yet.'
      />
    );

    expect(screen.getByText('No rows')).toBeInTheDocument();
    expect(screen.getByText('No entities yet.')).toBeInTheDocument();
  });
});
