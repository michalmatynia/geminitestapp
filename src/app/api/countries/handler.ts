import { WithId } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  ensureInternationalizationDefaults,
  fallbackCountries,
  countryMappings,
  defaultCountries,
  defaultCurrencies,
} from '@/features/internationalization/server';
import { getInternationalizationProvider } from '@/features/internationalization/services/internationalization-provider';
import { parseJsonBody } from '@/features/products/server';
import type { CountryWithCurrenciesDto as CountryWithCurrencies } from '@/shared/contracts/internationalization';
import { conflictError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

import type { CountryCode } from '@prisma/client';
import type { Prisma } from '@prisma/client';

const countrySchema = z.object({
  code: z.enum(['PL', 'DE', 'GB', 'US', 'SE']),
  name: z.string().trim().min(1),
  currencyIds: z.array(z.string()).optional(),
});

type CurrencyDoc = {
  id: string;
  code: string;
  name: string;
  symbol?: string | null;
  isDefault?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type CountryDoc = {
  id: string;
  code: string;
  name: string;
  currencyIds?: string[];
  createdAt: Date;
  updatedAt: Date;
};

const CURRENCIES_COLLECTION = 'currencies';
const COUNTRIES_COLLECTION = 'countries';

const seedMongoInternationalization = async (
  db: Awaited<ReturnType<typeof getMongoDb>>
): Promise<void> => {
  const now = new Date();
  await db.collection<CurrencyDoc>(CURRENCIES_COLLECTION).bulkWrite(
    defaultCurrencies.map((currency: (typeof defaultCurrencies)[number]) => ({
      updateOne: {
        filter: { id: currency.code },
        update: {
          $setOnInsert: {
            id: currency.code,
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol ?? null,
            createdAt: now,
          },
          $set: { updatedAt: now },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );

  const currencyByCountry = new Map<string, string[]>();
  for (const mapping of countryMappings) {
    const entries = currencyByCountry.get(mapping.countryCode) ?? [];
    if (!entries.includes(mapping.currencyCode)) {
      entries.push(mapping.currencyCode);
    }
    currencyByCountry.set(mapping.countryCode, entries);
  }

  await db.collection<CountryDoc>(COUNTRIES_COLLECTION).bulkWrite(
    defaultCountries.map((country: (typeof defaultCountries)[number]) => ({
      updateOne: {
        filter: { id: country.code },
        update: {
          $setOnInsert: {
            id: country.code,
            code: country.code,
            name: country.name,
            currencyIds: currencyByCountry.get(country.code) ?? [],
            createdAt: now,
          },
          $set: { updatedAt: now },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
};

const normalizeCountryResponse = (
  country: CountryDoc,
  currencyMap: Map<string, CurrencyDoc>
): CountryWithCurrencies => ({
  id: country.id,
  code: country.code,
  name: country.name,
  isoAlpha3: '',
  nativeName: country.name,
  phoneCode: '',
  isActive: true,
  createdAt: country.createdAt.toISOString(),
  updatedAt: country.updatedAt.toISOString(),
  currencies: (country.currencyIds ?? [])
    .map((currencyId: string) => {
      const currency = currencyMap.get(currencyId);
      if (!currency) return null;
      return {
        currencyId,
        currency: {
          id: currency.id,
          code: currency.code,
          name: currency.name,
          symbol: currency.symbol ?? null,
          isDefault: currency.isDefault || false,
          isActive: true,
          createdAt: currency.createdAt.toISOString(),
          updatedAt: currency.updatedAt.toISOString(),
        },
      };
    })
    .filter(Boolean) as CountryWithCurrencies['currencies'],
});

/**
 * GET /api/countries
 * Fetches all countries (and ensures defaults exist).
 */
export async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const provider = await getInternationalizationProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) {
      throw internalError('MongoDB is not configured.');
    }
    const db = await getMongoDb();
    await seedMongoInternationalization(db);
    const countries = await db
      .collection<CountryDoc>(COUNTRIES_COLLECTION)
      .find({})
      .sort({ name: 1 })
      .toArray();
    const currencyIds = Array.from(
      new Set(countries.flatMap((country: WithId<CountryDoc>) => country.currencyIds ?? []))
    );
    const currencies = currencyIds.length
      ? await db
        .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
        .find({ id: { $in: currencyIds } })
        .toArray()
      : [];
    const currencyMap = new Map(
      currencies.map((currency: WithId<CurrencyDoc>) => [currency.id, currency])
    );
    const normalized = countries.map((country: WithId<CountryDoc>) =>
      normalizeCountryResponse(country, currencyMap)
    );
    return NextResponse.json(normalized);
  }

  if (!process.env['DATABASE_URL']) {
    return NextResponse.json(fallbackCountries);
  }
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await ensureInternationalizationDefaults(tx);
  });

  const countries = await prisma.country.findMany({
    orderBy: { name: 'asc' },
    include: {
      currencies: {
        include: { currency: true },
      },
    },
  });

  return NextResponse.json(countries as unknown as CountryWithCurrencies[]);
}

/**
 * POST /api/countries
 * Creates a country.
 */
export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, countrySchema, {
    logPrefix: 'countries.POST',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const data = parsed.data;

  const { currencyIds, ...countryData } = data;

  const provider = await getInternationalizationProvider();
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) {
      throw internalError('MongoDB is not configured.');
    }
    const db = await getMongoDb();
    const existing = await db
      .collection<CountryDoc>(COUNTRIES_COLLECTION)
      .findOne({ id: countryData.code });
    if (existing) {
      throw conflictError('Country code already exists.', {
        code: countryData.code,
      });
    }
    const requestedCurrencyIds = Array.from(
      new Set(currencyIds ?? [])
    );
    const currencyDocs = requestedCurrencyIds.length
      ? await db
        .collection<CurrencyDoc>(CURRENCIES_COLLECTION)
        .find({ id: { $in: requestedCurrencyIds } })
        .toArray()
      : [];
    const validCurrencyIds = new Set(
      currencyDocs.map((currency: WithId<CurrencyDoc>) => currency.id)
    );
    const now = new Date();
    const country: CountryDoc = {
      id: countryData.code,
      code: countryData.code,
      name: countryData.name,
      currencyIds: requestedCurrencyIds.filter((id: string) =>
        validCurrencyIds.has(id)
      ),
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<CountryDoc>(COUNTRIES_COLLECTION).insertOne(country);
    const currencyMap = new Map(
      currencyDocs.map((currency: WithId<CurrencyDoc>) => [currency.id, currency])
    );
    return NextResponse.json(
      normalizeCountryResponse(country, currencyMap)
    );
  }

  if (!process.env['DATABASE_URL']) {
    throw internalError('Postgres product store is not configured.');
  }

  const country = await prisma.country.create({
    data: {
      // countryData.code is a zod enum union; Prisma code is an enum too (compatible)
      ...(countryData as unknown as { code: CountryCode; name: string }),
      ...(currencyIds?.length ? {
        currencies: {
          createMany: {
            data: currencyIds.map((currencyId: string) => ({ currencyId })),
          },
        },
      } : {}),
    },
    include: {
      currencies: {
        include: { currency: true },
      },
    },
  });

  return NextResponse.json(country);
}

