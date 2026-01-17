import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { defaultCurrencies } from "@/lib/internationalizationDefaults";
import { fallbackCurrencies } from "@/lib/internationalizationFallback";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

export const runtime = "nodejs";

const currencySchema = z.object({
  code: z.enum(["USD", "EUR", "PLN", "GBP", "SEK"]),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).optional(),
});

type CurrencyDoc = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const CURRENCIES_COLLECTION = "currencies";

const seedMongoCurrencies = async (db: Awaited<ReturnType<typeof getMongoDb>>) => {
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
};

/**
 * GET /api/currencies
 * Fetches all currencies (and ensures defaults exist).
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
      await seedMongoCurrencies(mongo);
      const currencies = await mongo
        .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
        .find({})
        .sort({ code: 1 })
        .toArray();
      return NextResponse.json(currencies);
    }
    if (!process.env.DATABASE_URL) {
      return NextResponse.json(fallbackCurrencies);
    }
    await prisma.currency.createMany({
      data: defaultCurrencies,
      skipDuplicates: true,
    });

    const currencies = await prisma.currency.findMany({
      orderBy: { code: "asc" },
    });

    return NextResponse.json(currencies);
  } catch (error) {
    const errorId = randomUUID();
    console.error("[currencies][GET] Failed to fetch currencies", {
      errorId,
      error,
    });
    return NextResponse.json(fallbackCurrencies);
  }
}

/**
 * POST /api/currencies
 * Creates a currency.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = currencySchema.parse(body);

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
        .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
        .findOne({ code: data.code });
      if (existing) {
        return NextResponse.json(
          { error: "Currency code already exists." },
          { status: 400 }
        );
      }
      const now = new Date();
      const doc: CurrencyDoc = {
        id: data.code,
        code: data.code,
        name: data.name,
        symbol: data.symbol ?? null,
        createdAt: now,
        updatedAt: now,
      };
      await mongo.collection<CurrencyDoc>(CURRENCIES_COLLECTION).insertOne(doc);
      return NextResponse.json(doc);
    }

    // Ensure TS sees `code` as Prisma's enum type (matches schema)
    const currency = await prisma.currency.create({
      data: data as unknown as Prisma.CurrencyCreateInput,
    });

    return NextResponse.json(currency);
  } catch (error: unknown) {
    const errorId = randomUUID();

    if (error instanceof z.ZodError) {
      console.warn("[currencies][POST] Invalid payload", {
        errorId,
        issues: error.flatten(),
      });
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten(), errorId },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      console.error("[currencies][POST] Failed to create currency", {
        errorId,
        message: error.message,
      });
      return NextResponse.json(
        { error: error.message, errorId },
        { status: 400 }
      );
    }

    console.error("[currencies][POST] Unknown error", { errorId, error });
    return NextResponse.json(
      { error: "An unknown error occurred", errorId },
      { status: 400 }
    );
  }
}
