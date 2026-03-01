import { NextRequest, NextResponse } from 'next/server';
import { CountryCode, Prisma } from '@prisma/client';

import {
  getCurrencyRepository,
  getInternationalizationProvider,
} from '@/features/internationalization/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { MongoCountryDoc, MongoLanguageDoc, MongoCatalogDoc } from '@/shared/lib/db/services/database-sync-types';
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

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const raw = record[key];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readStringArray = (record: Record<string, unknown>, key: string): string[] | null => {
  const raw = record[key];
  if (!Array.isArray(raw)) return null;
  return raw
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value): value is string => value.length > 0);
};

const toIso = (value: unknown): string | undefined => {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return undefined;
};

const mapMongoCountry = (
  doc: MongoCountryDoc
): {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  currencies: Array<{ countryId: string; currencyId: string }>;
} => {
  const id = String(doc.id ?? doc.code ?? '');
  const code = String(doc.code ?? doc.id ?? '').toUpperCase();
  const currencyIds = Array.isArray(doc.currencyIds) ? doc.currencyIds : [];
  return {
    id,
    code,
    name: String(doc.name ?? code),
    isActive: true,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    currencies: currencyIds.map((currencyId: string) => ({
      countryId: id,
      currencyId,
    })),
  };
};

const mapMongoLanguage = (
  doc: MongoLanguageDoc,
  countriesById: Map<string, ReturnType<typeof mapMongoCountry>>
): {
  id: string;
  code: string;
  name: string;
  nativeName: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  countries: Array<{ id: string; code: string; name: string; isActive: boolean; countryId: string }>;
} => {
  const id = String(doc.id ?? doc.code ?? '');
  const code = String(doc.code ?? doc.id ?? '').toUpperCase();
  const relations = Array.isArray(doc.countries) ? doc.countries : [];
  return {
    id,
    code,
    name: String(doc.name ?? code),
    nativeName: String(doc.nativeName ?? doc.name ?? code),
    isDefault: false,
    isActive: true,
    createdAt: toIso(doc.createdAt),
    updatedAt: toIso(doc.updatedAt),
    countries: relations.map((relation: { countryId: string }) => {
      const country = countriesById.get(relation.countryId);
      if (country) {
        return {
          id: country.id,
          code: country.code,
          name: country.name,
          isActive: true,
          countryId: country.id,
        };
      }
      return {
        id: relation.countryId,
        code: relation.countryId,
        name: relation.countryId,
        isActive: true,
        countryId: relation.countryId,
      };
    }),
  };
};

const resolveMongoCountry = async (id: string): Promise<MongoCountryDoc | null> => {
  const mongo = await getMongoDb();
  return (await mongo.collection<MongoCountryDoc>('countries').findOne({
    $or: [{ id }, { code: id }],
  })) as MongoCountryDoc | null;
};

const resolveMongoLanguage = async (id: string): Promise<MongoLanguageDoc | null> => {
  const mongo = await getMongoDb();
  return (await mongo.collection<MongoLanguageDoc>('languages').findOne({
    $or: [{ id }, { code: id }],
  })) as MongoLanguageDoc | null;
};

export async function GET_metadata_id_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;
  const provider = await getInternationalizationProvider();

  if (type === 'currencies') {
    const repo = await getCurrencyRepository(provider);
    const currency = await repo.getCurrencyById(id);
    if (!currency) throw notFoundError(`Currency not found: ${id}`);
    return NextResponse.json(currency);
  }

  if (type === 'countries') {
    if (provider === 'mongodb') {
      const countryDoc = await resolveMongoCountry(id);
      if (!countryDoc) throw notFoundError(`Country not found: ${id}`);
      return NextResponse.json(mapMongoCountry(countryDoc));
    }

    const country = await prisma.country.findUnique({
      where: { id },
      include: { currencies: { include: { currency: true } } },
    });
    if (!country) throw notFoundError(`Country not found: ${id}`);
    return NextResponse.json(country);
  }

  if (type === 'languages') {
    if (provider === 'mongodb') {
      const languageDoc = await resolveMongoLanguage(id);
      if (!languageDoc) throw notFoundError(`Language not found: ${id}`);
      const countryIds = (languageDoc.countries ?? []).map((entry) => entry.countryId);
      const mongo = await getMongoDb();
      const countryDocs = (await mongo
        .collection<MongoCountryDoc>('countries')
        .find({ id: { $in: countryIds } })
        .toArray()) as MongoCountryDoc[];
      const countriesById = new Map(
        countryDocs.map((country: MongoCountryDoc) => {
          const mapped = mapMongoCountry(country);
          return [mapped.id, mapped] as const;
        })
      );
      return NextResponse.json(mapMongoLanguage(languageDoc, countriesById));
    }

    const language = await prisma.language.findUnique({
      where: { id },
      include: { countries: { include: { country: true } } },
    });
    if (!language) throw notFoundError(`Language not found: ${id}`);
    return NextResponse.json({
      ...language,
      isDefault: false,
      isActive: true,
      countries: language.countries.map((relation) => ({
        ...relation.country,
        countryId: relation.countryId,
      })),
    });
  }

  throw badRequestError(`Invalid internationalization type: ${type}`);
}

export async function PUT_metadata_id_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;
  const data = unwrapPayload(await req.json());
  const provider = await getInternationalizationProvider();

  if (type === 'currencies') {
    const repo = await getCurrencyRepository(provider);
    const updateData: { code?: string; name?: string; symbol?: string | null } = {};
    if ('code' in data) updateData.code = readString(data, 'code');
    if ('name' in data) updateData.name = readString(data, 'name');
    if ('symbol' in data) {
      updateData.symbol = data['symbol'] === null ? null : (readString(data, 'symbol') ?? null);
    }
    return NextResponse.json(await repo.updateCurrency(id, updateData));
  }

  if (type === 'countries') {
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const existing = await resolveMongoCountry(id);
      if (!existing) throw notFoundError(`Country not found: ${id}`);
      const resolvedId = String(existing.id ?? existing.code ?? id);
      const now = new Date();
      const nextCode = ('code' in data ? readString(data, 'code') : undefined)?.toUpperCase();
      const nextId = nextCode ?? resolvedId;
      const currencyIds = readStringArray(data, 'currencyIds');
      const update: Record<string, unknown> = { updatedAt: now };
      if (nextCode) {
        update['code'] = nextCode;
        update['id'] = nextId;
      }
      if ('name' in data) update['name'] = readString(data, 'name') ?? nextCode ?? resolvedId;
      if (currencyIds !== null) update['currencyIds'] = currencyIds;

      await mongo.collection<MongoCountryDoc>('countries').updateOne(
        { $or: [{ id: resolvedId }, { code: resolvedId }] },
        { $set: update }
      );

      if (nextId !== resolvedId) {
        await mongo.collection<MongoLanguageDoc>('languages').updateMany(
          { 'countries.countryId': resolvedId },
          { $set: { 'countries.$[entry].countryId': nextId, updatedAt: now } },
          { arrayFilters: [{ 'entry.countryId': resolvedId }] }
        );
      }

      const updated = await resolveMongoCountry(nextId);
      if (!updated) throw notFoundError(`Country not found after update: ${nextId}`);
      return NextResponse.json(mapMongoCountry(updated));
    }

    const existing = await prisma.country.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFoundError(`Country not found: ${id}`);

    const updateData: Prisma.CountryUpdateInput = {};
    if ('code' in data) {
      updateData.code = (readString(data, 'code') ?? '') as CountryCode;
    }
    if ('name' in data) {
      updateData.name = readString(data, 'name') ?? '';
    }

    const currencyIds = readStringArray(data, 'currencyIds');
    if (currencyIds !== null) {
      updateData.currencies = {
        deleteMany: {},
        create: currencyIds.map((currencyId: string) => ({ currencyId })),
      };
    }

    const country = await prisma.country.update({
      where: { id },
      data: updateData,
      include: { currencies: true },
    });
    return NextResponse.json(country);
  }

  if (type === 'languages') {
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const existing = await resolveMongoLanguage(id);
      if (!existing) throw notFoundError(`Language not found: ${id}`);
      const resolvedId = String(existing.id ?? existing.code ?? id);
      const now = new Date();
      const nextCode = ('code' in data ? readString(data, 'code') : undefined)?.toUpperCase();
      const nextId = nextCode ?? resolvedId;

      const update: Record<string, unknown> = { updatedAt: now };
      if (nextCode) {
        update['code'] = nextCode;
        update['id'] = nextId;
      }
      if ('name' in data) update['name'] = readString(data, 'name') ?? nextCode ?? resolvedId;
      if ('nativeName' in data) {
        update['nativeName'] =
          data['nativeName'] === null ? null : (readString(data, 'nativeName') ?? null);
      }
      const countryIds = readStringArray(data, 'countryIds');
      if (countryIds !== null) {
        update['countries'] = countryIds.map((countryId: string) => ({ countryId }));
      }

      await mongo.collection<MongoLanguageDoc>('languages').updateOne(
        { $or: [{ id: resolvedId }, { code: resolvedId }] },
        { $set: update }
      );

      if (nextId !== resolvedId) {
        await mongo.collection<MongoCatalogDoc>('catalogs').updateMany(
          { languageIds: resolvedId },
          {
            $pull: { languageIds: resolvedId },
            $addToSet: { languageIds: nextId },
            $set: { updatedAt: now },
          } as unknown as UpdateFilter<MongoCatalogDoc>
        );
        await mongo.collection<MongoCatalogDoc>('catalogs').updateMany(

          { defaultLanguageId: resolvedId },
          { $set: { defaultLanguageId: nextId, updatedAt: now } }
        );
      }

      const updated = await resolveMongoLanguage(nextId);
      if (!updated) throw notFoundError(`Language not found after update: ${nextId}`);
      const relatedCountryIds = (updated.countries ?? []).map((entry) => entry.countryId);
      const countryDocs = (await mongo
        .collection<MongoCountryDoc>('countries')
        .find({ id: { $in: relatedCountryIds } })
        .toArray()) as MongoCountryDoc[];
      const countriesById = new Map(
        countryDocs.map((country: MongoCountryDoc) => {
          const mapped = mapMongoCountry(country);
          return [mapped.id, mapped] as const;
        })
      );
      return NextResponse.json(mapMongoLanguage(updated, countriesById));
    }

    const existing = await prisma.language.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFoundError(`Language not found: ${id}`);

    const updateData: Prisma.LanguageUpdateInput = {};
    if ('code' in data) {
      updateData.code = readString(data, 'code') ?? '';
    }
    if ('name' in data) {
      updateData.name = readString(data, 'name') ?? '';
    }
    if ('nativeName' in data) {
      updateData.nativeName =
        data['nativeName'] === null ? null : (readString(data, 'nativeName') ?? null);
    }

    const countryIds = readStringArray(data, 'countryIds');
    if (countryIds !== null) {
      updateData.countries = {
        deleteMany: {},
        create: countryIds.map((countryId: string) => ({ countryId })),
      };
    }

    const language = await prisma.language.update({
      where: { id },
      data: updateData,
      include: { countries: { include: { country: true } } },
    });
    return NextResponse.json({
      ...language,
      isDefault: false,
      isActive: true,
      countries: language.countries.map((relation) => ({
        ...relation.country,
        countryId: relation.countryId,
      })),
    });
  }

  throw badRequestError(`Invalid internationalization type: ${type}`);
}

export async function DELETE_metadata_id_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string; id: string }
): Promise<Response> {
  const { type, id } = params;
  const provider = await getInternationalizationProvider();

  if (type === 'currencies') {
    const repo = await getCurrencyRepository(provider);
    await repo.deleteCurrency(id);
    return new Response(null, { status: 204 });
  }

  if (type === 'countries') {
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const existing = await resolveMongoCountry(id);
      if (!existing) throw notFoundError(`Country not found: ${id}`);
      const resolvedId = String(existing.id ?? existing.code ?? id);
      await mongo.collection<MongoCountryDoc>('countries').deleteOne({ id: resolvedId });
      await mongo.collection<MongoLanguageDoc>('languages').updateMany(
        { 'countries.countryId': resolvedId },
        {
          $pull: { countries: { countryId: resolvedId } },
          $set: { updatedAt: new Date() },
        } as unknown as UpdateFilter<MongoLanguageDoc>
      );


      return new Response(null, { status: 204 });
    }

    const existing = await prisma.country.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFoundError(`Country not found: ${id}`);
    await prisma.country.delete({ where: { id } });
    return new Response(null, { status: 204 });
  }

  if (type === 'languages') {
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const existing = await resolveMongoLanguage(id);
      if (!existing) throw notFoundError(`Language not found: ${id}`);
      const resolvedId = String(existing.id ?? existing.code ?? id);
      const now = new Date();
      await mongo.collection<MongoLanguageDoc>('languages').deleteOne({ id: resolvedId });
      await mongo.collection<MongoCatalogDoc>('catalogs').updateMany(
        { languageIds: resolvedId },
        {
          $pull: { languageIds: resolvedId },
          $set: { updatedAt: now },
        } as unknown as UpdateFilter<MongoCatalogDoc>
      );

      await mongo.collection('catalogs').updateMany(
        { defaultLanguageId: resolvedId },
        { $set: { defaultLanguageId: null, updatedAt: now } }
      );
      return new Response(null, { status: 204 });
    }

    const existing = await prisma.language.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw notFoundError(`Language not found: ${id}`);
    await prisma.language.delete({ where: { id } });
    return new Response(null, { status: 204 });
  }

  throw badRequestError(`Invalid internationalization type: ${type}`);
}
