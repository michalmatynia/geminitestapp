// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({}),
  };
});

import { DataTable } from './data-table';

describe('DataTable fixed layout', () => {
  it('wires aria-describedby through an element id', () => {
    render(
      <DataTable
        ariaLabel='Products table'
        ariaDescription='List of products available for export.'
        columns={[
          {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => row.original.name,
          },
        ]}
        data={[{ id: 'product-1', name: 'Product A' }]}
        getRowId={(row) => row.id}
      />
    );

    const table = screen.getByRole('table', { name: 'Products table' });
    const describedBy = table.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy ?? '')).toHaveTextContent(
      'List of products available for export.'
    );
  });

  it('uses fixed table layout and applies explicit column widths when requested', () => {
    const { container } = render(
      <DataTable
        tableLayout='fixed'
        columns={[
          {
            accessorKey: 'name',
            header: 'Name',
            cell: ({ row }) => row.original.name,
          },
          {
            accessorKey: 'price',
            header: 'Price',
            meta: { widthPx: 140 },
            cell: ({ row }) => row.original.price,
          },
        ]}
        data={[{ id: 'product-1', name: 'Very long product name', price: '19.99' }]}
        getRowId={(row) => row.id}
      />
    );

    const table = screen.getByRole('table');
    expect(table.className).toContain('table-fixed');

    const colElements = container.querySelectorAll('colgroup col');
    expect(colElements).toHaveLength(2);
    expect((colElements[0] as HTMLTableColElement).style.width).toBe('');
    expect((colElements[1] as HTMLTableColElement).style.width).toBe('140px');

    const columnHeaders = screen.getAllByRole('columnheader');
    expect((columnHeaders[1] as HTMLTableCellElement).style.width).toBe('140px');
    expect((columnHeaders[1] as HTMLTableCellElement).style.minWidth).toBe('140px');
    expect((columnHeaders[1] as HTMLTableCellElement).style.maxWidth).toBe('140px');
  });
});
