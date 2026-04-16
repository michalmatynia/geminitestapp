/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductListingsDataMock,
  useProductListingsUIStateMock,
  useProductListingsModalsMock,
  useProductBaseSyncPreviewMock,
  usePriceGroupsMock,
  useBaseInventoriesMock,
  useBaseWarehousesMock,
  useIntegrationsWithConnectionsMock,
  useProductSyncProfilesMock,
  useRunProductBaseSyncMutationMock,
  refetchPreviewMock,
  toastMock,
} = vi.hoisted(() => ({
  useProductListingsDataMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
  useProductBaseSyncPreviewMock: vi.fn(),
  usePriceGroupsMock: vi.fn(),
  useBaseInventoriesMock: vi.fn(),
  useBaseWarehousesMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
  useProductSyncProfilesMock: vi.fn(),
  useRunProductBaseSyncMutationMock: vi.fn(),
  refetchPreviewMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsData: () => useProductListingsDataMock(),
  useProductListingsUIState: () => useProductListingsUIStateMock(),
  useProductListingsModals: () => useProductListingsModalsMock(),
}));

vi.mock('@/features/product-sync/hooks/useProductBaseSync', () => ({
  useProductBaseSyncPreview: (...args: unknown[]) => useProductBaseSyncPreviewMock(...args),
  useRunProductBaseSyncMutation: () => useRunProductBaseSyncMutationMock(),
}));

vi.mock('@/features/product-sync/hooks/useProductSyncSettings', () => ({
  useProductSyncProfiles: () => useProductSyncProfilesMock(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  usePriceGroups: (...args: unknown[]) => usePriceGroupsMock(...args),
}));

vi.mock('@/shared/hooks/useIntegrationQueries', () => ({
  useBaseInventories: (...args: unknown[]) => useBaseInventoriesMock(...args),
  useBaseWarehouses: (...args: unknown[]) => useBaseWarehousesMock(...args),
  useIntegrationsWithConnections: () => useIntegrationsWithConnectionsMock(),
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui/primitives.public')>(
    '@/shared/ui/primitives.public'
  );
  return {
    ...actual,
    useToast: () => ({
      toast: (...args: unknown[]) => toastMock(...args),
    }),
  };
});

import { ProductListingsSyncPanel } from './ProductListingsSyncPanel';

const createPreviewData = (
  overrides: Record<string, unknown> = {}
): Record<string, unknown> => ({
  status: 'ready',
  canSync: true,
  disabledReason: null,
  profile: {
    id: 'profile-1',
    name: 'Base Product Sync',
    isDefault: true,
    enabled: true,
    connectionId: 'connection-1',
    connectionName: 'Main Base Connection',
    inventoryId: 'inventory-1',
    catalogId: null,
    lastRunAt: null,
  },
  linkedBaseProductId: 'base-1',
  resolvedTargetSource: 'product',
  fields: [
    {
      appField: 'name_en',
      appFieldLabel: 'Name (EN)',
      baseField: 'text_fields.name',
      baseFieldLabel: 'Product name (text_fields.name)',
      baseFieldDescription: 'Name inside text_fields object.',
      direction: 'app_to_base',
      appValue: 'Example product',
      baseValue: 'Old Base title',
      hasDifference: true,
      willWriteToApp: false,
      willWriteToBase: true,
    },
    {
      appField: 'stock',
      appFieldLabel: 'Stock',
      baseField: 'stock',
      baseFieldLabel: 'Inventory stock (stock)',
      baseFieldDescription: 'Inventory-level stock (no warehouse).',
      direction: 'base_to_app',
      appValue: 5,
      baseValue: 8,
      hasDifference: true,
      willWriteToApp: true,
      willWriteToBase: false,
    },
    {
      appField: 'weight',
      appFieldLabel: 'Weight',
      baseField: 'weight',
      baseFieldLabel: 'Weight (weight)',
      baseFieldDescription: 'Weight in product payload.',
      direction: 'app_to_base',
      appValue: 100,
      baseValue: 100,
      hasDifference: false,
      willWriteToApp: false,
      willWriteToBase: false,
    },
    {
      appField: 'sku',
      appFieldLabel: 'SKU',
      baseField: 'sku',
      baseFieldLabel: 'SKU (sku)',
      baseFieldDescription: 'SKU identifier.',
      direction: 'disabled',
      appValue: 'SKU-1',
      baseValue: 'SKU-1',
      hasDifference: false,
      willWriteToApp: false,
      willWriteToBase: false,
    },
  ],
  ...overrides,
});

describe('ProductListingsSyncPanel', () => {
  const setIsSyncImagesConfirmOpen = vi.fn();
  const mutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useProductListingsDataMock.mockReturnValue({
      product: {
        id: 'product-1',
        sku: 'SKU-1',
        name_en: 'Example product',
        description_en: 'Example description',
        price: 123,
        stock: 5,
        ean: 'EAN-1',
        weight: 100,
        imageLinks: [],
        images: [],
      },
      listings: [
        {
          id: 'listing-base-1',
          status: 'active',
          integration: {
            name: 'Base.com',
            slug: 'base-com',
          },
        },
      ],
    });
    useProductListingsUIStateMock.mockReturnValue({
      syncingImages: null,
    });
    useProductListingsModalsMock.mockReturnValue({
      setIsSyncImagesConfirmOpen,
    });
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'integration-1',
          name: 'Base.com',
          slug: 'base-com',
          connections: [{ id: 'connection-1', name: 'Main Base Connection' }],
        },
      ],
      isLoading: false,
      error: null,
    });
    useBaseInventoriesMock.mockReturnValue({
      data: [{ id: 'inventory-1', name: 'Main Inventory', is_default: true }],
      isLoading: false,
      error: null,
    });
    usePriceGroupsMock.mockReturnValue({
      data: [
        {
          id: 'pg-eur',
          groupId: 'EUR_RETAIL',
          name: 'Retail EUR',
          currencyId: 'EUR',
          currencyCode: 'EUR',
          isDefault: false,
          type: 'standard',
          basePriceField: 'price',
          sourceGroupId: null,
          priceMultiplier: 1,
          addToPrice: 0,
        },
      ],
      isLoading: false,
      error: null,
    });
    useBaseWarehousesMock.mockReturnValue({
      data: {
        warehouses: [{ id: '1', name: 'Main Warehouse', is_default: true, typedId: 'bl_1' }],
        allWarehouses: [{ id: '1', name: 'Main Warehouse', is_default: true, typedId: 'bl_1' }],
      },
      isLoading: false,
      error: null,
    });
    useProductSyncProfilesMock.mockReturnValue({
      data: [
        {
          id: 'profile-1',
          name: 'Base Product Sync',
          isDefault: true,
          enabled: true,
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
          catalogId: null,
          scheduleIntervalMinutes: 30,
          batchSize: 100,
          conflictPolicy: 'skip',
          fieldRules: [
            {
              id: 'rule-1',
              appField: 'stock',
              baseField: 'stock.bl_1',
              direction: 'base_to_app',
            },
            {
              id: 'rule-2',
              appField: 'name_en',
              baseField: 'text_fields.name',
              direction: 'app_to_base',
            },
            {
              id: 'rule-3',
              appField: 'price',
              baseField: 'prices.EUR_RETAIL',
              direction: 'disabled',
            },
          ],
          lastRunAt: null,
          createdAt: '2026-04-11T12:00:00.000Z',
          updatedAt: '2026-04-11T12:00:00.000Z',
        },
      ],
      isLoading: false,
      error: null,
    });
    refetchPreviewMock.mockResolvedValue({
      data: createPreviewData(),
      error: null,
    });
    useProductBaseSyncPreviewMock.mockReturnValue({
      data: createPreviewData(),
      isFetching: false,
      isLoading: false,
      error: null,
      refetch: refetchPreviewMock,
    });
    mutateAsync.mockResolvedValue({
      preview: {
        status: 'ready',
        canSync: true,
        disabledReason: null,
        profile: {
          id: 'profile-1',
          name: 'Base Product Sync',
          isDefault: true,
          enabled: true,
          connectionId: 'connection-1',
          connectionName: 'Main Base Connection',
          inventoryId: 'inventory-1',
          catalogId: null,
          lastRunAt: null,
        },
        linkedBaseProductId: 'base-1',
        resolvedTargetSource: 'product',
        fields: [],
      },
      result: {
        status: 'success',
        localChanges: ['baseProductId'],
        baseChanges: ['text_fields.name'],
        message: 'Synchronized successfully.',
        errorMessage: null,
      },
    });
    useRunProductBaseSyncMutationMock.mockReturnValue({
      mutateAsync,
      isPending: false,
    });
  });

  it('reveals live out-of-sync fields only after Check and then runs the Base sync action', async () => {
    render(<ProductListingsSyncPanel />);

    expect(useProductBaseSyncPreviewMock).toHaveBeenCalledWith('product-1', { enabled: false });
    expect(
      screen.getByText(
        'Click Check to load the live Base.com status for this product and reveal the fields that are currently out of sync.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Configured Directions')).toBeInTheDocument();
    expect(
      screen.getByText(
        'These are the saved field directions. Click Check to load the live out-of-sync fields.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Main Base Connection')).toBeInTheDocument();
    expect(screen.getByText('connection-1')).toBeInTheDocument();
    expect(screen.getByText('Main Inventory')).toBeInTheDocument();
    expect(screen.getByText('inventory-1')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('1 App -> Base, 1 Base -> App, 5 Disabled')).toBeInTheDocument();
    expect(screen.getByText('Target: Product name (text_fields.name)')).toBeInTheDocument();
    expect(screen.getByText('Target: Main Warehouse (bl_1)')).toBeInTheDocument();
    expect(screen.getByText('Target: Retail EUR (EUR_RETAIL)')).toBeInTheDocument();
    expect(screen.queryByText('Base.com field: Product name (text_fields.name)')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sync' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    await waitFor(() => {
      expect(refetchPreviewMock).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByRole('link', { name: 'Base Product Sync' })).toHaveAttribute(
      'href',
      '/admin/integrations/aggregators/base-com/synchronization-engine'
    );
    expect(screen.getAllByText('App -> Base').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Base -> App').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Base Product Sync').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Main Base Connection').length).toBeGreaterThan(0);
    expect(screen.getAllByText('connection-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Main Inventory').length).toBeGreaterThan(0);
    expect(screen.getAllByText('inventory-1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Never').length).toBeGreaterThan(0);
    expect(screen.getByText('Saved Link')).toBeInTheDocument();
    expect(screen.getByText('Base.com field: Product name (text_fields.name)')).toBeInTheDocument();
    expect(screen.getByText('Name inside text_fields object.')).toBeInTheDocument();
    expect(screen.queryByText('Base.com field: Weight (weight)')).not.toBeInTheDocument();
    expect(screen.queryByText('Base.com field: SKU (sku)')).not.toBeInTheDocument();
    expect(screen.getByText('2 field(s) currently out of sync')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ productId: 'product-1' });
    });
    expect(toastMock).toHaveBeenCalledWith(
      'Synchronization completed: 1 app update(s), 1 Base.com update(s).',
      { variant: 'success' }
    );
    expect(screen.getByText('Last Manual Sync')).toBeInTheDocument();
    expect(screen.getByText('App updated')).toBeInTheDocument();
    expect(screen.getByText('Base.com updated')).toBeInTheDocument();
    expect(screen.getByText('Base product link')).toBeInTheDocument();
  });

  it('explains when the next sync will clear stale values after Check', async () => {
    refetchPreviewMock.mockResolvedValue({
      data: createPreviewData({
        resolvedTargetSource: 'sku_backfill',
        fields: [
          {
            appField: 'description_en',
            appFieldLabel: 'Description (EN)',
            baseField: 'text_fields.description',
            baseFieldLabel: 'Product description (text_fields.description)',
            baseFieldDescription: 'Description inside text_fields object.',
            direction: 'base_to_app',
            appValue: 'Legacy app description',
            baseValue: null,
            hasDifference: true,
            willWriteToApp: true,
            willWriteToBase: false,
          },
          {
            appField: 'ean',
            appFieldLabel: 'EAN',
            baseField: 'ean',
            baseFieldLabel: 'EAN (ean)',
            baseFieldDescription: 'EAN barcode.',
            direction: 'app_to_base',
            appValue: null,
            baseValue: 'STALE-EAN',
            hasDifference: true,
            willWriteToApp: false,
            willWriteToBase: true,
          },
        ],
      }),
      error: null,
    });

    render(<ProductListingsSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    await waitFor(() => {
      expect(screen.getByText('Import SKU')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Target resolved from the product SKU in the active Base inventory. The first successful sync will save the Base ID and Base listing link locally.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Next sync clears the app value because Base.com is blank.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Next sync clears the Base.com value because the app field is blank.')
    ).toBeInTheDocument();
    expect(screen.getByText('Base.com field: EAN (ean)')).toBeInTheDocument();
    expect(screen.getByText('EAN barcode.')).toBeInTheDocument();
  });

  it('shows the disabled reason and blocks sync when the checked preview cannot sync', async () => {
    refetchPreviewMock.mockResolvedValue({
      data: createPreviewData({
        status: 'missing_base_link',
        canSync: false,
        disabledReason:
          'This product is not linked to a Base.com product for the active sync profile connection.',
        linkedBaseProductId: null,
        resolvedTargetSource: 'none',
        fields: [],
      }),
      error: null,
    });

    render(<ProductListingsSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Check' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sync' })).toBeDisabled();
    });

    expect(
      screen.getByText(
        'This product is not linked to a Base.com product for the active sync profile connection.'
      )
    ).toBeInTheDocument();
  });

  it('opens the Base image sync confirmation when the listing is idle', () => {
    render(<ProductListingsSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Sync Image URLs' }));

    expect(setIsSyncImagesConfirmOpen).toHaveBeenCalledWith(true);
  });

  it('disables Base image sync while the listing export is queued or running', () => {
    useProductListingsDataMock.mockReturnValue({
      product: {
        id: 'product-1',
        sku: 'SKU-1',
        name_en: 'Example product',
        description_en: 'Example description',
        price: 123,
        stock: 5,
        ean: 'EAN-1',
        weight: 100,
        imageLinks: [],
        images: [],
      },
      listings: [
        {
          id: 'listing-base-1',
          status: 'pending',
          integration: {
            name: 'Base.com',
            slug: 'base-com',
          },
        },
      ],
    });

    render(<ProductListingsSyncPanel />);

    expect(screen.getByRole('button', { name: 'Sync Image URLs' })).toBeDisabled();
  });
});
