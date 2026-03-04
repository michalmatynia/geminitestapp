import {
  EXPORT_WAREHOUSE_SKIP_VALUE,
  parseExportWarehouseByInventoryMap,
  type ExportWarehouseByInventoryMap,
} from '@/features/integrations/services/export-warehouse-preference';

export type ExportWarehousePreferenceMigrationInput = {
  mapValueRaw: string | null;
  legacyWarehouseValueRaw: string | null;
  defaultInventoryIdRaw: string | null;
};

export type ExportWarehousePreferenceMigrationResult = {
  map: ExportWarehouseByInventoryMap;
  changed: boolean;
  legacyPayloadDetected: boolean;
  legacyWarehouseId: string | null;
  defaultInventoryId: string | null;
  migratedToInventoryId: string | null;
  warnings: string[];
};

const normalizeOptionalId = (value: string | null): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const migrateLegacyExportWarehousePreference = (
  input: ExportWarehousePreferenceMigrationInput
): ExportWarehousePreferenceMigrationResult => {
  const warnings: string[] = [];
  const map = parseExportWarehouseByInventoryMap(input.mapValueRaw);
  let changed = false;
  let migratedToInventoryId: string | null = null;

  const legacyWarehouseId = normalizeOptionalId(input.legacyWarehouseValueRaw);
  const defaultInventoryId = normalizeOptionalId(input.defaultInventoryIdRaw);

  let legacyPayloadDetected = false;
  if (legacyWarehouseId) {
    legacyPayloadDetected = true;
    if (!defaultInventoryId) {
      warnings.push(
        'Legacy export warehouse fallback exists but default inventory is missing; could not migrate to scoped map.'
      );
    } else {
      const existing = map[defaultInventoryId];
      if (!existing || existing === EXPORT_WAREHOUSE_SKIP_VALUE) {
        map[defaultInventoryId] = legacyWarehouseId;
        changed = true;
        migratedToInventoryId = defaultInventoryId;
      } else if (existing !== legacyWarehouseId) {
        warnings.push(
          `Legacy warehouse "${legacyWarehouseId}" conflicts with existing scoped mapping for inventory "${defaultInventoryId}"; keeping scoped value "${existing}".`
        );
      }
    }
  }

  return {
    map,
    changed,
    legacyPayloadDetected,
    legacyWarehouseId,
    defaultInventoryId,
    migratedToInventoryId,
    warnings,
  };
};
