// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useImportListMock: vi.fn(),
  useImportRunMock: vi.fn(),
  useInventoriesMock: vi.fn(),
  useWarehousesMock: vi.fn(),
}));

vi.mock('@/features/data-import-export/hooks/useImportQueries', () => ({
  useInventories: (...args: unknown[]) => mocks.useInventoriesMock(...args),
  useWarehouses: (...args: unknown[]) => mocks.useWarehousesMock(...args),
  useImportList: (...args: unknown[]) => mocks.useImportListMock(...args),
  useImportRun: (...args: unknown[]) => mocks.useImportRunMock(...args),
}));

import { useImportExportData } from './useImportExportData';

describe('useImportExportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mocks.useInventoriesMock.mockReturnValue({
      data: [{ id: 'fallback-inv', name: 'Fallback inventory' }],
      isFetching: false,
      refetch: vi.fn(),
    });
    mocks.useWarehousesMock.mockReturnValue({
      data: { warehouses: [], allWarehouses: [] },
      isFetching: false,
      refetch: vi.fn(),
    });
    mocks.useImportListMock.mockReturnValue({
      data: { products: [] },
      isFetching: false,
      refetch: vi.fn(),
    });
    mocks.useImportRunMock.mockReturnValue({
      data: null,
      isFetching: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not replace saved inventory selections during first inventory hydration', () => {
    const setInventoryId = vi.fn();
    const setExportInventoryId = vi.fn();

    renderHook(() =>
      useImportExportData({
        selectedBaseConnectionId: 'conn-1',
        isBaseConnected: true,
        inventoriesEnabled: true,
        inventoryId: '',
        inventoryIdRef: { current: 'saved-inv' },
        setInventoryId,
        exportInventoryId: '',
        exportInventoryIdRef: { current: 'saved-export-inv' },
        setExportInventoryId,
        includeAllWarehouses: false,
        warehousesEnabled: false,
        catalogId: 'catalog-1',
        limit: 'all',
        uniqueOnly: true,
        importListPage: 1,
        importListPageSize: 25,
        importNameSearch: '',
        importDirectTargetType: 'base_product_id',
        importDirectTargetValue: '',
        importSkuSearch: '',
        importListEnabled: false,
        activeImportRunId: '',
        pollImportRun: false,
        setPollImportRun: vi.fn(),
      })
    );

    act(() => {
      vi.runAllTimers();
    });

    expect(setInventoryId).not.toHaveBeenCalled();
    expect(setExportInventoryId).not.toHaveBeenCalled();
  });
});
