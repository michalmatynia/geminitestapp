import type { BaseImportInventoriesResponse } from '@/shared/contracts/integrations/import-export';

export const normalizeInventoryId = (value: string | null | undefined): string =>
  typeof value === 'string' ? value.trim() : '';

const readInventoryCandidates = (
  inventories: BaseImportInventoriesResponse['inventories'] | null | undefined
): Array<{ id: string; isDefault: boolean }> =>
  (Array.isArray(inventories) ? inventories : [])
    .map((entry) => ({
      id: normalizeInventoryId(entry.id),
      isDefault: entry.is_default === true,
    }))
    .filter((entry) => entry.id.length > 0);

export const resolveFallbackInventoryId = (
  inventories: BaseImportInventoriesResponse['inventories'] | null | undefined
): string => {
  const normalizedInventories = readInventoryCandidates(inventories);
  const defaultInventory = normalizedInventories.find((entry) => entry.isDefault === true);
  if (defaultInventory !== undefined) return defaultInventory.id;
  if (normalizedInventories.length !== 1) return '';
  return normalizedInventories[0]?.id ?? '';
};
