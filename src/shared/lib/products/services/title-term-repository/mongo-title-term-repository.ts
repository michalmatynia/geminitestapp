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
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { normalizeTitleTermName } from '@/shared/lib/products/title-terms';

import type { Document, Filter, UpdateFilter } from 'mongodb';

const COLLECTION = 'product_title_terms';
const GLOBAL_TITLE_TERM_CATALOG_ID = 'global';

interface ProductTitleTermDoc extends Document {
  _id: ObjectId | string;
  id?: string;
  catalogId: string;
  type: 'size' | 'material' | 'theme';
  name: string;
  name_en: string;
  name_pl: string | null;
  normalizedNameEn: string;
  createdAt?: Date;
  updatedAt?: Date;
}

let indexesInitialized = false;
let indexesInFlight: Promise<void> | null = null;

const createIndexes = async (): Promise<void> => {
  const db = await getMongoDb();
  const collection = db.collection<ProductTitleTermDoc>(COLLECTION);
  await Promise.all([
    collection.createIndex(
      { type: 1, name_en: 1 },
      { name: 'product_title_terms_type_display_name' }
    ),
    collection.createIndex(
      { type: 1, normalizedNameEn: 1 },
      { unique: true, name: 'product_title_terms_type_normalized_name' }
    ),
  ]);
  indexesInitialized = true;
};

const ensureIndexes = async (): Promise<void> => {
  if (indexesInitialized) return;
  const inFlight = indexesInFlight ?? createIndexes();
  indexesInFlight = inFlight;
  try {
    await inFlight;
  } finally {
    if (indexesInFlight === inFlight) {
      indexesInFlight = null;
    }
  }
};

const normalizeName = (value: string): string => value.trim().replace(/\s+/g, ' ');

const toTitleTermDomain = (doc: ProductTitleTermDoc): ProductTitleTerm => ({
  id: String(doc.id ?? doc._id),
  name: doc.name_en,
  description: null,
  name_en: doc.name_en,
  name_pl: doc.name_pl ?? null,
  catalogId: GLOBAL_TITLE_TERM_CATALOG_ID,
  type: doc.type,
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const buildIdFilter = (id: string): Filter<ProductTitleTermDoc> => {
  const trimmed = id.trim();
  const filters: Filter<ProductTitleTermDoc>[] = [
    { _id: trimmed },
    { id: trimmed },
  ];
  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    filters.push({ _id: new ObjectId(trimmed) });
  }
  return { $or: filters };
};

const buildListQuery = (filters: TitleTermFilters): Filter<ProductTitleTermDoc> => {
  const query: Filter<ProductTitleTermDoc> = {};
  if (filters.type !== undefined) {
    query.type = filters.type;
  }
  if (filters.search !== undefined && filters.search.length > 0) {
    const searchFilters: Filter<ProductTitleTermDoc>[] = [
      { name_en: { $regex: filters.search, $options: 'i' } },
      { name_pl: { $regex: filters.search, $options: 'i' } },
    ];
    query.$or = searchFilters;
  }
  return query;
};

export const mongoTitleTermRepository: TitleTermRepository = {
  async listTitleTerms(filters: TitleTermFilters): Promise<ProductTitleTerm[]> {
    await ensureIndexes();
    const db = await getMongoDb();
    const query = buildListQuery(filters);

    const cursor = db.collection<ProductTitleTermDoc>(COLLECTION).find(query).sort({
      type: 1,
      name_en: 1,
    });
    if (typeof filters.skip === 'number') cursor.skip(filters.skip);
    if (typeof filters.limit === 'number') cursor.limit(filters.limit);

    return (await cursor.toArray()).map(toTitleTermDomain);
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
    const nameEn = normalizeName(data.name_en);
    const doc: ProductTitleTermDoc = {
      _id: new ObjectId(),
      id: randomUUID(),
      catalogId: GLOBAL_TITLE_TERM_CATALOG_ID,
      type: data.type,
      name: nameEn,
      name_en: nameEn,
      name_pl:
        data.name_pl !== undefined && data.name_pl !== null && data.name_pl.length > 0
          ? normalizeName(data.name_pl)
          : null,
      normalizedNameEn: normalizeTitleTermName(nameEn),
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<ProductTitleTermDoc>(COLLECTION).insertOne(doc);
    return toTitleTermDomain(doc);
  },

  async updateTitleTerm(id: string, data: TitleTermUpdateInput): Promise<ProductTitleTerm> {
    await ensureIndexes();
    const db = await getMongoDb();
    const set: Partial<ProductTitleTermDoc> = {
      catalogId: GLOBAL_TITLE_TERM_CATALOG_ID,
      updatedAt: new Date(),
    };

    if (data.type !== undefined) set.type = data.type;
    if (data.name_en !== undefined) {
      const normalized = normalizeName(data.name_en);
      set.name = normalized;
      set.name_en = normalized;
      set.normalizedNameEn = normalizeTitleTermName(normalized);
    }
    if (data.name_pl !== undefined) {
      set.name_pl =
        data.name_pl !== null && data.name_pl.length > 0 ? normalizeName(data.name_pl) : null;
    }

    const update: UpdateFilter<ProductTitleTermDoc> = { $set: set };
    await db
      .collection<ProductTitleTermDoc>(COLLECTION)
      .updateOne(buildIdFilter(id), update);

    const updated = await this.getTitleTermById(id);
    if (updated === null) throw internalError('Failed to update title term', { titleTermId: id });
    return updated;
  },

  async deleteTitleTerm(id: string): Promise<void> {
    await ensureIndexes();
    const db = await getMongoDb();
    await db.collection<ProductTitleTermDoc>(COLLECTION).deleteOne(buildIdFilter(id));
  },

  async findByName(
    type: ProductTitleTermDoc['type'],
    nameEn: string
  ): Promise<ProductTitleTerm | null> {
    await ensureIndexes();
    const db = await getMongoDb();
    const doc = await db.collection<ProductTitleTermDoc>(COLLECTION).findOne({
      type,
      normalizedNameEn: normalizeTitleTermName(nameEn),
    });
    return doc ? toTitleTermDomain(doc) : null;
  },
};
