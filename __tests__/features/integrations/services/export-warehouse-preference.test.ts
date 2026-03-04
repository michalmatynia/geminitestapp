import { describe, expect, it } from 'vitest';

import {
  EXPORT_WAREHOUSE_SKIP_VALUE,
  parseExportWarehouseByInventoryMap,
  stringifyExportWarehouseByInventoryMap,
} from '@/features/integrations/services/export-warehouse-preference';

describe('export-warehouse-preference', () => {
  it('parses canonical scoped warehouse map', () => {
    expect(
      parseExportWarehouseByInventoryMap(
        JSON.stringify({
          invA: 'whA',
          invB: EXPORT_WAREHOUSE_SKIP_VALUE,
        })
      )
    ).toEqual({
      invA: 'whA',
      invB: EXPORT_WAREHOUSE_SKIP_VALUE,
    });
  });

  it('drops invalid entries from payload', () => {
    expect(
      parseExportWarehouseByInventoryMap(
        JSON.stringify({
          ' ': 'whA',
          invA: '',
          invB: null,
          invC: 'whC',
        })
      )
    ).toEqual({
      invC: 'whC',
    });
  });

  it('stringifies map in sorted key order', () => {
    expect(
      stringifyExportWarehouseByInventoryMap({
        invB: 'whB',
        invA: 'whA',
      })
    ).toBe(
      JSON.stringify({
        invA: 'whA',
        invB: 'whB',
      })
    );
  });
});
