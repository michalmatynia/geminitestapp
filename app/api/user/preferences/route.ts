import { NextRequest, NextResponse } from "next/server";
import { getUserPreferences, updateUserPreferences, type UserPreferencesData } from "@/lib/services/user-preferences-repository";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { apiHandler } from "@/lib/api/api-handler";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";

// For now, we'll use a hardcoded user ID
// In a real app, this would come from the session
const DEFAULT_USER_ID = "default-user";
const isDatabaseConfigured = Boolean(process.env.DATABASE_URL || process.env.MONGODB_URI);

const updatePreferencesSchema = z.object({
  productListNameLocale: z.enum(["name_en", "name_pl", "name_de"]).optional().nullable(),
  productListCatalogFilter: z.string().optional().nullable(),
  productListCurrencyCode: z.string().optional().nullable(),
  productListPageSize: z.number().int().min(10).max(200).optional().nullable(),
  aiPathsActivePathId: z.string().optional().nullable(),
  aiPathsExpandedGroups: z.array(z.string()).optional().nullable(),
  aiPathsPaletteCollapsed: z.boolean().optional().nullable(),
  aiPathsPathIndex: z.array(z.unknown()).optional().nullable(),
  aiPathsPathConfigs: z.union([z.record(z.unknown()), z.string()]).optional().nullable(),
});

/**
 * GET /api/user/preferences
 * Get current user preferences
 */
async function GET_handler() {
  let userId = DEFAULT_USER_ID;
  try {
    const session = await auth();
    userId = session?.user?.id ?? DEFAULT_USER_ID;
    if (!isDatabaseConfigured) {
      return NextResponse.json({
        productListNameLocale: "name_en",
        productListCatalogFilter: "all",
        productListCurrencyCode: "PLN",
        productListPageSize: 12,
        aiPathsActivePathId: null,
        aiPathsExpandedGroups: ["Triggers"],
        aiPathsPaletteCollapsed: false,
        aiPathsPathIndex: null,
        aiPathsPathConfigs: null,
      });
    }
    const preferences = await getUserPreferences(userId);
    return NextResponse.json(preferences);
  } catch (error) {
    // If foreign key constraint fails (no user exists), return defaults
    const isPrismaFKError = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
    if (isPrismaFKError) {
      return NextResponse.json({
        productListNameLocale: "name_en",
        productListCatalogFilter: "all",
        productListCurrencyCode: "PLN",
        productListPageSize: 12,
        aiPathsActivePathId: null,
        aiPathsExpandedGroups: ["Triggers"],
        aiPathsPaletteCollapsed: false,
        aiPathsPathIndex: null,
        aiPathsPathConfigs: null,
      });
    }
    console.error("[user/preferences][GET] Error:", {
      error,
      hasMongo: Boolean(process.env.MONGODB_URI),
      hasPrisma: Boolean(process.env.DATABASE_URL),
    });
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
async function PATCH_handler(req: NextRequest) {
  let data: Partial<UserPreferencesData> = {};
  let userId = DEFAULT_USER_ID;
  try {
    const session = await auth();
    userId = session?.user?.id ?? DEFAULT_USER_ID;
    const body: unknown = await req.json();
    const parsed = updatePreferencesSchema.parse(body);

    // Type assertion to handle exactOptionalPropertyTypes
    data = {
      ...(parsed.productListNameLocale !== undefined && { productListNameLocale: parsed.productListNameLocale }),
      ...(parsed.productListCatalogFilter !== undefined && { productListCatalogFilter: parsed.productListCatalogFilter }),
      ...(parsed.productListCurrencyCode !== undefined && { productListCurrencyCode: parsed.productListCurrencyCode }),
      ...(parsed.productListPageSize !== undefined && { productListPageSize: parsed.productListPageSize }),
      ...(parsed.aiPathsActivePathId !== undefined && { aiPathsActivePathId: parsed.aiPathsActivePathId }),
      ...(parsed.aiPathsExpandedGroups !== undefined && { aiPathsExpandedGroups: parsed.aiPathsExpandedGroups }),
      ...(parsed.aiPathsPaletteCollapsed !== undefined && { aiPathsPaletteCollapsed: parsed.aiPathsPaletteCollapsed }),
      ...(parsed.aiPathsPathIndex !== undefined && { aiPathsPathIndex: parsed.aiPathsPathIndex }),
      ...(parsed.aiPathsPathConfigs !== undefined && { aiPathsPathConfigs: parsed.aiPathsPathConfigs }),
    };

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
    // If foreign key constraint fails (no user exists), return success anyway
    // This allows the app to work without authentication
    const isPrismaFKError = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
    if (isPrismaFKError) {
      console.warn("[user/preferences][PATCH] No user exists, returning mock success");
      return NextResponse.json({
        id: "mock",
        userId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.error("[user/preferences][PATCH] Error:", {
      error,
      hasMongo: Boolean(process.env.MONGODB_URI),
      hasPrisma: Boolean(process.env.DATABASE_URL),
      payload: data,
    });
    return createErrorResponse(error, {
      request: req,
      source: "user.preferences.PATCH",
      fallbackMessage: "Failed to update preferences",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "user.preferences.GET" });
export const PATCH = apiHandler(PATCH_handler, { source: "user.preferences.PATCH" });
