import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { fallbackCurrencies } from "@/lib/internationalizationFallback";

const priceGroupSchema = z
  .object({
    groupId: z.string().trim().min(1),
    isDefault: z.boolean().optional(),
    name: z.string().trim().min(1),
    description: z.string().trim().optional().default(""),
    currencyId: z.string().trim().min(1),
    type: z.enum(["standard", "dependent"]),
    basePriceField: z.string().trim().min(1),
    sourceGroupId: z.string().trim().optional().transform((value) => {
      if (!value) return undefined;
      return value;
    }),
    priceMultiplier: z.coerce.number().nonnegative(),
    addToPrice: z.coerce.number().int(),
  })
  .refine(
    (data) => data.type === "standard" || !!data.sourceGroupId,
    {
      message: "Source price group is required for dependent groups",
      path: ["sourceGroupId"],
    }
  );

type CurrencyRecord = {
  id: string;
  code: string;
  name?: string | null;
  symbol?: string | null;
};

type PriceGroupDoc = {
  id: string;
  groupId: string;
  isDefault: boolean;
  name: string;
  description: string | null;
  currencyId: string;
  currencyCode?: string | null;
  type: "standard" | "dependent";
  basePriceField: string;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
  createdAt: Date;
  updatedAt: Date;
};

const PRICE_GROUPS_COLLECTION = "price_groups";

const buildCurrencyMap = async (): Promise<Map<string, CurrencyRecord>> => {
  if (process.env.DATABASE_URL) {
    try {
      const currencies = await prisma.currency.findMany({
        select: { id: true, code: true, name: true, symbol: true },
      });
      return new Map(
        currencies.map((currency) => [currency.id, currency as CurrencyRecord])
      );
    } catch {
      // Ignore and fall back to defaults.
    }
  }
  return new Map(
    fallbackCurrencies.map((currency) => [currency.id, currency])
  );
};

const resolveCurrency = (
  map: Map<string, CurrencyRecord>,
  currencyId: string,
  currencyCode?: string | null
): CurrencyRecord => {
  if (currencyId && map.has(currencyId)) {
    return map.get(currencyId)!;
  }
  if (currencyCode) {
    return {
      id: currencyId || currencyCode,
      code: currencyCode,
      name: currencyCode,
      symbol: null,
    };
  }
  return {
    id: currencyId,
    code: currencyId,
    name: currencyId,
    symbol: null,
  };
};

/**
 * PUT /api/price-groups/[id]
 * Updates a price group and enforces a single default group.
 */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const data = priceGroupSchema.parse(body);

    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        return NextResponse.json(
          { error: "MongoDB is not configured." },
          { status: 500 }
        );
      }
      const db = await getMongoDb();
      const current = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .findOne({ id });
      if (!current) {
        return NextResponse.json(
          { error: "Price group not found." },
          { status: 404 }
        );
      }
      const existingGroupId = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .findOne({ groupId: data.groupId, id: { $ne: id } });
      if (existingGroupId) {
        return NextResponse.json(
          { error: "A price group with this ID already exists." },
          { status: 400 }
        );
      }
      if (data.isDefault) {
        await db
          .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
          .updateMany({ id: { $ne: id } }, { $set: { isDefault: false } });
      }
      const currencyMap = await buildCurrencyMap();
      const currency = resolveCurrency(currencyMap, data.currencyId);
      const updateDoc = {
        groupId: data.groupId,
        isDefault: data.isDefault ?? false,
        name: data.name,
        description: data.description || null,
        currencyId: data.currencyId,
        currencyCode: currency.code,
        type: data.type,
        basePriceField: data.basePriceField,
        sourceGroupId: data.sourceGroupId ?? null,
        priceMultiplier: data.priceMultiplier,
        addToPrice: data.addToPrice,
        updatedAt: new Date(),
      };
      await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .updateOne({ id }, { $set: updateDoc });
      const updated = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .findOne({ id });
      return NextResponse.json({
        ...(updated ?? current),
        currency,
        sourceGroup: updateDoc.sourceGroupId
          ? await db
              .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
              .findOne({ id: updateDoc.sourceGroupId })
          : null,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.priceGroup.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }
      return await tx.priceGroup.update({
        where: { id },
        data: {
          groupId: data.groupId,
          isDefault: data.isDefault ?? false,
          name: data.name,
          description: data.description || null,
          currencyId: data.currencyId,
          type: data.type,
          basePriceField: data.basePriceField,
          sourceGroupId: data.sourceGroupId,
          priceMultiplier: data.priceMultiplier,
          addToPrice: data.addToPrice,
        },
      });
    });

    return NextResponse.json(result);
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
 * DELETE /api/price-groups/[id]
 * Deletes a price group.
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
      const total = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .countDocuments();
      if (total <= 1) {
        return NextResponse.json(
          { error: "At least one price group is required." },
          { status: 400 }
        );
      }
      await db.collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION).deleteOne({ id });
      return new Response(null, { status: 204 });
    }

    const total = await prisma.priceGroup.count();
    if (total <= 1) {
      return NextResponse.json(
        { error: "At least one price group is required." },
        { status: 400 }
      );
    }
    await prisma.priceGroup.delete({ where: { id } });
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Failed to delete price group" },
      { status: 500 }
    );
  }
}
