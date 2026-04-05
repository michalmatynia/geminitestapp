import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getProducerRepository,
  getTagRepository,
  getParameterRepository,
} from '@/features/products/server';
import { paginationQuerySchema, type PaginationQuery } from '@/shared/contracts/base';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type {
  MongoCurrencyDoc,
  MongoPriceGroupDoc,
} from '@/shared/lib/db/services/database-sync-types';
import { listSimpleParameters } from '@/shared/lib/products/services/simple-parameter-service';

export const querySchema = paginationQuerySchema.extend({
  catalogId: optionalTrimmedQueryString(),
});

const parseObjectPayload = async (
  req: NextRequest,
  ctx?: ApiHandlerContext
): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; response: Response }> => {
  if (ctx?.body && typeof ctx.body === 'object' && !Array.isArray(ctx.body)) {
    return { ok: true, data: ctx.body as Record<string, unknown> };
  }

  return await parseObjectJsonBody(req, {
    logPrefix: 'products.metadata.[type]',
  });
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

const optionalTrimmedStringSchema = z.preprocess((value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().optional());

const optionalNumberSchema = z.preprocess((value: unknown): unknown => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : value;
}, z.number().finite().optional());

export const priceGroupCreatePayloadSchema = z.object({
  groupId: optionalTrimmedStringSchema,
  name: optionalTrimmedStringSchema,
  description: optionalTrimmedStringSchema,
  currencyId: optionalTrimmedStringSchema,
  currencyCode: optionalTrimmedStringSchema,
  type: z.preprocess((value: unknown): unknown => {
    if (typeof value !== 'string') return value;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
  }, z.enum(['standard', 'dependent']).optional()),
  basePriceField: optionalTrimmedStringSchema,
  sourceGroupId: optionalTrimmedStringSchema,
  isDefault: z.boolean().optional(),
  priceMultiplier: optionalNumberSchema,
  addToPrice: optionalNumberSchema,
}).passthrough();

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
  };
};

export async function GET_products_metadata_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const query = (_ctx.query ?? paginationQuerySchema.parse({})) as PaginationQuery & {
    catalogId?: string;
  };
  const catalogId = query.catalogId ?? '';
  const { page, pageSize } = query;
  const skip = (page - 1) * pageSize;

  if (type === 'producers') {
    const repo = await getProducerRepository();
    return NextResponse.json(await repo.listProducers({ skip, limit: pageSize }));
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    return NextResponse.json(await repo.listTags({ skip, limit: pageSize }));
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    return NextResponse.json(await repo.listParameters({ skip, limit: pageSize }));
  }
  if (type === 'simple-parameters') {
    if (!catalogId) throw badRequestError('catalogId is required for simple-parameters');
    return NextResponse.json(await listSimpleParameters({ catalogId }));
  }
  if (type === 'price-groups') {
    const mongo = await getMongoDb();
    const groups = (await mongo
      .collection<MongoPriceGroupDoc>('price_groups')
      .find({})
      .sort({ name: 1 })
      .skip(skip)
      .limit(pageSize)
      .toArray()) as MongoPriceGroupDoc[];
    const currencyIds = Array.from(
      new Set(
        groups
          .map((group: MongoPriceGroupDoc) => group.currencyId ?? '')
          .filter((value: string): value is string => value.trim().length > 0)
      )
    );
    const currencyDocs = (
      currencyIds.length
        ? await mongo.collection<MongoCurrencyDoc>('currencies').find({ id: { $in: currencyIds } }).toArray()
        : []
    ) as MongoCurrencyDoc[];
    const currencyById = new Map(
      currencyDocs.map((currency: MongoCurrencyDoc) => [String(currency.id ?? ''), currency])
    );
    return NextResponse.json(
      groups.map((group: MongoPriceGroupDoc) => mapMongoPriceGroupResponse(group, currencyById))
    );
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
    const parsed = await parseObjectPayload(req, _ctx);
    if (!parsed.ok) {
      return parsed.response;
    }
    const payload = priceGroupCreatePayloadSchema.parse(parsed.data);
    const mongo = await getMongoDb();
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
    const typeValue = readString(payload, 'type');
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
      const existing = await mongo.collection<MongoPriceGroupDoc>('price_groups').findOne({ groupId });
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
    const insertDoc: MongoPriceGroupDoc = {
      _id: new ObjectId(),
      ...created,
    };
    await mongo.collection<MongoPriceGroupDoc>('price_groups').insertOne(insertDoc);

    const currencyById = new Map([[String(currencyDoc.id ?? currencyDoc.code ?? ''), currencyDoc]]);
    return NextResponse.json(mapMongoPriceGroupResponse(created, currencyById));
  }

  throw badRequestError(`POST not implemented for products metadata type: ${type}`);
}
