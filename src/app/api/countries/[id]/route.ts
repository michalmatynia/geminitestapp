import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { getProductDataProvider } from "@/features/products";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import {
  configurationError,
  notFoundError,
  duplicateEntryError,
} from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

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
 * PUT /api/countries/[id]
 * Updates a country.
 */
async function PUT_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await req.json()) as unknown;
    const data = countrySchema.parse(body);
    const { currencyIds, ...countryData } = data;

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw configurationError("MongoDB is not configured");
      }
      const db = await getMongoDb();
      const countries = db.collection<CountryDoc>(COUNTRIES_COLLECTION);
      const existing = await countries.findOne({ id });
      if (!existing) {
        throw notFoundError("Country not found");
      }
      if (countryData.code !== id) {
        const collision = await countries.findOne({ id: countryData.code });
        if (collision) {
          throw duplicateEntryError("Country code already exists");
        }
      }
      let nextCurrencyIds = existing.currencyIds ?? [];
      let currencyDocs: CurrencyDoc[] = [];
      if (currencyIds) {
        const requestedCurrencyIds = Array.from(new Set(currencyIds));
        currencyDocs = requestedCurrencyIds.length
          ? await db
              .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
              .find({ id: { $in: requestedCurrencyIds } })
              .toArray()
          : [];
        const validCurrencyIds = new Set(
          currencyDocs.map((currency) => currency.id)
        );
        nextCurrencyIds = requestedCurrencyIds.filter((currencyId) =>
          validCurrencyIds.has(currencyId)
        );
      } else if (nextCurrencyIds.length) {
        currencyDocs = await db
          .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
          .find({ id: { $in: nextCurrencyIds } })
          .toArray();
      }
      const now = new Date();
      const updated = await countries.findOneAndUpdate(
        { id },
        {
          $set: {
            id: countryData.code,
            code: countryData.code,
            name: countryData.name,
            ...(currencyIds ? { currencyIds: nextCurrencyIds } : {}),
            updatedAt: now,
          },
        },
        { returnDocument: "after" }
      );
      const currencyMap = new Map(
        currencyDocs.map((currency) => [currency.id, currency])
      );
      return NextResponse.json(
        updated ? normalizeCountryResponse(updated, currencyMap) : null
      );
    }

    const country = await prisma.$transaction(async (tx) => {
      const updated = await tx.country.update({
        where: { id },
        data: {
          ...countryData,
        },
      });

      if (currencyIds) {
        await tx.countryCurrency.deleteMany({ where: { countryId: id } });
        if (currencyIds.length > 0) {
          await tx.countryCurrency.createMany({
            data: currencyIds.map((currencyId) => ({ countryId: id, currencyId })),
          });
        }
      }

      return tx.country.findUnique({
        where: { id: updated.id },
        include: {
          currencies: {
            include: {
              currency: true,
            },
          },
        },
      });
    });
    return NextResponse.json(country);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "countries.[id].PUT",
      fallbackMessage: "Failed to update country",
    });
  }
}

/**
 * DELETE /api/countries/[id]
 * Deletes a country.
 */
async function DELETE_handler(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw configurationError("MongoDB is not configured");
      }
      const db = await getMongoDb();
      await db.collection(COUNTRIES_COLLECTION).deleteOne({ id });
      return new Response(null, { status: 204 });
    }

    await prisma.country.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "countries.[id].DELETE",
      fallbackMessage: "Failed to delete country",
    });
  }
}

export const PUT = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => PUT_handler(req, { params: Promise.resolve(params) }), { source: "countries.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req, _ctx, params) => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "countries.[id].DELETE" });
