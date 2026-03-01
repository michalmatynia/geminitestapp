import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchBaseWarehousesMock } = vi.hoisted(() => ({
  fetchBaseWarehousesMock: vi.fn(),
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

import { resolveWarehouseAndStockMappings } from '@/app/api/integrations/products/[id]/export-to-base/segments/stock';

describe('resolveWarehouseAndStockMappings', () => {
  beforeEach(() => {
    fetchBaseWarehousesMock.mockReset();
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
});
