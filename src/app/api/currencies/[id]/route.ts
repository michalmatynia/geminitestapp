export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { getInternationalizationProvider } from "@/features/internationalization/services/internationalization-provider";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import {
  badRequestError,
  configurationError,
  notFoundError,
  duplicateEntryError,
} from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { CurrencyRecord } from "@/shared/types/internationalization";

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
const PRICE_GROUPS_COLLECTION = "price_groups";
const COUNTRIES_COLLECTION = "countries";

const currencySchema = z.object({
  code: z.enum(["USD", "EUR", "PLN", "GBP", "SEK"]),
  name: z.string().trim().min(1),
  symbol: z.string().trim().min(1).optional(),
});

/**
 * PUT /api/currencies/[id]
 * Updates a currency.
 */
async function PUT_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;
  const data = ctx.body as z.infer<typeof currencySchema>;

  const provider = await getInternationalizationProvider();
  if (provider === "mongodb") {
    if (!process.env["MONGODB_URI"]) {
      throw configurationError("MongoDB is not configured");
    }
    const db = await getMongoDb();
    const collection = db.collection<CurrencyDoc>(CURRENCIES_COLLECTION);
    const existing = await collection.findOne({ id });
    if (!existing) {
      throw notFoundError("Currency not found");
    }
    if (data.code !== id) {
      const collision = await collection.findOne({ id: data.code });
      if (collision) {
        throw duplicateEntryError("Currency code already exists");
      }
      const now = new Date();
      await db
        .collection(PRICE_GROUPS_COLLECTION)
        .updateMany({ currencyId: id }, { $set: { currencyId: data.code } });
      await db.collection<CountryDoc>(COUNTRIES_COLLECTION).updateMany(
        { currencyIds: id },
        {
          $pull: { currencyIds: id },
          $addToSet: { currencyIds: data.code },
          $set: { updatedAt: now },
        }
      );
    }
    const now = new Date();
    const updated = await collection.findOneAndUpdate(
      { id },
      {
        $set: {
          id: data.code,
          code: data.code,
          name: data.name,
          symbol: data.symbol ?? null,
          updatedAt: now,
        },
      },
      { returnDocument: "after" }
    );
    return NextResponse.json((updated ?? null) as CurrencyRecord | null);
  }

  const currency = await prisma.currency.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      ...(data.symbol !== undefined && { symbol: data.symbol }),
    },
  });
  return NextResponse.json(currency as unknown as CurrencyRecord);
}

/**
 * DELETE /api/currencies/[id]
 * Deletes a currency.
 */
async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string }
): Promise<Response> {
  const id = params.id;

  const provider = await getInternationalizationProvider();
  if (provider === "mongodb") {
    if (!process.env["MONGODB_URI"]) {
      throw configurationError("MongoDB is not configured");
    }
    const db = await getMongoDb();
    const priceGroupCount = await db
      .collection(PRICE_GROUPS_COLLECTION)
      .countDocuments({ currencyId: id });
    const countryCount = await db
      .collection(COUNTRIES_COLLECTION)
      .countDocuments({ currencyIds: id });
    if (priceGroupCount > 0 || countryCount > 0) {
      throw badRequestError("Currency is in use and cannot be deleted", {
        priceGroupCount,
        countryCount,
      });
    }
    await db.collection(CURRENCIES_COLLECTION).deleteOne({ id });
    return new Response(null, { status: 204 });
  }

  await prisma.currency.delete({ where: { id } });
  return new Response(null, { status: 204 });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: "currencies.[id].PUT",
  parseJsonBody: true,
  bodySchema: currencySchema,
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: "currencies.[id].DELETE",
});
