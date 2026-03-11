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

export const normalizeUserPreferencesUpdatePayload = (
  payload: UserPreferencesUpdatePayload
): Partial<UserPreferencesUpdatePayload> => {
  const normalized: Partial<UserPreferencesUpdatePayload> = {};

  if (payload.productListNameLocale !== undefined) {
    normalized.productListNameLocale = payload.productListNameLocale;
  }
  if (payload.productListCatalogFilter !== undefined) {
    normalized.productListCatalogFilter = normalizeNullableString(payload.productListCatalogFilter);
  }
  if (payload.productListCurrencyCode !== undefined) {
    normalized.productListCurrencyCode = normalizeNullableString(payload.productListCurrencyCode);
  }
  if (payload.productListPageSize !== undefined) {
    normalized.productListPageSize =
      payload.productListPageSize === null
        ? null
        : normalizeProductPageSize(payload.productListPageSize, 12);
  }
  if (payload.productListThumbnailSource !== undefined) {
    normalized.productListThumbnailSource = payload.productListThumbnailSource;
  }
  if (payload.productListFiltersCollapsedByDefault !== undefined) {
    normalized.productListFiltersCollapsedByDefault = payload.productListFiltersCollapsedByDefault;
  }
  if (payload.productListShowTriggerRunFeedback !== undefined) {
    normalized.productListShowTriggerRunFeedback = payload.productListShowTriggerRunFeedback;
  }
  if (payload.productListAdvancedFilterPresets !== undefined) {
    normalized.productListAdvancedFilterPresets = payload.productListAdvancedFilterPresets ?? [];
  }
  if (payload.productListAppliedAdvancedFilter !== undefined) {
    normalized.productListAppliedAdvancedFilter = normalizeNullableString(
      payload.productListAppliedAdvancedFilter
    );
  }
  if (payload.productListAppliedAdvancedFilterPresetId !== undefined) {
    normalized.productListAppliedAdvancedFilterPresetId = normalizeNullableString(
      payload.productListAppliedAdvancedFilterPresetId
    );
  }
  if (payload.productListDraftIconColorMode !== undefined) {
    normalized.productListDraftIconColorMode = payload.productListDraftIconColorMode;
  }
  if (payload.productListDraftIconColor !== undefined) {
    normalized.productListDraftIconColor =
      typeof payload.productListDraftIconColor === 'string'
        ? payload.productListDraftIconColor.toLowerCase()
        : payload.productListDraftIconColor;
  }
  if (payload.aiPathsActivePathId !== undefined) {
    normalized.aiPathsActivePathId = payload.aiPathsActivePathId;
  }
  if (payload.imageStudioLastProjectId !== undefined) {
    normalized.imageStudioLastProjectId = payload.imageStudioLastProjectId;
  }
  if (payload.caseResolverCaseListViewMode !== undefined) {
    normalized.caseResolverCaseListViewMode = payload.caseResolverCaseListViewMode;
  }
  if (payload.caseResolverCaseListSortBy !== undefined) {
    normalized.caseResolverCaseListSortBy = payload.caseResolverCaseListSortBy;
  }
  if (payload.caseResolverCaseListSortOrder !== undefined) {
    normalized.caseResolverCaseListSortOrder = payload.caseResolverCaseListSortOrder;
  }
  if (payload.caseResolverCaseListSearchScope !== undefined) {
    normalized.caseResolverCaseListSearchScope = payload.caseResolverCaseListSearchScope;
  }
  if (payload.caseResolverCaseListFiltersCollapsedByDefault !== undefined) {
    normalized.caseResolverCaseListFiltersCollapsedByDefault =
      payload.caseResolverCaseListFiltersCollapsedByDefault;
  }
  if (payload.caseResolverCaseListShowNestedContent !== undefined) {
    normalized.caseResolverCaseListShowNestedContent =
      payload.caseResolverCaseListShowNestedContent;
  }
  if (payload.adminMenuCollapsed !== undefined) {
    normalized.adminMenuCollapsed = payload.adminMenuCollapsed;
  }
  if (payload.adminMenuFavorites !== undefined) {
    normalized.adminMenuFavorites = normalizeStringArray(payload.adminMenuFavorites) ?? [];
  }
  if (payload.adminMenuSectionColors !== undefined) {
    normalized.adminMenuSectionColors = payload.adminMenuSectionColors ?? {};
  }
  if (payload.adminMenuCustomEnabled !== undefined) {
    normalized.adminMenuCustomEnabled = payload.adminMenuCustomEnabled;
  }
  if (payload.adminMenuCustomNav !== undefined) {
    normalized.adminMenuCustomNav = payload.adminMenuCustomNav ?? [];
  }
  if (payload.cmsLastPageId !== undefined) {
    normalized.cmsLastPageId = payload.cmsLastPageId;
  }
  if (payload.cmsActiveDomainId !== undefined) {
    normalized.cmsActiveDomainId = payload.cmsActiveDomainId;
  }
  if (payload.cmsThemeOpenSections !== undefined) {
    normalized.cmsThemeOpenSections = normalizeStringArray(payload.cmsThemeOpenSections) ?? [];
  }
  if (payload.cmsThemeLogoWidth !== undefined) {
    normalized.cmsThemeLogoWidth = payload.cmsThemeLogoWidth;
  }
  if (payload.cmsThemeLogoUrl !== undefined) {
    normalized.cmsThemeLogoUrl = normalizeNullableString(payload.cmsThemeLogoUrl);
  }
  if (payload.cmsPreviewEnabled !== undefined) {
    normalized.cmsPreviewEnabled = payload.cmsPreviewEnabled;
  }
  if (payload.cmsSlideshowPauseOnHoverInEditor !== undefined) {
    normalized.cmsSlideshowPauseOnHoverInEditor = payload.cmsSlideshowPauseOnHoverInEditor;
  }

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
