import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchBaseWarehousesMock, logWarningMock } = vi.hoisted(() => ({
  fetchBaseWarehousesMock: vi.fn(),
  logWarningMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  fetchBaseWarehouses: fetchBaseWarehousesMock,
  normalizeStockKey: (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const typedMatch = trimmed.match(/([a-z]+)[_-]?(\d+)/i);
    if (typedMatch?.[1] && typedMatch?.[2]) {
      return `${typedMatch[1].toLowerCase()}_${typedMatch[2]}`;
    }
    const numericMatch = trimmed.match(/(\d+)/);
    return numericMatch?.[1] ?? null;
  },
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    logWarning: logWarningMock,
  },
}));

import { resolveWarehouseAndStockMappings } from '@/app/api/integrations/products/[id]/export-to-base/segments/stock';

describe('resolveWarehouseAndStockMappings', () => {
  beforeEach(() => {
    fetchBaseWarehousesMock.mockReset();
    logWarningMock.mockReset();
  });

  it('maps numeric warehouse IDs to typed IDs from inventory warehouses', async () => {
    fetchBaseWarehousesMock.mockResolvedValue([
      {
        id: '15019',
        name: 'Main',
        is_default: true,
        typedId: 'bl_15019',
      },
    ]);

    const result = await resolveWarehouseAndStockMappings({
      imagesOnly: false,
      token: 'token',
      targetInventoryId: 'inv-1',
      initialWarehouseId: '15019',
      mappings: [{ sourceKey: 'stock', targetField: 'stock_15019' }],
      productId: 'product-1',
    });

    expect(result.warehouseId).toBe('bl_15019');
    expect(result.stockWarehouseAliases).toEqual({
      '15019': 'bl_15019',
    });
    expect(result.effectiveMappings).toEqual([
      {
        sourceKey: 'stock',
        targetField: 'stock_bl_15019',
      },
    ]);
  });

  it('uses warehouse_id mapping after resolving it against inventory aliases', async () => {
    fetchBaseWarehousesMock.mockResolvedValue([
      {
        id: '15019',
        name: 'Main',
        is_default: true,
        typedId: 'bl_15019',
      },
    ]);

    const result = await resolveWarehouseAndStockMappings({
      imagesOnly: false,
      token: 'token',
      targetInventoryId: 'inv-1',
      initialWarehouseId: null,
      mappings: [{ sourceKey: '15019', targetField: 'warehouse_id' }],
      productId: 'product-1',
    });

    expect(result.warehouseId).toBe('bl_15019');
  });

  it('drops stock mappings that target warehouses outside selected inventory', async () => {
    fetchBaseWarehousesMock.mockResolvedValue([
      {
        id: '15019',
        name: 'Main',
        is_default: true,
        typedId: 'bl_15019',
      },
    ]);

    const result = await resolveWarehouseAndStockMappings({
      imagesOnly: false,
      token: 'token',
      targetInventoryId: 'inv-1',
      initialWarehouseId: null,
      mappings: [
        { sourceKey: 'stock', targetField: 'stock_99999' },
        { sourceKey: 'name', targetField: 'name' },
      ],
      productId: 'product-1',
    });

    expect(result.effectiveMappings).toEqual([{ sourceKey: 'name', targetField: 'name' }]);
  });

  it('keeps typed warehouse IDs when already provided', async () => {
    fetchBaseWarehousesMock.mockResolvedValue([
      {
        id: '15019',
        name: 'Main',
        is_default: true,
        typedId: 'bl_15019',
      },
    ]);

    const result = await resolveWarehouseAndStockMappings({
      imagesOnly: false,
      token: 'token',
      targetInventoryId: 'inv-1',
      initialWarehouseId: 'bl_15019',
      mappings: [{ sourceKey: 'stock', targetField: 'stock_bl_15019' }],
      productId: 'product-1',
    });

    expect(result.warehouseId).toBe('bl_15019');
    expect(result.effectiveMappings).toEqual([
      {
        sourceKey: 'stock',
        targetField: 'stock_bl_15019',
      },
    ]);
  });

  it('clears invalid initial warehouse id and emits warning', async () => {
    fetchBaseWarehousesMock.mockResolvedValue([
      {
        id: '15019',
        name: 'Main',
        is_default: true,
        typedId: 'bl_15019',
      },
    ]);

    const result = await resolveWarehouseAndStockMappings({
      imagesOnly: false,
      token: 'token',
      targetInventoryId: 'inv-1',
      initialWarehouseId: '15020',
      mappings: [{ sourceKey: 'name', targetField: 'name' }],
      productId: 'product-1',
    });

    expect(result.warehouseId).toBeNull();
    expect(logWarningMock).toHaveBeenCalledWith(
      expect.stringContaining('Requested warehouse is not available'),
      expect.objectContaining({
        service: 'export-to-base.stock-segment',
        productId: 'product-1',
        inventoryId: 'inv-1',
        requestedWarehouseId: '15020',
      })
    );
  });
});
