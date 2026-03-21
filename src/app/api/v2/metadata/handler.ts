import { ObjectId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getCurrencyRepository,
  getInternationalizationProvider,
} from '@/features/internationalization/public/server';
import { paginationQuerySchema, type PaginationQuery } from '@/shared/contracts/base';
import { type CurrencyCreateInput } from '@/shared/contracts/internationalization';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type {
  MongoCountryDoc,
  MongoLanguageDoc,
} from '@/shared/lib/db/services/database-sync-types';

const metadataMutationSchema = z
  .object({
    code: z.string().trim().optional(),
    name: z.string().trim().optional(),
    symbol: z.string().trim().nullable().optional(),
    nativeName: z.string().trim().nullable().optional(),
    currencyIds: z.array(z.string().trim().min(1)).optional(),
    countryIds: z.array(z.string().trim().min(1)).optional(),
  })
  .passthrough();

const readString = (record: Record<string, unknown>, key: string): string | undefined => {
  const raw = record[key];
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const readStringArray = (record: Record<string, unknown>, key: string): string[] => {
  const raw = record[key];
  if (!Array.isArray(raw)) return [];
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
  countries: Array<{
    id: string;
    code: string;
    name: string;
    isActive: boolean;
    countryId: string;
  }>;
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

export async function GET_intl_handler(
  _req: NextRequest,
  ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const provider = await getInternationalizationProvider();
  const query = (ctx.query ?? paginationQuerySchema.parse({})) as PaginationQuery;
  const { page, pageSize } = query;
  const skip = (page - 1) * pageSize;

  if (type === 'currencies') {
    const repo = await getCurrencyRepository(provider);
    return NextResponse.json(await repo.listCurrencies({ skip, limit: pageSize }));
  }

  if (type === 'countries') {
    const mongo = await getMongoDb();
    const countries = (await mongo
      .collection<MongoCountryDoc>('countries')
      .find({})
      .sort({ code: 1 })
      .skip(skip)
      .limit(pageSize)
      .toArray()) as MongoCountryDoc[];
    return NextResponse.json(countries.map(mapMongoCountry));
  }

  if (type === 'languages') {
    const mongo = await getMongoDb();
    const [countryDocs, languageDocs] = (await Promise.all([
      mongo.collection<MongoCountryDoc>('countries').find({}).toArray(),
      mongo
        .collection<MongoLanguageDoc>('languages')
        .find({})
        .sort({ code: 1 })
        .skip(skip)
        .limit(pageSize)
        .toArray(),
    ])) as [MongoCountryDoc[], MongoLanguageDoc[]];
    const countriesById = new Map(
      countryDocs.map((country: MongoCountryDoc) => {
        const mapped = mapMongoCountry(country);
        return [mapped.id, mapped] as const;
      })
    );
    return NextResponse.json(
      languageDocs.map((language: MongoLanguageDoc) => mapMongoLanguage(language, countriesById))
    );
  }

  throw badRequestError(`Invalid internationalization type: ${type}`);
}

export async function POST_intl_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const parsed = await parseJsonBody(req, metadataMutationSchema, {
    logPrefix: 'metadata.[type].POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data as Record<string, unknown>;
  const provider = await getInternationalizationProvider();

  if (type === 'currencies') {
    const repo = await getCurrencyRepository(provider);
    const code = readString(data, 'code');
    const name = readString(data, 'name');
    if (!code || !name) throw badRequestError('Code and name are required');

    const payload: CurrencyCreateInput = {
      code: code.toUpperCase(),
      name,
      symbol: readString(data, 'symbol') ?? null,
      isDefault: false,
      isActive: true,
    };
    return NextResponse.json(await repo.createCurrency(payload));
  }

  if (type === 'countries') {
    const code = (readString(data, 'code') ?? '').toUpperCase();
    const name = readString(data, 'name');
    if (!code || !name) throw badRequestError('Code and name are required');

    const mongo = await getMongoDb();
    const now = new Date();
    const countryDoc: MongoCountryDoc = {
      id: code,
      code,
      name,
      currencyIds: readStringArray(data, 'currencyIds'),
      createdAt: now,
      updatedAt: now,
    };
    const insertDoc: MongoCountryDoc = {
      _id: new ObjectId(),
      ...countryDoc,
    };
    await mongo.collection<MongoCountryDoc>('countries').insertOne(insertDoc);
    return NextResponse.json(mapMongoCountry(countryDoc));
  }

  if (type === 'languages') {
    const code = (readString(data, 'code') ?? '').toUpperCase();
    const name = readString(data, 'name');
    if (!code || !name) throw badRequestError('Code and name are required');

    const mongo = await getMongoDb();
    const countryIds = readStringArray(data, 'countryIds');
    const now = new Date();
    const languageDoc: MongoLanguageDoc = {
      id: code,
      code,
      name,
      nativeName: readString(data, 'nativeName') ?? null,
      countries: countryIds.map((countryId: string) => ({ countryId })),
      createdAt: now,
      updatedAt: now,
    };
    const insertDoc: MongoLanguageDoc = {
      _id: new ObjectId(),
      ...languageDoc,
    };
    await mongo.collection<MongoLanguageDoc>('languages').insertOne(insertDoc);

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

  throw badRequestError(`Invalid internationalization type: ${type}`);
}
