import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import {
  ensureInternationalizationDefaults,
  fallbackLanguages,
  defaultLanguages,
  countryMappings,
} from "@/features/internationalization/server";
import { getInternationalizationProvider } from "@/features/internationalization/services/internationalization-provider";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { conflictError, internalError } from "@/shared/errors/app-error";
import { logSystemEvent } from "@/features/observability/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { LanguageWithCountries } from "@/shared/types/internationalization";

export const runtime = "nodejs";

const languageCreateSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
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

type CountryDoc = {
  id: string;
  code: string;
  name: string;
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

const seedMongoLanguages = async (db: Awaited<ReturnType<typeof getMongoDb>>) => {
  const now = new Date();
  const countriesCollection = db.collection("countries");

  for (const language of defaultLanguages) {
    const matchingMappings = countryMappings.filter((mapping: (typeof countryMappings)[number]) =>
      mapping.languageCodes.includes(language.code)
    );

    const countries: LanguageCountryDoc[] = [];
    for (const mapping of matchingMappings) {
      const country = (await countriesCollection.findOne({
        code: mapping.countryCode,
      })) as { id: string; code: string; name: string } | null;
      if (country) {
        countries.push({
          countryId: country.id || mapping.countryCode,
          country: {
            id: country.id || mapping.countryCode,
            code: country.code || mapping.countryCode,
            name: country.name || mapping.countryCode,
          },
        });
      }
    }

    await db.collection<LanguageDoc>(LANGUAGES_COLLECTION).updateOne(
      { code: language.code },
      {
        $setOnInsert: {
          id: language.code,
          code: language.code,
          name: language.name,
          nativeName: language.nativeName,
          countries,
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true }
    );
  }
};

/**
 * GET /api/languages
 * Fetches available languages (seeds defaults if empty).
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const provider = await getInternationalizationProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return createErrorResponse(internalError("MongoDB is not configured."), {
          request: req,
          source: "languages.GET",
        });
      }
      const mongo = await getMongoDb();
      await seedMongoLanguages(mongo);
      const languages = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .find({})
        .sort({ code: 1 })
        .toArray();
      return NextResponse.json(languages as LanguageWithCountries[]);
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(fallbackLanguages);
    }
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await ensureInternationalizationDefaults(tx);
    });
    const languages = await prisma.language.findMany({
      orderBy: { code: "asc" },
      include: {
        countries: {
          include: {
            country: true,
          },
        },
      },
    });
    return NextResponse.json(languages as LanguageWithCountries[]);
  } catch (error) {
    void logSystemEvent({
      level: "error",
      message: "Failed to fetch languages",
      source: "languages.GET",
      error,
      request: req,
    });
    return NextResponse.json(fallbackLanguages);
  }
}

/**
 * POST /api/languages
 * Creates a language with optional country assignments.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, languageCreateSchema, {
      logPrefix: "languages.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const code = data.code.toUpperCase();

    const provider = await getInternationalizationProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const mongo = await getMongoDb();
      const existing = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .findOne({ code });
      if (existing) {
        throw conflictError("Language code already exists.", { code });
      }

      const countryIds = data.countryIds ?? [];
      const uniqueIds = Array.from(new Set(countryIds));
      const countries: LanguageCountryDoc[] = [];

      if (uniqueIds.length > 0) {
        const countriesCollection = mongo.collection("countries");
        for (const countryId of uniqueIds) {
          const country = (await countriesCollection.findOne({ id: countryId })) as unknown as CountryDoc | null;
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

      const now = new Date();
      const doc: LanguageDoc = {
        id: code,
        code,
        name: data.name,
        nativeName: data.nativeName ?? null,
        countries,
        createdAt: now,
        updatedAt: now,
      };
      await mongo.collection<LanguageDoc>(LANGUAGES_COLLECTION).insertOne(doc);
      return NextResponse.json(doc);
    }

    const countryIds = data.countryIds ?? [];
    const uniqueIds = Array.from(new Set(countryIds));
    const existingLanguage = await prisma.language.findUnique({
      where: { code },
      select: { id: true },
    });
    if (existingLanguage) {
      throw conflictError("Language code already exists.", { code });
    }
    const existing = await prisma.country.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry: { id: string }) => entry.id));
    const validIds = uniqueIds.filter((countryId: string) =>
      existingIds.has(countryId)
    );

    const language = await prisma.language.create({
      data: {
        code,
        name: data.name,
        ...(data.nativeName !== undefined && { nativeName: data.nativeName }),
        ...(validIds.length ? {
          countries: {
            createMany: {
              data: validIds.map((countryId: string) => ({ countryId })),
            },
          },
        } : {}),
      },
      include: {
        countries: {
          include: {
            country: true,
          },
        },
      },
    });
    return NextResponse.json(language);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "languages.POST",
      fallbackMessage: "Failed to create language",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "languages.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "languages.POST" });
