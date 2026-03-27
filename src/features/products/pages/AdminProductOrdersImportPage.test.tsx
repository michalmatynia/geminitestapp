// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { BaseOrderImportPreviewResponse } from '@/shared/contracts/products';
import type { ColumnDef, ExpandedState, RowSelectionState } from '@tanstack/react-table';

const useIntegrationsWithConnections = vi.fn();
const useDefaultExportConnection = vi.fn();
const useBaseOrderImportStatuses = vi.fn();
const usePreviewBaseOrdersMutation = vi.fn();
const useImportBaseOrdersMutation = vi.fn();
const useQuickImportBaseOrdersMutation = vi.fn();

vi.mock('@/shared/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => useIntegrationsWithConnections(),
  useDefaultExportConnection: () => useDefaultExportConnection(),
}));

vi.mock('@/features/products/hooks/useProductOrdersImport', () => ({
  useBaseOrderImportStatuses: () => useBaseOrderImportStatuses(),
  usePreviewBaseOrdersMutation: () => usePreviewBaseOrdersMutation(),
  useImportBaseOrdersMutation: () => useImportBaseOrdersMutation(),
  useQuickImportBaseOrdersMutation: () => useQuickImportBaseOrdersMutation(),
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
    children,
    title,
  }: {
    children?: React.ReactNode;
    title?: React.ReactNode;
  }) => (
    <div>
      {title}
      {children}
    </div>
  ),
  Badge: ({ children }: { children?: React.ReactNode }) => <span>{children}</span>,
  Button: ({
    children,
    onClick,
    disabled,
    asChild: _asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode; asChild?: boolean }) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  ),
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean | 'indeterminate';
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type='checkbox'
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
  EmptyState: ({
    title,
    description,
    action,
  }: {
    title: string;
    description?: string;
    action?: React.ReactNode;
  }) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
      {action}
    </div>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: React.InputHTMLAttributes<HTMLInputElement> & { value: string }) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
  StandardDataTablePanel: ({
    data,
    columns,
    filters,
    alerts,
    actions,
    expanded,
    renderRowDetails,
    getRowId,
    footer,
    emptyState,
    rowSelection,
    onRowSelectionChange,
  }: {
    data: unknown[];
    columns: ColumnDef<unknown>[];
    filters?: React.ReactNode;
    alerts?: React.ReactNode;
    actions?: React.ReactNode;
    expanded?: ExpandedState;
    renderRowDetails?: (props: { row: { original: unknown } }) => React.ReactNode;
    getRowId?: (row: unknown) => string | number;
    footer?: React.ReactNode;
    emptyState?: React.ReactNode;
    rowSelection?: RowSelectionState;
    onRowSelectionChange?: React.Dispatch<React.SetStateAction<RowSelectionState>>;
  }) => (
    <div>
      {alerts}
      {filters}
      {actions}
      <div data-testid='orders-count'>{String(data.length)}</div>
      {data.map((row) => {
        const rowId = String(getRowId ? getRowId(row) : Math.random());
        const table = {
          getIsAllPageRowsSelected: () =>
            data.length > 0 && data.every((item) => Boolean(rowSelection?.[String(getRowId ? getRowId(item) : '')])),
          getIsSomePageRowsSelected: () =>
            data.some((item) => Boolean(rowSelection?.[String(getRowId ? getRowId(item) : '')])),
          toggleAllPageRowsSelected: (checked: boolean) => {
            onRowSelectionChange?.(() => {
              const nextSelection: RowSelectionState = {};
              if (checked) {
                for (const item of data) {
                  const nextId = String(getRowId ? getRowId(item) : Math.random());
                  nextSelection[nextId] = true;
                }
              }
              return nextSelection;
            });
          },
        };
        const rowApi = {
          original: row,
          getIsSelected: () => Boolean(rowSelection?.[rowId]),
          toggleSelected: (checked: boolean) => {
            onRowSelectionChange?.((currentSelection) => {
              const nextSelection = { ...(currentSelection ?? {}) };
              if (checked) {
                nextSelection[rowId] = true;
              } else {
                delete nextSelection[rowId];
              }
              return nextSelection;
            });
          },
          getIsExpanded: () => Boolean(expanded?.[rowId]),
        };
        return (
          <div key={rowId}>
            {columns.map((column, index) => {
              if (!('cell' in column) || !column.cell) return null;
              if (typeof column.cell !== 'function') return null;
              return (
                <div key={`${rowId}:${column.id ?? index}`}>
                  {column.cell({
                    row: rowApi,
                    table,
                  } as never)}
                </div>
              );
            })}
            {expanded?.[rowId] && renderRowDetails ? renderRowDetails({ row: rowApi }) : null}
          </div>
        );
      })}
      {data.length === 0 ? emptyState : null}
      {footer}
    </div>
  ),
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

import { AdminProductOrdersImportPage } from './AdminProductOrdersImportPage';

describe('AdminProductOrdersImportPage', () => {
  beforeEach(() => {
    useIntegrationsWithConnections.mockReturnValue({
      data: [
        {
          id: 'integration-1',
          slug: 'base-com',
          name: 'Base.com',
          connections: [{ id: 'conn-1', name: 'Primary Base' }],
        },
      ],
      isLoading: false,
    });
    useDefaultExportConnection.mockReturnValue({
      data: { connectionId: 'conn-1' },
    });
    useBaseOrderImportStatuses.mockReturnValue({
      data: [{ id: 'paid', name: 'Paid' }],
      isLoading: false,
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useQuickImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
  });

  it('previews Base.com orders with the selected filters', async () => {
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
      ],
      stats: {
        total: 1,
        newCount: 1,
        importedCount: 0,
        changedCount: 0,
      },
    };
    const mutateAsync = vi.fn().mockResolvedValue(previewResponse);
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.change(screen.getByLabelText('Order status'), {
      target: { value: 'paid' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        dateFrom: undefined,
        dateTo: undefined,
        statusId: 'paid',
        limit: 50,
      })
    );
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    expect(screen.getByText(/Loaded 1 orders/i)).toBeInTheDocument();
  });

  it('imports latest Base.com orders in one click and refreshes the preview table', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
      preview: {
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
            importState: 'imported',
            lastImportedAt: '2026-03-26T10:00:00.000Z',
            previousImport: {
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
              lastImportedAt: '2026-03-26T10:00:00.000Z',
            },
          },
        ],
        stats: {
          total: 1,
          newCount: 0,
          importedCount: 1,
          changedCount: 0,
        },
      },
      importableCount: 1,
      skippedImportedCount: 0,
      importedCount: 1,
      createdCount: 1,
      updatedCount: 0,
      syncedAt: '2026-03-26T10:00:00.000Z',
      results: [{ baseOrderId: '1001', result: 'created' }],
    });
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useQuickImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.change(screen.getByLabelText('Order status'), {
      target: { value: 'paid' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Import latest from Base\.com/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        dateFrom: undefined,
        dateTo: undefined,
        statusId: 'paid',
        limit: 50,
      })
    );
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    expect(screen.getByText(/Imported 1 orders from Base\.com/i)).toBeInTheDocument();
    expect(screen.getByText('1 imported')).toBeInTheDocument();
  });

  it('shows the integration empty state when no Base.com connections exist', () => {
    useIntegrationsWithConnections.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useDefaultExportConnection.mockReturnValue({ data: null });
    useBaseOrderImportStatuses.mockReturnValue({ data: [], isLoading: false });
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });

    render(<AdminProductOrdersImportPage />);

    expect(screen.getByText('No Base.com connection')).toBeInTheDocument();
    expect(screen.getByText(/Connect Base.com in Integrations/i)).toBeInTheDocument();
  });

  it('filters previewed orders by import state and updates visible importable actions', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 2,
              unitPriceGross: 50,
              baseProductId: 'base-1',
            },
          ],
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
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 3,
              unitPriceGross: 66.67,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));
    expect(
      screen.getByRole('button', { name: /Select visible new \+ changed \(1\)/i })
    ).toBeInTheDocument();
    expect(screen.getByText('5 visible items')).toBeInTheDocument();
    expect(screen.getByText('PLN 300.00 visible gross')).toBeInTheDocument();
    expect(screen.getByText('0 selected visible items')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    expect(
      screen.getByRole('button', { name: /Select visible new \+ changed \(0\)/i })
    ).toBeDisabled();
    expect(screen.getByText('3 visible items')).toBeInTheDocument();
    expect(screen.getByText('PLN 200.00 visible gross')).toBeInTheDocument();
    expect(screen.getByText('0 visible new')).toBeInTheDocument();
    expect(screen.getByText('0 visible changed')).toBeInTheDocument();
    expect(screen.getByText('1 visible imported')).toBeInTheDocument();
  });

  it('updates selected visible aggregate totals with row selection', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 2,
              unitPriceGross: 50,
              baseProductId: 'base-1',
            },
          ],
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
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 3,
              unitPriceGross: 66.67,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 3,
                unitPriceGross: 66.67,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    expect(screen.getByText('0 selected visible items')).toBeInTheDocument();
    expect(screen.getByText('0.00 selected visible gross')).toBeInTheDocument();
    expect(screen.getByText('0 selected import items')).toBeInTheDocument();
    expect(screen.getByText('0.00 selected import gross')).toBeInTheDocument();
    expect(screen.getByText('0 selected reimport items')).toBeInTheDocument();
    expect(screen.getByText('0.00 selected reimport gross')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select order 1001'));

    expect(screen.getByText('2 selected visible items')).toBeInTheDocument();
    expect(screen.getByText('PLN 100.00 selected visible gross')).toBeInTheDocument();
    expect(screen.getByText('2 selected import items')).toBeInTheDocument();
    expect(screen.getByText('PLN 100.00 selected import gross')).toBeInTheDocument();
    expect(screen.getByText('0 selected reimport items')).toBeInTheDocument();
    expect(screen.getByText('0.00 selected reimport gross')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select order 1002'));

    expect(screen.getByText('5 selected visible items')).toBeInTheDocument();
    expect(screen.getByText('PLN 300.00 selected visible gross')).toBeInTheDocument();
    expect(screen.getByText('2 selected import items')).toBeInTheDocument();
    expect(screen.getByText('PLN 100.00 selected import gross')).toBeInTheDocument();
    expect(screen.getByText('3 selected reimport items')).toBeInTheDocument();
    expect(screen.getByText('PLN 200.00 selected reimport gross')).toBeInTheDocument();
  });

  it('marks preview as stale after changing preview scope controls and blocks import actions', async () => {
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
      ],
      stats: {
        total: 1,
        newCount: 1,
        importedCount: 0,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByLabelText('Select order 1001'));
    expect(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    ).toBeEnabled();

    fireEvent.change(screen.getByLabelText('Preview limit'), {
      target: { value: '100' },
    });

    await waitFor(() =>
      expect(screen.getByText(/Preview out of date/i)).toBeInTheDocument()
    );
    expect(screen.queryByText('Preview ready')).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Preview scope changed\. Run Preview orders again before importing or selecting orders\./i
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Loaded scope vs current scope')).toBeInTheDocument();
    expect(screen.getByText('50 -> 100')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Import visible new \+ changed \(1\)/i })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Select visible new \+ changed \(1\)/i })
    ).toBeDisabled();
    expect(screen.getByLabelText('Select order 1001')).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: /Expand order details/i }));
    expect(screen.getByRole('button', { name: /Import this order/i })).toBeDisabled();
  });

  it('refreshes stale preview directly from the warning alert', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
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
      ],
      stats: {
        total: 1,
        newCount: 1,
        importedCount: 0,
        changedCount: 0,
      },
    });
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    fireEvent.change(screen.getByLabelText('Preview limit'), {
      target: { value: '100' },
    });

    await waitFor(() =>
      expect(screen.getByText(/Preview out of date/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /Refresh preview now/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenLastCalledWith({
        connectionId: 'conn-1',
        dateFrom: undefined,
        dateTo: undefined,
        statusId: undefined,
        limit: 100,
      })
    );
    await waitFor(() =>
      expect(screen.queryByText(/Preview out of date/i)).not.toBeInTheDocument()
    );
    expect(
      screen.getByRole('button', { name: /Import visible new \+ changed \(1\)/i })
    ).toBeEnabled();
  });

  it('restores the loaded preview scope from the stale warning', async () => {
    const mutateAsync = vi.fn().mockResolvedValue({
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
      ],
      stats: {
        total: 1,
        newCount: 1,
        importedCount: 0,
        changedCount: 0,
      },
    });
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync,
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.change(screen.getByLabelText('Order status'), {
      target: { value: 'paid' },
    });
    fireEvent.change(screen.getByLabelText('Preview limit'), {
      target: { value: '100' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    fireEvent.change(screen.getByLabelText('Order status'), {
      target: { value: '__all__' },
    });
    fireEvent.change(screen.getByLabelText('Preview limit'), {
      target: { value: '150' },
    });

    await waitFor(() =>
      expect(screen.getByText(/Preview out of date/i)).toBeInTheDocument()
    );
    expect(screen.getByText('Paid -> All statuses')).toBeInTheDocument();
    expect(screen.getByText('100 -> 150')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Restore loaded scope/i }));

    await waitFor(() =>
      expect(screen.queryByText(/Preview out of date/i)).not.toBeInTheDocument()
    );
    expect(screen.getByLabelText('Order status')).toHaveValue('paid');
    expect(screen.getByLabelText('Preview limit')).toHaveValue('100');
  });

  it('resets preview scope controls back to defaults', async () => {
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
      ],
      stats: {
        total: 1,
        newCount: 1,
        importedCount: 0,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    fireEvent.change(screen.getByLabelText('Date from'), {
      target: { value: '2026-03-01' },
    });
    fireEvent.change(screen.getByLabelText('Order status'), {
      target: { value: 'paid' },
    });
    fireEvent.change(screen.getByLabelText('Preview limit'), {
      target: { value: '100' },
    });

    await waitFor(() =>
      expect(screen.getByText(/Preview out of date/i)).toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /Reset preview scope/i }));

    await waitFor(() =>
      expect(screen.queryByText(/Preview out of date/i)).not.toBeInTheDocument()
    );
    expect(screen.getByLabelText('Date from')).toHaveValue('');
    expect(screen.getByLabelText('Order status')).toHaveValue('__all__');
    expect(screen.getByLabelText('Preview limit')).toHaveValue('50');
    expect(screen.getByRole('button', { name: /Reset preview scope/i })).toBeDisabled();
  });

  it('searches previewed orders by line item sku and name', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          lineItems: [
            {
              sku: 'MATH-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'new',
          lastImportedAt: null,
        },
      ],
      stats: {
        total: 2,
        newCount: 2,
        importedCount: 0,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.change(screen.getByPlaceholderText('Search previewed orders...'), {
      target: { value: 'CLOCK-1' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    expect(screen.getByText('1001')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search previewed orders...'), {
      target: { value: 'math workbook' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    expect(screen.getByText('1002')).toBeInTheDocument();
  });

  it('sorts previewed orders by the selected sort mode', async () => {
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
          totalGross: 300,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
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
          buyerName: 'Charlie',
          buyerEmail: 'charlie@example.com',
          currency: 'PLN',
          totalGross: 100,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-26T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'new',
          lastImportedAt: null,
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-25T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'new',
          lastImportedAt: null,
        },
      ],
      stats: {
        total: 3,
        newCount: 3,
        importedCount: 0,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    expect(screen.getAllByText(/^(1001|1002|1003)$/).map((node) => node.textContent)).toEqual([
      '1002',
      '1003',
      '1001',
    ]);

    fireEvent.change(screen.getByLabelText('Sort preview'), {
      target: { value: 'customer-asc' },
    });

    await waitFor(() =>
      expect(screen.getAllByText(/^(1001|1002|1003)$/).map((node) => node.textContent)).toEqual([
        '1001',
        '1003',
        '1002',
      ])
    );
  });

  it('resets local view filters without clearing preview scope', async () => {
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
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
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
          buyerName: 'Charlie',
          buyerEmail: 'charlie@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-26T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T11:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Charlie',
            buyerEmail: 'charlie@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-26T10:00:00.000Z',
            orderUpdatedAt: '2026-03-26T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T11:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });
    fireEvent.change(screen.getByLabelText('Sort preview'), {
      target: { value: 'customer-asc' },
    });
    fireEvent.change(screen.getByPlaceholderText('Search previewed orders...'), {
      target: { value: 'charlie' },
    });

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: /Reset view filters/i }));

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));
    expect(screen.getByLabelText('Import state')).toHaveValue('all');
    expect(screen.getByLabelText('Sort preview')).toHaveValue('created-desc');
    expect(screen.getByPlaceholderText('Search previewed orders...')).toHaveValue('');
  });

  it('shows a local empty state when view filters hide loaded orders and restores them', async () => {
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
          buyerName: 'Charlie',
          buyerEmail: 'charlie@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-26T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T11:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Charlie',
            buyerEmail: 'charlie@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-26T10:00:00.000Z',
            orderUpdatedAt: '2026-03-26T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T11:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'changed' },
    });
    fireEvent.change(screen.getByPlaceholderText('Search previewed orders...'), {
      target: { value: 'missing-order' },
    });

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('0'));
    expect(screen.getByText('No orders in the current view')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Loaded 2 orders, but the current search or import-state filters hide them.'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show loaded orders/i }));

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));
    expect(screen.getByLabelText('Import state')).toHaveValue('all');
    expect(screen.getByPlaceholderText('Search previewed orders...')).toHaveValue('');
  });

  it('renders expandable order details with line items after preview', async () => {
    const importMutateAsync = vi.fn().mockResolvedValue({
      importedCount: 1,
      createdCount: 1,
      updatedCount: 0,
      syncedAt: '2026-03-26T11:00:00.000Z',
      results: [{ baseOrderId: '1001', result: 'created' }],
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: importMutateAsync,
    });
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 2,
              unitPriceGross: 50,
              baseProductId: 'base-1',
            },
          ],
          fingerprint: 'fp-1',
          raw: {},
          importState: 'changed',
          lastImportedAt: null,
          previousImport: {
            orderNumber: 'SO-1001',
            externalStatusId: 'draft',
            externalStatusName: 'Draft',
            buyerName: 'Alice',
            buyerEmail: 'alice@example.com',
            currency: 'PLN',
            totalGross: 80,
            deliveryMethod: 'Locker',
            paymentMethod: 'Cash',
            source: 'Base',
            orderCreatedAt: '2026-03-25T10:00:00.000Z',
            orderUpdatedAt: '2026-03-25T09:00:00.000Z',
            lineItems: [
              {
                sku: 'CLOCK-1',
                name: 'Clock game license',
                quantity: 1,
                unitPriceGross: 80,
                baseProductId: 'base-1',
              },
            ],
            lastImportedAt: '2026-03-26T08:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 1,
        newCount: 0,
        importedCount: 0,
        changedCount: 1,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: /Expand order details/i }));

    expect(screen.getByText('Line Items')).toBeInTheDocument();
    expect(screen.getByText('Clock game license')).toBeInTheDocument();
    expect(screen.getByText(/SKU CLOCK-1/i)).toBeInTheDocument();
    expect(screen.getByText('Import Snapshot')).toBeInTheDocument();
    expect(screen.getByText('Change Summary')).toBeInTheDocument();
    expect(screen.getByText('Status changed')).toBeInTheDocument();
    expect(screen.getByText('Total changed')).toBeInTheDocument();
    expect(screen.getByText('Items changed')).toBeInTheDocument();
    expect(screen.getByText('Delivery changed')).toBeInTheDocument();
    expect(screen.getByText('Payment changed')).toBeInTheDocument();
    expect(screen.getByText('Draft -> Paid')).toBeInTheDocument();
    expect(screen.getByText('Locker -> Courier')).toBeInTheDocument();
    expect(screen.getByText('Cash -> Card')).toBeInTheDocument();
    expect(screen.getByText('1 -> 2')).toBeInTheDocument();
    expect(screen.getByText('Previous Import')).toBeInTheDocument();
    expect(screen.getByText('Draft')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Import this order/i }));
    await waitFor(() =>
      expect(importMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orders: [previewResponse.orders[0]],
      })
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Reimport this order/i })).toBeInTheDocument()
    );
    expect(screen.queryByText('Change Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Draft')).not.toBeInTheDocument();
  });

  it('expands and collapses visible order details in bulk', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByRole('button', { name: /Expand visible details \(2\)/i }));

    expect(screen.getAllByText('Line Items')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: /Collapse visible details \(2\)/i })
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Collapse visible details \(2\)/i }));

    await waitFor(() => expect(screen.queryAllByText('Line Items')).toHaveLength(0));
    expect(
      screen.getByRole('button', { name: /Collapse visible details \(0\)/i })
    ).toBeDisabled();
  });

  it('expands and collapses only visible new and changed order details', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          buyerName: 'Beata',
          buyerEmail: 'beata@example.com',
          currency: 'PLN',
          totalGross: 140,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'CLOCK-2',
              name: 'Clock challenge pack',
              quantity: 1,
              unitPriceGross: 140,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'changed',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'draft',
            externalStatusName: 'Draft',
            buyerName: 'Beata',
            buyerEmail: 'beata@example.com',
            currency: 'PLN',
            totalGross: 120,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-24T10:00:00.000Z',
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'CLOCK-2',
                name: 'Clock challenge pack',
                quantity: 1,
                unitPriceGross: 120,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-23T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-3',
            },
          ],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T09:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1003',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Bob',
            buyerEmail: 'bob@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-23T10:00:00.000Z',
            orderUpdatedAt: '2026-03-23T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-3',
              },
            ],
            lastImportedAt: '2026-03-26T09:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 1,
        changedCount: 1,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    fireEvent.click(screen.getByRole('button', { name: /Expand visible import details \(2\)/i }));

    expect(screen.getAllByText('Line Items')).toHaveLength(2);
    expect(screen.getByText('Clock game license')).toBeInTheDocument();
    expect(screen.getByText('Clock challenge pack')).toBeInTheDocument();
    expect(screen.queryByText('Math workbook')).not.toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /Collapse visible import details \(2\)/i })
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Collapse visible import details \(2\)/i }));

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Collapse visible import details \(0\)/i })
      ).toBeDisabled()
    );

    expect(screen.queryByText('Clock game license')).not.toBeInTheDocument();
    expect(screen.queryByText('Clock challenge pack')).not.toBeInTheDocument();
    expect(screen.queryAllByText('Line Items')).toHaveLength(0);
  });

  it('expands only visible new order details', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          buyerName: 'Beata',
          buyerEmail: 'beata@example.com',
          currency: 'PLN',
          totalGross: 140,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'CLOCK-2',
              name: 'Clock challenge pack',
              quantity: 1,
              unitPriceGross: 140,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'changed',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'draft',
            externalStatusName: 'Draft',
            buyerName: 'Beata',
            buyerEmail: 'beata@example.com',
            currency: 'PLN',
            totalGross: 120,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-24T10:00:00.000Z',
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'CLOCK-2',
                name: 'Clock challenge pack',
                quantity: 1,
                unitPriceGross: 120,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-23T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-3',
            },
          ],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T09:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1003',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Bob',
            buyerEmail: 'bob@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-23T10:00:00.000Z',
            orderUpdatedAt: '2026-03-23T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-3',
              },
            ],
            lastImportedAt: '2026-03-26T09:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 1,
        changedCount: 1,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    fireEvent.click(screen.getByRole('button', { name: /Expand visible new details \(1\)/i }));

    expect(screen.getAllByText('Line Items')).toHaveLength(1);
    expect(screen.getByText('Clock game license')).toBeInTheDocument();
    expect(screen.queryByText('Clock challenge pack')).not.toBeInTheDocument();
    expect(screen.queryByText('Math workbook')).not.toBeInTheDocument();
  });

  it('expands only visible changed order details', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          buyerName: 'Beata',
          buyerEmail: 'beata@example.com',
          currency: 'PLN',
          totalGross: 140,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'CLOCK-2',
              name: 'Clock challenge pack',
              quantity: 1,
              unitPriceGross: 140,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'changed',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'draft',
            externalStatusName: 'Draft',
            buyerName: 'Beata',
            buyerEmail: 'beata@example.com',
            currency: 'PLN',
            totalGross: 120,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-24T10:00:00.000Z',
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'CLOCK-2',
                name: 'Clock challenge pack',
                quantity: 1,
                unitPriceGross: 120,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-23T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-3',
            },
          ],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T09:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1003',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Bob',
            buyerEmail: 'bob@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-23T10:00:00.000Z',
            orderUpdatedAt: '2026-03-23T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-3',
              },
            ],
            lastImportedAt: '2026-03-26T09:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 1,
        changedCount: 1,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    fireEvent.click(screen.getByRole('button', { name: /Expand visible changed details \(1\)/i }));

    expect(screen.getAllByText('Line Items')).toHaveLength(1);
    expect(screen.getByText('Clock challenge pack')).toBeInTheDocument();
    expect(screen.queryByText('Clock game license')).not.toBeInTheDocument();
    expect(screen.queryByText('Math workbook')).not.toBeInTheDocument();
  });

  it('expands only visible imported order details', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          buyerName: 'Beata',
          buyerEmail: 'beata@example.com',
          currency: 'PLN',
          totalGross: 140,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'CLOCK-2',
              name: 'Clock challenge pack',
              quantity: 1,
              unitPriceGross: 140,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'changed',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'draft',
            externalStatusName: 'Draft',
            buyerName: 'Beata',
            buyerEmail: 'beata@example.com',
            currency: 'PLN',
            totalGross: 120,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-24T10:00:00.000Z',
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'CLOCK-2',
                name: 'Clock challenge pack',
                quantity: 1,
                unitPriceGross: 120,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-23T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-3',
            },
          ],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T09:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1003',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Bob',
            buyerEmail: 'bob@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-23T10:00:00.000Z',
            orderUpdatedAt: '2026-03-23T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-3',
              },
            ],
            lastImportedAt: '2026-03-26T09:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 1,
        changedCount: 1,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    fireEvent.click(screen.getByRole('button', { name: /Expand visible reimport details \(1\)/i }));

    expect(screen.getAllByText('Line Items')).toHaveLength(1);
    expect(screen.getByText('Math workbook')).toBeInTheDocument();
    expect(screen.queryByText('Clock game license')).not.toBeInTheDocument();
    expect(screen.queryByText('Clock challenge pack')).not.toBeInTheDocument();
  });

  it('expands and collapses only selected visible order details', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByLabelText('Select order 1002'));
    fireEvent.click(
      screen.getByRole('button', { name: /Expand selected visible details \(1\)/i })
    );

    expect(screen.getAllByText('Line Items')).toHaveLength(1);
    expect(screen.getByText('Math workbook')).toBeInTheDocument();
    expect(screen.queryByText('Clock game license')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Collapse selected visible details \(1\)/i })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole('button', { name: /Collapse selected visible details \(1\)/i })
    );

    await waitFor(() => expect(screen.queryAllByText('Line Items')).toHaveLength(0));
    expect(
      screen.getByRole('button', { name: /Collapse selected visible details \(0\)/i })
    ).toBeDisabled();
  });

  it('collapses only hidden expanded order details after filter changes', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByRole('button', { name: /Expand visible details \(2\)/i }));
    expect(screen.getAllByText('Line Items')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    expect(screen.getAllByText('Line Items')).toHaveLength(1);
    expect(
      screen.getByRole('button', { name: /Collapse hidden details \(1\)/i })
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Collapse hidden details \(1\)/i }));

    expect(
      screen.getByRole('button', { name: /Collapse hidden details \(0\)/i })
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'all' },
    });

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));
    expect(screen.getAllByText('Line Items')).toHaveLength(1);
    expect(screen.getByText('Math workbook')).toBeInTheDocument();
    expect(screen.queryByText('Clock game license')).not.toBeInTheDocument();
  });

  it('collapses all order details across visible and hidden states', async () => {
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
          lineItems: [
            {
              sku: 'CLOCK-1',
              name: 'Clock game license',
              quantity: 1,
              unitPriceGross: 100,
              baseProductId: 'base-1',
            },
          ],
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
          lineItems: [
            {
              sku: 'BOOK-1',
              name: 'Math workbook',
              quantity: 2,
              unitPriceGross: 100,
              baseProductId: 'base-2',
            },
          ],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [
              {
                sku: 'BOOK-1',
                name: 'Math workbook',
                quantity: 2,
                unitPriceGross: 100,
                baseProductId: 'base-2',
              },
            ],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByRole('button', { name: /Expand visible details \(2\)/i }));
    expect(screen.getAllByText('Line Items')).toHaveLength(2);

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    expect(
      screen.getByRole('button', { name: /Collapse all details \(2\)/i })
    ).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: /Collapse all details \(2\)/i }));

    await waitFor(() => expect(screen.queryAllByText('Line Items')).toHaveLength(0));
    expect(
      screen.getByRole('button', { name: /Collapse all details \(0\)/i })
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'all' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));
    expect(screen.queryAllByText('Line Items')).toHaveLength(0);
  });

  it('imports only visible new and changed orders from the main bulk action', async () => {
    const importMutateAsync = vi.fn().mockResolvedValue({
      importedCount: 1,
      createdCount: 1,
      updatedCount: 0,
      syncedAt: '2026-03-26T11:00:00.000Z',
      results: [{ baseOrderId: '1001', result: 'created' }],
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: importMutateAsync,
    });
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
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByRole('button', { name: /Import visible new \+ changed \(1\)/i }));

    await waitFor(() =>
      expect(importMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orders: [previewResponse.orders[0]],
      })
    );

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Import visible new \+ changed \(0\)/i })).toBeDisabled()
    );
    expect(importMutateAsync).toHaveBeenCalledTimes(1);
  });

  it('allows deliberate reimport from the order details row', async () => {
    const importMutateAsync = vi.fn().mockResolvedValue({
      importedCount: 1,
      createdCount: 0,
      updatedCount: 1,
      syncedAt: '2026-03-26T11:00:00.000Z',
      results: [{ baseOrderId: '1002', result: 'updated' }],
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: importMutateAsync,
    });
    const previewResponse: BaseOrderImportPreviewResponse = {
      orders: [
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
          orderUpdatedAt: '2026-03-26T09:00:00.000Z',
          lineItems: [],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
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
            orderUpdatedAt: '2026-03-26T09:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 1,
        newCount: 0,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByRole('button', { name: /Expand order details/i }));
    fireEvent.click(screen.getByRole('button', { name: /Reimport this order/i }));

    await waitFor(() =>
      expect(importMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orders: [previewResponse.orders[0]],
      })
    );
  });

  it('imports only selected new and changed orders from the selected-action button', async () => {
    const importMutateAsync = vi.fn().mockResolvedValue({
      importedCount: 1,
      createdCount: 1,
      updatedCount: 0,
      syncedAt: '2026-03-26T11:00:00.000Z',
      results: [{ baseOrderId: '1001', result: 'created' }],
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: importMutateAsync,
    });
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
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByLabelText('Select order 1001'));
    fireEvent.click(screen.getByLabelText('Select order 1002'));

    expect(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /Reimport selected visible imported \(1\)/i })
    ).toBeEnabled();

    fireEvent.click(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    );

    await waitFor(() =>
      expect(importMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orders: [previewResponse.orders[0]],
      })
    );
  });

  it('selects only visible changed orders for targeted import', async () => {
    const importMutateAsync = vi.fn().mockResolvedValue({
      importedCount: 1,
      createdCount: 0,
      updatedCount: 1,
      syncedAt: '2026-03-26T11:00:00.000Z',
      results: [{ baseOrderId: '1002', result: 'updated' }],
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: importMutateAsync,
    });
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
          buyerName: 'Beata',
          buyerEmail: 'beata@example.com',
          currency: 'PLN',
          totalGross: 140,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'changed',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'draft',
            externalStatusName: 'Draft',
            buyerName: 'Beata',
            buyerEmail: 'beata@example.com',
            currency: 'PLN',
            totalGross: 120,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-24T10:00:00.000Z',
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-23T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T09:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1003',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Bob',
            buyerEmail: 'bob@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-23T10:00:00.000Z',
            orderUpdatedAt: '2026-03-23T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T09:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 1,
        changedCount: 1,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    fireEvent.click(screen.getByRole('button', { name: /Select visible changed \(1\)/i }));

    expect(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    ).toBeEnabled();
    expect(screen.getByText('1 selected to import')).toBeInTheDocument();
    expect(screen.getByText('0 selected to reimport')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    );

    await waitFor(() =>
      expect(importMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orders: [previewResponse.orders[1]],
      })
    );
  });

  it('selects only visible new orders for targeted import', async () => {
    const importMutateAsync = vi.fn().mockResolvedValue({
      importedCount: 1,
      createdCount: 1,
      updatedCount: 0,
      syncedAt: '2026-03-26T11:00:00.000Z',
      results: [{ baseOrderId: '1001', result: 'created' }],
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: importMutateAsync,
    });
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
          buyerName: 'Beata',
          buyerEmail: 'beata@example.com',
          currency: 'PLN',
          totalGross: 140,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-24T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-2',
          raw: {},
          importState: 'changed',
          lastImportedAt: '2026-03-26T10:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1002',
            externalStatusId: 'draft',
            externalStatusName: 'Draft',
            buyerName: 'Beata',
            buyerEmail: 'beata@example.com',
            currency: 'PLN',
            totalGross: 120,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-24T10:00:00.000Z',
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Bob',
          buyerEmail: 'bob@example.com',
          currency: 'PLN',
          totalGross: 200,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-23T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T09:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1003',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Bob',
            buyerEmail: 'bob@example.com',
            currency: 'PLN',
            totalGross: 200,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-23T10:00:00.000Z',
            orderUpdatedAt: '2026-03-23T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T09:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 1,
        changedCount: 1,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    fireEvent.click(screen.getByRole('button', { name: /Select visible new \(1\)/i }));

    expect(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    ).toBeEnabled();
    expect(screen.getByText('1 selected to import')).toBeInTheDocument();
    expect(screen.getByText('0 selected to reimport')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(1\)/i })
    );

    await waitFor(() =>
      expect(importMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orders: [previewResponse.orders[0]],
      })
    );
  });

  it('reimports only selected imported orders from the selected reimport action', async () => {
    const importMutateAsync = vi.fn().mockResolvedValue({
      importedCount: 1,
      createdCount: 0,
      updatedCount: 1,
      syncedAt: '2026-03-26T11:00:00.000Z',
      results: [{ baseOrderId: '1002', result: 'updated' }],
    });
    useImportBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: importMutateAsync,
    });
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
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByLabelText('Select order 1001'));
    fireEvent.click(screen.getByLabelText('Select order 1002'));
    fireEvent.click(
      screen.getByRole('button', { name: /Reimport selected visible imported \(1\)/i })
    );

    await waitFor(() =>
      expect(importMutateAsync).toHaveBeenCalledWith({
        connectionId: 'conn-1',
        orders: [previewResponse.orders[1]],
      })
    );
  });

  it('selects visible imported orders for bulk reimport', async () => {
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
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
        {
          baseOrderId: '1003',
          orderNumber: 'SO-1003',
          externalStatusId: 'paid',
          externalStatusName: 'Paid',
          buyerName: 'Charlie',
          buyerEmail: 'charlie@example.com',
          currency: 'PLN',
          totalGross: 300,
          deliveryMethod: 'Courier',
          paymentMethod: 'Card',
          source: 'Base',
          orderCreatedAt: '2026-03-23T10:00:00.000Z',
          orderUpdatedAt: null,
          lineItems: [],
          fingerprint: 'fp-3',
          raw: {},
          importState: 'imported',
          lastImportedAt: '2026-03-26T09:00:00.000Z',
          previousImport: {
            orderNumber: 'SO-1003',
            externalStatusId: 'paid',
            externalStatusName: 'Paid',
            buyerName: 'Charlie',
            buyerEmail: 'charlie@example.com',
            currency: 'PLN',
            totalGross: 300,
            deliveryMethod: 'Courier',
            paymentMethod: 'Card',
            source: 'Base',
            orderCreatedAt: '2026-03-23T10:00:00.000Z',
            orderUpdatedAt: '2026-03-23T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T09:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 3,
        newCount: 1,
        importedCount: 2,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('3'));

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });

    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));
    fireEvent.click(screen.getByRole('button', { name: /Select visible imported \(2\)/i }));

    expect(
      screen.getByRole('button', { name: /Reimport selected visible imported \(2\)/i })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(0\)/i })
    ).toBeDisabled();
  });

  it('does not apply hidden selected orders to visible bulk actions after filter changes', async () => {
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
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByLabelText('Select order 1002'));
    expect(screen.getByText('1 selected visible')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'new' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    expect(screen.getByText('0 selected visible')).toBeInTheDocument();
    expect(screen.getByText('1 hidden by filters')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Import selected visible new \+ changed \(0\)/i })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Reimport selected visible imported \(0\)/i })
    ).toBeDisabled();
  });

  it('clears only hidden selected orders and preserves visible selection', async () => {
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
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.click(screen.getByLabelText('Select order 1001'));
    fireEvent.click(screen.getByLabelText('Select order 1002'));

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'new' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    expect(screen.getByText('1 selected visible')).toBeInTheDocument();
    expect(screen.getByText('1 hidden by filters')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear hidden selection \(1\)/i }));

    expect(screen.getByText('1 selected visible')).toBeInTheDocument();
    expect(screen.queryByText('1 hidden by filters')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Clear hidden selection \(0\)/i })
    ).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'all' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    expect(screen.getByText('1 selected visible')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reimport selected visible imported \(0\)/i })
    ).toBeDisabled();
  });

  it('clears only visible selected orders and preserves hidden selection', async () => {
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
          previousImport: {
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
            orderUpdatedAt: '2026-03-24T10:00:00.000Z',
            lineItems: [],
            lastImportedAt: '2026-03-26T10:00:00.000Z',
          },
        },
      ],
      stats: {
        total: 2,
        newCount: 1,
        importedCount: 1,
        changedCount: 0,
      },
    };
    usePreviewBaseOrdersMutation.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn().mockResolvedValue(previewResponse),
    });

    render(<AdminProductOrdersImportPage />);

    fireEvent.click(screen.getByRole('button', { name: /Preview orders/i }));
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));

    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByLabelText('Select order 1002'));
    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'all' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('2'));
    fireEvent.change(screen.getByPlaceholderText('Search previewed orders...'), {
      target: { value: 'alice' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByLabelText('Select order 1001'));
    expect(screen.getByText('1 hidden by filters')).toBeInTheDocument();
    expect(screen.getByText('1 selected visible')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear visible selection \(1\)/i }));

    expect(screen.getByText('0 selected visible')).toBeInTheDocument();
    expect(screen.getByText('1 hidden by filters')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Clear visible selection \(0\)/i })
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Reimport selected visible imported \(0\)/i })
    ).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText('Search previewed orders...'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Import state'), {
      target: { value: 'imported' },
    });
    await waitFor(() => expect(screen.getByTestId('orders-count')).toHaveTextContent('1'));

    expect(screen.getByText('1 selected visible')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Reimport selected visible imported \(1\)/i })
    ).toBeEnabled();
  });
});
