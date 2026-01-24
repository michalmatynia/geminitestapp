import { NextRequest, NextResponse } from "next/server";
import { getUserPreferences, updateUserPreferences } from "@/lib/services/user-preferences-repository";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { apiHandler } from "@/lib/api/api-handler";

// For now, we'll use a hardcoded user ID
// In a real app, this would come from the session
const DEFAULT_USER_ID = "default-user";

const updatePreferencesSchema = z.object({
  productListNameLocale: z.enum(["name_en", "name_pl", "name_de"]).optional().nullable(),
  productListCatalogFilter: z.string().optional().nullable(),
  productListCurrencyCode: z.string().optional().nullable(),
  productListPageSize: z.number().int().min(10).max(200).optional().nullable(),
});

/**
 * GET /api/user/preferences
 * Get current user preferences
 */
async function GET_handler() {
  try {
    const preferences = await getUserPreferences(DEFAULT_USER_ID);
    return NextResponse.json(preferences);
  } catch (error) {
    // If foreign key constraint fails (no user exists), return defaults
    const isPrismaFKError = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
    if (isPrismaFKError) {
      return NextResponse.json({
        productListNameLocale: "name_en",
        productListCatalogFilter: "all",
        productListCurrencyCode: null,
        productListPageSize: 50,
      });
    }
    console.error("[user/preferences][GET] Error:", error);
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
  let data: any = {};
  try {
    const body = await req.json();
    const parsed = updatePreferencesSchema.parse(body);

    // Type assertion to handle exactOptionalPropertyTypes
    data = {
      ...(parsed.productListNameLocale !== undefined && { productListNameLocale: parsed.productListNameLocale }),
      ...(parsed.productListCatalogFilter !== undefined && { productListCatalogFilter: parsed.productListCatalogFilter }),
      ...(parsed.productListCurrencyCode !== undefined && { productListCurrencyCode: parsed.productListCurrencyCode }),
      ...(parsed.productListPageSize !== undefined && { productListPageSize: parsed.productListPageSize }),
    };

    const updated = await updateUserPreferences(DEFAULT_USER_ID, data);
    return NextResponse.json(updated);
  } catch (error) {
    // If foreign key constraint fails (no user exists), return success anyway
    // This allows the app to work without authentication
    const isPrismaFKError = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003";
    if (isPrismaFKError) {
      console.warn("[user/preferences][PATCH] No user exists, returning mock success");
      return NextResponse.json({
        id: "mock",
        userId: DEFAULT_USER_ID,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    console.error("[user/preferences][PATCH] Error:", error);
    return createErrorResponse(error, {
      request: req,
      source: "user.preferences.PATCH",
      fallbackMessage: "Failed to update preferences",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "user.preferences.GET" });
export const PATCH = apiHandler(PATCH_handler, { source: "user.preferences.PATCH" });
