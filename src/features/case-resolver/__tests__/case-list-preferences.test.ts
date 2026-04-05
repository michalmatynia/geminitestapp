import { describe, expect, it } from 'vitest';

import { normalizeCaseListViewDefaults } from '@/features/case-resolver/context/admin-cases/utils';
import type { UserPreferences } from '@/shared/contracts/auth';
import {
  normalizeUserPreferencesUpdatePayload,
  userPreferencesUpdateSchema,
} from '@/shared/validations/user-preferences';

describe('case list preferences', () => {
  it('defaults nested content visibility to true when preference is missing', () => {
    const defaults = normalizeCaseListViewDefaults(undefined);

    expect(defaults.showNestedContent).toBe(true);
  });

  it('respects explicit nested-content preference and falls back on invalid sort values', () => {
    const normalized = normalizeCaseListViewDefaults({
      caseResolverCaseListSortBy: 'unknown_sort_key',
      caseResolverCaseListShowNestedContent: false,
    } as unknown as UserPreferences);

    expect(normalized.sortBy).toBe('updated');
    expect(normalized.showNestedContent).toBe(false);
  });

  it('round-trips nested-content toggle through preferences update normalization', () => {
    const parsed = userPreferencesUpdateSchema.parse({
      caseResolverCaseListShowNestedContent: false,
    });
    const normalized = normalizeUserPreferencesUpdatePayload(parsed);

    expect(normalized.caseResolverCaseListShowNestedContent).toBe(false);
  });

  it('normalizes trimmed strings, arrays, page size, and color casing in preference updates', () => {
    const normalized = normalizeUserPreferencesUpdatePayload({
      productListCatalogFilter: '  summer  ',
      productListAppliedAdvancedFilter: '   ',
      productListAppliedAdvancedFilterPresetId: ' preset-1 ',
      productListPageSize: 999,
      productListDraftIconColor: '#ABCDEF',
      productListAdvancedFilterPresets: null,
      adminMenuFavorites: [' cases ', 'cases', ''],
      adminMenuSectionColors: null,
      adminMenuCustomNav: null,
      cmsThemeOpenSections: [' hero ', 'hero', ''],
      cmsThemeLogoUrl: '   ',
    });

    expect(normalized).toMatchObject({
      productListCatalogFilter: 'summer',
      productListAppliedAdvancedFilter: null,
      productListAppliedAdvancedFilterPresetId: 'preset-1',
      productListPageSize: 48,
      productListDraftIconColor: '#abcdef',
      productListAdvancedFilterPresets: [],
      adminMenuFavorites: ['cases'],
      adminMenuSectionColors: {},
      adminMenuCustomNav: [],
      cmsThemeOpenSections: ['hero'],
      cmsThemeLogoUrl: null,
    });
  });
});
