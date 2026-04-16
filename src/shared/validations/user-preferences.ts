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

const applyNormalizedPreference = <TKey extends keyof UserPreferencesUpdatePayload>(
  target: Partial<UserPreferencesUpdatePayload>,
  key: TKey,
  value: UserPreferencesUpdatePayload[TKey] | undefined
): void => {
  if (value !== undefined) {
    // eslint-disable-next-line no-param-reassign
    target[key] = value;
  }
};

const normalizeProductListPageSize = (value: number | null): number | null =>
  value === null ? null : normalizeProductPageSize(value, 12);

const normalizeDraftIconColor = (value: string | null): string | null =>
  typeof value === 'string' ? value.toLowerCase() : value;

const normalizeNullableArray = <T>(value: T[] | null): T[] => value ?? [];

const normalizeNullableRecord = <T extends Record<string, unknown>>(value: T | null): T =>
  value ?? ({} as unknown as T);

const normalizeAdminMenuCustomNav = <T>(value: T | null): T | [] => value ?? [];

const normalizeProductListPreferences = (
  payload: UserPreferencesUpdatePayload,
  normalized: Partial<UserPreferencesUpdatePayload>
): void => {
  applyNormalizedPreference(normalized, 'productListNameLocale', payload.productListNameLocale);
  applyNormalizedPreference(
    normalized,
    'productListCatalogFilter',
    resolveDefinedValue(payload.productListCatalogFilter, normalizeNullableString)
  );
  applyNormalizedPreference(
    normalized,
    'productListCurrencyCode',
    resolveDefinedValue(payload.productListCurrencyCode, normalizeNullableString)
  );
  applyNormalizedPreference(
    normalized,
    'productListPageSize',
    resolveDefinedValue(payload.productListPageSize, normalizeProductListPageSize)
  );
  applyNormalizedPreference(normalized, 'productListThumbnailSource', payload.productListThumbnailSource);
  applyNormalizedPreference(normalized, 'productListFiltersCollapsedByDefault', payload.productListFiltersCollapsedByDefault);
  applyNormalizedPreference(normalized, 'productListShowTriggerRunFeedback', payload.productListShowTriggerRunFeedback);
  applyNormalizedPreference(
    normalized,
    'productListAdvancedFilterPresets',
    resolveDefinedValue(payload.productListAdvancedFilterPresets, normalizeNullableArray)
  );
  applyNormalizedPreference(
    normalized,
    'productListAppliedAdvancedFilter',
    resolveDefinedValue(payload.productListAppliedAdvancedFilter, normalizeNullableString)
  );
  applyNormalizedPreference(
    normalized,
    'productListAppliedAdvancedFilterPresetId',
    resolveDefinedValue(payload.productListAppliedAdvancedFilterPresetId, normalizeNullableString)
  );
  applyNormalizedPreference(normalized, 'productListDraftIconColorMode', payload.productListDraftIconColorMode);
  applyNormalizedPreference(
    normalized,
    'productListDraftIconColor',
    resolveDefinedValue(payload.productListDraftIconColor, normalizeDraftIconColor)
  );
};

const normalizeCaseResolverPreferences = (
  payload: UserPreferencesUpdatePayload,
  normalized: Partial<UserPreferencesUpdatePayload>
): void => {
  applyNormalizedPreference(
    normalized,
    'caseResolverCaseListViewMode',
    payload.caseResolverCaseListViewMode
  );
  applyNormalizedPreference(
    normalized,
    'caseResolverCaseListSortBy',
    payload.caseResolverCaseListSortBy
  );
  applyNormalizedPreference(
    normalized,
    'caseResolverCaseListSortOrder',
    payload.caseResolverCaseListSortOrder
  );
  applyNormalizedPreference(
    normalized,
    'caseResolverCaseListSearchScope',
    payload.caseResolverCaseListSearchScope
  );
  applyNormalizedPreference(
    normalized,
    'caseResolverCaseListFiltersCollapsedByDefault',
    payload.caseResolverCaseListFiltersCollapsedByDefault
  );
  applyNormalizedPreference(
    normalized,
    'caseResolverCaseListShowNestedContent',
    payload.caseResolverCaseListShowNestedContent
  );
};

const normalizeAdminMenuPreferences = (
  payload: UserPreferencesUpdatePayload,
  normalized: Partial<UserPreferencesUpdatePayload>
): void => {
  applyNormalizedPreference(normalized, 'adminMenuCollapsed', payload.adminMenuCollapsed);
  applyNormalizedPreference(
    normalized,
    'adminMenuFavorites',
    resolveDefinedValue(payload.adminMenuFavorites, normalizeStringArray)
  );
  applyNormalizedPreference(
    normalized,
    'adminMenuSectionColors',
    resolveDefinedValue(payload.adminMenuSectionColors, normalizeNullableRecord)
  );
  applyNormalizedPreference(
    normalized,
    'adminMenuCustomEnabled',
    payload.adminMenuCustomEnabled
  );
  applyNormalizedPreference(
    normalized,
    'adminMenuCustomNav',
    resolveDefinedValue(payload.adminMenuCustomNav, normalizeAdminMenuCustomNav)
  );
};

const normalizeCmsPreferences = (
  payload: UserPreferencesUpdatePayload,
  normalized: Partial<UserPreferencesUpdatePayload>
): void => {
  applyNormalizedPreference(normalized, 'cmsLastPageId', payload.cmsLastPageId);
  applyNormalizedPreference(normalized, 'cmsActiveDomainId', payload.cmsActiveDomainId);
  applyNormalizedPreference(
    normalized,
    'cmsThemeOpenSections',
    resolveDefinedValue(payload.cmsThemeOpenSections, normalizeStringArray)
  );
  applyNormalizedPreference(normalized, 'cmsThemeLogoWidth', payload.cmsThemeLogoWidth);
  applyNormalizedPreference(
    normalized,
    'cmsThemeLogoUrl',
    resolveDefinedValue(payload.cmsThemeLogoUrl, normalizeNullableString)
  );
  applyNormalizedPreference(normalized, 'cmsPreviewEnabled', payload.cmsPreviewEnabled);
  applyNormalizedPreference(
    normalized,
    'cmsSlideshowPauseOnHoverInEditor',
    payload.cmsSlideshowPauseOnHoverInEditor
  );
};

export const normalizeUserPreferencesUpdatePayload = (
  payload: UserPreferencesUpdatePayload
): Partial<UserPreferencesUpdatePayload> => {
  const normalized: Partial<UserPreferencesUpdatePayload> = {};

  normalizeProductListPreferences(payload, normalized);
  applyNormalizedPreference(normalized, 'aiPathsActivePathId', payload.aiPathsActivePathId);
  applyNormalizedPreference(
    normalized,
    'imageStudioLastProjectId',
    payload.imageStudioLastProjectId
  );
  normalizeCaseResolverPreferences(payload, normalized);
  normalizeAdminMenuPreferences(payload, normalized);
  normalizeCmsPreferences(payload, normalized);

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
