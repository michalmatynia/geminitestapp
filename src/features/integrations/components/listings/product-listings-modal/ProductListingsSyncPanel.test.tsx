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
  useRunProductBaseSyncMutationMock,
  refetchPreviewMock,
  toastMock,
} = vi.hoisted(() => ({
  useProductListingsDataMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
  useProductListingsModalsMock: vi.fn(),
  useProductBaseSyncPreviewMock: vi.fn(),
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
        localChanges: ['stock'],
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

  it('renders live field directions immediately on open and runs the Base sync action', async () => {
    render(<ProductListingsSyncPanel />);

    expect(useProductBaseSyncPreviewMock).toHaveBeenCalledWith('product-1');
    expect(
      screen.queryByText(
        'Click Check to load the live Base.com status for this product and reveal the fields that are currently out of sync.'
      )
    ).not.toBeInTheDocument();
    expect(screen.getAllByText('App -> Base').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Base -> App').length).toBeGreaterThan(0);
    expect(screen.getByText('Base Product Sync')).toBeInTheDocument();
    expect(screen.getByText('Main Base Connection')).toBeInTheDocument();
    expect(screen.getByText('connection-1')).toBeInTheDocument();
    expect(screen.getByText('inventory-1')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
    expect(screen.getByText('Saved Link')).toBeInTheDocument();
    expect(screen.getByText('Base.com field: Product name (text_fields.name)')).toBeInTheDocument();
    expect(screen.getByText('Name inside text_fields object.')).toBeInTheDocument();
    expect(screen.getByText('Weight')).toBeInTheDocument();
    expect(screen.getByText('SKU')).toBeInTheDocument();
    expect(screen.getAllByText('In sync').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Disabled').length).toBeGreaterThan(0);
    expect(
      screen.getByText('This field is already aligned between the app and Base.com.')
    ).toBeInTheDocument();
    expect(screen.getByText('This field is disabled in the active sync profile.')).toBeInTheDocument();
    expect(
      screen.getByText('2 field(s) out of sync, 2 already aligned, 1 disabled')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Sync' }));

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({ productId: 'product-1' });
    });
    expect(toastMock).toHaveBeenCalledWith(
      'Synchronization completed: 1 app update(s), 1 Base.com update(s).',
      { variant: 'success' }
    );
  });

  it('refreshes the live Base.com sync preview on demand', async () => {
    render(<ProductListingsSyncPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));

    await waitFor(() => {
      expect(refetchPreviewMock).toHaveBeenCalledTimes(1);
    });
  });

  it('explains when the next sync will clear stale values', () => {
    useProductBaseSyncPreviewMock.mockReturnValue({
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
      refetch: refetchPreviewMock,
      isFetching: false,
      isLoading: false,
      error: null,
    });

    render(<ProductListingsSyncPanel />);

    expect(screen.getByText('Import SKU')).toBeInTheDocument();
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

  it('shows the disabled reason and blocks sync when preview cannot sync', () => {
    useProductBaseSyncPreviewMock.mockReturnValue({
      data: createPreviewData({
        status: 'missing_base_link',
        canSync: false,
        disabledReason:
          'This product is not linked to a Base.com product for the active sync profile connection.',
        linkedBaseProductId: null,
        resolvedTargetSource: 'none',
        fields: [],
      }),
      refetch: refetchPreviewMock,
      isFetching: false,
      isLoading: false,
      error: null,
    });

    render(<ProductListingsSyncPanel />);

    expect(screen.getByRole('button', { name: 'Sync' })).toBeDisabled();
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
