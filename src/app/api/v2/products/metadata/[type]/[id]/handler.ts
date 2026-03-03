import { NextRequest, NextResponse } from 'next/server';
import { CurrencyCode, Prisma } from '@prisma/client';
import {
  getProducerRepository,
  getTagRepository,
  getParameterRepository,
  getProductDataProvider,
  type ProductTagUpdateInput,
  type ProductParameterUpdateInput,
} from '@/features/products/server';
import { deleteSimpleParameter } from '@/shared/lib/products/services/simple-parameter-service';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type {
  MongoCurrencyDoc,
  MongoPriceGroupDoc,
  MongoCatalogDoc,
} from '@/shared/lib/db/services/database-sync-types';
import type { UpdateFilter } from 'mongodb';

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
    if (normalized === 'standard' || normalized === 'dependent') return normalized;
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

const resolveMongoPriceGroup = async (
  idOrGroupId: string
): Promise<MongoPriceGroupDoc | null> => {
  const mongo = await getMongoDb();
  return (await mongo.collection<MongoPriceGroupDoc>('price_groups').findOne({
    $or: [{ id: idOrGroupId }, { groupId: idOrGroupId }],
  })) as MongoPriceGroupDoc | null;
};

const resolvePriceGroupId = async (idOrGroupId: string): Promise<string> => {
  const direct = await prisma.priceGroup.findUnique({
    where: { id: idOrGroupId },
    select: { id: true },
  });
  if (direct) return direct.id;

  const byGroupId = await prisma.priceGroup.findUnique({
    where: { groupId: idOrGroupId },
    select: { id: true },
  });
  if (byGroupId) return byGroupId.id;

  throw notFoundError(`Price group not found: ${idOrGroupId}`);
};

const resolveCurrencyIdFromPayload = async (
  payload: Record<string, unknown>
): Promise<string | null> => {
  const currencyId = readString(payload, 'currencyId');
  if (currencyId) {
    const byId = await prisma.currency.findUnique({
      where: { id: currencyId },
      select: { id: true },
    });
    if (byId) return byId.id;
    throw notFoundError(`Currency not found: ${currencyId}`);
  }

  const currencyCode = readString(payload, 'currencyCode');
  if (!currencyCode) return null;
  const normalizedCode = currencyCode.toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCode)) {
    throw badRequestError(`Invalid currencyCode for price-group: ${currencyCode}`);
  }
  const byCode = await prisma.currency.findUnique({
    where: { code: normalizedCode as CurrencyCode },
    select: { id: true },
  });
  if (!byCode) throw notFoundError(`Currency not found for code: ${normalizedCode}`);
  return byCode.id;
};

export async function GET_products_metadata_id_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;

  if (type === 'producers') {
    const repo = await getProducerRepository();
    const item = await repo.getProducerById(id);
    if (!item) throw notFoundError(`Producer not found: ${id}`);
    return NextResponse.json(item);
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    const item = await repo.getTagById(id);
    if (!item) throw notFoundError(`Tag not found: ${id}`);
    return NextResponse.json(item);
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    const item = await repo.getParameterById(id);
    if (!item) throw notFoundError(`Parameter not found: ${id}`);
    return NextResponse.json(item);
  }
  if (type === 'price-groups') {
    const provider = await getProductDataProvider();
    if (provider === 'mongodb') {
      const group = await resolveMongoPriceGroup(id);
      if (!group) throw notFoundError(`Price group not found: ${id}`);
      const mongo = await getMongoDb();
      const currencyDoc = (await mongo.collection<MongoCurrencyDoc>('currencies').findOne({
        $or: [{ id: group.currencyId }, { code: group.currencyId }],
      })) as MongoCurrencyDoc | null;
      const currencyById = new Map<string, MongoCurrencyDoc>();
      if (currencyDoc) {
        currencyById.set(String(currencyDoc.id ?? currencyDoc.code ?? ''), currencyDoc);
      }
      return NextResponse.json(mapMongoPriceGroupResponse(group, currencyById));
    }

    const resolvedId = await resolvePriceGroupId(id);
    const item = await prisma.priceGroup.findUnique({
      where: { id: resolvedId },
      include: { currency: true },
    });
    if (!item) throw notFoundError(`Price group not found: ${id}`);
    return NextResponse.json(mapPriceGroupResponse(item));
  }

  throw badRequestError(`Invalid products metadata type for GET: ${type}`);
}

export async function PUT_products_metadata_id_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;
  const data = unwrapPayload(await req.json());

  if (type === 'producers') {
    const repo = await getProducerRepository();
    const updateData = data as { name?: string; website?: string | null };
    return NextResponse.json(await repo.updateProducer(id, updateData));
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    const updateData = data as ProductTagUpdateInput;
    return NextResponse.json(await repo.updateTag(id, updateData));
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    const updateData = data as ProductParameterUpdateInput;
    return NextResponse.json(await repo.updateParameter(id, updateData));
  }
  if (type === 'price-groups') {
    const provider = await getProductDataProvider();
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const existing = await resolveMongoPriceGroup(id);
      if (!existing) throw notFoundError(`Price group not found: ${id}`);
      const resolvedId = String(existing.id ?? id);
      const now = new Date();
      const update: Record<string, unknown> = { updatedAt: now };

      const currencyId = readString(data, 'currencyId');
      const currencyCode = readString(data, 'currencyCode')?.toUpperCase();
      if (currencyId || currencyCode) {
        const currencyDoc = (await mongo.collection<MongoCurrencyDoc>('currencies').findOne({
          $or: [
            ...(currencyId ? [{ id: currencyId }, { code: currencyId }] : []),
            ...(currencyCode ? [{ code: currencyCode }] : []),
          ],
        })) as MongoCurrencyDoc | null;
        if (!currencyDoc) {
          throw notFoundError(
            `Currency not found: ${(currencyId ?? currencyCode ?? '').toString()}`
          );
        }
        update['currencyId'] = String(currencyDoc.id ?? currencyDoc.code ?? '');
      }

      const groupId = readString(data, 'groupId');
      if (groupId) update['groupId'] = groupId;
      const name = readString(data, 'name');
      if (name) update['name'] = name;
      if ('description' in data) {
        update['description'] = data['description'] === null ? null : readString(data, 'description');
      }
      const isDefault = readBoolean(data, 'isDefault');
      if (isDefault !== null) update['isDefault'] = isDefault;
      if ('sourceGroupId' in data) {
        update['sourceGroupId'] =
          data['sourceGroupId'] === null ? null : readString(data, 'sourceGroupId');
      }
      if ('type' in data || 'groupType' in data || 'sourceGroupId' in data) {
        update['type'] = resolveGroupType(
          data['type'] ?? data['groupType'],
          (update['sourceGroupId'] as string | null | undefined) ?? existing.sourceGroupId ?? null
        );
      }
      const basePriceField = readString(data, 'basePriceField');
      if (basePriceField) update['basePriceField'] = basePriceField;
      const priceMultiplier = readNumber(data, 'priceMultiplier');
      if (priceMultiplier !== null) update['priceMultiplier'] = priceMultiplier;
      const addToPrice = readNumber(data, 'addToPrice');
      if (addToPrice !== null) update['addToPrice'] = Math.trunc(addToPrice);

      await mongo.collection<MongoPriceGroupDoc>('price_groups').updateOne(
        { $or: [{ id: resolvedId }, { groupId: resolvedId }] },
        { $set: update }
      );

      const updated = await resolveMongoPriceGroup(resolvedId);
      if (!updated) throw notFoundError(`Price group not found after update: ${resolvedId}`);
      const currencyDoc = (await mongo.collection<MongoCurrencyDoc>('currencies').findOne({
        $or: [{ id: updated.currencyId }, { code: updated.currencyId }],
      })) as MongoCurrencyDoc | null;
      const currencyById = new Map<string, MongoCurrencyDoc>();
      if (currencyDoc) {
        currencyById.set(String(currencyDoc.id ?? currencyDoc.code ?? ''), currencyDoc);
      }
      return NextResponse.json(mapMongoPriceGroupResponse(updated, currencyById));
    }

    const resolvedId = await resolvePriceGroupId(id);
    const currencyId = await resolveCurrencyIdFromPayload(data);
    const sourceGroupId = data['sourceGroupId'] === null ? null : readString(data, 'sourceGroupId');

    const updateData: Prisma.PriceGroupUncheckedUpdateInput = {};
    const groupId = readString(data, 'groupId');
    if (groupId) updateData.groupId = groupId;
    const name = readString(data, 'name');
    if (name) updateData.name = name;
    if ('description' in data) {
      updateData.description =
        data['description'] === null ? null : readString(data, 'description');
    }
    if (currencyId) updateData.currencyId = currencyId;
    const isDefault = readBoolean(data, 'isDefault');
    if (isDefault !== null) updateData.isDefault = isDefault;
    if ('sourceGroupId' in data) updateData.sourceGroupId = sourceGroupId;
    if ('type' in data || 'groupType' in data || 'sourceGroupId' in data) {
      updateData.type = resolveGroupType(data['type'] ?? data['groupType'], sourceGroupId);
    }
    const basePriceField = readString(data, 'basePriceField');
    if (basePriceField) updateData.basePriceField = basePriceField;
    const priceMultiplier = readNumber(data, 'priceMultiplier');
    if (priceMultiplier !== null) updateData.priceMultiplier = priceMultiplier;
    const addToPrice = readNumber(data, 'addToPrice');
    if (addToPrice !== null) updateData.addToPrice = Math.trunc(addToPrice);

    const item = await prisma.priceGroup.update({
      where: { id: resolvedId },
      data: updateData,
      include: { currency: true },
    });
    return NextResponse.json(mapPriceGroupResponse(item));
  }

  throw badRequestError(`Invalid products metadata type for PUT: ${type}`);
}

export async function DELETE_products_metadata_id_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;

  if (type === 'producers') {
    const repo = await getProducerRepository();
    await repo.deleteProducer(id);
    return new Response(null, { status: 204 });
  }
  if (type === 'tags') {
    const repo = await getTagRepository();
    await repo.deleteTag(id);
    return new Response(null, { status: 204 });
  }
  if (type === 'parameters') {
    const repo = await getParameterRepository();
    await repo.deleteParameter(id);
    return new Response(null, { status: 204 });
  }
  if (type === 'price-groups') {
    const provider = await getProductDataProvider();
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const existing = await resolveMongoPriceGroup(id);
      if (!existing) throw notFoundError(`Price group not found: ${id}`);
      const resolvedId = String(existing.id ?? id);
      const now = new Date();

      await mongo.collection<MongoPriceGroupDoc>('price_groups').deleteOne({
        $or: [{ id: resolvedId }, { groupId: resolvedId }],
      });
      await mongo.collection<MongoCatalogDoc>('catalogs').updateMany(
        { priceGroupIds: resolvedId },
        {
          $pull: { priceGroupIds: resolvedId },
          $set: { updatedAt: now },
        } as unknown as UpdateFilter<MongoCatalogDoc>
      );
      await mongo.collection('catalogs').updateMany(
        { defaultPriceGroupId: resolvedId },
        { $set: { defaultPriceGroupId: null, updatedAt: now } }
      );
      await mongo.collection('products').updateMany(
        { defaultPriceGroupId: resolvedId },
        { $set: { defaultPriceGroupId: null, updatedAt: now } }
      );
      return new Response(null, { status: 204 });
    }

    const resolvedId = await resolvePriceGroupId(id);
    await prisma.priceGroup.delete({ where: { id: resolvedId } });
    return new Response(null, { status: 204 });
  }
  if (type === 'simple-parameters') {
    await deleteSimpleParameter(id);
    return new Response(null, { status: 204 });
  }

  throw badRequestError(`Invalid products metadata type for DELETE: ${type}`);
}
