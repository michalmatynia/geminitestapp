import { randomUUID } from 'crypto';

import { WithId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { fallbackCurrencies } from '@/features/internationalization/server';
import { getProductDataProvider } from '@/features/products/server';
import { parseJsonBody } from '@/features/products/server';
import type { PriceGroupWithDetails } from '@/features/products/types';
import { conflictError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/types/api/api';

import type { Prisma } from '@prisma/client';

const priceGroupSchema = z
  .object({
    groupId: z.string().trim().min(1),
    isDefault: z.boolean().optional(),
    name: z.string().trim().min(1),
    description: z.string().trim().optional().default(''),
    currencyId: z.string().trim().min(1),
    type: z.enum(['standard', 'dependent']),
    basePriceField: z.string().trim().min(1),
    sourceGroupId: z.string().trim().optional().transform((value) => {
      if (!value) return undefined;
      return value;
    }),
    priceMultiplier: z.coerce.number().nonnegative(),
    addToPrice: z.coerce.number().int(),
  })
  .refine(
    (data) => data.type === 'standard' || !!data['sourceGroupId'],
    {
      message: 'Source price group is required for dependent groups',
      path: ['sourceGroupId'],
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
  type: 'standard' | 'dependent';
  basePriceField: string;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
  createdAt: Date;
  updatedAt: Date;
};

const PRICE_GROUPS_COLLECTION = 'price_groups';

const buildCurrencyMap = async (): Promise<Map<string, CurrencyRecord>> => {
  if (process.env['DATABASE_URL']) {
    try {
      const currencies = await prisma.currency.findMany({
        select: { id: true, code: true, name: true, symbol: true },
      });
      return new Map(
        currencies.map((currency: { id: string; code: string; name: string | null; symbol: string | null }) => [currency.id, currency as CurrencyRecord])
      );
    } catch {
      // Fall through to fallback currencies.
    }
  }
  return new Map(
    fallbackCurrencies.map((currency: (typeof fallbackCurrencies)[number]) => [currency.id, currency])
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
export async function getPriceGroupsHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const provider = await getProductDataProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) {
      throw internalError('MongoDB is not configured.');
    }
    const db = await getMongoDb();
    const currencyMap = await buildCurrencyMap();
    const currencyByCode = new Map(
      Array.from(currencyMap.values()).map((currency: CurrencyRecord) => [
        currency.code,
        currency,
      ])
    );
    const existingPln = await db
      .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
      .findOne({ groupId: 'PLN' });
    if (!existingPln) {
      const existingDefault = await db
        .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
        .findOne({ isDefault: true });
      const currency = currencyByCode.get('PLN');
      const now = new Date();
      const plnGroup: PriceGroupDoc = {
        id: randomUUID(),
        groupId: 'PLN',
        isDefault: !existingDefault,
        name: 'PLN',
        description: null,
        currencyId: currency?.id ?? 'PLN',
        currencyCode: currency?.code ?? 'PLN',
        type: 'standard',
        basePriceField: 'price',
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
      groups.map((group: WithId<PriceGroupDoc>) => [group.id, group])
    );
    const normalized = groups.map((group: WithId<PriceGroupDoc>) => ({
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
    return NextResponse.json(normalized as unknown as PriceGroupWithDetails[]);
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const plnCurrency = await tx.currency.findUnique({
      where: { code: 'PLN' },
    });
    if (!plnCurrency) return;

    const existingPln = await tx.priceGroup.findUnique({
      where: { groupId: 'PLN' },
    });

    if (!existingPln) {
      const existingDefault = await tx.priceGroup.findFirst({
        where: { isDefault: true },
        select: { id: true },
      });
      await tx.priceGroup.create({
        data: {
          groupId: 'PLN',
          isDefault: !existingDefault,
          name: 'PLN',
          description: null,
          currencyId: plnCurrency.id,
          type: 'standard',
          basePriceField: 'price',
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
    orderBy: [{ name: 'asc' }],
  });
  return NextResponse.json(groups as unknown as PriceGroupWithDetails[]);
}

/**
 * POST /api/price-groups
 * Creates a price group and enforces a single default group.
 */
export async function postPriceGroupsHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext
): Promise<Response> {
  const parsed = await parseJsonBody(req, priceGroupSchema, {
    logPrefix: 'priceGroups.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const provider = await getProductDataProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) {
      throw internalError('MongoDB is not configured.');
    }
    const db = await getMongoDb();
    const existingGroupId = await db
      .collection<PriceGroupDoc>(PRICE_GROUPS_COLLECTION)
      .findOne({ groupId: data.groupId });
    if (existingGroupId) {
      throw conflictError('A price group with this ID already exists.', {
        groupId: data.groupId,
      });
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
      sourceGroupId: data['sourceGroupId'] ?? null,
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

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        ...(data['sourceGroupId'] !== undefined && { sourceGroupId: data['sourceGroupId'] }),
        priceMultiplier: data.priceMultiplier,
        addToPrice: data.addToPrice,
      },
    });
  });

  return NextResponse.json(result);
}
