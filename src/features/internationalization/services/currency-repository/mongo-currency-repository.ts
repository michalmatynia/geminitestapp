import { ObjectId, type Document, type AnyBulkWriteOperation, type UpdateFilter, type Db } from 'mongodb';

import { defaultCurrencies } from '@/features/internationalization/server';
import type { CurrencyRecord } from '@/shared/contracts/internationalization';
import type { CurrencyRepository } from '@/shared/contracts/internationalization';
import { notFoundError, internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION = 'currencies';

interface CurrencyDoc extends Document {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  description?: string | null;
  exchangeRate?: number;
  isDefault?: boolean;
  enabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CountryCurrencyDoc extends Document {
  currencyIds?: string[];
  updatedAt?: Date;
}

const PRICE_GROUPS_COLLECTION = 'price_groups';
const COUNTRIES_COLLECTION = 'countries';

const toCurrencyDomain = (doc: CurrencyDoc): CurrencyRecord => ({
  id: doc.id,
  code: doc.code,
  name: doc.name,
  symbol: doc.symbol,
  description: doc.description ?? undefined,
  exchangeRate: doc.exchangeRate ?? undefined,
  isDefault: doc.isDefault ?? false,
  isActive: doc.enabled ?? true,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

const updateRelatedToCurrencyCode = async (
  db: Db,
  id: string,
  nextCode: string,
  now: Date
): Promise<void> => {
  await db
    .collection(PRICE_GROUPS_COLLECTION)
    .updateMany({ currencyId: id }, { $set: { currencyId: nextCode } });
  
  const countriesCollection = db.collection<CountryCurrencyDoc>(COUNTRIES_COLLECTION);
  const countries = await countriesCollection
    .find({ currencyIds: id }, { projection: { _id: 1, currencyIds: 1 } })
    .toArray();
  
  const operations: AnyBulkWriteOperation<CountryCurrencyDoc>[] = countries.map((country) => {
    const existingCurrencyIds = Array.isArray(country.currencyIds)
      ? country.currencyIds.filter(
        (currencyId): currencyId is string =>
          typeof currencyId === 'string' && currencyId !== id
      )
      : [];
    return {
      updateOne: {
        filter: { _id: country._id },
        update: {
          $set: {
            currencyIds: Array.from(new Set([...existingCurrencyIds, nextCode])),
            updatedAt: now,
          },
        } satisfies UpdateFilter<CountryCurrencyDoc>,
      },
    };
  });
  
  if (operations.length > 0) {
    await countriesCollection.bulkWrite(operations, { ordered: false });
  }
};

export const mongoCurrencyRepository: CurrencyRepository = {
  async listCurrencies(filters?: { skip?: number; limit?: number }): Promise<CurrencyRecord[]> {
    const db = await getMongoDb();
    const query = db.collection<CurrencyDoc>(COLLECTION).find({}).sort({ code: 1 });

    if (typeof filters?.skip === 'number') query.skip(filters.skip);
    if (typeof filters?.limit === 'number') query.limit(filters.limit);

    const currencies = await query.toArray();
    return currencies.map(toCurrencyDomain);
  },

  async getCurrencyByCode(code: string): Promise<CurrencyRecord | null> {
    const db = await getMongoDb();
    const doc = await db.collection<CurrencyDoc>(COLLECTION).findOne({ code });
    return doc !== null ? toCurrencyDomain(doc) : null;
  },

  async getCurrencyById(id: string): Promise<CurrencyRecord | null> {
    const db = await getMongoDb();
    const doc = await db.collection<CurrencyDoc>(COLLECTION).findOne({ id });
    return doc !== null ? toCurrencyDomain(doc) : null;
  },

  async createCurrency(data: {
    code: string;
    name: string;
    symbol?: string | null;
  }): Promise<CurrencyRecord> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: CurrencyDoc = {
      _id: new ObjectId(),
      id: data.code,
      code: data.code,
      name: data.name,
      symbol: data.symbol ?? null,
      isDefault: false,
      enabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<CurrencyDoc>(COLLECTION).insertOne(doc);
    return toCurrencyDomain(doc);
  },

  async updateCurrency(
    id: string,
    data: { code?: string; name?: string; symbol?: string | null }
  ): Promise<CurrencyRecord> {
    const db = await getMongoDb();
    const collection = db.collection<CurrencyDoc>(COLLECTION);
    const existing = await collection.findOne({ id });
    if (existing === null) throw notFoundError('Currency not found', { id });

    const now = new Date();
    if (data.code !== undefined && data.code !== id) {
      await updateRelatedToCurrencyCode(db, id, data.code, now);
    }

    const nextId = data.code ?? id;
    await collection.updateOne({ id }, {
      $set: {
        ...(data.code !== undefined && { id: data.code, code: data.code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.symbol !== undefined && { symbol: data.symbol }),
        updatedAt: now,
      },
    });

    const updated = await collection.findOne({ id: nextId });
    if (updated === null) throw internalError('Failed to update currency', { id: nextId });
    return toCurrencyDomain(updated);
  },

  async deleteCurrency(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection(COLLECTION).deleteOne({ id });
  },

  async isCurrencyInUse(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const [priceGroupCount, countryCount] = await Promise.all([
      db.collection(PRICE_GROUPS_COLLECTION).countDocuments({ currencyId: id }),
      db.collection(COUNTRIES_COLLECTION).countDocuments({ currencyIds: id }),
    ]);
    return priceGroupCount > 0 || countryCount > 0;
  },

  async ensureDefaultCurrencies(): Promise<void> {
    const db = await getMongoDb();
    const now = new Date();
    const operations: AnyBulkWriteOperation<CurrencyDoc>[] = defaultCurrencies.map((currency) => ({
      updateOne: {
        filter: { id: currency.code },
        update: {
          $setOnInsert: {
            _id: new ObjectId(),
            id: currency.code,
            code: currency.code,
            name: currency.name,
            symbol: currency.symbol ?? null,
            isDefault: false,
            enabled: true,
            createdAt: now,
          },
          $set: { updatedAt: now },
        },
        upsert: true,
      },
    }));

    if (operations.length > 0) {
      await db.collection<CurrencyDoc>(COLLECTION).bulkWrite(operations, { ordered: false });
    }
  },
};
