import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getCatalogRepository } from "@/lib/services/catalog-repository";

const catalogSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  languageIds: z.array(z.string().trim().min(1)).optional(),
  defaultLanguageId: z.string().trim().min(1).optional(),
  priceGroupIds: z.array(z.string().trim().min(1)).optional(),
  defaultPriceGroupId: z.string().trim().min(1).optional(),
  isDefault: z.boolean().optional(),
});

/**
 * GET /api/catalogs
 * Fetches all catalogs.
 */
export async function GET() {
  try {
    const catalogRepository = await getCatalogRepository();
    const catalogs = await catalogRepository.listCatalogs();
    return NextResponse.json(catalogs);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[catalogs][GET] Failed to fetch catalogs", { errorId, error });
    return NextResponse.json(
      { error: "Failed to fetch catalogs", errorId },
      { status: 500 }
    );
  }
}

/**
 * POST /api/catalogs
 * Creates a catalog.
 */
export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      const errorId = randomUUID();
      console.error("[catalogs][POST] Failed to parse JSON body", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload", errorId },
        { status: 400 }
      );
    }
    const data = catalogSchema.parse(body);
    if (!data.languageIds || data.languageIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one language." },
        { status: 400 }
      );
    }
    if (!data.defaultLanguageId || !data.languageIds.includes(data.defaultLanguageId)) {
      return NextResponse.json(
        { error: "Default language must be one of the selected languages." },
        { status: 400 }
      );
    }
    if (!data.priceGroupIds || data.priceGroupIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one price group." },
        { status: 400 }
      );
    }
    if (
      !data.defaultPriceGroupId ||
      !data.priceGroupIds.includes(data.defaultPriceGroupId)
    ) {
      return NextResponse.json(
        { error: "Default price group must be one of the selected price groups." },
        { status: 400 }
      );
    }
    const catalogRepository = await getCatalogRepository();
    const existingCatalogs = await catalogRepository.listCatalogs();
    const shouldBeDefault =
      existingCatalogs.length === 0 ? true : data.isDefault ?? false;
    const catalog = await catalogRepository.createCatalog({
      name: data.name,
      description: data.description ?? null,
      isDefault: shouldBeDefault,
      languageIds: data.languageIds ?? [],
      defaultLanguageId: data.defaultLanguageId ?? null,
      priceGroupIds: data.priceGroupIds ?? [],
      defaultPriceGroupId: data.defaultPriceGroupId ?? null,
    });
    return NextResponse.json(catalog);
  } catch (error: unknown) {
    const errorId = randomUUID();
    if (error instanceof z.ZodError) {
      console.warn("[catalogs][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[catalogs][POST] Failed to create catalog", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[catalogs][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
