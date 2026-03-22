import { describe, expect, it } from 'vitest';

import {
  loginSchema,
  registerSchema,
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
        productListShowTriggerRunFeedback: true,
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
        productListShowTriggerRunFeedback: false,
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

  it('parses shared auth request payload schemas used by auth routes', () => {
    expect(
      registerSchema.parse({
        email: ' user@example.com ',
        password: 'Secret123!',
        name: ' Test User ',
      }).email
    ).toBe('user@example.com');

    expect(
      loginSchema.parse({
        email: ' user@example.com ',
        password: 'Secret123!',
        authFlow: ' kangur_parent ',
      }).authFlow
    ).toBe('kangur_parent');
  });
});
