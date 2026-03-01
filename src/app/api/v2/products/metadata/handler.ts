import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { CurrencyCode } from '@prisma/client';
import {
  getProducerRepository,
  getTagRepository,
  getParameterRepository,
  getProductDataProvider,
} from '@/features/products/server';
import { listSimpleParameters } from '@/shared/lib/products/services/simple-parameter-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type {
  MongoCurrencyDoc,
  MongoPriceGroupDoc,
} from '@/shared/lib/db/services/database-sync-types';

const unwrapPayload = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const nested = record['data'];
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return record;
};

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const raw = record[key];
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readNumber = (record: Record<string, unknown>, key: string): number | null => {
  const raw = record[key];
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const readBoolean = (record: Record<string, unknown>, key: string): boolean | null => {
  const raw = record[key];
  if (typeof raw === 'boolean') return raw;
  return null;
};

const normalizeGroupId = (value: string): string => {
  const normalized = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^A-Za-z0-9_-]/g, '')
    .toUpperCase();
  return normalized || 'PRICE_GROUP';
};

const toIso = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return undefined;
};

const resolveGroupType = (
  value: unknown,
  sourceGroupId: string | null
): 'standard' | 'dependent' => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'standard' || normalized === 'dependent') {
      return normalized;
    }
  }
  return sourceGroupId ? 'dependent' : 'standard';
};

const mapPriceGroupResponse = <
  T extends {
    type: string;
    sourceGroupId: string | null;
    currencyId: string;
    currency?: { code: string } | null;
  },
>(
    group: T
  ): T & { currencyCode: string; groupType: 'standard' | 'dependent' } => ({
    ...group,
    currencyCode: group.currency?.code ?? group.currencyId,
    groupType: resolveGroupType(group.type, group.sourceGroupId),
  });

const mapMongoPriceGroupResponse = (
  group: MongoPriceGroupDoc,
  currencyById: Map<string, MongoCurrencyDoc>
): {
  id: string;
  groupId: string;
  isDefault: boolean;
  name: string;
  description: string | null;
  currencyId: string;
  type: string;
  basePriceField: string;
  sourceGroupId: string | null;
  priceMultiplier: number;
  addToPrice: number;
  createdAt?: string;
  updatedAt?: string;
  currency: { id: string; code: string; name: string; symbol: string | null };
  currencyCode: string;
  groupType: 'standard' | 'dependent';
} => {
  const id = String(group.id ?? group.groupId ?? '');
  const currencyId = String(group.currencyId ?? '');
  const currency = currencyById.get(currencyId);
  const currencyCode = String(currency?.code ?? currencyId);
  const currencyName = String(currency?.name ?? currencyCode);
  const currencySymbol = currency?.symbol ?? null;
  const type = String(group.type ?? 'standard');
  const sourceGroupId = group.sourceGroupId ?? null;
  return {
    id,
    groupId: String(group.groupId ?? id),
    isDefault: Boolean(group.isDefault),
    name: String(group.name ?? group.groupId ?? id),
    description: group.description ?? null,
    currencyId,
    type,
    basePriceField: String(group.basePriceField ?? 'price'),
    sourceGroupId,
    priceMultiplier: Number.isFinite(group.priceMultiplier) ? Number(group.priceMultiplier) : 1,
    addToPrice: Number.isFinite(group.addToPrice) ? Number(group.addToPrice) : 0,
    createdAt: toIso(group.createdAt),
    updatedAt: toIso(group.updatedAt),
    currency: {
      id: currencyId,
      code: currencyCode,
      name: currencyName,
      symbol: currencySymbol,
    },
    currencyCode,
    groupType: resolveGroupType(type, sourceGroupId),
  };
};

const resolveCurrencyId = async (payload: Record<string, unknown>): Promise<string> => {
  const explicitCurrencyId = readString(payload, 'currencyId');
  if (explicitCurrencyId) {
    const currencyById = await prisma.currency.findUnique({
      where: { id: explicitCurrencyId },
      select: { id: true },
    });
    if (currencyById) return currencyById.id;
  }

  const rawCurrencyCode = readString(payload, 'currencyCode');
  if (rawCurrencyCode) {
    const normalizedCode = rawCurrencyCode.toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCode)) {
      throw badRequestError(`Invalid currencyCode for price-group: ${rawCurrencyCode}`);
    }
    const currencyByCode = await prisma.currency.findUnique({
      where: { code: normalizedCode as CurrencyCode },
      select: { id: true },
    });
    if (currencyByCode) return currencyByCode.id;
  }

  throw badRequestError('currencyId or currencyCode is required for price-groups');
};

const resolveUniqueGroupId = async (payload: Record<string, unknown>): Promise<string> => {
  const explicitGroupId = readString(payload, 'groupId');
  const fallbackFromName = readString(payload, 'name');
  const fallbackFromCurrency = readString(payload, 'currencyCode');
  const baseGroupId = normalizeGroupId(
    explicitGroupId ?? fallbackFromCurrency ?? fallbackFromName ?? 'PRICE_GROUP'
  );

  let candidate = baseGroupId;
  let sequence = 2;
  while (sequence < 1000) {
    const existing = await prisma.priceGroup.findUnique({
      where: { groupId: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    candidate = `${baseGroupId}_${sequence}`;
    sequence += 1;
  }
  return `${baseGroupId}_${randomUUID()}`;
};

export async function GET_products_metadata_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const searchParams = _req.nextUrl.searchParams;
  const catalogId = searchParams.get('catalogId') || '';

  if (type === 'producers') {
    const repo = await getProducerRepository();
    return NextResponse.json(await repo.listProducers({}));
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    return NextResponse.json(await repo.listTags({}));
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    return NextResponse.json(await repo.listParameters({}));
  }
  if (type === 'simple-parameters') {
    if (!catalogId) throw badRequestError('catalogId is required for simple-parameters');
    return NextResponse.json(await listSimpleParameters({ catalogId }));
  }
  if (type === 'price-groups') {
    const provider = await getProductDataProvider();
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const groups = (await mongo
        .collection<MongoPriceGroupDoc>('price_groups')
        .find({})
        .sort({ name: 1 })
        .toArray()) as MongoPriceGroupDoc[];
      const currencyIds = Array.from(
        new Set(
          groups
            .map((group: MongoPriceGroupDoc) => group.currencyId ?? '')
            .filter((value: string): value is string => value.trim().length > 0)
        )
      );
      const currencyDocs = (currencyIds.length
        ? await mongo
          .collection<MongoCurrencyDoc>('currencies')
          .find({ id: { $in: currencyIds } })
          .toArray()
        : []) as MongoCurrencyDoc[];
      const currencyById = new Map(
        currencyDocs.map((currency: MongoCurrencyDoc) => [String(currency.id ?? ''), currency])
      );
      return NextResponse.json(
        groups.map((group: MongoPriceGroupDoc) => mapMongoPriceGroupResponse(group, currencyById))
      );
    }

    const groups = await prisma.priceGroup.findMany({
      include: { currency: true },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json(groups.map(mapPriceGroupResponse));
  }

  throw badRequestError(`Invalid products metadata type: ${type}`);
}

export async function POST_products_metadata_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;

  if (type === 'price-groups') {
    const provider = await getProductDataProvider();
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const payload = unwrapPayload(await req.json());

      const explicitCurrencyId = readString(payload, 'currencyId');
      const currencyCodeFromPayload = readString(payload, 'currencyCode')?.toUpperCase() ?? null;
      let currencyDoc: MongoCurrencyDoc | null = null;
      if (explicitCurrencyId) {
        currencyDoc = (await mongo.collection<MongoCurrencyDoc>('currencies').findOne({
          $or: [{ id: explicitCurrencyId }, { code: explicitCurrencyId }],
        })) as MongoCurrencyDoc | null;
      }
      if (!currencyDoc && currencyCodeFromPayload) {
        currencyDoc = (await mongo.collection<MongoCurrencyDoc>('currencies').findOne({
          code: currencyCodeFromPayload,
        })) as MongoCurrencyDoc | null;
      }
      if (!currencyDoc) {
        throw badRequestError('currencyId or currencyCode is required for price-groups');
      }

      const sourceGroupId = readString(payload, 'sourceGroupId');
      const typeValue = readString(payload, 'type') ?? readString(payload, 'groupType');
      const groupType = resolveGroupType(typeValue, sourceGroupId);

      if (groupType === 'dependent' && !sourceGroupId) {
        throw badRequestError('Invalid payload. dependent group requires sourceGroupId.');
      }

      const explicitGroupId = readString(payload, 'groupId');
      const fallbackFromName = readString(payload, 'name');
      const fallbackFromCurrency = currencyCodeFromPayload ?? readString(payload, 'currencyCode');
      const baseGroupId = normalizeGroupId(
        explicitGroupId ?? fallbackFromCurrency ?? fallbackFromName ?? 'PRICE_GROUP'
      );

      let groupId = baseGroupId;
      let sequence = 2;
      while (sequence < 1000) {
        const existing = await mongo
          .collection<MongoPriceGroupDoc>('price_groups')
          .findOne({ groupId });
        if (!existing) break;
        groupId = `${baseGroupId}_${sequence}`;
        sequence += 1;
      }

      const now = new Date();
      const created: MongoPriceGroupDoc = {
        id: randomUUID(),
        groupId,
        isDefault: readBoolean(payload, 'isDefault') ?? false,
        name: readString(payload, 'name') ?? groupId,
        description: readString(payload, 'description'),
        currencyId: String(currencyDoc.id ?? currencyDoc.code ?? ''),
        type: groupType,
        basePriceField: readString(payload, 'basePriceField') ?? 'price',
        sourceGroupId,
        priceMultiplier: readNumber(payload, 'priceMultiplier') ?? 1,
        addToPrice: Math.trunc(readNumber(payload, 'addToPrice') ?? 0),
        createdAt: now,
        updatedAt: now,
      };
      await mongo.collection<MongoPriceGroupDoc>('price_groups').insertOne({
        _id: created.id,
        ...created,
      } as unknown as MongoPriceGroupDoc);

      const currencyById = new Map([[String(currencyDoc.id ?? currencyDoc.code ?? ''), currencyDoc]]);
      return NextResponse.json(mapMongoPriceGroupResponse(created, currencyById));
    }

    const payload = unwrapPayload(await req.json());
    const currencyId = await resolveCurrencyId(payload);
    const sourceGroupId = readString(payload, 'sourceGroupId');
    const typeValue = readString(payload, 'type') ?? readString(payload, 'groupType');
    const groupType = resolveGroupType(typeValue, sourceGroupId);

    if (groupType === 'dependent' && !sourceGroupId) {
      throw badRequestError('Invalid payload. dependent group requires sourceGroupId.');
    }

    const groupId = await resolveUniqueGroupId(payload);
    const name = readString(payload, 'name') ?? groupId;

    const created = await prisma.priceGroup.create({
      data: {
        groupId,
        name,
        description: readString(payload, 'description'),
        currencyId,
        isDefault: readBoolean(payload, 'isDefault') ?? false,
        type: groupType,
        basePriceField: readString(payload, 'basePriceField') ?? 'price',
        sourceGroupId,
        priceMultiplier: readNumber(payload, 'priceMultiplier') ?? 1,
        addToPrice: Math.trunc(readNumber(payload, 'addToPrice') ?? 0),
      },
      include: { currency: true },
    });

    return NextResponse.json(mapPriceGroupResponse(created));
  }

  throw badRequestError(`POST not implemented for products metadata type: ${type}`);
}
