import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import { getInternationalizationProvider } from "@/features/internationalization/services/internationalization-provider";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, internalError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

export const runtime = "nodejs";

const languageUpdateSchema = z.object({
  code: z.string().trim().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  nativeName: z.string().trim().min(1).optional(),
  countryIds: z.array(z.string().trim().min(1)).optional(),
});

type LanguageCountryDoc = {
  countryId: string;
  country: {
    id: string;
    code: string;
    name: string;
  };
};

type LanguageDoc = {
  id: string;
  code: string;
  name: string;
  nativeName?: string | null;
  countries: LanguageCountryDoc[];
  createdAt: Date;
  updatedAt: Date;
};

const LANGUAGES_COLLECTION = "languages";

/**
 * PUT /api/languages/[id]
 * Updates language country assignments.
 */
async function PUT_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id } = params;
    if (!id) {
      throw badRequestError("Language id is required");
    }
    const parsed = await parseJsonBody(req, languageUpdateSchema, {
      logPrefix: "languages.PUT",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    const provider = await getInternationalizationProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const mongo = await getMongoDb();
      const existingLang = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .findOne({ id });

      if (!existingLang) {
        throw notFoundError("Language not found.", { languageId: id });
      }

      const updateFields: Partial<LanguageDoc> = {
        updatedAt: new Date(),
      };

      if (data.code) {
        updateFields.code = data.code.toUpperCase();
      }
      if (data.name) {
        updateFields.name = data.name;
      }
      if (data.nativeName !== undefined) {
        updateFields.nativeName = data.nativeName;
      }

      if (data.countryIds) {
        const uniqueIds = Array.from(new Set(data.countryIds));
        const countries: LanguageCountryDoc[] = [];

        if (uniqueIds.length > 0) {
          const countriesCollection = mongo.collection("countries");
          for (const countryId of uniqueIds) {
            const country = (await countriesCollection.findOne({ id: countryId })) as { id: string; code: string; name: string } | null;
            if (country) {
              countries.push({
                countryId: country.id,
                country: {
                  id: country.id,
                  code: country.code,
                  name: country.name,
                },
              });
            }
          }
        }
        updateFields.countries = countries;
      }

      await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .updateOne({ id }, { $set: updateFields });

      const updated = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .findOne({ id });
      if (!updated) {
        throw notFoundError("Language not found.", { languageId: id });
      }

      return NextResponse.json(updated);
    }

    const language = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingLanguage = await tx.language.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existingLanguage) {
        throw notFoundError("Language not found.", { languageId: id });
      }
      if (data.code || data.name || data.nativeName !== undefined) {
        await tx.language.update({
          where: { id },
          data: {
            ...(data.code && { code: data.code.toUpperCase() }),
            ...(data.name && { name: data.name }),
            ...(data.nativeName !== undefined && { nativeName: data.nativeName }),
          },
        });
      }

      if (data.countryIds) {
        const uniqueIds = Array.from(new Set(data.countryIds));
        const existing = await tx.country.findMany({
          where: { id: { in: uniqueIds } },
          select: { id: true },
        });
        const existingIds = new Set(existing.map((entry) => entry.id));
        const validIds = uniqueIds.filter((countryId) =>
          existingIds.has(countryId)
        );
        await tx.languageCountry.deleteMany({ where: { languageId: id } });
        if (validIds.length > 0) {
          await tx.languageCountry.createMany({
            data: validIds.map((countryId) => ({
              languageId: id,
              countryId,
            })),
          });
        }
      }

      return tx.language.findUnique({
        where: { id },
        include: {
          countries: {
            include: {
              country: true,
            },
          },
        },
      });
    });
    if (!language) {
      throw notFoundError("Language not found.", { languageId: id });
    }
    return NextResponse.json(language);
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)), {
      request: req,
      source: "languages.[id].PUT",
      fallbackMessage: "Failed to update language",
    });
  }
}

/**
 * DELETE /api/languages/[id]
 * Deletes a language and its assignments.
 */
async function DELETE_handler(req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> {
  try {
    const { id } = params;
    if (!id) {
      throw badRequestError("Language id is required");
    }

    const provider = await getInternationalizationProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const mongo = await getMongoDb();

      // Remove language from any catalogs that reference it
      await mongo.collection("catalogs").updateMany(
        { languageIds: id },
        { 
          $pull: { languageIds: id } 
        } as unknown as import("mongodb").UpdateFilter<import("mongodb").Document>
      );

      // Delete the language
      const result = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .deleteOne({ id });

      if (result.deletedCount === 0) {
        throw notFoundError("Language not found.", { languageId: id });
      }

      return new Response(null, { status: 204 });
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const existingLanguage = await tx.language.findUnique({
        where: { id },
        select: { id: true },
      });
      if (!existingLanguage) {
        throw notFoundError("Language not found.", { languageId: id });
      }
      await tx.languageCountry.deleteMany({ where: { languageId: id } });
      await tx.catalogLanguage.deleteMany({ where: { languageId: id } });
      await tx.language.delete({ where: { id } });
    });

    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return createErrorResponse(error instanceof Error ? error : new Error(String(error)), {
      request: req,
      source: "languages.[id].DELETE",
      fallbackMessage: "Failed to delete language",
    });
  }
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, { source: "languages.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, { source: "languages.[id].DELETE" });
