import { fetchBaseWarehouses, normalizeStockKey } from '@/features/integrations/server';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

import { type BaseFieldMapping } from './common';

const inferTypedWarehouseId = (value: string): { typed: string; numeric: string } | null => {
  const match = value.match(/([a-z]+)[_-]?(\d+)/i);
  if (!match?.[1] || !match?.[2]) return null;
  const typed = `${match[1].toLowerCase()}_${match[2]}`;
  return { typed, numeric: match[2] };
};

const resolveWarehouseCandidate = (
  value: string,
  validWarehouseIds: Set<string>,
  aliases: Record<string, string> | null
): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const directAlias = aliases?.[trimmed];
  if (directAlias && validWarehouseIds.has(directAlias)) {
    return directAlias;
  }

  const normalized = normalizeStockKey(trimmed);
  if (normalized) {
    const aliased = aliases?.[normalized];
    if (aliased && validWarehouseIds.has(aliased)) return aliased;
    if (validWarehouseIds.has(normalized)) return normalized;
  }

  if (validWarehouseIds.has(trimmed)) return trimmed;

  return null;
};

const logWarehouseWarning = (message: string, context: Record<string, unknown>): void => {
  void ErrorSystem.logWarning(message, {
    service: 'export-to-base.stock-segment',
    ...context,
  });
};

export const resolveWarehouseAndStockMappings = async ({
  imagesOnly,
  token,
  targetInventoryId,
  initialWarehouseId,
  mappings,
  productId,
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
      for (const warehouse of warehouses) {
        const warehouseRecord = warehouse as Record<string, unknown>;
        const typedWarehouseId =
          typeof warehouseRecord['typedId'] === 'string' ? warehouseRecord['typedId'] : undefined;
        warehouseIdSet.add(warehouse['id']);
        const inferred = typedWarehouseId ?? inferTypedWarehouseId(warehouse['id'])?.typed;
        if (inferred) {
          warehouseIdSet.add(inferred);
          const numeric = inferTypedWarehouseId(inferred)?.numeric;
          if (numeric) {
            warehouseAliases[numeric] = inferred;
          }
          if (inferred !== warehouse['id']) {
            warehouseAliases[warehouse['id']] = inferred;
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
    } catch (error) {
      void ErrorSystem.captureException(error);
      logWarehouseWarning(
        '[export-to-base] Failed to fetch inventory warehouses; skipping warehouse validation.',
        {
          productId,
          inventoryId: targetInventoryId,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  let effectiveMappings = mappings;
  if (!imagesOnly && validWarehouseIds) {
    const droppedStockMappings = new Set<string>();

    if (warehouseId) {
      const requestedWarehouseId = warehouseId;
      warehouseId = resolveWarehouseCandidate(
        warehouseId,
        validWarehouseIds,
        stockWarehouseAliases
      );
      if (!warehouseId) {
        logWarehouseWarning(
          '[export-to-base] Requested warehouse is not available in target inventory; clearing warehouse.',
          {
            productId,
            inventoryId: targetInventoryId,
            requestedWarehouseId,
            availableWarehouseCount: validWarehouseIds.size,
          }
        );
      }
    }

    const warehouseIdMapping = mappings.find(
      (m) => String(m['targetField']).toLowerCase() === 'warehouse_id'
    );
    if (warehouseIdMapping) {
      const mappedValue = String(warehouseIdMapping['sourceKey'] || '').trim();
      if (mappedValue) {
        const resolvedMappedValue = resolveWarehouseCandidate(
          mappedValue,
          validWarehouseIds,
          stockWarehouseAliases
        );
        if (resolvedMappedValue) {
          warehouseId = resolvedMappedValue;
        } else {
          logWarehouseWarning(
            '[export-to-base] Template warehouse_id mapping does not exist in target inventory; ignoring mapped warehouse.',
            {
              productId,
              inventoryId: targetInventoryId,
              mappedWarehouseId: mappedValue,
              availableWarehouseCount: validWarehouseIds.size,
            }
          );
        }
      }
    }

    effectiveMappings = mappings
      .map((mapping) => {
        const targetField = String(mapping['targetField'] || '').toLowerCase();
        if (!targetField.startsWith('stock_')) {
          return mapping;
        }
        const rawKey = targetField.replace(/^stock_/, '');
        const normalized = normalizeStockKey(rawKey);
        if (!normalized) {
          return null;
        }
        const aliased = stockWarehouseAliases?.[normalized] ?? normalized;
        const resolvedStockKey = validWarehouseIds.has(aliased)
          ? aliased
          : validWarehouseIds.has(normalized)
            ? normalized
            : null;
        if (!resolvedStockKey) {
          droppedStockMappings.add(rawKey);
          return null;
        }
        if (resolvedStockKey !== rawKey) {
          return { ...mapping, targetField: `stock_${resolvedStockKey}` };
        }
        return mapping;
      })
      .filter((mapping): mapping is BaseFieldMapping => Boolean(mapping));

    if (droppedStockMappings.size > 0) {
      logWarehouseWarning(
        '[export-to-base] Dropped stock_* mappings that are not valid for target inventory.',
        {
          productId,
          inventoryId: targetInventoryId,
          droppedStockMappings: Array.from(droppedStockMappings),
          availableWarehouseCount: validWarehouseIds.size,
        }
      );
    }
  }

  return {
    warehouseId,
    stockWarehouseAliases,
    effectiveMappings,
  };
};
