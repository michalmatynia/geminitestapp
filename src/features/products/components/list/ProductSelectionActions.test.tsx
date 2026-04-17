import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  setSelectedProductsArchivedStateMock,
  executeTraderaMassExportMock,
  executeVintedMassExportMock,
  productScanModalMock,
  traderaStatusCheckModalMock,
  useBulkSetProductsArchivedStateMock,
  useBulkConvertImagesToBase64Mock,
  useProductListFiltersContextMock,
  useProductListSelectionContextMock,
  useTraderaMassQuickExportMock,
  useVintedMassQuickExportMock,
} = vi.hoisted(() => ({
  setSelectedProductsArchivedStateMock: vi.fn(),
  executeTraderaMassExportMock: vi.fn(),
  executeVintedMassExportMock: vi.fn(),
  productScanModalMock: vi.fn(),
  traderaStatusCheckModalMock: vi.fn(),
  useBulkSetProductsArchivedStateMock: vi.fn(),
  useBulkConvertImagesToBase64Mock: vi.fn(),
  useProductListFiltersContextMock: vi.fn(),
  useProductListSelectionContextMock: vi.fn(),
  useTraderaMassQuickExportMock: vi.fn(),
  useVintedMassQuickExportMock: vi.fn(),
}));

vi.mock('@/features/products/context/ProductListContext', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/products/context/ProductListContext')>();
  return {
    ...actual,
    useProductListFiltersContext: () => useProductListFiltersContextMock(),
    useProductListSelectionContext: () => useProductListSelectionContextMock(),
  };
});

vi.mock('@/features/products/hooks/useProductsMutations', () => ({
  useBulkSetProductsArchivedState: () => useBulkSetProductsArchivedStateMock(),
  useBulkConvertImagesToBase64: () => useBulkConvertImagesToBase64Mock(),
}));

vi.mock('@/features/products/hooks/product-list/useTraderaMassQuickExport', () => ({
  useTraderaMassQuickExport: () => useTraderaMassQuickExportMock(),
}));

vi.mock('@/features/products/hooks/product-list/useVintedMassQuickExport', () => ({
  useVintedMassQuickExport: () => useVintedMassQuickExportMock(),
}));

vi.mock('@/features/integrations/components/listings/TraderaStatusCheckModal', () => ({
  TraderaStatusCheckModal: (props: unknown) => {
    traderaStatusCheckModalMock(props);
    return null;
  },
}));

vi.mock('@/features/products/components/list/ProductScanModal', () => ({
  ProductScanModal: (props: unknown) => {
    productScanModalMock(props);
    return null;
  },
}));

vi.mock('@/shared/ui/selection-bar', () => ({
  SelectionBar: ({
    actions,
    rightActions,
  }: {
    actions?: React.ReactNode;
    rightActions?: React.ReactNode;
  }) => (
    <div>
      <div>{actions}</div>
      <div>{rightActions}</div>
    </div>
  ),
}));

vi.mock('@/shared/ui/ActionMenu', () => ({
  ActionMenu: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/app-modal', () => ({
  AppModal: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/shared/ui/chip', () => ({
  Chip: ({ label }: { label: string }) => <div>{label}</div>,
}));

vi.mock('@/shared/ui/dropdown-menu', () => ({
  DropdownMenuItem: ({
    children,
    onClick,
    disabled,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
  DropdownMenuLabel: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <div data-testid='separator' />,
  DropdownMenuSub: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSubContent: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSubTrigger: ({
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
}));

vi.mock('@/shared/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock('@/shared/ui/templates/modals/JSONImportModal', () => ({
  JSONImportModal: () => null,
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

import { ProductSelectionActions } from './ProductSelectionActions';

describe('ProductSelectionActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    useProductListSelectionContextMock.mockReturnValue({
      data: [{ id: 'product-1' }, { id: 'product-2' }],
      rowSelection: {
        'product-1': true,
        'product-2': true,
      },
      setRowSelection: vi.fn(),
      onSelectAllGlobal: vi.fn(),
      loadingGlobal: false,
      onDeleteSelected: vi.fn(),
      onAddToMarketplace: vi.fn(),
    });
    useProductListFiltersContextMock.mockReturnValue({
      advancedFilter: '',
      activeAdvancedFilterPresetId: null,
      advancedFilterPresets: [],
      includeArchived: false,
      setAdvancedFilterPresets: vi.fn(),
      setAdvancedFilterState: vi.fn(),
    });
    useBulkConvertImagesToBase64Mock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useBulkSetProductsArchivedStateMock.mockReturnValue({
      mutateAsync: setSelectedProductsArchivedStateMock,
      isPending: false,
    });
    useTraderaMassQuickExportMock.mockReturnValue({
      execute: executeTraderaMassExportMock,
      isRunning: false,
      progress: { current: 0, total: 0, errors: 0 },
    });
    useVintedMassQuickExportMock.mockReturnValue({
      execute: executeVintedMassExportMock,
      isRunning: false,
      progress: { current: 0, total: 0, errors: 0 },
    });
  });

  it('passes the selected product ids into the Vinted mass quick export action', () => {
    render(<ProductSelectionActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Quick Export to Vinted' }));

    expect(executeVintedMassExportMock).toHaveBeenCalledWith([
      'product-1',
      'product-2',
    ]);
  });

  it('archives the selected products and clears the current selection', async () => {
    const setRowSelectionMock = vi.fn();
    setSelectedProductsArchivedStateMock.mockResolvedValue({
      status: 'ok',
      archived: true,
      updated: 2,
    });
    useProductListSelectionContextMock.mockReturnValue({
      data: [{ id: 'product-1' }, { id: 'product-2' }],
      rowSelection: {
        'product-1': true,
        'product-2': true,
      },
      setRowSelection: setRowSelectionMock,
      onSelectAllGlobal: vi.fn(),
      loadingGlobal: false,
      onDeleteSelected: vi.fn(),
      onAddToMarketplace: vi.fn(),
    });

    render(<ProductSelectionActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Send to Archive' }));

    await waitFor(() => {
      expect(setSelectedProductsArchivedStateMock).toHaveBeenCalledWith({
        productIds: ['product-1', 'product-2'],
        archived: true,
      });
      expect(setRowSelectionMock).toHaveBeenCalledWith({});
    });
  });

  it('unarchives the selected products when archived items are visible', async () => {
    const setRowSelectionMock = vi.fn();
    setSelectedProductsArchivedStateMock.mockResolvedValue({
      status: 'ok',
      archived: false,
      updated: 1,
    });
    useProductListSelectionContextMock.mockReturnValue({
      data: [{ id: 'product-1', archived: true }],
      rowSelection: {
        'product-1': true,
      },
      setRowSelection: setRowSelectionMock,
      onSelectAllGlobal: vi.fn(),
      loadingGlobal: false,
      onDeleteSelected: vi.fn(),
      onAddToMarketplace: vi.fn(),
    });
    useProductListFiltersContextMock.mockReturnValue({
      advancedFilter: '',
      activeAdvancedFilterPresetId: null,
      advancedFilterPresets: [],
      includeArchived: true,
      setAdvancedFilterPresets: vi.fn(),
      setAdvancedFilterState: vi.fn(),
    });

    render(<ProductSelectionActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Remove from Archive' }));

    await waitFor(() => {
      expect(setSelectedProductsArchivedStateMock).toHaveBeenCalledWith({
        productIds: ['product-1'],
        archived: false,
      });
      expect(setRowSelectionMock).toHaveBeenCalledWith({});
    });
  });

  it('disables the Vinted mass quick export action when no products are selected', () => {
    useProductListSelectionContextMock.mockReturnValue({
      data: [{ id: 'product-1' }],
      rowSelection: {},
      setRowSelection: vi.fn(),
      onSelectAllGlobal: vi.fn(),
      loadingGlobal: false,
      onDeleteSelected: vi.fn(),
      onAddToMarketplace: vi.fn(),
    });

    render(<ProductSelectionActions />);

    expect(screen.getByRole('button', { name: 'Quick Export to Vinted' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send to Archive' })).toBeDisabled();
  });

  it('only shows the unarchive action when archived items are included in the list', () => {
    render(<ProductSelectionActions />);

    expect(screen.queryByRole('button', { name: 'Remove from Archive' })).not.toBeInTheDocument();

    useProductListFiltersContextMock.mockReturnValue({
      advancedFilter: '',
      activeAdvancedFilterPresetId: null,
      advancedFilterPresets: [],
      includeArchived: true,
      setAdvancedFilterPresets: vi.fn(),
      setAdvancedFilterState: vi.fn(),
    });

    render(<ProductSelectionActions />);

    expect(screen.getByRole('button', { name: 'Remove from Archive' })).toBeInTheDocument();
  });

  it('opens the Tradera status check modal with the selected products', () => {
    render(<ProductSelectionActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Check Tradera Listing Status' }));

    expect(traderaStatusCheckModalMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isOpen: true,
        productIds: ['product-1', 'product-2'],
        products: [{ id: 'product-1' }, { id: 'product-2' }],
      })
    );
  });

  it('opens the Amazon scan modal with the selected products', () => {
    render(<ProductSelectionActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Scan Amazon ASIN' }));

    expect(productScanModalMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        isOpen: true,
        productIds: ['product-1', 'product-2'],
        products: [{ id: 'product-1' }, { id: 'product-2' }],
      })
    );
  });
});
