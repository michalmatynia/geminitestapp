import { describe, expect, it } from 'vitest';

import {
  userPreferencesResponseSchema,
  userPreferencesUpdateSchema,
} from '@/shared/contracts/auth';

describe('auth user preferences contract runtime', () => {
  it('parses user preferences api responses with optional admin-menu fields omitted', () => {
    expect(
      userPreferencesResponseSchema.parse({
        productListNameLocale: 'name_en',
        productListCatalogFilter: 'all',
        productListCurrencyCode: 'PLN',
        productListPageSize: 24,
        productListThumbnailSource: 'file',
        productListAppliedAdvancedFilter: '{"type":"group"}',
        productListAppliedAdvancedFilterPresetId: 'preset-1',
        cmsPreviewEnabled: false,
      }).productListAppliedAdvancedFilterPresetId
    ).toBe('preset-1');
  });

  it('parses user preferences patch payloads and rejects invalid colors', () => {
    expect(
      userPreferencesUpdateSchema.parse({
        productListAppliedAdvancedFilter: '  {"type":"group"}  ',
        aiPathsActivePathId: ' path-1 ',
        cmsThemeOpenSections: ['hero', 'footer'],
      }).aiPathsActivePathId
    ).toBe('path-1');

    expect(() =>
      userPreferencesUpdateSchema.parse({
        productListDraftIconColor: '#fff',
      })
    ).toThrow();
  });
});
