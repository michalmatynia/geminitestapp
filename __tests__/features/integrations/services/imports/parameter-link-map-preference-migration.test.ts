import { describe, expect, it } from 'vitest';

import { parseLegacyCompatibleScopedCatalogParameterLinkMap } from '../../../../../scripts/db/lib/integrations/link-map-preference-migration';
import { stringifyScopedCatalogParameterLinkMap } from '@/features/integrations/services/imports/parameter-import/link-map-preference';

describe('parameter-link-map-preference-migration', () => {
  it('converts legacy __global__ and scoped buckets into canonical payload', () => {
    const migrated = parseLegacyCompatibleScopedCatalogParameterLinkMap(
      JSON.stringify({
        __global__: {
          'cat-1': {
            'base-1': 'param-1',
          },
        },
        'conn-1::inv-1': {
          'cat-2': {
            'base-2': 'param-2',
          },
        },
      })
    );

    expect(migrated.legacyPayloadDetected).toBe(true);
    expect(migrated.map).toEqual({
      defaultByCatalog: {
        'cat-1': {
          'base-1': 'param-1',
        },
      },
      byScope: {
        'conn-1::inv-1': {
          'cat-2': {
            'base-2': 'param-2',
          },
        },
      },
    });
  });

  it('converts flat legacy catalog buckets into canonical defaultByCatalog', () => {
    const migrated = parseLegacyCompatibleScopedCatalogParameterLinkMap(
      JSON.stringify({
        'cat-1': {
          'base-1': 'param-1',
        },
      })
    );

    expect(migrated.legacyPayloadDetected).toBe(true);
    expect(migrated.map).toEqual({
      defaultByCatalog: {
        'cat-1': {
          'base-1': 'param-1',
        },
      },
      byScope: {},
    });
    expect(migrated.warnings.some((warning) => /converted flat legacy catalog bucket/i.test(warning))).toBe(
      true
    );
  });

  it('keeps canonical payload unchanged and does not mark legacy', () => {
    const raw = JSON.stringify({
      defaultByCatalog: {
        'cat-1': {
          'base-1': 'param-1',
        },
      },
      byScope: {
        'conn-1::inv-1': {
          'cat-2': {
            'base-2': 'param-2',
          },
        },
      },
    });
    const migrated = parseLegacyCompatibleScopedCatalogParameterLinkMap(raw);

    expect(migrated.legacyPayloadDetected).toBe(false);
    expect(stringifyScopedCatalogParameterLinkMap(migrated.map)).toBe(raw);
  });
});
