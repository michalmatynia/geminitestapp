import { NextRequest, NextResponse } from 'next/server';

import { getUserPreferences, updateUserPreferences, type UserPreferencesData } from '@/features/auth/server';
import { auth } from '@/features/auth/server';
import { logSystemEvent } from '@/features/observability/server';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api';
import { parseUserPreferencesUpdatePayload } from '@/shared/validations/user-preferences';

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
  aiPathsExpandedGroups: preferences?.aiPathsExpandedGroups ?? [],
  aiPathsPaletteCollapsed: preferences?.aiPathsPaletteCollapsed ?? false,
  aiPathsPathIndex: preferences?.aiPathsPathIndex ?? null,
  aiPathsPathConfigs: preferences?.aiPathsPathConfigs ?? null,
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
  const data = await withTiming<Partial<UserPreferencesData>>(
    'parseBody',
    async () => parseUserPreferencesUpdatePayload(body) as Partial<UserPreferencesData>
  );

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
