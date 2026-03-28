// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BaseOrderImportPreviewResponse } from '@/shared/contracts/products';

const useAdminProductOrdersImportState = vi.fn();
const buildColumns = vi.fn();

vi.mock('./AdminProductOrdersImportPage.hooks', () => ({
  useAdminProductOrdersImportState: () => useAdminProductOrdersImportState(),
}));

vi.mock('./AdminProductOrdersImportPage.columns', () => ({
  buildColumns: (...args: unknown[]) => buildColumns(...args),
}));

vi.mock('./AdminProductOrdersImportPage.OrderDetails', () => ({
  OrderDetails: ({ order }: { order: { baseOrderId: string } }) => (
    <div data-testid={`order-details:${order.baseOrderId}`}>details:{order.baseOrderId}</div>
  ),
}));

vi.mock('@/shared/ui', () => ({
  AdminProductsPageLayout: ({
    children,
    title,
    headerActions,
  }: {
    children?: React.ReactNode;
    title?: string;
    headerActions?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {headerActions}
      {children}
    </div>
  ),
  Alert: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {title ? <div>{title}</div> : null}
      <div>{children}</div>
    </div>
  ),
  Badge: ({
    children,
    onClick,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
  Button: ({
    children,
    onClick,
    disabled,
    loading: _loading,
    icon,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    loading?: boolean;
    icon?: React.ReactNode;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {icon}
      {children}
    </button>
  ),
  EmptyState: ({
    title,
    description,
  }: {
    title?: string;
    description?: string;
  }) => (
    <div>
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SearchInput: ({
    value,
    onChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    value?: string;
    onChange?: ((value: string) => void) | React.ChangeEventHandler<HTMLInputElement>;
  }) => (
    <input
      value={value}
      onChange={(event) => {
        if (typeof onChange === 'function') {
          onChange(event.target.value as never);
        }
      }}
      {...props}
    />
  ),
  SelectSimple: ({
    value,
    onChange,
    onValueChange,
    options,
    placeholder,
    disabled,
  }: {
    value?: string;
    onChange?: (value: string) => void;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    placeholder?: string;
    disabled?: boolean;
  }) => (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={(event) => {
        onChange?.(event.target.value);
        onValueChange?.(event.target.value);
      }}
    >
      {placeholder ? <option value=''>{placeholder}</option> : null}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  StandardDataTablePanel: ({
    title,
    headerActions,
    children,
    data,
    renderExpandedRow,
    isRowExpanded,
  }: {
    title?: string;
    headerActions?: React.ReactNode;
    children?: React.ReactNode;
    data?: Array<{ baseOrderId: string; buyerName?: string }>;
    renderExpandedRow?: (row: { baseOrderId: string; buyerName?: string }) => React.ReactNode;
    isRowExpanded?: (row: { baseOrderId: string; buyerName?: string }) => boolean;
  }) => (
    <section>
      {title ? <h2>{title}</h2> : null}
      {headerActions}
      {children}
      {Array.isArray(data) ? <div data-testid='orders-count'>{data.length}</div> : null}
      {data?.map((row) => (
        <div key={row.baseOrderId}>
          <span>{row.baseOrderId}</span>
          <span>{row.buyerName}</span>
          {isRowExpanded?.(row) && renderExpandedRow ? renderExpandedRow(row) : null}
        </div>
      ))}
    </section>
  ),
}));

import { AdminProductOrdersImportPage } from './AdminProductOrdersImportPage';

const previewResponse: BaseOrderImportPreviewResponse = {
  orders: [
    {
      baseOrderId: '1001',
      orderNumber: 'SO-1001',
      externalStatusId: 'paid',
      externalStatusName: 'Paid',
      buyerName: 'Alice',
      buyerEmail: 'alice@example.com',
      currency: 'PLN',
      totalGross: 100,
      deliveryMethod: 'Courier',
      paymentMethod: 'Card',
      source: 'Base',
      orderCreatedAt: '2026-03-25T10:00:00.000Z',
      orderUpdatedAt: null,
      lineItems: [],
      fingerprint: 'fp-1',
      raw: {},
      importState: 'new',
      lastImportedAt: null,
    },
    {
      baseOrderId: '1002',
      orderNumber: 'SO-1002',
      externalStatusId: 'paid',
      externalStatusName: 'Paid',
      buyerName: 'Bob',
      buyerEmail: 'bob@example.com',
      currency: 'PLN',
      totalGross: 200,
      deliveryMethod: 'Courier',
      paymentMethod: 'Card',
      source: 'Base',
      orderCreatedAt: '2026-03-24T10:00:00.000Z',
      orderUpdatedAt: null,
      lineItems: [],
      fingerprint: 'fp-2',
      raw: {},
      importState: 'imported',
      lastImportedAt: '2026-03-26T10:00:00.000Z',
    },
  ],
  stats: {
    total: 2,
    newCount: 1,
    importedCount: 1,
    changedCount: 0,
  },
};

type MockState = ReturnType<typeof createState>;

function createState(overrides: Partial<MockState> = {}) {
  const handlePreview = vi.fn().mockResolvedValue(undefined);
  const handleRestoreLoadedPreviewScope = vi.fn();
  const handleResetViewFilters = vi.fn();
  const handleToggleExpanded = vi.fn();
  const setSelectedConnectionId = vi.fn();
  const setDateFrom = vi.fn();
  const setDateTo = vi.fn();
  const setStatusId = vi.fn();
  const setLimit = vi.fn();
  const setPreview = vi.fn();
  const setFeedback = vi.fn();
  const setImportStateFilter = vi.fn();
  const setViewSearchQuery = vi.fn();
  const setViewSort = vi.fn();
  const setRowSelection = vi.fn();
  const setExpanded = vi.fn();
  const importMutateAsync = vi.fn().mockResolvedValue({ importedCount: 1 });
  const quickImportMutateAsync = vi.fn().mockResolvedValue({
    importedCount: 1,
    createdCount: 1,
    updatedCount: 0,
    skippedImportedCount: 0,
    syncedAt: '2026-03-26T10:00:00.000Z',
    preview: previewResponse,
    results: [],
  });

  return {
    areIntegrationsLoading: false,
    baseConnections: [
      { value: 'conn-1', label: 'Primary Base (Base.com)' },
      { value: 'conn-2', label: 'Secondary Base (Base.com)' },
    ],
    selectedConnectionId: 'conn-1',
    setSelectedConnectionId,
    dateFrom: '',
    setDateFrom,
    dateTo: '',
    setDateTo,
    statusId: '',
    setStatusId,
    limit: '50',
    setLimit,
    preview: null as BaseOrderImportPreviewResponse | null,
    setPreview,
    lastPreviewScope: null as null | {
      connectionId: string;
      dateFrom: string;
      dateTo: string;
      statusId: string;
      limit: string;
    },
    feedback: null as null | { variant: 'success' | 'error' | 'info'; message: string },
    setFeedback,
    importStateFilter: 'all' as const,
    setImportStateFilter,
    viewSearchQuery: '',
    setViewSearchQuery,
    viewSort: 'created-desc' as const,
    setViewSort,
    rowSelection: {} as Record<string, boolean>,
    setRowSelection,
    expanded: {} as Record<string, boolean>,
    setExpanded,
    previewMutation: { isPending: false, mutateAsync: vi.fn() },
    importMutation: { isPending: false, mutateAsync: importMutateAsync },
    quickImportMutation: { isPending: false, mutateAsync: quickImportMutateAsync },
    availableStatuses: [{ id: 'paid', name: 'Paid' }],
    isPreviewStale: false,
    previewScopeChanges: [] as Array<{
      key: string;
      label: string;
      loaded: string;
      current: string;
    }>,
    filteredOrders: [] as BaseOrderImportPreviewResponse['orders'],
    handlePreview,
    handleRestoreLoadedPreviewScope,
    handleResetViewFilters,
    handleToggleExpanded,
    ...overrides,
  };
}

describe('AdminProductOrdersImportPage', () => {
  beforeEach(() => {
    buildColumns.mockReturnValue([]);
  });

  it('renders the current import-scope shell and wires primary actions through the state hook', async () => {
    const state = createState();
    useAdminProductOrdersImportState.mockReturnValue(state);

    render(<AdminProductOrdersImportPage />);

    expect(screen.getByText('Base.com Orders Import')).toBeInTheDocument();
    expect(screen.getByText('No preview loaded')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /quick import/i }));
    expect(state.quickImportMutation.mutateAsync).toHaveBeenCalledWith({
      connectionId: 'conn-1',
    });

    fireEvent.click(screen.getByRole('button', { name: /load preview/i }));
    await waitFor(() => expect(state.handlePreview).toHaveBeenCalled());
  });

  it('wires current filter controls to the state setters', () => {
    const state = createState();
    useAdminProductOrdersImportState.mockReturnValue(state);

    const { container } = render(<AdminProductOrdersImportPage />);
    const selects = container.querySelectorAll('select');
    const dateInputs = container.querySelectorAll('input[type="date"]');

    fireEvent.change(selects[0]!, { target: { value: 'conn-2' } });
    fireEvent.change(dateInputs[0]!, { target: { value: '2026-03-01' } });
    fireEvent.change(dateInputs[1]!, { target: { value: '2026-03-31' } });
    fireEvent.change(selects[1]!, { target: { value: 'paid' } });
    fireEvent.change(selects[2]!, { target: { value: '100' } });

    expect(state.setSelectedConnectionId).toHaveBeenCalledWith('conn-2');
    expect(state.setDateFrom).toHaveBeenCalledWith('2026-03-01');
    expect(state.setDateTo).toHaveBeenCalledWith('2026-03-31');
    expect(state.setStatusId).toHaveBeenCalledWith('paid');
    expect(state.setLimit).toHaveBeenCalledWith('100');
  });

  it('renders stale-preview feedback from the current state contract', () => {
    const state = createState({
      isPreviewStale: true,
      lastPreviewScope: {
        connectionId: 'conn-1',
        dateFrom: '',
        dateTo: '',
        statusId: '',
        limit: '50',
      },
      previewScopeChanges: [
        {
          key: 'status',
          label: 'Status',
          loaded: 'All statuses',
          current: 'Paid',
        },
      ],
    });
    useAdminProductOrdersImportState.mockReturnValue(state);

    render(<AdminProductOrdersImportPage />);

    expect(screen.getByText('Preview is stale')).toBeInTheDocument();
    expect(screen.getByText(/status:/i)).toBeInTheDocument();
    expect(screen.getByText('Restore Loaded')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /restore loaded/i }));
    expect(state.handleRestoreLoadedPreviewScope).toHaveBeenCalled();
  });

  it('renders the current preview section and imports the selected orders', async () => {
    const state = createState({
      preview: previewResponse,
      filteredOrders: previewResponse.orders,
      rowSelection: { '1001': true },
    });
    useAdminProductOrdersImportState.mockReturnValue(state);

    render(<AdminProductOrdersImportPage />);

    expect(screen.getByText('Order Preview')).toBeInTheDocument();
    expect(screen.getByText(/total:/i)).toBeInTheDocument();
    expect(screen.getByText(/1001/)).toBeInTheDocument();
    expect(screen.getByText(/alice/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /import selected \(1\)/i }));

    await waitFor(() => expect(state.importMutation.mutateAsync).toHaveBeenCalledTimes(1));
    expect(state.importMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'conn-1',
        orders: expect.arrayContaining([
          expect.objectContaining({
            baseOrderId: '1001',
          }),
        ]),
      })
    );
    await waitFor(() => expect(state.handlePreview).toHaveBeenCalled());
  });

  it('wires the preview search, state badges, and reset action through the current state contract', () => {
    const state = createState({
      preview: previewResponse,
      filteredOrders: previewResponse.orders,
      feedback: { variant: 'info', message: 'Loaded 2 orders.' },
    });
    useAdminProductOrdersImportState.mockReturnValue(state);

    render(<AdminProductOrdersImportPage />);

    fireEvent.change(screen.getByPlaceholderText('Search orders...'), {
      target: { value: 'alice' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'imported' }));
    fireEvent.click(screen.getByRole('button', { name: /reset view/i }));

    expect(state.setViewSearchQuery).toHaveBeenCalledWith('alice');
    expect(state.setImportStateFilter).toHaveBeenCalledWith('imported');
    expect(state.handleResetViewFilters).toHaveBeenCalled();
    expect(screen.getByText('Notification')).toBeInTheDocument();
    expect(screen.getByText('Loaded 2 orders.')).toBeInTheDocument();
  });

  it('passes the current expansion contract into the preview columns and renders expanded details through the table shell', () => {
    const state = createState({
      preview: previewResponse,
      filteredOrders: [previewResponse.orders[0]!],
      expanded: { '1001': true },
    });
    useAdminProductOrdersImportState.mockReturnValue(state);

    render(<AdminProductOrdersImportPage />);

    expect(buildColumns).toHaveBeenCalledWith(
      expect.objectContaining({
        expanded: { '1001': true },
        onToggleExpanded: state.handleToggleExpanded,
      })
    );
    expect(screen.getByTestId('order-details:1001')).toBeInTheDocument();
  });
});
