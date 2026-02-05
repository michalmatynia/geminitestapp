import { NextRequest, NextResponse } from "next/server";
import { getUserPreferences, updateUserPreferences, type UserPreferencesData } from "@/features/auth/server";
import { z } from "zod";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { auth } from "@/features/auth/server";
import { isAbortError } from "@/features/ai/chatbot/utils";

export const runtime = "nodejs";

// For now, we'll use a hardcoded user ID
// In a real app, this would come from the session
const DEFAULT_USER_ID = "default-user";
const isDatabaseConfigured = Boolean(process.env.MONGODB_URI);

const updatePreferencesSchema = z.object({
  productListNameLocale: z.enum(["name_en", "name_pl", "name_de"]).optional().nullable(),
  productListCatalogFilter: z.string().optional().nullable(),
  productListCurrencyCode: z.string().optional().nullable(),
  productListPageSize: z.number().int().min(10).max(200).optional().nullable(),
  productListThumbnailSource: z.enum(["file", "link", "base64"]).optional().nullable(),
  adminMenuCollapsed: z.boolean().optional().nullable(),
  cmsLastPageId: z.string().optional().nullable(),
  cmsActiveDomainId: z.string().optional().nullable(),
  cmsThemeOpenSections: z.array(z.string()).optional().nullable(),
  cmsThemeLogoWidth: z.number().int().min(50).max(300).optional().nullable(),
  cmsThemeLogoUrl: z.string().optional().nullable(),
  cmsPreviewEnabled: z.boolean().optional().nullable(),
});

/**
 * GET /api/user/preferences
 * Get current user preferences
 */
async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let userId = DEFAULT_USER_ID;
  try {
    const include = _req.nextUrl.searchParams.get("include") ?? "";
    const includeAdminMenu = include.split(",").map((value: string) => value.trim()).includes("admin-menu");
    const session = await auth();
    userId = session?.user?.id ?? DEFAULT_USER_ID;
    if (!isDatabaseConfigured) {
      return NextResponse.json({
        productListNameLocale: "name_en",
        productListCatalogFilter: "all",
        productListCurrencyCode: "PLN",
        productListPageSize: 12,
        productListThumbnailSource: "file",
        adminMenuCollapsed: false,
        cmsLastPageId: null,
        cmsActiveDomainId: null,
        cmsThemeOpenSections: [],
        cmsThemeLogoWidth: null,
        cmsThemeLogoUrl: null,
        cmsPreviewEnabled: false,
        ...(includeAdminMenu
          ? {
              adminMenuFavorites: [],
              adminMenuSectionColors: {},
              adminMenuCustomEnabled: false,
              adminMenuCustomNav: [],
            }
          : {}),
      });
    }
    const preferences = await getUserPreferences(userId);
    return NextResponse.json({
      productListNameLocale: preferences.productListNameLocale ?? "name_en",
      productListCatalogFilter: preferences.productListCatalogFilter ?? "all",
      productListCurrencyCode: preferences.productListCurrencyCode ?? "PLN",
      productListPageSize: preferences.productListPageSize ?? 12,
      productListThumbnailSource: preferences.productListThumbnailSource ?? "file",
      adminMenuCollapsed: preferences.adminMenuCollapsed ?? false,
      cmsLastPageId: preferences.cmsLastPageId ?? null,
      cmsActiveDomainId: preferences.cmsActiveDomainId ?? null,
      cmsThemeOpenSections: preferences.cmsThemeOpenSections ?? [],
      cmsThemeLogoWidth: preferences.cmsThemeLogoWidth ?? null,
      cmsThemeLogoUrl: preferences.cmsThemeLogoUrl ?? null,
      cmsPreviewEnabled: preferences.cmsPreviewEnabled ?? false,
      ...(includeAdminMenu
        ? {
            adminMenuFavorites: preferences.adminMenuFavorites ?? [],
            adminMenuSectionColors: preferences.adminMenuSectionColors ?? {},
            adminMenuCustomEnabled: preferences.adminMenuCustomEnabled ?? false,
            adminMenuCustomNav: preferences.adminMenuCustomNav ?? [],
          }
        : {}),
    });
  } catch (error) {
    return createErrorResponse(error, {
      source: "user.preferences.GET",
      fallbackMessage: "Failed to fetch preferences",
    });
  }
}

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
async function PATCH_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  let data: Partial<UserPreferencesData> = {};
  let userId = DEFAULT_USER_ID;
  try {
    const session = await auth();
    userId = session?.user?.id ?? DEFAULT_USER_ID;
    const rawBody = await req.text();
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
    const parsed = updatePreferencesSchema.parse(body);

    // Type assertion to handle exactOptionalPropertyTypes
    const partial: Record<string, unknown> = {};
    if (parsed.productListNameLocale !== undefined) partial.productListNameLocale = parsed.productListNameLocale;
    if (parsed.productListCatalogFilter !== undefined) partial.productListCatalogFilter = parsed.productListCatalogFilter;
    if (parsed.productListCurrencyCode !== undefined) partial.productListCurrencyCode = parsed.productListCurrencyCode;
    if (parsed.productListPageSize !== undefined) partial.productListPageSize = parsed.productListPageSize;
    if (parsed.productListThumbnailSource !== undefined) partial.productListThumbnailSource = parsed.productListThumbnailSource;
    if (parsed.adminMenuCollapsed !== undefined) partial.adminMenuCollapsed = parsed.adminMenuCollapsed;
    if (parsed.cmsLastPageId !== undefined) partial.cmsLastPageId = parsed.cmsLastPageId;
    if (parsed.cmsActiveDomainId !== undefined) partial.cmsActiveDomainId = parsed.cmsActiveDomainId;
    if (parsed.cmsThemeOpenSections !== undefined) partial.cmsThemeOpenSections = parsed.cmsThemeOpenSections ?? [];
    if (parsed.cmsThemeLogoWidth !== undefined) partial.cmsThemeLogoWidth = parsed.cmsThemeLogoWidth;
    if (parsed.cmsThemeLogoUrl !== undefined) partial.cmsThemeLogoUrl = parsed.cmsThemeLogoUrl;
    if (parsed.cmsPreviewEnabled !== undefined) partial.cmsPreviewEnabled = parsed.cmsPreviewEnabled;
    data = partial as Partial<UserPreferencesData>;

    if (!isDatabaseConfigured) {
      return NextResponse.json({
        id: "mock",
        userId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    const updated = await updateUserPreferences(userId, data);
    return NextResponse.json(updated);
  } catch (error) {
    const isAbort =
      req.signal.aborted ||
      isAbortError(error) ||
      (error instanceof Error && (error as { code?: string }).code === "ECONNRESET");
    if (isAbort) {
      return new NextResponse(null, { status: 204 });
    }
    return createErrorResponse(error, {
      request: req,
      source: "user.preferences.PATCH",
      fallbackMessage: "Failed to update preferences",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "user.preferences.GET" });
export const PATCH = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PATCH_handler(req, ctx),
 { source: "user.preferences.PATCH" });
// POST handler for sendBeacon (used during page unload to save AI Paths settings)
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => PATCH_handler(req, ctx),
 { source: "user.preferences.POST" });
