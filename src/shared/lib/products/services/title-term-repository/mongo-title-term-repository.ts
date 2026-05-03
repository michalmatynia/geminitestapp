import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import type {
  TitleTermCreateInput,
  TitleTermFilters,
  TitleTermRepository,
  TitleTermUpdateInput,
} from '@/shared/contracts/products/drafts';
import type { ProductTitleTerm } from '@/shared/contracts/products/title-terms';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { normalizeTitleTermName } from '@/shared/lib/products/title-terms';

import type { Document, Filter, UpdateFilter } from 'mongodb';

const COLLECTION = 'product_title_terms';

interface ProductTitleTermDoc extends Document {
  _id: ObjectId | string;
  id?: string;
  catalogId: string;
  type: 'size' | 'material' | 'theme';
  name: string;
  name_en: string;
  name_pl: string | null;
  normalizedNameEn: string;
  createdAt: Date;
  updatedAt: Date;
}

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;

const ensureIndexes = async (): Promise<void> => {
  if (indexesInitialized) return;
  if (indexesInFlight) {
    await indexesInFlight;
    return;
  }
  indexesInFlight = (async (): Promise<void> => {
    const db = await getMongoDb();
    const collection = db.collection<ProductTitleTermDoc>(COLLECTION);
    await Promise.all([
      collection.createIndex(
        { catalogId: 1, type: 1, normalizedNameEn: 1 },
        { unique: true, name: 'product_title_terms_catalog_type_name' }
      ),
      collection.createIndex(
        { catalogId: 1, type: 1, name_en: 1 },
        { name: 'product_title_terms_catalog_type_display_name' }
      ),
    ]);
    indexesInitialized = true;
  })();
  try {
    await indexesInFlight;
  } finally {
    indexesInFlight = null;
  }
};

const normalizeName = (value: string): string => value.trim().replace(/\s+/g, ' ');

const toTitleTermDomain = (doc: ProductTitleTermDoc): ProductTitleTerm => ({
  id: String(doc.id ?? doc._id),
  name: doc.name_en,
  description: null,
  name_en: doc.name_en,
  name_pl: doc.name_pl ?? null,
  catalogId: doc.catalogId,
  type: doc.type,
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const buildIdFilter = (id: string): Filter<ProductTitleTermDoc> => {
  const trimmed = id.trim();
  const filters: Filter<ProductTitleTermDoc>[] = [
    { _id: trimmed } as Filter<ProductTitleTermDoc>,
    { id: trimmed } as Filter<ProductTitleTermDoc>,
  ];
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    filters.push({ _id: new ObjectId(trimmed) } as Filter<ProductTitleTermDoc>);
  }
  return { $or: filters };
};

export const mongoTitleTermRepository: TitleTermRepository = {
  async listTitleTerms(filters: TitleTermFilters): Promise<ProductTitleTerm[]> {
    await ensureIndexes();
    const db = await getMongoDb();
    const query: Filter<ProductTitleTermDoc> = {};
    if (filters.catalogId) query.catalogId = filters.catalogId;
    if (filters.type) query.type = filters.type;
    if (filters.search) {
      query.$or = [
        { name_en: { $regex: filters.search, $options: 'i' } },
        { name_pl: { $regex: filters.search, $options: 'i' } },
      ] as Filter<ProductTitleTermDoc>[];
    }

    const cursor = db.collection<ProductTitleTermDoc>(COLLECTION).find(query).sort({
      type: 1,
      name_en: 1,
    });
    if (typeof filters.skip === 'number') cursor.skip(filters.skip);
    if (typeof filters.limit === 'number') cursor.limit(filters.limit);

    const docs = await cursor.toArray();
    return docs.map(toTitleTermDomain);
  },

  async getTitleTermById(id: string): Promise<ProductTitleTerm | null> {
    await ensureIndexes();
    const db = await getMongoDb();
    const doc = await db.collection<ProductTitleTermDoc>(COLLECTION).findOne(buildIdFilter(id));
    return doc ? toTitleTermDomain(doc) : null;
  },

  async createTitleTerm(data: TitleTermCreateInput): Promise<ProductTitleTerm> {
    await ensureIndexes();
    const db = await getMongoDb();
    const now = new Date();
    const name_en = normalizeName(data.name_en);
    const doc: Omit<ProductTitleTermDoc, '_id'> = {
      id: randomUUID(),
      catalogId: data.catalogId,
      type: data.type,
      name: name_en,
      name_en,
      name_pl: data.name_pl ? normalizeName(data.name_pl) : null,
      normalizedNameEn: normalizeTitleTermName(name_en),
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Omit<ProductTitleTermDoc, '_id'>>(COLLECTION).insertOne(doc);
    return toTitleTermDomain({ ...doc, _id: result.insertedId } as ProductTitleTermDoc);
  },

  async updateTitleTerm(id: string, data: TitleTermUpdateInput): Promise<ProductTitleTerm> {
    await ensureIndexes();
    const db = await getMongoDb();
    const set: Partial<ProductTitleTermDoc> = {
      updatedAt: new Date(),
    };

    if (data.catalogId !== undefined) set.catalogId = data.catalogId;
    if (data.type !== undefined) set.type = data.type;
    if (data.name_en !== undefined) {
      const normalized = normalizeName(data.name_en);
      set.name = normalized;
      set.name_en = normalized;
      set.normalizedNameEn = normalizeTitleTermName(normalized);
    }
    if (data.name_pl !== undefined) {
      set.name_pl = data.name_pl ? normalizeName(data.name_pl) : null;
    }

    await db
      .collection<ProductTitleTermDoc>(COLLECTION)
      .updateOne(buildIdFilter(id), { $set: set } as UpdateFilter<ProductTitleTermDoc>);

    const updated = await this.getTitleTermById(id);
    if (!updated) throw internalError('Failed to update title term', { titleTermId: id });
    return updated;
  },

  async deleteTitleTerm(id: string): Promise<void> {
    await ensureIndexes();
    const db = await getMongoDb();
    await db.collection<ProductTitleTermDoc>(COLLECTION).deleteOne(buildIdFilter(id));
  },

  async findByName(
    catalogId: string,
    type: ProductTitleTermDoc['type'],
    name_en: string
  ): Promise<ProductTitleTerm | null> {
    await ensureIndexes();
    const db = await getMongoDb();
    const doc = await db.collection<ProductTitleTermDoc>(COLLECTION).findOne({
      catalogId,
      type,
      normalizedNameEn: normalizeTitleTermName(name_en),
    });
    return doc ? toTitleTermDomain(doc) : null;
  },
};
