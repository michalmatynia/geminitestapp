// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useImportExportDataMock: vi.fn(),
  useImportExportStateMock: vi.fn(),
  useImportExportActionsMock: vi.fn(),
  apiPostMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string }) => <img alt={props.alt ?? ''} />,
}));

vi.mock('@/features/data-import-export/context/ImportExportContext', () => ({
  useImportExportData: () => mocks.useImportExportDataMock(),
  useImportExportState: () => mocks.useImportExportStateMock(),
  useImportExportActions: () => mocks.useImportExportActionsMock(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: (...args: unknown[]) => mocks.apiPostMock(...args),
  },
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    disabled,
    loading,
    onClick,
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    loading?: boolean;
    onClick?: () => void;
  }) => (
    <button type='button' disabled={disabled || loading} onClick={onClick}>
      {children}
    </button>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ toast: mocks.toastMock }),
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  Pagination: () => <div>pagination</div>,
  UI_CENTER_ROW_SPACED_CLASSNAME: 'row',
}));

vi.mock('@/shared/ui/templates.public', () => ({
  PanelFilters: () => <div>filters</div>,
  StandardDataTablePanel: ({
    columns,
    data,
    footer,
    emptyState,
  }: {
    columns: Array<{
      id?: string;
      accessorKey?: string;
      header?: React.ReactNode | ((ctx: unknown) => React.ReactNode);
      cell?: (ctx: { row: { original: Record<string, unknown> } }) => React.ReactNode;
    }>;
    data: Array<Record<string, unknown>>;
    footer?: React.ReactNode;
    emptyState?: React.ReactNode;
  }) => (
    <div>
      <div>
        {columns.map((column, index) => (
          <div key={column.id ?? column.accessorKey ?? index}>
            {typeof column.header === 'function' ? column.header({}) : column.header}
          </div>
        ))}
      </div>
      <div>
        {data.map((row, rowIndex) => (
          <div key={rowIndex}>
            {columns.map((column, columnIndex) => (
              <div key={`${rowIndex}-${column.id ?? column.accessorKey ?? columnIndex}`}>
                {column.cell
                  ? column.cell({ row: { original: row } })
                  : typeof column.accessorKey === 'string'
                    ? String(row[column.accessorKey] ?? '')
                    : null}
              </div>
            ))}
          </div>
        ))}
      </div>
      {footer}
      {emptyState}
    </div>
  ),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock('@/shared/lib/documentation/tooltips', () => ({
  getDocumentationTooltip: () => null,
}));

import { ImportListPreviewSection } from './Import.List';

const createStateMock = (overrides: Record<string, unknown> = {}) => ({
  selectedBaseConnectionId: 'connection-1',
  inventoryId: 'inventory-1',
  catalogId: 'catalog-1',
  limit: '5',
  importNameSearch: '',
  setImportNameSearch: vi.fn(),
  importSkuSearch: '',
  setImportSkuSearch: vi.fn(),
  importDirectTargetType: 'base_product_id',
  setImportDirectTargetType: vi.fn(),
  importDirectTargetValue: '',
  setImportDirectTargetValue: vi.fn(),
  importListPage: 1,
  setImportListPage: vi.fn(),
  importListPageSize: 25,
  setImportListPageSize: vi.fn(),
  uniqueOnly: true,
  setUniqueOnly: vi.fn(),
  selectedImportIds: new Set<string>(),
  setSelectedImportIds: vi.fn(),
  ...overrides,
});

describe('ImportListPreviewSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useImportExportDataMock.mockReturnValue({
      loadingImportList: false,
      importListStats: {
        total: 10,
        filtered: 5,
        available: 5,
        existing: 0,
        skuDuplicates: 0,
        page: 1,
        pageSize: 5,
        totalPages: 1,
      },
      importList: [
        {
          baseProductId: '1',
          name: 'Product 1',
          sku: 'SKU-1',
          exists: false,
          skuExists: false,
          image: null,
          price: 10,
          stock: 2,
          description: '',
        },
      ],
    });
    mocks.useImportExportActionsMock.mockReturnValue({
      handleLoadImportList: vi.fn(),
      handleImport: vi.fn(),
      importing: false,
    });
  });

  it('renders run import beside load import list and triggers import', () => {
    const handleImport = vi.fn();
    mocks.useImportExportActionsMock.mockReturnValue({
      handleLoadImportList: vi.fn(),
      handleImport,
      importing: false,
    });
    mocks.useImportExportStateMock.mockReturnValue(createStateMock());

    render(<ImportListPreviewSection />);

    const actionButtons = screen.getAllByRole('button');
    expect(actionButtons[0]).toHaveTextContent('Load import list');
    expect(actionButtons[1]).toHaveTextContent('Run import');
    expect(screen.getByText('Using import settings: Unique only · Limit 5')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run import' }));

    expect(handleImport).toHaveBeenCalledTimes(1);
  });

  it('shows exact-target load action text when an exact target is active', () => {
    mocks.useImportExportStateMock.mockReturnValue(
      createStateMock({
        importDirectTargetType: 'sku',
        importDirectTargetValue: 'FOASW022',
      })
    );

    render(<ImportListPreviewSection />);

    expect(screen.getByRole('button', { name: 'Load exact item' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run exact import' })).toBeInTheDocument();
    expect(
      screen.getByText(
        'Exact target imports always create a new product, generate a unique SKU when needed, and stay detached from Base sync/update linkage.'
      )
    ).toBeInTheDocument();
  });

  it('renders the exact-target input with browser autofill disabled', () => {
    mocks.useImportExportStateMock.mockReturnValue(createStateMock());

    render(<ImportListPreviewSection />);

    const input = screen.getByLabelText('Exact import target value');
    expect(input).toHaveAttribute('name', 'base-import-exact-target');
    expect(input).toHaveAttribute('autocomplete', 'off');
    expect(input).toHaveAttribute('autocapitalize', 'none');
    expect(input).toHaveAttribute('autocorrect', 'off');
    expect(input).toHaveAttribute('spellcheck', 'false');
  });

  it('submits an exact SKU target when provided', () => {
    const handleImport = vi.fn();
    mocks.useImportExportActionsMock.mockReturnValue({
      handleLoadImportList: vi.fn(),
      handleImport,
      importing: false,
    });
    mocks.useImportExportStateMock.mockReturnValue(
      createStateMock({
        limit: 'all',
        importDirectTargetType: 'sku',
        importDirectTargetValue: 'FOASW022',
        selectedImportIds: new Set<string>(['1']),
      })
    );

    render(<ImportListPreviewSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Run exact import' }));

    expect(handleImport).toHaveBeenCalledWith({
      directTarget: {
        type: 'sku',
        value: 'FOASW022',
      },
    });
  });

  it('selects all matching ids across all pages', async () => {
    const setSelectedImportIds = vi.fn();
    mocks.useImportExportStateMock.mockReturnValue(
      createStateMock({
        setSelectedImportIds,
      })
    );
    mocks.apiPostMock.mockResolvedValue({
      ids: ['1', '2', '3', '4', '5'],
      totalMatching: 5,
    });

    render(<ImportListPreviewSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Select All Pages (5)' }));

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith('/api/v2/integrations/imports/base', {
        action: 'list_ids',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: 'catalog-1',
        limit: 5,
        uniqueOnly: true,
        searchName: '',
        searchSku: '',
      });
    });

    expect(setSelectedImportIds).toHaveBeenCalledTimes(1);
    expect(setSelectedImportIds.mock.calls[0]?.[0]).toEqual(
      new Set(['1', '2', '3', '4', '5'])
    );
    expect(mocks.toastMock).toHaveBeenCalledWith('Selected 5 matching products.', {
      variant: 'success',
    });
  });

  it('passes an exact target when selecting all matching ids across all pages', async () => {
    const setSelectedImportIds = vi.fn();
    mocks.useImportExportStateMock.mockReturnValue(
      createStateMock({
        importDirectTargetType: 'sku',
        importDirectTargetValue: 'FOASW022',
        setSelectedImportIds,
      })
    );
    mocks.apiPostMock.mockResolvedValue({
      ids: ['9568407'],
      totalMatching: 1,
    });

    render(<ImportListPreviewSection />);

    fireEvent.click(screen.getByRole('button', { name: 'Select All Pages (5)' }));

    await waitFor(() => {
      expect(mocks.apiPostMock).toHaveBeenCalledWith('/api/v2/integrations/imports/base', {
        action: 'list_ids',
        connectionId: 'connection-1',
        inventoryId: 'inventory-1',
        catalogId: 'catalog-1',
        limit: 5,
        uniqueOnly: true,
        searchName: '',
        searchSku: '',
        directTarget: {
          type: 'sku',
          value: 'FOASW022',
        },
      });
    });

    expect(setSelectedImportIds).toHaveBeenCalledWith(new Set(['9568407']));
  });

  it('selects all visible products from the header checkbox', async () => {
    const setSelectedImportIds = vi.fn();
    mocks.useImportExportDataMock.mockReturnValue({
      loadingImportList: false,
      importListStats: {
        total: 10,
        filtered: 5,
        available: 5,
        existing: 0,
        skuDuplicates: 0,
        page: 1,
        pageSize: 5,
        totalPages: 1,
      },
      importList: [
        {
          baseProductId: '1',
          name: 'Product 1',
          sku: 'SKU-1',
          exists: false,
          skuExists: false,
          image: null,
          price: 10,
          stock: 2,
          description: '',
        },
        {
          baseProductId: '2',
          name: 'Product 2',
          sku: 'SKU-2',
          exists: false,
          skuExists: false,
          image: null,
          price: 10,
          stock: 2,
          description: '',
        },
      ],
    });
    mocks.useImportExportStateMock.mockReturnValue(
      createStateMock({
        setSelectedImportIds,
      })
    );

    render(<ImportListPreviewSection />);

    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all products on this page' }));

    expect(setSelectedImportIds).toHaveBeenCalledTimes(1);
    const updater = setSelectedImportIds.mock.calls[0]?.[0] as (previous: Set<string>) => Set<string>;
    expect(updater(new Set())).toEqual(new Set(['1', '2']));
  });

  it('clears selected ids when the import list scope changes', async () => {
    const setSelectedImportIds = vi.fn();
    const state = {
      ...createStateMock({
        selectedImportIds: new Set<string>(['1']),
        setSelectedImportIds,
      }),
    };
    mocks.useImportExportStateMock.mockImplementation(() => state);

    const { rerender } = render(<ImportListPreviewSection />);

    state.importSkuSearch = 'SKU-1';
    rerender(<ImportListPreviewSection />);

    await waitFor(() => {
      expect(setSelectedImportIds).toHaveBeenCalledWith(new Set());
    });
  });
});
