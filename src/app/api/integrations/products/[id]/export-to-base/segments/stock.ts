import {
  fetchBaseWarehouses,
  normalizeStockKey,
} from '@/features/integrations/server';
import { type BaseFieldMapping } from './common';

export const resolveWarehouseAndStockMappings = async ({
  imagesOnly,
  token,
  targetInventoryId,
  initialWarehouseId,
  mappings,
  productId: _productId,
}: {
  imagesOnly: boolean;
  token: string;
  targetInventoryId: string;
  initialWarehouseId: string | null;
  mappings: BaseFieldMapping[];
  productId: string;
}): Promise<{
  warehouseId: string | null;
  stockWarehouseAliases: Record<string, string> | null;
  effectiveMappings: BaseFieldMapping[];
}> => {
  let warehouseId = initialWarehouseId;
  let stockWarehouseAliases: Record<string, string> | null = null;
  let validWarehouseIds: Set<string> | null = null;

  if (!imagesOnly) {
    try {
      const warehouses = await fetchBaseWarehouses(token, targetInventoryId);
      const warehouseIdSet = new Set<string>();
      const warehouseAliases: Record<string, string> = {};
      const inferTypedWarehouseId = (value: string) => {
        const match = value.match(/([a-z]+)[_-]?(\d+)/i);
        if (!match?.[1] || !match?.[2]) return null;
        const typed = `${match[1].toLowerCase()}_${match[2]}`;
        return { typed, numeric: match[2] };
      };
      for (const warehouse of warehouses) {
        const warehouseRecord = warehouse as Record<string, unknown>;
        const typedWarehouseId =
          typeof warehouseRecord['typedId'] === 'string' ? warehouseRecord['typedId'] : undefined;
        warehouseIdSet.add(warehouse['id']);
        const inferred = typedWarehouseId ?? inferTypedWarehouseId(warehouse['id'])?.typed;
        if (inferred) {
          warehouseIdSet.add(inferred);
          if (inferred !== warehouse['id']) {
            const numeric = inferTypedWarehouseId(inferred)?.numeric;
            if (numeric) {
              warehouseAliases[numeric] = inferred;
            } else {
              warehouseAliases[warehouse['id']] = inferred;
            }
          }
        }
        if (typedWarehouseId && typedWarehouseId !== warehouse['id']) {
          warehouseAliases[warehouse['id']] = typedWarehouseId;
        }
      }
      validWarehouseIds = warehouseIdSet;
      if (Object.keys(warehouseAliases).length > 0) {
        stockWarehouseAliases = warehouseAliases;
      }
    } catch {
      // skip warehouse validation on API failure
    }
  }

  let effectiveMappings = mappings;
  if (!imagesOnly && validWarehouseIds) {
    const warehouseIdMapping = mappings.find(
      (m) => String(m['targetField']).toLowerCase() === 'warehouse_id'
    );
    if (warehouseIdMapping) {
      const mappedValue = String(warehouseIdMapping['sourceKey'] || '').trim();
      if (mappedValue && (validWarehouseIds.has(mappedValue) || /^\d+$/.test(mappedValue))) {
        warehouseId = mappedValue;
      }
    }

    effectiveMappings = mappings.map((mapping) => {
      const targetField = String(mapping['targetField'] || '').toLowerCase();
      if (targetField.startsWith('stock_')) {
        const rawKey = targetField.replace(/^stock_/, '');
        const normalized = normalizeStockKey(rawKey);
        if (normalized !== rawKey) {
          return { ...mapping, targetField: `stock_${normalized}` };
        }
      }
      return mapping;
    });
  }

  return {
    warehouseId,
    stockWarehouseAliases,
    effectiveMappings,
  };
};
