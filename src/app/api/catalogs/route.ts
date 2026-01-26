import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogRepository } from "@/lib/services/catalog-repository";
import { getProductDataProvider } from "@/features/products/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";
import prisma from "@/lib/prisma";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { badRequestError } from "@/lib/errors/app-error";
import { logSystemEvent } from "@/lib/services/system-logger";
import { apiHandler } from "@/lib/api/api-handler";

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
async function GET_handler(req: Request) {
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
            void logSystemEvent({
              level: "warn",
              message: "Failed to load legacy languages from Prisma",
              source: "catalogs.GET",
              error,
              request: req,
              context: { provider },
            });
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
                // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
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
        void logSystemEvent({
          level: "warn",
          message: "Failed to normalize catalog language IDs",
          source: "catalogs.GET",
          error,
          request: req,
          context: { provider },
        });
      }
    }
    return NextResponse.json(catalogs);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "catalogs.GET",
      fallbackMessage: "Failed to fetch catalogs",
    });
  }
}

/**
 * POST /api/catalogs
 * Creates a catalog.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, catalogSchema, {
      logPrefix: "catalogs.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    if (!data.languageIds || data.languageIds.length === 0) {
      throw badRequestError("Select at least one language.", {
        field: "languageIds",
      });
    }
    if (
      !data.defaultLanguageId ||
      !data.languageIds.includes(data.defaultLanguageId)
    ) {
      throw badRequestError(
        "Default language must be one of the selected languages.",
        { field: "defaultLanguageId" }
      );
    }
    if (!data.priceGroupIds || data.priceGroupIds.length === 0) {
      throw badRequestError("Select at least one price group.", {
        field: "priceGroupIds",
      });
    }
    if (
      !data.defaultPriceGroupId ||
      !data.priceGroupIds.includes(data.defaultPriceGroupId)
    ) {
      throw badRequestError(
        "Default price group must be one of the selected price groups.",
        { field: "defaultPriceGroupId" }
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
    return createErrorResponse(error, {
      request: req,
      source: "catalogs.POST",
      fallbackMessage: "Failed to create catalog",
    });
  }
}

export const GET = apiHandler(GET_handler, { source: "catalogs.GET" });
export const POST = apiHandler(POST_handler, { source: "catalogs.POST" });
