import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import {
  getCurrencyRepository,
  getInternationalizationProvider,
  ensureInternationalizationDefaults,
} from '@/features/internationalization/server';
import { type CurrencyCreateInput } from '@/shared/contracts/internationalization';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { type CountryCode } from '@prisma/client';
import type { MongoCountryDoc, MongoLanguageDoc } from '@/shared/lib/db/services/database-sync-types';

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

export async function GET_intl_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { type: string }
): Promise<Response> {
  const { type } = params;
  const provider = await getInternationalizationProvider();

  if (type === 'currencies') {
    const repo = await getCurrencyRepository(provider);
    let currencies = await repo.listCurrencies();
    
    if (currencies.length === 0 && provider === 'prisma') {
      await prisma.$transaction(async (tx) => {
        await ensureInternationalizationDefaults(tx);
      });
      currencies = await repo.listCurrencies();
    }
    
    return NextResponse.json(currencies);
  }

  if (type === 'countries') {
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const countries = (await mongo
        .collection<MongoCountryDoc>('countries')
        .find({})
        .sort({ code: 1 })
        .toArray()) as MongoCountryDoc[];
      return NextResponse.json(countries.map(mapMongoCountry));
    }

    let countries = await prisma.country.findMany({
      include: { currencies: { include: { currency: true } } },
    });

    if (countries.length === 0) {
      await prisma.$transaction(async (tx) => {
        await ensureInternationalizationDefaults(tx);
      });
      countries = await prisma.country.findMany({
        include: { currencies: { include: { currency: true } } },
      });
    }

    return NextResponse.json(countries);
  }

  if (type === 'languages') {
    if (provider === 'mongodb') {
      const mongo = await getMongoDb();
      const [countryDocs, languageDocs] = (await Promise.all([
        mongo.collection<MongoCountryDoc>('countries').find({}).toArray(),
        mongo
          .collection<MongoLanguageDoc>('languages')
          .find({})
          .sort({ code: 1 })
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

    let languages = await prisma.language.findMany({
      include: { countries: { include: { country: true } } },
    });

    if (languages.length === 0) {
      await prisma.$transaction(async (tx) => {
        await ensureInternationalizationDefaults(tx);
      });
      languages = await prisma.language.findMany({
        include: { countries: { include: { country: true } } },
      });
    }

    return NextResponse.json(
      languages.map((language) => ({
        ...language,
        isDefault: false,
        isActive: true,
        countries: language.countries.map((relation) => ({
          ...relation.country,
          countryId: relation.countryId,
        })),
      }))
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
  const data = unwrapPayload(await req.json());
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

    if (provider === 'mongodb') {
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
      await mongo.collection<MongoCountryDoc>('countries').insertOne({
        _id: randomUUID(),
        ...countryDoc,
      } as unknown as MongoCountryDoc);
      return NextResponse.json(mapMongoCountry(countryDoc));
    }

    const currencyIds = readStringArray(data, 'currencyIds');
    const country = await prisma.country.create({
      data: {
        code: code as CountryCode,
        name,
        currencies:
          currencyIds.length > 0
            ? {
              create: currencyIds.map((currencyId: string) => ({ currencyId })),
            }
            : undefined,
      },
      include: { currencies: true },
    });
    return NextResponse.json(country);
  }

  if (type === 'languages') {
    const code = (readString(data, 'code') ?? '').toUpperCase();
    const name = readString(data, 'name');
    if (!code || !name) throw badRequestError('Code and name are required');

    if (provider === 'mongodb') {
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
      await mongo.collection<MongoLanguageDoc>('languages').insertOne({
        _id: randomUUID(),
        ...languageDoc,
      } as unknown as MongoLanguageDoc);

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

    const countryIds = readStringArray(data, 'countryIds');
    const language = await prisma.language.create({
      data: {
        code,
        name,
        nativeName: readString(data, 'nativeName'),
        countries:
          countryIds.length > 0
            ? {
              create: countryIds.map((countryId: string) => ({ countryId })),
            }
            : undefined,
      },
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
