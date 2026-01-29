import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogRepository } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import prisma from "@/shared/lib/db/prisma";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { badRequestError } from "@/shared/errors/app-error";
import { logSystemEvent } from "@/features/observability/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { CatalogRecord } from "@/features/products/types";
import { type Filter } from "mongodb";

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
async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
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
        mongoLanguages.forEach((language: { id: string; code: string }) => {
          if (language.id) languageCodeById.set(language.id, language.code);
          if (language.code) languageCodeById.set(language.code, language.code);
        });

        const missingIds = new Set<string>();
        catalogs.forEach((catalog: CatalogRecord) => {
          (catalog.languageIds ?? []).forEach((languageId: string) => {
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
            legacyLanguages.forEach((language: { id: string; code: string }) => {
              languageCodeById.set(language.id, language.code);
            });
          } catch (error: unknown) {
            void logSystemEvent({
              level: "warn",
              message: "Failed to load legacy languages from Prisma",
              source: "catalogs.GET",
              error,
              request: req,
              requestId: ctx.requestId,
              context: { provider },
            });
          }
        }

        const collection = mongo.collection<{ _id: string; id: string }>("catalogs");
        catalogs = await Promise.all(
          catalogs.map(async (catalog: CatalogRecord) => {
            const nextLanguageIds =
              catalog.languageIds?.map(
                (languageId: string) => languageCodeById.get(languageId) ?? languageId
              ) ?? [];
            const nextDefaultLanguageId = catalog.defaultLanguageId
              ? languageCodeById.get(catalog.defaultLanguageId) ??
                catalog.defaultLanguageId
              : null;

            const languageIdsChanged =
              nextLanguageIds.length !== (catalog.languageIds?.length ?? 0) ||
              nextLanguageIds.some(
                (languageId: string, index: number) => languageId !== catalog.languageIds?.[index]
              );
            const defaultChanged =
              nextDefaultLanguageId !== catalog.defaultLanguageId;

            if (languageIdsChanged || defaultChanged) {
              const filter: Filter<{ _id: string; id: string }> = { $or: [{ _id: catalog.id }, { id: catalog.id }] };
              await collection.updateOne(
                filter,
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
      } catch (error: unknown) {
        void logSystemEvent({
          level: "warn",
          message: "Failed to normalize catalog language IDs",
          source: "catalogs.GET",
          error,
          request: req,
          requestId: ctx.requestId,
          context: { provider },
        });
      }
    }
    return NextResponse.json(catalogs);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "catalogs.GET",
      fallbackMessage: "Failed to fetch catalogs",
      requestId: ctx.requestId,
    });
  }
}

/**
 * POST /api/catalogs
 * Creates a catalog.
 */
async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
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
      requestId: ctx.requestId,
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "catalogs.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "catalogs.POST" });
