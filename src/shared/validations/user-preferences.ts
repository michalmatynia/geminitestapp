import { z } from 'zod';

import type { JsonValue, UserPreferencesDto } from '@/shared/contracts/auth';

export const USER_PREFERENCES_HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ])
);

const nullableTrimmedStringSchema = z.string().trim().optional().nullable();
const nullableIdSchema = z.union([z.string().trim().min(1), z.null()]).optional();
const stringArraySchema = z.array(z.string().trim().min(1));

export const userPreferencesUpdateSchema = z.object({
  productListNameLocale: z.enum(['name_en', 'name_pl', 'name_de']).optional().nullable(),
  productListCatalogFilter: nullableTrimmedStringSchema,
  productListCurrencyCode: nullableTrimmedStringSchema,
  productListPageSize: z.number().int().min(10).max(200).optional().nullable(),
  productListThumbnailSource: z.enum(['file', 'link', 'base64']).optional().nullable(),
  productListFiltersCollapsedByDefault: z.boolean().optional().nullable(),
  productListDraftIconColorMode: z.enum(['theme', 'custom']).optional().nullable(),
  productListDraftIconColor: z
    .string()
    .regex(USER_PREFERENCES_HEX_COLOR_PATTERN)
    .optional()
    .nullable(),
  aiPathsActivePathId: nullableIdSchema,
  imageStudioLastProjectId: nullableIdSchema,
  caseResolverCaseListViewMode: z.enum(['hierarchy', 'list']).optional().nullable(),
  caseResolverCaseListSortBy: z.enum(['updated', 'created', 'name']).optional().nullable(),
  caseResolverCaseListSortOrder: z.enum(['asc', 'desc']).optional().nullable(),
  caseResolverCaseListSearchScope: z.enum(['all', 'name', 'folder', 'content']).optional().nullable(),
  caseResolverCaseListFiltersCollapsedByDefault: z.boolean().optional().nullable(),
  adminMenuCollapsed: z.boolean().optional().nullable(),
  adminMenuFavorites: stringArraySchema.optional().nullable(),
  adminMenuSectionColors: z.record(z.string(), z.string()).optional().nullable(),
  adminMenuCustomEnabled: z.boolean().optional().nullable(),
  adminMenuCustomNav: jsonValueSchema.optional().nullable(),
  cmsLastPageId: nullableIdSchema,
  cmsActiveDomainId: nullableIdSchema,
  cmsThemeOpenSections: stringArraySchema.optional().nullable(),
  cmsThemeLogoWidth: z.number().int().min(50).max(300).optional().nullable(),
  cmsThemeLogoUrl: nullableTrimmedStringSchema,
  cmsPreviewEnabled: z.boolean().optional().nullable(),
  cmsSlideshowPauseOnHoverInEditor: z.boolean().optional().nullable(),
});

export type UserPreferencesUpdatePayload = z.infer<typeof userPreferencesUpdateSchema>;

export const userPreferencesResponseSchema = z
  .object({
    productListNameLocale: z.enum(['name_en', 'name_pl', 'name_de']).optional(),
    productListCatalogFilter: z.string().optional().nullable(),
    productListCurrencyCode: z.string().optional().nullable(),
    productListPageSize: z.number().int().optional().nullable(),
    productListThumbnailSource: z.enum(['file', 'link', 'base64']).optional().nullable(),
    productListFiltersCollapsedByDefault: z.boolean().optional().nullable(),
    productListDraftIconColorMode: z.enum(['theme', 'custom']).optional().nullable(),
    productListDraftIconColor: z.string().regex(USER_PREFERENCES_HEX_COLOR_PATTERN).optional().nullable(),
    aiPathsActivePathId: z.string().optional().nullable(),
    imageStudioLastProjectId: z.string().optional().nullable(),
    caseResolverCaseListViewMode: z.enum(['hierarchy', 'list']).optional().nullable(),
    caseResolverCaseListSortBy: z.enum(['updated', 'created', 'name']).optional().nullable(),
    caseResolverCaseListSortOrder: z.enum(['asc', 'desc']).optional().nullable(),
    caseResolverCaseListSearchScope: z.enum(['all', 'name', 'folder', 'content']).optional().nullable(),
    caseResolverCaseListFiltersCollapsedByDefault: z.boolean().optional().nullable(),
    adminMenuCollapsed: z.boolean().optional().nullable(),
    adminMenuFavorites: z.array(z.string()).optional(),
    adminMenuSectionColors: z.record(z.string(), z.string()).optional(),
    adminMenuCustomEnabled: z.boolean().optional().nullable(),
    adminMenuCustomNav: jsonValueSchema.optional().nullable(),
    cmsLastPageId: z.string().optional().nullable(),
    cmsActiveDomainId: z.string().optional().nullable(),
    cmsThemeOpenSections: z.array(z.string()).optional(),
    cmsThemeLogoWidth: z.number().int().optional().nullable(),
    cmsThemeLogoUrl: z.string().optional().nullable(),
    cmsPreviewEnabled: z.boolean().optional().nullable(),
    cmsSlideshowPauseOnHoverInEditor: z.boolean().optional().nullable(),
  })
  .passthrough();

const normalizeNullableString = (
  value: string | null
): string | null => {
  if (value === null) return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeStringArray = (
  value: string[] | null
): string[] => {
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
    normalized.productListPageSize = payload.productListPageSize;
  }
  if (payload.productListThumbnailSource !== undefined) {
    normalized.productListThumbnailSource = payload.productListThumbnailSource;
  }
  if (payload.productListFiltersCollapsedByDefault !== undefined) {
    normalized.productListFiltersCollapsedByDefault = payload.productListFiltersCollapsedByDefault;
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
    normalized.cmsSlideshowPauseOnHoverInEditor =
      payload.cmsSlideshowPauseOnHoverInEditor;
  }

  return normalized;
};

export const parseUserPreferencesUpdatePayload = (
  payload: unknown
): Partial<UserPreferencesUpdatePayload> => {
  const parsed = userPreferencesUpdateSchema.parse(payload);
  return normalizeUserPreferencesUpdatePayload(parsed);
};

export const normalizeUserPreferencesResponse = (
  payload: unknown
): Partial<UserPreferencesDto> => {
  const parsed = userPreferencesResponseSchema.safeParse(payload);
  if (!parsed.success) return {};
  return parsed.data as Partial<UserPreferencesDto>;
};
