import type {
  ProductSyncDirection,
  ProductSyncFieldRule,
} from '@/shared/contracts/product-sync';
import {
  getProductSyncBaseFieldPresentation,
} from '@/shared/contracts/product-sync';
import type { BaseImportWarehousesResponse } from '@/shared/contracts/integrations';
import type { BaseInventory, BaseWarehouse } from '@/shared/contracts/integrations/base-com';
import type { PriceGroup } from '@/shared/contracts/products/catalogs';

export type BulkSyncLabel = { primary: string; secondary: string | null };

export const directionLabel = (direction: ProductSyncDirection): string => {
  if (direction === 'app_to_base') return 'App -> Base';
  if (direction === 'base_to_app') return 'Base -> App';
  return 'Disabled';
};

export const formatLastRunAt = (value: string | null | undefined): string => {
  const normalized = (value ?? '').trim();
  if (normalized.length === 0) return 'Never';
  const ts = Date.parse(normalized);
  if (!Number.isFinite(ts)) return normalized;
  return new Date(ts).toLocaleString();
};

export const resolveConnectionLabel = (
  connectionId: string,
  connectionName: string | null | undefined
): BulkSyncLabel => {
  const name = (connectionName ?? '').trim();
  const id = connectionId.trim();
  if (name.length === 0) return { primary: id, secondary: null };
  return { primary: name, secondary: name === id ? null : id };
};

export const resolveInventoryLabel = (
  inventoryId: string,
  inventories: BaseInventory[]
): BulkSyncLabel => {
  const id = inventoryId.trim();
  const inv = inventories.find((item) => item.id === id);
  const name = inv?.name.trim() ?? '';
  if (name.length === 0) return { primary: id, secondary: null };
  return { primary: name, secondary: name === id ? null : id };
};

export const buildWarehouseLabelMap = (
  response: BaseImportWarehousesResponse | undefined
): Map<string, string> => {
  const map = new Map<string, string>();
  const records = [
    ...(Array.isArray(response?.warehouses) ? response.warehouses : []),
    ...(Array.isArray(response?.allWarehouses) ? response.allWarehouses : []),
  ];
  records.forEach((warehouse) => addWarehouseLabels(map, warehouse));
  return map;
};

const addWarehouseLabels = (map: Map<string, string>, warehouse: BaseWarehouse): void => {
  const id = warehouse.id.trim();
  const typedId = typeof warehouse.typedId === 'string' ? warehouse.typedId.trim() : '';
  if (id.length > 0 && !map.has(id)) map.set(id, `${warehouse.name} (${id})`);
  if (typedId.length > 0 && !map.has(typedId)) {
    map.set(typedId, `${warehouse.name} (${typedId})`);
  }
};

const normalizePriceGroups = (value: unknown): PriceGroup[] => {
  if (Array.isArray(value)) return value as PriceGroup[];
  if (value === null || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  if (Array.isArray(record['priceGroups'])) return record['priceGroups'] as PriceGroup[];
  if (Array.isArray(record['groups'])) return record['groups'] as PriceGroup[];
  if (Array.isArray(record['items'])) return record['items'] as PriceGroup[];
  if (Array.isArray(record['data'])) return record['data'] as PriceGroup[];
  return [];
};

export const buildPriceGroupLabelMap = (groups: unknown): Map<string, string> => {
  const map = new Map<string, string>();
  normalizePriceGroups(groups).forEach((group) => {
    const id = group.groupId.trim();
    if (id.length === 0 || map.has(id)) return;
    map.set(id, `${group.name} (${id})`);
  });
  return map;
};

const resolveMappedRuleTargetLabel = (
  id: string,
  labels: Map<string, string>
): string | null => {
  if (id.length === 0) return null;
  return labels.get(id) ?? null;
};

export const resolveRuleTargetLabel = (
  rule: ProductSyncFieldRule,
  warehouseLabels: Map<string, string>,
  priceGroupLabels: Map<string, string>
): string => {
  const base = rule.baseField.trim();
  if (rule.appField === 'stock' && base.startsWith('stock.')) {
    const label = resolveMappedRuleTargetLabel(base.slice('stock.'.length).trim(), warehouseLabels);
    if (label !== null) return label;
  }
  if (rule.appField === 'price' && base.startsWith('prices.')) {
    const label = resolveMappedRuleTargetLabel(base.slice('prices.'.length).trim(), priceGroupLabels);
    if (label !== null) return label;
  }
  return getProductSyncBaseFieldPresentation(rule.appField, rule.baseField).label;
};

export const summarizeDirectionRules = (
  directionRules: ProductSyncFieldRule[]
): {
  appToBaseCount: number;
  baseToAppCount: number;
  disabledCount: number;
} => ({
  appToBaseCount: directionRules.filter((rule) => rule.direction === 'app_to_base').length,
  baseToAppCount: directionRules.filter((rule) => rule.direction === 'base_to_app').length,
  disabledCount: directionRules.filter((rule) => rule.direction === 'disabled').length,
});
