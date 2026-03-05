import type { AiPathsCollectionMap as ExportWarehouseByInventoryMap } from '@/shared/lib/ai-paths/core/utils/collection-mapping';

export const EXPORT_WAREHOUSE_SKIP_VALUE = '__skip__';

export type { ExportWarehouseByInventoryMap };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const toNormalizedString = (value: unknown): string => {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
};

export const parseExportWarehouseByInventoryMap = (
  value: string | null
): ExportWarehouseByInventoryMap => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }
    const result: ExportWarehouseByInventoryMap = {};
    Object.entries(parsed).forEach(([inventoryId, rawWarehouse]: [string, unknown]) => {
      const normalizedInventoryId = inventoryId.trim();
      if (!normalizedInventoryId) return;
      const normalizedWarehouse = toNormalizedString(rawWarehouse);
      if (!normalizedWarehouse) return;
      if (normalizedWarehouse === EXPORT_WAREHOUSE_SKIP_VALUE) {
        result[normalizedInventoryId] = EXPORT_WAREHOUSE_SKIP_VALUE;
        return;
      }
      result[normalizedInventoryId] = normalizedWarehouse;
    });
    return result;
  } catch {
    return {};
  }
};

export const stringifyExportWarehouseByInventoryMap = (
  map: ExportWarehouseByInventoryMap
): string => {
  const normalized = parseExportWarehouseByInventoryMap(JSON.stringify(map));
  const sorted = Object.keys(normalized)
    .sort((left: string, right: string) => left.localeCompare(right))
    .reduce((acc: ExportWarehouseByInventoryMap, inventoryId: string) => {
      acc[inventoryId] = normalized[inventoryId] as string;
      return acc;
    }, {});
  return JSON.stringify(sorted);
};
