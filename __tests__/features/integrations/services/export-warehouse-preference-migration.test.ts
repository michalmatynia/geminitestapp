import { describe, expect, it } from 'vitest';

import {
  EXPORT_WAREHOUSE_SKIP_VALUE,
  stringifyExportWarehouseByInventoryMap,
} from '@/features/integrations/services/export-warehouse-preference';
import { migrateLegacyExportWarehousePreference } from '@/features/integrations/services/export-warehouse-preference-migration';

describe('export-warehouse-preference-migration', () => {
  it('migrates legacy fallback warehouse into default inventory mapping', () => {
    const migrated = migrateLegacyExportWarehousePreference({
      mapValueRaw: null,
      legacyWarehouseValueRaw: 'wh-legacy',
      defaultInventoryIdRaw: 'inv-1',
    });

    expect(migrated.changed).toBe(true);
    expect(migrated.legacyPayloadDetected).toBe(true);
    expect(migrated.migratedToInventoryId).toBe('inv-1');
    expect(migrated.map).toEqual({
      'inv-1': 'wh-legacy',
    });
  });

  it('keeps existing scoped value when legacy conflicts', () => {
    const migrated = migrateLegacyExportWarehousePreference({
      mapValueRaw: stringifyExportWarehouseByInventoryMap({
        'inv-1': 'wh-current',
      }),
      legacyWarehouseValueRaw: 'wh-legacy',
      defaultInventoryIdRaw: 'inv-1',
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.map).toEqual({
      'inv-1': 'wh-current',
    });
    expect(
      migrated.warnings.some((warning) => /conflicts with existing scoped mapping/i.test(warning))
    ).toBe(true);
  });

  it('reports warning when legacy fallback cannot be scoped', () => {
    const migrated = migrateLegacyExportWarehousePreference({
      mapValueRaw: stringifyExportWarehouseByInventoryMap({
        'inv-1': EXPORT_WAREHOUSE_SKIP_VALUE,
      }),
      legacyWarehouseValueRaw: 'wh-legacy',
      defaultInventoryIdRaw: null,
    });

    expect(migrated.changed).toBe(false);
    expect(migrated.migratedToInventoryId).toBeNull();
    expect(
      migrated.warnings.some((warning) => /default inventory is missing/i.test(warning))
    ).toBe(true);
  });
});
