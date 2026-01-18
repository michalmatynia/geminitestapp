import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
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
      // Fall through to fallback currencies.
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
 * GET /api/price-groups
 * Fetches all price groups with currency details.
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
      const currencyMap = await buildCurrencyMap();
      const currencyByCode = new Map(
        Array.from(currencyMap.values()).map((currency) => [
          currency.code,
          currency,
        ])
      );
      const existingPln = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .findOne({ groupId: "PLN" });
      if (!existingPln) {
        const existingDefault = await db
          .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
          .findOne({ isDefault: true });
        const currency = currencyByCode.get("PLN");
        const now = new Date();
        const plnGroup: PriceGroupDoc = {
          id: randomUUID(),
          groupId: "PLN",
          isDefault: !existingDefault,
          name: "PLN",
          description: null,
          currencyId: currency?.id ?? "PLN",
          currencyCode: currency?.code ?? "PLN",
          type: "standard",
          basePriceField: "price",
          sourceGroupId: null,
          priceMultiplier: 1,
          addToPrice: 0,
          createdAt: now,
          updatedAt: now,
        };
        await db
          .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
          .insertOne(plnGroup);
      }
      const groups = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .find({})
        .sort({ name: 1 })
        .toArray();
      const groupMap = new Map(
        groups.map((group) => [group.id, group])
      );
      const normalized = groups.map((group) => ({
        ...group,
        currency: resolveCurrency(
          currencyMap,
          group.currencyId,
          group.currencyCode
        ),
        sourceGroup: group.sourceGroupId
          ? groupMap.get(group.sourceGroupId) ?? null
          : null,
      }));
      return NextResponse.json(normalized);
    }

    await prisma.$transaction(async (tx) => {
      const plnCurrency = await tx.currency.findUnique({
        where: { code: "PLN" },
      });
      if (!plnCurrency) return;

      const existingPln = await tx.priceGroup.findUnique({
        where: { groupId: "PLN" },
      });

      if (!existingPln) {
        const existingDefault = await tx.priceGroup.findFirst({
          where: { isDefault: true },
          select: { id: true },
        });
        await tx.priceGroup.create({
          data: {
            groupId: "PLN",
            isDefault: !existingDefault,
            name: "PLN",
            description: null,
            currencyId: plnCurrency.id,
            type: "standard",
            basePriceField: "price",
            sourceGroupId: null,
            priceMultiplier: 1,
            addToPrice: 0,
          },
        });
      }
    });

    const groups = await prisma.priceGroup.findMany({
      include: {
        currency: true,
        sourceGroup: true,
      },
      orderBy: [{ name: "asc" }],
    });
    return NextResponse.json(groups);
  } catch (_error) {
    return NextResponse.json(
      { error: "Failed to fetch price groups" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/price-groups
 * Creates a price group and enforces a single default group.
 */
export async function POST(req: Request) {
  try {
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
      const existingGroupId = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .findOne({ groupId: data.groupId });
      if (existingGroupId) {
        return NextResponse.json(
          { error: "A price group with this ID already exists." },
          { status: 400 }
        );
      }
      if (data.isDefault) {
        await db
          .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
          .updateMany({}, { $set: { isDefault: false } });
      }
      const currencyMap = await buildCurrencyMap();
      const currency = resolveCurrency(currencyMap, data.currencyId);
      const now = new Date();
      const group: PriceGroupDoc = {
        id: randomUUID(),
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
        createdAt: now,
        updatedAt: now,
      };
      await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .insertOne(group);
      return NextResponse.json({
        ...group,
        currency,
        sourceGroup: null,
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      if (data.isDefault) {
        await tx.priceGroup.updateMany({
          data: { isDefault: false },
        });
      }
      return await tx.priceGroup.create({
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
