import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureInternationalizationDefaults } from "@/lib/seedInternationalization";
import { fallbackLanguages } from "@/lib/internationalizationFallback";
import { defaultLanguages, countryMappings } from "@/lib/internationalizationDefaults";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

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
    const matchingMappings = countryMappings.filter((mapping) =>
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
export async function GET() {
  try {
    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const mongo = await getMongoDb();
      await seedMongoLanguages(mongo);
      const languages = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .find({})
        .sort({ code: 1 })
        .toArray();
      return NextResponse.json(languages);
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(fallbackLanguages);
    }
    await prisma.$transaction(async (tx) => {
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
    return NextResponse.json(languages);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[languages][GET] Failed to fetch languages", { errorId, error });
    return NextResponse.json(fallbackLanguages);
  }
}

/**
 * POST /api/languages
 * Creates a language with optional country assignments.
 */
export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = (await req.json()) as unknown;
    const data = languageCreateSchema.parse(body);
    const code = data.code.toUpperCase();

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const mongo = await getMongoDb();
      const existing = await mongo
        .collection<LanguageDoc>(LANGUAGES_COLLECTION)
        .findOne({ code });
      if (existing) {
        return NextResponse.json(
          { error: "Language code already exists." },
          { status: 400 }
        );
      }

      const countryIds = data.countryIds ?? [];
      const uniqueIds = Array.from(new Set(countryIds));
      const countries: LanguageCountryDoc[] = [];

      if (uniqueIds.length > 0) {
        const countriesCollection = mongo.collection("countries");
        for (const countryId of uniqueIds) {
          const country = await countriesCollection.findOne({ id: countryId });
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
    const existing = await prisma.country.findMany({
      where: { id: { in: uniqueIds } },
      select: { id: true },
    });
    const existingIds = new Set(existing.map((entry) => entry.id));
    const validIds = uniqueIds.filter((countryId) =>
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
              data: validIds.map((countryId) => ({ countryId })),
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
    if (error instanceof z.ZodError) {
      console.warn("[languages][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      console.error("[languages][POST] Failed to create language", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }
    console.error("[languages][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
