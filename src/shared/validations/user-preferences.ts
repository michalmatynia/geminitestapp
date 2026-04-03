import type { UserPreferencesResponse, UserPreferencesUpdatePayload } from '@/shared/contracts/auth';
import {
  USER_PREFERENCES_HEX_COLOR_PATTERN,
  userPreferencesResponseSchema,
  userPreferencesUpdateSchema,
} from '@/shared/contracts/auth';
import { normalizeProductPageSize } from '@/shared/lib/products/constants';
export {
  USER_PREFERENCES_HEX_COLOR_PATTERN,
  userPreferencesResponseSchema,
  userPreferencesUpdateSchema,
};
export type { UserPreferencesResponse, UserPreferencesUpdatePayload };

const normalizeNullableString = (value: string | null): string | null => {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeStringArray = (value: string[] | null): string[] => {
  if (value === null) return [];
  const normalized = value
    .map((entry: string) => entry.trim())
    .filter((entry: string) => entry.length > 0);
  return Array.from(new Set(normalized));
};

const resolveDefinedValue = <TInput, TOutput>(
  value: TInput | undefined,
  normalizer: (value: TInput) => TOutput
): TOutput | undefined => (value === undefined ? undefined : normalizer(value));

const setNormalizedPreference = <TKey extends keyof UserPreferencesUpdatePayload>(
  normalized: Partial<UserPreferencesUpdatePayload>,
  key: TKey,
  value: UserPreferencesUpdatePayload[TKey] | undefined
): void => {
  if (value !== undefined) {
    normalized[key] = value;
  }
};

const normalizeProductListPageSize = (value: number | null): number | null =>
  value === null ? null : normalizeProductPageSize(value, 12);

const normalizeDraftIconColor = (value: string | null): string | null =>
  typeof value === 'string' ? value.toLowerCase() : value;

const normalizeNullableArray = <T>(value: T[] | null): T[] => value ?? [];

const normalizeNullableRecord = <T extends Record<string, unknown>>(value: T | null): T =>
  value ?? ({} as T);

export const normalizeUserPreferencesUpdatePayload = (
  payload: UserPreferencesUpdatePayload
): Partial<UserPreferencesUpdatePayload> => {
  const normalized: Partial<UserPreferencesUpdatePayload> = {};

  setNormalizedPreference(normalized, 'productListNameLocale', payload.productListNameLocale);
  setNormalizedPreference(
    normalized,
    'productListCatalogFilter',
    resolveDefinedValue(payload.productListCatalogFilter, normalizeNullableString)
  );
  setNormalizedPreference(
    normalized,
    'productListCurrencyCode',
    resolveDefinedValue(payload.productListCurrencyCode, normalizeNullableString)
  );
  setNormalizedPreference(
    normalized,
    'productListPageSize',
    resolveDefinedValue(payload.productListPageSize, normalizeProductListPageSize)
  );
  setNormalizedPreference(
    normalized,
    'productListThumbnailSource',
    payload.productListThumbnailSource
  );
  setNormalizedPreference(
    normalized,
    'productListFiltersCollapsedByDefault',
    payload.productListFiltersCollapsedByDefault
  );
  setNormalizedPreference(
    normalized,
    'productListShowTriggerRunFeedback',
    payload.productListShowTriggerRunFeedback
  );
  setNormalizedPreference(
    normalized,
    'productListAdvancedFilterPresets',
    resolveDefinedValue(payload.productListAdvancedFilterPresets, normalizeNullableArray)
  );
  setNormalizedPreference(
    normalized,
    'productListAppliedAdvancedFilter',
    resolveDefinedValue(payload.productListAppliedAdvancedFilter, normalizeNullableString)
  );
  setNormalizedPreference(
    normalized,
    'productListAppliedAdvancedFilterPresetId',
    resolveDefinedValue(payload.productListAppliedAdvancedFilterPresetId, normalizeNullableString)
  );
  setNormalizedPreference(
    normalized,
    'productListDraftIconColorMode',
    payload.productListDraftIconColorMode
  );
  setNormalizedPreference(
    normalized,
    'productListDraftIconColor',
    resolveDefinedValue(payload.productListDraftIconColor, normalizeDraftIconColor)
  );
  setNormalizedPreference(normalized, 'aiPathsActivePathId', payload.aiPathsActivePathId);
  setNormalizedPreference(
    normalized,
    'imageStudioLastProjectId',
    payload.imageStudioLastProjectId
  );
  setNormalizedPreference(
    normalized,
    'caseResolverCaseListViewMode',
    payload.caseResolverCaseListViewMode
  );
  setNormalizedPreference(
    normalized,
    'caseResolverCaseListSortBy',
    payload.caseResolverCaseListSortBy
  );
  setNormalizedPreference(
    normalized,
    'caseResolverCaseListSortOrder',
    payload.caseResolverCaseListSortOrder
  );
  setNormalizedPreference(
    normalized,
    'caseResolverCaseListSearchScope',
    payload.caseResolverCaseListSearchScope
  );
  setNormalizedPreference(
    normalized,
    'caseResolverCaseListFiltersCollapsedByDefault',
    payload.caseResolverCaseListFiltersCollapsedByDefault
  );
  setNormalizedPreference(
    normalized,
    'caseResolverCaseListShowNestedContent',
    payload.caseResolverCaseListShowNestedContent
  );
  setNormalizedPreference(normalized, 'adminMenuCollapsed', payload.adminMenuCollapsed);
  setNormalizedPreference(
    normalized,
    'adminMenuFavorites',
    resolveDefinedValue(payload.adminMenuFavorites, normalizeStringArray)
  );
  setNormalizedPreference(
    normalized,
    'adminMenuSectionColors',
    resolveDefinedValue(payload.adminMenuSectionColors, normalizeNullableRecord)
  );
  setNormalizedPreference(
    normalized,
    'adminMenuCustomEnabled',
    payload.adminMenuCustomEnabled
  );
  setNormalizedPreference(
    normalized,
    'adminMenuCustomNav',
    payload.adminMenuCustomNav
  );
  setNormalizedPreference(normalized, 'cmsLastPageId', payload.cmsLastPageId);
  setNormalizedPreference(normalized, 'cmsActiveDomainId', payload.cmsActiveDomainId);
  setNormalizedPreference(
    normalized,
    'cmsThemeOpenSections',
    resolveDefinedValue(payload.cmsThemeOpenSections, normalizeStringArray)
  );
  setNormalizedPreference(normalized, 'cmsThemeLogoWidth', payload.cmsThemeLogoWidth);
  setNormalizedPreference(
    normalized,
    'cmsThemeLogoUrl',
    resolveDefinedValue(payload.cmsThemeLogoUrl, normalizeNullableString)
  );
  setNormalizedPreference(normalized, 'cmsPreviewEnabled', payload.cmsPreviewEnabled);
  setNormalizedPreference(
    normalized,
    'cmsSlideshowPauseOnHoverInEditor',
    payload.cmsSlideshowPauseOnHoverInEditor
  );

  return normalized;
};

export const parseUserPreferencesUpdatePayload = (
  payload: unknown
): Partial<UserPreferencesUpdatePayload> => {
  const parsed = userPreferencesUpdateSchema.parse(payload);
  return normalizeUserPreferencesUpdatePayload(parsed);
};

export const normalizeUserPreferencesResponse = (payload: unknown): UserPreferencesResponse => {
  const parsed = userPreferencesResponseSchema.safeParse(payload);
  if (!parsed.success) return {};
  return parsed.data;
};
