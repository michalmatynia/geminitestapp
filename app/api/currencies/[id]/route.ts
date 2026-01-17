import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";

type CurrencyDoc = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
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
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
      const db = await getMongoDb();
      const collection = db.collection<CurrencyDoc>(CURRENCIES_COLLECTION);
      const existing = await collection.findOne({ id });
      if (!existing) {
        return NextResponse.json(
          { error: "Currency not found." },
          { status: 404 }
        );
      }
      if (data.code !== id) {
        const collision = await collection.findOne({ id: data.code });
        if (collision) {
          return NextResponse.json(
            { error: "Currency code already exists." },
            { status: 400 }
          );
        }
        const now = new Date();
        await db
          .collection(PRICE_GROUPS_COLLECTION)
          .updateMany({ currencyId: id }, { $set: { currencyId: data.code } });
        await db.collection(COUNTRIES_COLLECTION).updateMany(
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
      return NextResponse.json(updated?.value ?? null);
    }

    const currency = await prisma.currency.update({
      where: { id },
      data,
    });
    return NextResponse.json(currency);
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
 * DELETE /api/currencies/[id]
 * Deletes a currency.
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
      const priceGroupCount = await db
        .collection(PRICE_GROUPS_COLLECTION)
        .countDocuments({ currencyId: id });
      const countryCount = await db
        .collection(COUNTRIES_COLLECTION)
        .countDocuments({ currencyIds: id });
      if (priceGroupCount > 0 || countryCount > 0) {
        return NextResponse.json(
          { error: "Currency is in use and cannot be deleted." },
          { status: 400 }
        );
      }
      await db.collection(CURRENCIES_COLLECTION).deleteOne({ id });
      return new Response(null, { status: 204 });
    }

    await prisma.currency.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete currency" },
      { status: 500 }
    );
  }
}
