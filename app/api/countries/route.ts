import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureInternationalizationDefaults } from "@/lib/seedInternationalization";
import { fallbackCountries } from "@/lib/internationalizationFallback";
import {
  countryMappings,
  defaultCountries,
  defaultCurrencies,
} from "@/lib/internationalizationDefaults";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";
import type { CountryCode } from "@prisma/client";

export const runtime = "nodejs";

const countrySchema = z.object({
  code: z.enum(["PL", "DE", "GB", "US", "SE"]),
  name: z.string().trim().min(1),
  currencyIds: z.array(z.string()).optional(),
});

type CurrencyDoc = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type CountryDoc = {
  id: string;
  code: string;
  name: string;
  currencyIds?: string[];
  createdAt: Date;
  updatedAt: Date;
};

const CURRENCIES_COLLECTION = "currencies";
const COUNTRIES_COLLECTION = "countries";

const seedMongoInternationalization = async (
  db: Awaited<ReturnType<typeof getMongoDb>>
) => {
  const now = new Date();
  await db.collection<CurrencyDoc>(CURRENCIES_COLLECTION).bulkWrite(
    defaultCurrencies.map((currency) => ({
      updateOne: {
        filter: { id: currency.code },
        update: {
          $setOnInsert: {
            id: currency.code,
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol ?? null,
            createdAt: now,
          },
          $set: { updatedAt: now },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const currencyByCountry = new Map<string, string[]>();
  for (const mapping of countryMappings) {
    const entries = currencyByCountry.get(mapping.countryCode) ?? [];
    if (!entries.includes(mapping.currencyCode)) {
      entries.push(mapping.currencyCode);
    }
    currencyByCountry.set(mapping.countryCode, entries);
  }

  await db.collection<CountryDoc>(COUNTRIES_COLLECTION).bulkWrite(
    defaultCountries.map((country) => ({
      updateOne: {
        filter: { id: country.code },
        update: {
          $setOnInsert: {
            id: country.code,
            code: country.code,
            name: country.name,
            currencyIds: currencyByCountry.get(country.code) ?? [],
            createdAt: now,
          },
          $set: { updatedAt: now },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
};

const normalizeCountryResponse = (
  country: CountryDoc,
  currencyMap: Map<string, CurrencyDoc>
) => ({
  id: country.id,
  code: country.code,
  name: country.name,
  currencies: (country.currencyIds ?? [])
    .map((currencyId) => {
      const currency = currencyMap.get(currencyId);
      if (!currency) return null;
      return {
        currencyId,
        currency: {
          id: currency.id,
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol ?? null,
        },
      };
    })
    .filter(Boolean),
});

/**
 * GET /api/countries
 * Fetches all countries (and ensures defaults exist).
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
      const db = await getMongoDb();
      await seedMongoInternationalization(db);
      const countries = await db
        .collection<CountryDoc>(COUNTRIES_COLLECTION)
        .find({})
        .sort({ name: 1 })
        .toArray();
      const currencyIds = Array.from(
        new Set(countries.flatMap((country) => country.currencyIds ?? []))
      );
      const currencies = currencyIds.length
        ? await db
            .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
            .find({ id: { $in: currencyIds } })
            .toArray()
        : [];
      const currencyMap = new Map(
        currencies.map((currency) => [currency.id, currency])
      );
      const normalized = countries.map((country) =>
        normalizeCountryResponse(country, currencyMap)
      );
      return NextResponse.json(normalized);
    }

    if (!process.env.DATABASE_URL) {
      return NextResponse.json(fallbackCountries);
    }
    await prisma.$transaction(async (tx) => {
      await ensureInternationalizationDefaults(tx);
    });

    const countries = await prisma.country.findMany({
      orderBy: { name: "asc" },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
    });

    return NextResponse.json(countries);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[countries][GET] Failed to fetch countries", {
      errorId,
      error,
    });
    return NextResponse.json(fallbackCountries);
  }
}

/**
 * POST /api/countries
 * Creates a country.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = countrySchema.parse(body);

    const { currencyIds, ...countryData } = data;

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      const existing = await db
        .collection<CountryDoc>(COUNTRIES_COLLECTION)
        .findOne({ id: countryData.code });
      if (existing) {
        return NextResponse.json(
          { error: "Country code already exists." },
          { status: 400 }
        );
      }
      const requestedCurrencyIds = Array.from(
        new Set(currencyIds ?? [])
      );
      const currencyDocs = requestedCurrencyIds.length
        ? await db
            .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
            .find({ id: { $in: requestedCurrencyIds } })
            .toArray()
        : [];
      const validCurrencyIds = new Set(
        currencyDocs.map((currency) => currency.id)
      );
      const now = new Date();
      const country: CountryDoc = {
        id: countryData.code,
        code: countryData.code,
        name: countryData.name,
        currencyIds: requestedCurrencyIds.filter((id) =>
          validCurrencyIds.has(id)
        ),
        createdAt: now,
        updatedAt: now,
      };
      await db.collection<CountryDoc>(COUNTRIES_COLLECTION).insertOne(country);
      const currencyMap = new Map(
        currencyDocs.map((currency) => [currency.id, currency])
      );
      return NextResponse.json(
        normalizeCountryResponse(country, currencyMap)
      );
    }

    const country = await prisma.country.create({
      data: {
        // countryData.code is a zod enum union; Prisma code is an enum too (compatible)
        ...(countryData as unknown as { code: CountryCode; name: string }),
        currencies: currencyIds?.length
          ? {
              createMany: {
                data: currencyIds.map((currencyId) => ({ currencyId })),
              },
            }
          : undefined,
      },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
    });

    return NextResponse.json(country);
  } catch (error: unknown) {
    const errorId = randomUUID();

    if (error instanceof z.ZodError) {
      console.warn("[countries][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("[countries][POST] Failed to create country", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }

    console.error("[countries][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
