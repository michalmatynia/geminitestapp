import { describe, expect, it } from 'vitest';

import {
  buildProductSyncProfileDeleteResponse,
  buildProductSyncProfilePatch,
  requireExistingProductSyncProfile,
  requireProductSyncProfileId,
} from './handler.helpers';

describe('product-sync profile-by-id handler helpers', () => {
  it('requires a trimmed profile id', () => {
    expect(requireProductSyncProfileId({ id: ' profile-1 ' })).toBe('profile-1');
    expect(() => requireProductSyncProfileId({ id: '   ' })).toThrow('Invalid route parameters');
  });

  it('builds a defined-only patch and backfills missing field-rule ids', () => {
    expect(
      buildProductSyncProfilePatch(
        {
          isDefault: true,
          enabled: true,
          fieldRules: [
            {
              appField: 'stock',
              baseField: 'stock',
              direction: 'base_to_app',
            },
            {
              id: 'rule-2',
              appField: 'sku',
              baseField: 'sku',
              direction: 'disabled',
            },
          ],
        },
        () => 'generated-rule-id'
      )
    ).toEqual({
      isDefault: true,
      enabled: true,
      fieldRules: [
        {
          id: 'generated-rule-id',
          appField: 'stock',
          baseField: 'stock',
          direction: 'base_to_app',
        },
        {
          id: 'rule-2',
          appField: 'sku',
          baseField: 'sku',
          direction: 'disabled',
        },
      ],
    });
  });

  it('requires an existing profile and builds the delete response', () => {
    expect(requireExistingProductSyncProfile({ id: 'profile-1' }, 'profile-1')).toEqual({
      id: 'profile-1',
    });
    expect(() => requireExistingProductSyncProfile(null, 'profile-1')).toThrow(
      'Sync profile not found.'
    );
    expect(buildProductSyncProfileDeleteResponse()).toEqual({ ok: true });
  });
});
