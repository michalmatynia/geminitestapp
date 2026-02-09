import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { getUserPreferences, updateUserPreferences, type UserPreferencesData } from '@/features/auth/server';
import { auth } from '@/features/auth/server';
import { logSystemEvent } from '@/features/observability/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';

export const runtime = 'nodejs';

// For now, we'll use a hardcoded user ID
// In a real app, this would come from the session
const DEFAULT_USER_ID = 'default-user';
const isDatabaseConfigured = Boolean(process.env['MONGODB_URI']);
const shouldLogTiming = (): boolean => process.env['DEBUG_API_TIMING'] === 'true';
const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
};
const USER_PREFERENCES_REPOSITORY_TIMEOUT_MS = parsePositiveInt(
  process.env['USER_PREFERENCES_REPOSITORY_TIMEOUT_MS'],
  2500
);
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const updatePreferencesSchema = z.object({
  productListNameLocale: z.enum(['name_en', 'name_pl', 'name_de']).optional().nullable(),
  productListCatalogFilter: z.string().optional().nullable(),
  productListCurrencyCode: z.string().optional().nullable(),
  productListPageSize: z.number().int().min(10).max(200).optional().nullable(),
  productListThumbnailSource: z.enum(['file', 'link', 'base64']).optional().nullable(),
  productListDraftIconColorMode: z.enum(['theme', 'custom']).optional().nullable(),
  productListDraftIconColor: z
    .string()
    .regex(HEX_COLOR_PATTERN)
    .optional()
    .nullable(),
  aiPathsActivePathId: z.string().optional().nullable(),
  adminMenuCollapsed: z.boolean().optional().nullable(),
  cmsLastPageId: z.string().optional().nullable(),
  cmsActiveDomainId: z.string().optional().nullable(),
  cmsThemeOpenSections: z.array(z.string()).optional().nullable(),
  cmsThemeLogoWidth: z.number().int().min(50).max(300).optional().nullable(),
  cmsThemeLogoUrl: z.string().optional().nullable(),
  cmsPreviewEnabled: z.boolean().optional().nullable(),
  cmsSlideshowPauseOnHoverInEditor: z.boolean().optional().nullable(),
});

const withTimeout = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`[user-preferences] ${label} timed out after ${USER_PREFERENCES_REPOSITORY_TIMEOUT_MS}ms`));
    }, USER_PREFERENCES_REPOSITORY_TIMEOUT_MS);
  });

  try {
    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const buildUserPreferencesResponse = (
  preferences: Partial<UserPreferencesData> | null | undefined,
  includeAdminMenu: boolean
): Record<string, unknown> => ({
  productListNameLocale: preferences?.productListNameLocale ?? 'name_en',
  productListCatalogFilter: preferences?.productListCatalogFilter ?? 'all',
  productListCurrencyCode: preferences?.productListCurrencyCode ?? 'PLN',
  productListPageSize: preferences?.productListPageSize ?? 12,
  productListThumbnailSource: preferences?.productListThumbnailSource ?? 'file',
  productListDraftIconColorMode: preferences?.productListDraftIconColorMode ?? 'theme',
  productListDraftIconColor: preferences?.productListDraftIconColor ?? '#60a5fa',
  aiPathsActivePathId: preferences?.aiPathsActivePathId ?? null,
  adminMenuCollapsed: preferences?.adminMenuCollapsed ?? false,
  cmsLastPageId: preferences?.cmsLastPageId ?? null,
  cmsActiveDomainId: preferences?.cmsActiveDomainId ?? null,
  cmsThemeOpenSections: preferences?.cmsThemeOpenSections ?? [],
  cmsThemeLogoWidth: preferences?.cmsThemeLogoWidth ?? null,
  cmsThemeLogoUrl: preferences?.cmsThemeLogoUrl ?? null,
  cmsPreviewEnabled: preferences?.cmsPreviewEnabled ?? false,
  cmsSlideshowPauseOnHoverInEditor: preferences?.cmsSlideshowPauseOnHoverInEditor ?? false,
  ...(includeAdminMenu
    ? {
      adminMenuFavorites: preferences?.adminMenuFavorites ?? [],
      adminMenuSectionColors: preferences?.adminMenuSectionColors ?? {},
      adminMenuCustomEnabled: preferences?.adminMenuCustomEnabled ?? false,
      adminMenuCustomNav: preferences?.adminMenuCustomNav ?? [],
    }
    : {}),
});

/**
 * GET /api/user/preferences
 * Get current user preferences
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const logTiming = shouldLogTiming();
  const timings: Record<string, number> = {};
  const totalStart = performance.now();
  const withTiming = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    timings[label] = performance.now() - start;
    return result;
  };

  const include = _req.nextUrl.searchParams.get('include') ?? '';
  const includeAdminMenu = include.split(',').map((value: string) => value.trim()).includes('admin-menu');
  const session = await withTiming('auth', () => auth());
  const userId = session?.user?.id ?? DEFAULT_USER_ID;
  if (!isDatabaseConfigured) {
    if (logTiming) {
      timings['total'] = performance.now() - totalStart;
      void logSystemEvent({
        level: 'info',
        message: '[timing] user.preferences.GET',
        context: { ...timings, databaseConfigured: false },
      }).catch(() => {});
    }
    return NextResponse.json(buildUserPreferencesResponse(undefined, includeAdminMenu), {
      headers: { 'x-user-preferences-fallback': 'true' },
    });
  }
  let preferences: Partial<UserPreferencesData>;
  try {
    preferences = await withTiming('repository', () =>
      withTimeout('repository.get', () => getUserPreferences(userId))
    );
  } catch (error) {
    if (logTiming) {
      timings['total'] = performance.now() - totalStart;
      void logSystemEvent({
        level: 'warn',
        message: '[timing] user.preferences.GET.fallback',
        context: {
          ...timings,
          databaseConfigured: true,
          reason: error instanceof Error ? error.message : String(error),
        },
      }).catch(() => {});
    }
    return NextResponse.json(buildUserPreferencesResponse(undefined, includeAdminMenu), {
      headers: { 'x-user-preferences-fallback': 'true' },
    });
  }
  const response = NextResponse.json(buildUserPreferencesResponse(preferences, includeAdminMenu));
  if (logTiming) {
    timings['total'] = performance.now() - totalStart;
    void logSystemEvent({
      level: 'info',
      message: '[timing] user.preferences.GET',
      context: { ...timings, databaseConfigured: true },
    }).catch(() => {});
  }
  return response;
}

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
async function PATCH_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const logTiming = shouldLogTiming();
  const timings: Record<string, number> = {};
  const totalStart = performance.now();
  const withTiming = async <T,>(label: string, fn: () => Promise<T>): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    timings[label] = performance.now() - start;
    return result;
  };

  const session = await withTiming('auth', () => auth());
  const userId = session?.user?.id ?? DEFAULT_USER_ID;
  const rawBody = await withTiming('readBody', () => req.text());
  let body: unknown = {};
  if (rawBody) {
    try {
      body = JSON.parse(rawBody);
    } catch (parseError) {
      if (parseError instanceof SyntaxError) {
        body = {};
      } else {
        throw parseError;
      }
    }
  }
  const parsed = await withTiming('parseBody', async () => updatePreferencesSchema.parse(body));

  // Type assertion to handle exactOptionalPropertyTypes
  const partial: Record<string, unknown> = {};
  if (parsed.productListNameLocale !== undefined) partial['productListNameLocale'] = parsed.productListNameLocale;
  if (parsed.productListCatalogFilter !== undefined) partial['productListCatalogFilter'] = parsed.productListCatalogFilter;
  if (parsed.productListCurrencyCode !== undefined) partial['productListCurrencyCode'] = parsed.productListCurrencyCode;
  if (parsed.productListPageSize !== undefined) partial['productListPageSize'] = parsed.productListPageSize;
  if (parsed.productListThumbnailSource !== undefined) partial['productListThumbnailSource'] = parsed.productListThumbnailSource;
  if (parsed.productListDraftIconColorMode !== undefined) {
    partial['productListDraftIconColorMode'] = parsed.productListDraftIconColorMode;
  }
  if (parsed.productListDraftIconColor !== undefined) {
    partial['productListDraftIconColor'] = parsed.productListDraftIconColor;
  }
  if (parsed.aiPathsActivePathId !== undefined) partial['aiPathsActivePathId'] = parsed.aiPathsActivePathId;
  if (parsed.adminMenuCollapsed !== undefined) partial['adminMenuCollapsed'] = parsed.adminMenuCollapsed;
  if (parsed.cmsLastPageId !== undefined) partial['cmsLastPageId'] = parsed.cmsLastPageId;
  if (parsed.cmsActiveDomainId !== undefined) partial['cmsActiveDomainId'] = parsed.cmsActiveDomainId;
  if (parsed.cmsThemeOpenSections !== undefined) partial['cmsThemeOpenSections'] = parsed.cmsThemeOpenSections ?? [];
  if (parsed.cmsThemeLogoWidth !== undefined) partial['cmsThemeLogoWidth'] = parsed.cmsThemeLogoWidth;
  if (parsed.cmsThemeLogoUrl !== undefined) partial['cmsThemeLogoUrl'] = parsed.cmsThemeLogoUrl;
  if (parsed.cmsPreviewEnabled !== undefined) partial['cmsPreviewEnabled'] = parsed.cmsPreviewEnabled;
  if (parsed.cmsSlideshowPauseOnHoverInEditor !== undefined) {
    partial['cmsSlideshowPauseOnHoverInEditor'] = parsed.cmsSlideshowPauseOnHoverInEditor;
  }
  const data = partial as Partial<UserPreferencesData>;

  if (!isDatabaseConfigured) {
    if (logTiming) {
      timings['total'] = performance.now() - totalStart;
      void logSystemEvent({
        level: 'info',
        message: '[timing] user.preferences.PATCH',
        context: { ...timings, databaseConfigured: false },
      }).catch(() => {});
    }
    return NextResponse.json(buildUserPreferencesResponse(data, false), {
      headers: { 'x-user-preferences-fallback': 'true' },
    });
  }
  let updated: Partial<UserPreferencesData>;
  try {
    updated = await withTiming('repository', () =>
      withTimeout('repository.patch', () => updateUserPreferences(userId, data))
    );
  } catch (error) {
    if (logTiming) {
      timings['total'] = performance.now() - totalStart;
      void logSystemEvent({
        level: 'warn',
        message: '[timing] user.preferences.PATCH.fallback',
        context: {
          ...timings,
          databaseConfigured: true,
          reason: error instanceof Error ? error.message : String(error),
        },
      }).catch(() => {});
    }
    return NextResponse.json(buildUserPreferencesResponse(data, false), {
      headers: {
        'x-user-preferences-fallback': 'true',
        'x-user-preferences-persisted': 'false',
      },
    });
  }

  const response = NextResponse.json(buildUserPreferencesResponse(updated, false));
  if (logTiming) {
    timings['total'] = performance.now() - totalStart;
    void logSystemEvent({
      level: 'info',
      message: '[timing] user.preferences.PATCH',
      context: { ...timings, databaseConfigured: true },
    }).catch(() => {});
  }
  return response;
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: 'user.preferences.GET' });
export const PATCH = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PATCH_handler(req, ctx),
  { source: 'user.preferences.PATCH' });
// POST handler for sendBeacon (used during page unload to save AI Paths settings)
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PATCH_handler(req, ctx),
  { source: 'user.preferences.POST' });
