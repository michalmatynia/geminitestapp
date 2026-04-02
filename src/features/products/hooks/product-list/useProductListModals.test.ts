// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { persistTraderaQuickListFeedback } from '@/features/products/components/list/columns/buttons/traderaQuickListFeedback';
import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations';
import type { ProductWithImages } from '@/shared/contracts/products';

const {
  baseHandleListProductSuccessMock,
  integrationModalState,
  refreshListingBadgesMock,
  setExportSettingsProductMock,
  setIntegrationsProductMock,
  setListProductPresetMock,
  setShowListProductModalMock,
} = vi.hoisted(() => ({
  baseHandleListProductSuccessMock: vi.fn(),
  integrationModalState: {
    integrationsProduct: null as ProductWithImages | null,
  },
  refreshListingBadgesMock: vi.fn(),
  setExportSettingsProductMock: vi.fn(),
  setIntegrationsProductMock: vi.fn(),
  setListProductPresetMock: vi.fn(),
  setShowListProductModalMock: vi.fn(),
}));

vi.mock('@/features/integrations/public', () => ({
  useIntegrationModalOperations: () => ({
    integrationsProduct: integrationModalState.integrationsProduct,
    setIntegrationsProduct: (
      value:
        | ProductWithImages
        | null
        | ((previous: ProductWithImages | null) => ProductWithImages | null)
    ) => {
      setIntegrationsProductMock(value);
      integrationModalState.integrationsProduct =
        typeof value === 'function' ? value(integrationModalState.integrationsProduct) : value;
    },
    showListProductModal: false,
    setShowListProductModal: setShowListProductModalMock,
    listProductPreset: null,
    setListProductPreset: setListProductPresetMock,
    exportSettingsProduct: null,
    setExportSettingsProduct: setExportSettingsProductMock,
    refreshListingBadges: refreshListingBadgesMock,
    handleListProductSuccess: baseHandleListProductSuccessMock,
  }),
}));

import { useProductListModals } from './useProductListModals';

const createProduct = (): ProductWithImages =>
  ({
    id: 'product-1',
    sku: 'SKU-1',
    name: 'Product 1',
    images: [],
    catalogIds: [],
    updatedAt: '2026-04-02T18:00:00.000Z',
  }) as ProductWithImages;

describe('useProductListModals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationModalState.integrationsProduct = null;
    window.sessionStorage.clear();
  });

  it('clears Tradera recovery context after listing success', () => {
    const recoveryContext: ProductListingsRecoveryContext = {
      source: 'tradera_quick_export_auth_required',
      integrationSlug: 'tradera',
      status: 'auth_required',
      runId: null,
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    };

    const refreshProductListingsData = vi.fn();
    const { result } = renderHook(() =>
      useProductListModals({
        handleOpenCreateModal: vi.fn(),
        prefetchIntegrationSelectionData: vi.fn(),
        prefetchProductListingsData: vi.fn(),
        refreshProductListingsData,
        rowSelection: {},
        toast: vi.fn(),
      })
    );

    act(() => {
      result.current.handleOpenIntegrationsModal(createProduct(), recoveryContext);
    });

    expect(result.current.integrationsRecoveryContext).toEqual(recoveryContext);

    act(() => {
      result.current.handleListProductSuccess();
    });

    expect(result.current.integrationsRecoveryContext).toBeNull();
    expect(setListProductPresetMock).toHaveBeenCalledWith(null);
    expect(refreshProductListingsData).toHaveBeenCalledWith('product-1');
    expect(baseHandleListProductSuccessMock).toHaveBeenCalled();
  });

  it('stores the requested integration filter when opening the listings modal', () => {
    const { result } = renderHook(() =>
      useProductListModals({
        handleOpenCreateModal: vi.fn(),
        prefetchIntegrationSelectionData: vi.fn(),
        prefetchProductListingsData: vi.fn(),
        refreshProductListingsData: vi.fn(),
        rowSelection: {},
        toast: vi.fn(),
      })
    );

    act(() => {
      result.current.handleOpenIntegrationsModal(createProduct(), undefined, 'tradera');
    });

    expect(result.current.integrationsFilterIntegrationSlug).toBe('tradera');
  });

  it('derives the marketplace filter from recovery context when no filter is provided', () => {
    const recoveryContext: ProductListingsRecoveryContext = {
      source: 'tradera_quick_export_failed',
      integrationSlug: 'tradera',
      status: 'failed',
      runId: null,
      requestId: 'job-tradera-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    };

    const { result } = renderHook(() =>
      useProductListModals({
        handleOpenCreateModal: vi.fn(),
        prefetchIntegrationSelectionData: vi.fn(),
        prefetchProductListingsData: vi.fn(),
        refreshProductListingsData: vi.fn(),
        rowSelection: {},
        toast: vi.fn(),
      })
    );

    act(() => {
      result.current.handleOpenIntegrationsModal(createProduct(), recoveryContext);
    });

    expect(result.current.integrationsFilterIntegrationSlug).toBe('tradera');
  });

  it('enriches Tradera recovery context from persisted quick-export feedback', () => {
    persistTraderaQuickListFeedback('product-1', 'failed', {
      runId: 'run-tradera-1',
      requestId: 'job-tradera-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });

    const recoveryContext: ProductListingsRecoveryContext = {
      source: 'tradera_quick_export_failed',
      integrationSlug: 'tradera',
      status: 'failed',
      runId: null,
      requestId: null,
      integrationId: undefined,
      connectionId: undefined,
    };

    const { result } = renderHook(() =>
      useProductListModals({
        handleOpenCreateModal: vi.fn(),
        prefetchIntegrationSelectionData: vi.fn(),
        prefetchProductListingsData: vi.fn(),
        refreshProductListingsData: vi.fn(),
        rowSelection: {},
        toast: vi.fn(),
      })
    );

    act(() => {
      result.current.handleOpenIntegrationsModal(createProduct(), recoveryContext, 'tradera');
    });

    expect(result.current.integrationsRecoveryContext).toEqual({
      ...recoveryContext,
      runId: 'run-tradera-1',
      requestId: 'job-tradera-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
  });
});
