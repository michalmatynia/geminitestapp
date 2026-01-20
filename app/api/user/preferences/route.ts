import { NextRequest, NextResponse } from "next/server";
import { getUserPreferences, updateUserPreferences } from "@/lib/services/user-preferences-repository";
import { z } from "zod";

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
export async function GET() {
  try {
    const preferences = await getUserPreferences(DEFAULT_USER_ID);
    return NextResponse.json(preferences);
  } catch (error) {
    console.error("[user/preferences][GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/preferences
 * Update user preferences
 */
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = updatePreferencesSchema.parse(body);

    // Type assertion to handle exactOptionalPropertyTypes
    const data = {
      ...(parsed.productListNameLocale !== undefined && { productListNameLocale: parsed.productListNameLocale }),
      ...(parsed.productListCatalogFilter !== undefined && { productListCatalogFilter: parsed.productListCatalogFilter }),
      ...(parsed.productListCurrencyCode !== undefined && { productListCurrencyCode: parsed.productListCurrencyCode }),
      ...(parsed.productListPageSize !== undefined && { productListPageSize: parsed.productListPageSize }),
    };

    const updated = await updateUserPreferences(DEFAULT_USER_ID, data);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.issues },
        { status: 400 }
      );
    }

    console.error("[user/preferences][PATCH] Error:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
