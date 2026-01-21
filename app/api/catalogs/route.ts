import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getCatalogRepository } from "@/lib/services/catalog-repository";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";
import prisma from "@/lib/prisma";

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
    let catalogs = await catalogRepository.listCatalogs();
    const provider = await getProductDataProvider();

    if (provider === "mongodb" && catalogs.length > 0) {
      try {
        const mongo = await getMongoDb();
        const mongoLanguages = await mongo
          .collection<{ id: string; code: string }>("languages")
          .find({}, { projection: { id: 1, code: 1 } })
          .toArray();
        const languageCodeById = new Map<string, string>();
        mongoLanguages.forEach((language) => {
          if (language.id) languageCodeById.set(language.id, language.code);
          if (language.code) languageCodeById.set(language.code, language.code);
        });

        const missingIds = new Set<string>();
        catalogs.forEach((catalog) => {
          (catalog.languageIds ?? []).forEach((languageId) => {
            if (!languageCodeById.has(languageId)) {
              missingIds.add(languageId);
            }
          });
          if (
            catalog.defaultLanguageId &&
            !languageCodeById.has(catalog.defaultLanguageId)
          ) {
            missingIds.add(catalog.defaultLanguageId);
          }
        });

        if (missingIds.size > 0 && process.env.DATABASE_URL) {
          const legacyIds = Array.from(missingIds);
          try {
            const legacyLanguages = await prisma.language.findMany({
              where: { id: { in: legacyIds } },
              select: { id: true, code: true },
            });
            legacyLanguages.forEach((language) => {
              languageCodeById.set(language.id, language.code);
            });
          } catch (error) {
            console.warn(
              "[catalogs][GET] Failed to load legacy languages from Prisma",
              error
            );
          }
        }

        const collection = mongo.collection("catalogs");
        catalogs = await Promise.all(
          catalogs.map(async (catalog) => {
            const nextLanguageIds =
              catalog.languageIds?.map(
                (languageId) => languageCodeById.get(languageId) ?? languageId
              ) ?? [];
            const nextDefaultLanguageId = catalog.defaultLanguageId
              ? languageCodeById.get(catalog.defaultLanguageId) ??
                catalog.defaultLanguageId
              : null;

            const languageIdsChanged =
              nextLanguageIds.length !== (catalog.languageIds?.length ?? 0) ||
              nextLanguageIds.some(
                (languageId, index) => languageId !== catalog.languageIds?.[index]
              );
            const defaultChanged =
              nextDefaultLanguageId !== catalog.defaultLanguageId;

            if (languageIdsChanged || defaultChanged) {
              const filter = { $or: [{ _id: catalog.id }, { id: catalog.id }] };
              await collection.updateOne(
                filter as unknown as any,
                {
                  $set: {
                    languageIds: nextLanguageIds,
                    defaultLanguageId: nextDefaultLanguageId,
                    updatedAt: new Date(),
                  },
                }
              );
            }

            return {
              ...catalog,
              languageIds: nextLanguageIds,
              defaultLanguageId: nextDefaultLanguageId,
            };
          })
        );
      } catch (error) {
        console.warn(
          "[catalogs][GET] Failed to normalize catalog language IDs",
          error
        );
      }
    }
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
