// @vitest-environment jsdom

import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  dataTableMock,
  standardDataTablePanelMock,
  useProductListAlertsContextMock,
  useProductListModalsContextMock,
  useProductListTableContextMock,
  useProductsTablePropsMock,
} = vi.hoisted(() => ({
  dataTableMock: vi.fn(),
  standardDataTablePanelMock: vi.fn(),
  useProductListAlertsContextMock: vi.fn(),
  useProductListModalsContextMock: vi.fn(),
  useProductListTableContextMock: vi.fn(),
  useProductsTablePropsMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicStub(props: Record<string, unknown>): React.JSX.Element {
      return <div data-testid='dynamic-stub'>{props.filtersContent as React.ReactNode}</div>;
    },
}));

vi.mock('@/features/products/context/ProductListContext', () => ({
  useProductListAlertsContext: () => useProductListAlertsContextMock(),
  useProductListModalsContext: () => useProductListModalsContextMock(),
  useProductListTableContext: () => useProductListTableContextMock(),
}));

vi.mock('@/features/products/hooks/useProductsTableProps', () => ({
  useProductsTableProps: () => useProductsTablePropsMock(),
}));

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DataTable: (props: Record<string, unknown>) => {
    dataTableMock(props);
    return <div data-testid='desktop-data-table' />;
  },
  EmptyState: ({
    title,
    description,
  }: {
    title?: string;
    description?: string;
    className?: string;
  }) => (
    <div>
      <span>{title}</span>
      <span>{description}</span>
    </div>
  ),
  StandardDataTablePanel: (props: Record<string, unknown>) => {
    standardDataTablePanelMock(props);
    return (
      <div data-testid='standard-data-table-panel'>
        {props.header as React.ReactNode}
        {props.alerts as React.ReactNode}
        {props.actions as React.ReactNode}
        {props.children as React.ReactNode}
      </div>
    );
  },
}));

import { ProductListPanel } from './ProductListPanel';

const createDomRect = (overrides: Partial<DOMRect> = {}): DOMRect =>
  ({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    toJSON: () => ({}),
    ...overrides,
  }) as DOMRect;

describe('ProductListPanel layout contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    const appContent = document.createElement('div');
    appContent.id = 'app-content';
    appContent.getBoundingClientRect = vi.fn(() => createDomRect({ bottom: 640, height: 640 }));
    document.body.innerHTML = '';
    document.body.appendChild(appContent);

    class ResizeObserverMock {
      observe = vi.fn();
      disconnect = vi.fn();
      unobserve = vi.fn();
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal(
      'requestAnimationFrame',
      ((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }) as typeof window.requestAnimationFrame
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    useProductListAlertsContextMock.mockReturnValue({
      loadError: null,
      actionError: null,
      onDismissActionError: vi.fn(),
    });
    useProductListModalsContextMock.mockReturnValue({
      isPromptOpen: false,
      setIsPromptOpen: vi.fn(),
      handleConfirmSku: vi.fn(),
    });
    useProductListTableContextMock.mockReturnValue({
      handleProductsTableRender: vi.fn(),
    });
    useProductsTablePropsMock.mockReturnValue({
      columns: [],
      data: [{ id: 'product-1' }],
      isLoading: false,
      getRowId: (row: { id: string }) => row.id,
      getRowClassName: undefined,
      rowSelection: {},
      onRowSelectionChange: vi.fn(),
      skeletonRows: null,
      stickyHeader: true,
      maxHeight: undefined,
    });
  });

  it('pins the current panel spacing and keeps the desktop table non-virtualized', async () => {
    render(<ProductListPanel />);

    const panelProps = standardDataTablePanelMock.mock.lastCall?.[0] as Record<string, unknown>;
    expect(panelProps.variant).toBe('flat');
    expect(panelProps.className).toBe('[&>div:first-child]:mb-3');
    expect(panelProps.enableVirtualization).toBe(false);

    const desktopTableWrapper = screen.getByTestId('desktop-data-table').parentElement;
    if (!desktopTableWrapper) {
      throw new Error('Desktop table wrapper was not rendered.');
    }
    desktopTableWrapper.getBoundingClientRect = vi.fn(() =>
      createDomRect({ top: 180, bottom: 420, height: 240 })
    );

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    await waitFor(() => {
      const dataTableProps = dataTableMock.mock.lastCall?.[0] as Record<string, unknown>;
      expect(dataTableProps.maxHeight).toBe(436);
      expect(dataTableProps.enableVirtualization).toBe(false);
      expect(dataTableProps.tableLayout).toBe('fixed');
    });
  });
});
