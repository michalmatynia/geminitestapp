import 'server-only';

import { randomUUID } from 'crypto';

import type {
  CatalogCreateInput,
  CatalogRecord,
  CatalogRepository,
  CatalogUpdateInput,
} from '@/shared/contracts/products';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { normalizePriceGroupSelectionForStorage } from '@/shared/lib/products/services/price-group-storage-normalization';

import type { WithId } from 'mongodb';

type CatalogDocument = {
  _id: string;
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  defaultLanguageId?: string | null;
  defaultPriceGroupId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  languageIds: string[];
  priceGroupIds?: string[];
};

const CATALOG_COLLECTION = 'catalogs';

const toRecord = async (
  doc: WithId<CatalogDocument>,
  mongo: Pick<Awaited<ReturnType<typeof getMongoDb>>, 'collection'>
): Promise<CatalogRecord> => {
  const normalizedPriceGroupSelection = await normalizePriceGroupSelectionForStorage(
    'mongodb',
    {
      priceGroupIds: Array.isArray(doc.priceGroupIds) ? doc.priceGroupIds : [],
      defaultPriceGroupId: doc.defaultPriceGroupId ?? null,
    },
    { mongo }
  );

  return {
    id: doc.id ?? doc._id,
    name: doc.name,
    description: doc.description ?? null,
    isDefault: doc.isDefault,
    defaultLanguageId: doc.defaultLanguageId ?? null,
    defaultPriceGroupId: normalizedPriceGroupSelection.defaultPriceGroupId,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    languageIds: Array.isArray(doc.languageIds) ? doc.languageIds : [],
    priceGroupIds: normalizedPriceGroupSelection.priceGroupIds,
  };
};

export const mongoCatalogRepository: CatalogRepository = {
  async listCatalogs() {
    const db = await getMongoDb();
    const docs = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return await Promise.all(
      docs.map((doc: WithId<CatalogDocument>) => toRecord({ ...doc, _id: doc._id }, db))
    );
  },

  async getCatalogById(id: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .findOne({ $or: [{ _id: id }, { id }] });
    return doc ? await toRecord({ ...doc, _id: doc._id }, db) : null;
  },

  async createCatalog(input: CatalogCreateInput) {
    const db = await getMongoDb();
    if (input.isDefault) {
      await db
        .collection<CatalogDocument>(CATALOG_COLLECTION)
        .updateMany({}, { $set: { isDefault: false } });
    }
    const now = new Date();
    const id = randomUUID();
    const normalizedPriceGroupSelection = await normalizePriceGroupSelectionForStorage(
      'mongodb',
      {
        priceGroupIds: input.priceGroupIds ?? [],
        defaultPriceGroupId: input.defaultPriceGroupId ?? null,
      },
      { mongo: db }
    );
    const doc: CatalogDocument = {
      _id: id,
      id,
      name: input.name,
      description: input.description ?? null,
      isDefault: Boolean(input.isDefault),
      defaultLanguageId: input.defaultLanguageId ?? null,
      defaultPriceGroupId: normalizedPriceGroupSelection.defaultPriceGroupId,
      createdAt: now,
      updatedAt: now,
      languageIds: input.languageIds ?? [],
      priceGroupIds: normalizedPriceGroupSelection.priceGroupIds,
    };
    await db.collection<CatalogDocument>(CATALOG_COLLECTION).insertOne(doc);
    return await toRecord(doc as WithId<CatalogDocument>, db);
  },

  async updateCatalog(id: string, input: CatalogUpdateInput) {
    const db = await getMongoDb();
    if (input.isDefault) {
      await db
        .collection<CatalogDocument>(CATALOG_COLLECTION)
        .updateMany({}, { $set: { isDefault: false } });
    }
    const normalizedPriceGroupSelection =
      input.priceGroupIds !== undefined || input.defaultPriceGroupId !== undefined
        ? await normalizePriceGroupSelectionForStorage(
            'mongodb',
            {
              ...(input.priceGroupIds !== undefined ? { priceGroupIds: input.priceGroupIds } : {}),
              ...(input.defaultPriceGroupId !== undefined
                ? { defaultPriceGroupId: input.defaultPriceGroupId }
                : {}),
            },
            { mongo: db }
          )
        : null;
    const updateDoc: Partial<CatalogDocument> = {
      ...(input.name !== undefined ? { name: input.name } : null),
      ...(input.description !== undefined ? { description: input.description ?? null } : null),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : null),
      ...(input.defaultLanguageId !== undefined
        ? { defaultLanguageId: input.defaultLanguageId ?? null }
        : null),
      ...(input.defaultPriceGroupId !== undefined
        ? { defaultPriceGroupId: normalizedPriceGroupSelection?.defaultPriceGroupId ?? null }
        : null),
      ...(input.languageIds !== undefined ? { languageIds: input.languageIds } : null),
      ...(input.priceGroupIds !== undefined
        ? { priceGroupIds: normalizedPriceGroupSelection?.priceGroupIds ?? [] }
        : null),
      updatedAt: new Date(),
    };
    const result = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id }] },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );
    return result ? await toRecord({ ...result, _id: result._id }, db) : null;
  },

  async deleteCatalog(id: string) {
    const db = await getMongoDb();
    await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .deleteOne({ $or: [{ _id: id }, { id }] });
  },

  async getCatalogsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const db = await getMongoDb();
    const docs = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .find({ $or: [{ _id: { $in: Array.from(ids) } }, { id: { $in: ids } }] })
      .toArray();
    return await Promise.all(
      docs.map((doc: WithId<CatalogDocument>) => toRecord({ ...doc, _id: doc._id }, db))
    );
  },

  async setDefaultCatalog(id: string) {
    const db = await getMongoDb();
    await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .updateMany({}, { $set: { isDefault: false } });
    await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .updateOne(
        { $or: [{ _id: id }, { id }] },
        { $set: { isDefault: true, updatedAt: new Date() } }
      );
  },
};
