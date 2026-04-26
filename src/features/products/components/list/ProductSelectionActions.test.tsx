import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductAdvancedFilterPreset } from '@/shared/contracts/products/filters';

const {
  setSelectedProductsArchivedStateMock,
  executeTraderaMassExportMock,
  executeVintedMassExportMock,
  productScanModalMock,
  traderaStatusCheckModalMock,
  useBulkSetProductsArchivedStateMock,
  useBulkConvertImagesToBase64Mock,
  useBulkProductBaseSyncMutationMock,
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
  useBulkProductBaseSyncMutationMock: vi.fn(),
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

vi.mock('@/features/product-sync/hooks/useProductBaseSync', () => ({
  useBulkProductBaseSyncMutation: () => useBulkProductBaseSyncMutationMock(),
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

vi.mock('@/features/integrations/product-integrations-adapter', () => ({
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

vi.mock('@/features/products/components/list/ProductBulkSyncResultsModal', () => ({
  ProductBulkSyncResultsModal: () => null,
}));

vi.mock('@/features/products/components/list/ProductBulkSyncSetupModal', () => ({
  ProductBulkSyncSetupModal: () => null,
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
  AppModal: ({
    children,
    footer,
    isOpen,
  }: {
    children?: React.ReactNode;
    footer?: React.ReactNode;
    isOpen?: boolean;
  }) =>
    isOpen ? (
      <div role='dialog'>
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
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
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} disabled={disabled} {...props}>
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

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value?: string;
    onValueChange?: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value ?? ''}
      onChange={(event) => onValueChange?.(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/checkbox', () => ({
  Checkbox: ({
    checked,
    onCheckedChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    onCheckedChange?: (checked: boolean) => void;
  }) => (
    <input
      type='checkbox'
      checked={checked === true}
      onChange={(event) => onCheckedChange?.(event.target.checked)}
      {...props}
    />
  ),
}));

vi.mock('@/shared/ui/label', () => ({
  Label: ({ children, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) => (
    <label {...props}>{children}</label>
  ),
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
    useBulkProductBaseSyncMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
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

  it('deletes a saved advanced filter preset from the menu', async () => {
    const preset: ProductAdvancedFilterPreset = {
      id: 'preset-1',
      name: 'Pinned SKU',
      filter: {
        type: 'group',
        id: 'group-1',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'condition-1',
            field: 'sku',
            operator: 'contains',
            value: 'PIN',
          },
        ],
      },
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z',
    };
    const setAdvancedFilterPresetsMock = vi.fn().mockResolvedValue(undefined);
    const setAdvancedFilterStateMock = vi.fn();

    useProductListFiltersContextMock.mockReturnValue({
      advancedFilter: JSON.stringify(preset.filter),
      activeAdvancedFilterPresetId: preset.id,
      advancedFilterPresets: [preset],
      includeArchived: false,
      setAdvancedFilterPresets: setAdvancedFilterPresetsMock,
      setAdvancedFilterState: setAdvancedFilterStateMock,
    });

    render(<ProductSelectionActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Delete preset Pinned SKU' }));

    await waitFor(() => {
      expect(setAdvancedFilterPresetsMock).toHaveBeenCalledWith([]);
      expect(setAdvancedFilterStateMock).toHaveBeenCalledWith('', null);
    });
  });

  it('edits a saved advanced filter preset from the pen action', async () => {
    const preset: ProductAdvancedFilterPreset = {
      id: 'preset-1',
      name: 'Pinned SKU',
      filter: {
        type: 'group',
        id: 'group-1',
        combinator: 'and',
        not: false,
        rules: [
          {
            type: 'condition',
            id: 'condition-1',
            field: 'sku',
            operator: 'contains',
            value: 'PIN',
          },
        ],
      },
      createdAt: '2026-04-26T00:00:00.000Z',
      updatedAt: '2026-04-26T00:00:00.000Z',
    };
    const setAdvancedFilterPresetsMock = vi.fn().mockResolvedValue(undefined);
    const setAdvancedFilterStateMock = vi.fn();

    useProductListFiltersContextMock.mockReturnValue({
      advancedFilter: JSON.stringify(preset.filter),
      activeAdvancedFilterPresetId: preset.id,
      advancedFilterPresets: [preset],
      includeArchived: false,
      setAdvancedFilterPresets: setAdvancedFilterPresetsMock,
      setAdvancedFilterState: setAdvancedFilterStateMock,
    });

    render(<ProductSelectionActions />);

    fireEvent.click(screen.getByRole('button', { name: 'Edit preset Pinned SKU' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Preset name' }), {
      target: { value: 'Updated SKU' },
    });
    fireEvent.change(screen.getByRole('textbox', { name: 'Condition value' }), {
      target: { value: 'WAL' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Update Preset' }));

    await waitFor(() => {
      expect(setAdvancedFilterPresetsMock).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'preset-1',
          name: 'Updated SKU',
          filter: expect.objectContaining({
            rules: [
              expect.objectContaining({
                field: 'sku',
                operator: 'contains',
                value: 'WAL',
              }),
            ],
          }),
          updatedAt: expect.any(String),
        }),
      ]);
      expect(setAdvancedFilterStateMock).toHaveBeenCalledWith(
        expect.stringContaining('"value":"WAL"'),
        'preset-1'
      );
    });
  });
});
