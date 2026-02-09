
import { ObjectId, type Document } from 'mongodb';

import { defaultCurrencies } from '@/features/internationalization/server';
import type { CurrencyRepository } from '@/features/internationalization/types/services/currency-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { CurrencyRecord } from '@/shared/types/domain/internationalization';

const COLLECTION = 'currencies';

interface CurrencyDoc extends Document {
  id: string;
  code: string;
  name: string;
  symbol: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const PRICE_GROUPS_COLLECTION = 'price_groups';
const COUNTRIES_COLLECTION = 'countries';

const toCurrencyDomain = (doc: CurrencyDoc): CurrencyRecord => ({
  id: doc.id,
  code: doc.code,
  name: doc.name,
  symbol: doc.symbol,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const mongoCurrencyRepository: CurrencyRepository = {
  async listCurrencies(): Promise<CurrencyRecord[]> {
    const db = await getMongoDb();
    const currencies = await db.collection<CurrencyDoc>(COLLECTION).find({}).sort({ code: 1 }).toArray();
    return currencies.map(toCurrencyDomain);
  },

  async getCurrencyByCode(code: string): Promise<CurrencyRecord | null> {
    const db = await getMongoDb();
    const doc = await db.collection<CurrencyDoc>(COLLECTION).findOne({ code });
    return doc ? toCurrencyDomain(doc) : null;
  },

  async getCurrencyById(id: string): Promise<CurrencyRecord | null> {
    const db = await getMongoDb();
    const doc = await db.collection<CurrencyDoc>(COLLECTION).findOne({ id });
    return doc ? toCurrencyDomain(doc) : null;
  },

  async createCurrency(data: { code: string; name: string; symbol?: string | null }): Promise<CurrencyRecord> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: CurrencyDoc = {
      _id: new ObjectId(), // MongoDB generates _id, but for strict typing, we can add it here.
      id: data.code,
      code: data.code,
      name: data.name,
      symbol: data.symbol ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<CurrencyDoc>(COLLECTION).insertOne(doc);
    return toCurrencyDomain(doc);
  },

  async updateCurrency(id: string, data: { code?: string; name?: string; symbol?: string | null }): Promise<CurrencyRecord> {
    const db = await getMongoDb();
    const collection = db.collection<CurrencyDoc>(COLLECTION);
    const existing = await collection.findOne({ id });
    if (!existing) throw new Error('Currency not found');

    const now = new Date();
    
    if (data.code && data.code !== id) {
      // Update related collections
      await db.collection(PRICE_GROUPS_COLLECTION).updateMany({ currencyId: id }, { $set: { currencyId: data.code } });
      await db.collection(COUNTRIES_COLLECTION).updateMany(
        { currencyIds: id },
        {
          $pull: { currencyIds: id },
          $addToSet: { currencyIds: data.code },
          $set: { updatedAt: now },
        } as any
      );
    }

    const set: Partial<CurrencyDoc> = { updatedAt: now };
    if (data.code !== undefined) {
      set.id = data.code;
      set.code = data.code;
    }
    if (data.name !== undefined) set.name = data.name;
    if (data.symbol !== undefined) set.symbol = data.symbol;

    await collection.updateOne({ id }, { $set: set });
    const updated = await collection.findOne({ id: data.code ?? id });
    if (!updated) throw new Error('Failed to update currency');
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
    const operations: AnyBulkWriteOperation<CurrencyDoc>[] = defaultCurrencies.map(currency => ({
      updateOne: {
        filter: { id: currency.code },
        update: {
          $setOnInsert: {
            _id: new ObjectId(), // Generate _id for new documents
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
    }));

    if (operations.length > 0) {
      await db.collection<CurrencyDoc>(COLLECTION).bulkWrite(operations, { ordered: false });
    }
  },
};
