import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

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
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      const countries = db.collection<CountryDoc>(COUNTRIES_COLLECTION);
      const existing = await countries.findOne({ id });
      if (!existing) {
        return NextResponse.json(
          { error: "Country not found." },
          { status: 404 }
        );
      }
      if (countryData.code !== id) {
        const collision = await countries.findOne({ id: countryData.code });
        if (collision) {
          return NextResponse.json(
            { error: "Country code already exists." },
            { status: 400 }
          );
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
        updated?.value ? normalizeCountryResponse(updated.value, currencyMap) : null
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
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/countries/[id]
 * Deletes a country.
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      await db.collection(COUNTRIES_COLLECTION).deleteOne({ id });
      return new Response(null, { status: 204 });
    }

    await prisma.country.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete country" },
      { status: 500 }
    );
  }
}
