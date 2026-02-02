import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import type { Prisma } from "@prisma/client";
import {
  defaultCurrencies,
  fallbackCurrencies,
} from "@/features/internationalization/server";
import { getInternationalizationProvider } from "@/features/internationalization/services/internationalization-provider";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { conflictError, internalError } from "@/shared/errors/app-error";
import { logSystemEvent } from "@/features/observability/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { CurrencyRecord } from "@/shared/types/internationalization";

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

const seedMongoCurrencies = async (db: Awaited<ReturnType<typeof getMongoDb>>): Promise<void> => {
  const now = new Date();
  await db.collection<CurrencyDoc>(CURRENCIES_COLLECTION).bulkWrite(
    defaultCurrencies.map((currency: (typeof defaultCurrencies)[number]) => ({
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
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const provider = await getInternationalizationProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return createErrorResponse(internalError("MongoDB is not configured."), {
          request: req,
          source: "currencies.GET",
        });
      }
      const mongo = await getMongoDb();
      await seedMongoCurrencies(mongo);
      const currencies = await mongo
        .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
        .find({})
        .sort({ code: 1 })
        .toArray();
      return NextResponse.json(currencies as unknown as CurrencyRecord[]);
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

    return NextResponse.json(currencies as CurrencyRecord[]);
  } catch (error) {
    void logSystemEvent({
      level: "error",
      message: "Failed to fetch currencies",
      source: "currencies.GET",
      error,
      request: req,
    });
    return NextResponse.json(fallbackCurrencies);
  }
}

/**
 * POST /api/currencies
 * Creates a currency.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, currencySchema, {
      logPrefix: "currencies.POST",
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
      const existing = await mongo
        .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
        .findOne({ code: data.code });
      if (existing) {
        throw conflictError("Currency code already exists.", { code: data.code });
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

    if (!process.env.DATABASE_URL) {
      throw internalError("Postgres product store is not configured.");
    }

    const existing = await prisma.currency.findUnique({
      where: { code: data.code },
      select: { id: true },
    });
    if (existing) {
      throw conflictError("Currency code already exists.", { code: data.code });
    }

    // Ensure TS sees `code` as Prisma's enum type (matches schema)
    const currency = await prisma.currency.create({
      data: data as unknown as Prisma.CurrencyCreateInput,
    });

    return NextResponse.json(currency);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "currencies.POST",
      fallbackMessage: "Failed to create currency",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "currencies.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "currencies.POST" });
