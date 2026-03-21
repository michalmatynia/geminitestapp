/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import type { MongoCurrencyDoc, MongoCountryDoc, MongoLanguageDoc } from '../database-sync-types';
import type { DatabaseSyncHandler } from './types';
import type { Prisma, CurrencyCode } from '@prisma/client';

export const syncCurrencies: DatabaseSyncHandler = async ({ mongo, prisma, currencyCodes }) => {
  // Clear dependent data so currency deletes don't fail on FK constraints.
  await prisma.product.deleteMany();
  await prisma.priceGroup.deleteMany();
  const docs = (await mongo
    .collection('currencies')
    .find({})
    .toArray()) as unknown as MongoCurrencyDoc[];
  const warnings: string[] = [];
  const data = docs
    .map((doc: MongoCurrencyDoc): Prisma.CurrencyCreateManyInput | null => {
      const code = String(doc.code ?? '').toUpperCase();
      if (!currencyCodes.has(code)) {
        warnings.push(`Skipped currency code: ${code || 'unknown'}`);
        return null;
      }
      const id = doc.id ?? code;
      return {
        id,
        code: code as CurrencyCode,
        name: doc.name ?? code,
        symbol: doc.symbol ?? null,
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.CurrencyCreateManyInput => item !== null);
  const deleted = await prisma.currency.deleteMany();
  const created = data.length ? await prisma.currency.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncCountries: DatabaseSyncHandler = async ({ mongo, prisma, countryCodes }) => {
  const docs = (await mongo
    .collection('countries')
    .find({})
    .toArray()) as unknown as MongoCountryDoc[];
  const warnings: string[] = [];
  const data = docs
    .map((doc: MongoCountryDoc) => {
      const code = String(doc.code ?? '').toUpperCase();
      if (!countryCodes.has(code)) {
        warnings.push(`Skipped country code: ${code || 'unknown'}`);
        return null;
      }
      const id = doc.id ?? code;
      return {
        id,
        code,
        name: doc.name ?? code,
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
        currencyIds: Array.isArray(doc.currencyIds) ? doc.currencyIds : [],
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const deleted = await prisma.country.deleteMany();
  const created = data.length
    ? await prisma.country.createMany({
      data: data.map(({ currencyIds: _, ...rest }) => rest) as Prisma.CountryCreateManyInput[],
    })
    : { count: 0 };

  const joinRows = data.flatMap((country) =>
    country.currencyIds.map((currencyId) => ({
      countryId: country.id,
      currencyId,
    }))
  ) as Prisma.CountryCurrencyCreateManyInput[];
  await prisma.countryCurrency.deleteMany();
  if (joinRows.length) {
    await prisma.countryCurrency.createMany({ data: joinRows });
  }

  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

export const syncLanguages: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  // Clear catalogs so defaultLanguage FK doesn't block language deletes.
  await prisma.catalog.deleteMany();
  const docs = (await mongo
    .collection('languages')
    .find({})
    .toArray()) as unknown as MongoLanguageDoc[];
  const data = docs
    .map((doc: MongoLanguageDoc) => {
      const code = String(doc.code ?? '').toUpperCase();
      if (!code) return null;
      return {
        id: doc.id ?? code,
        code,
        name: doc.name ?? code,
        nativeName: doc.nativeName ?? null,
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
        countries: Array.isArray(doc.countries) ? doc.countries : [],
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  const deleted = await prisma.language.deleteMany();
  const created = data.length
    ? await prisma.language.createMany({
      data: data.map(({ countries: _, ...rest }) => rest) as Prisma.LanguageCreateManyInput[],
    })
    : { count: 0 };

  const joinRows = data.flatMap((lang) =>
    lang.countries.map((c: { countryId: string }) => ({
      languageId: lang.id,
      countryId: c.countryId,
    }))
  ) as Prisma.LanguageCountryCreateManyInput[];
  await prisma.languageCountry.deleteMany();
  if (joinRows.length) {
    await prisma.languageCountry.createMany({ data: joinRows });
  }

  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncCurrenciesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.currency.findMany();
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    code: row.code,
    name: row.name,
    symbol: row.symbol ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('currencies');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncCountriesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.country.findMany({ include: { currencies: true } });
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    code: row.code,
    name: row.name,
    currencyIds: row.currencies.map((entry: { currencyId: string }) => entry.currencyId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('countries');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncLanguagesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.language.findMany({
    include: { countries: { include: { country: true } } },
  });
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    code: row.code,
    name: row.name,
    nativeName: row.nativeName ?? null,
    countries: row.countries.map(
      (entry: { countryId: string; country: { id: string; code: string; name: string } }) => ({
        countryId: entry.countryId,
        country: {
          id: entry.country.id,
          code: entry.country.code,
          name: entry.country.name,
        },
      })
    ),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('languages');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
