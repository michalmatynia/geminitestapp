import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import type {
  ParameterRepository,
  ParameterFilters,
  ParameterCreateInput,
  ParameterUpdateInput,
} from '@/shared/contracts/products';
import type { ProductParameter } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Filter, UpdateFilter, Document } from 'mongodb';

const COLLECTION = 'product_parameters';

interface ProductParameterDoc extends Document {
  _id: ObjectId | string;
  id?: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
  selectorType: ProductParameter['selectorType'];
  optionLabels: string[];
  catalogId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ALLOWED_SELECTOR_TYPES = new Set<ProductParameter['selectorType']>([
  'text',
  'textarea',
  'radio',
  'select',
  'dropdown',
  'checkbox',
  'checklist',
]);

const normalizeSelectorType = (value: unknown): ProductParameter['selectorType'] => {
  if (typeof value !== 'string') return 'text';
  const normalized = value.trim().toLowerCase();
  return ALLOWED_SELECTOR_TYPES.has(normalized as ProductParameter['selectorType'])
    ? (normalized as ProductParameter['selectorType'])
    : 'text';
};

const normalizeOptionLabels = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  input.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) return;
    seen.add(normalized.toLowerCase());
    labels.push(normalized);
  });
  return labels;
};

const toParameterDomain = (doc: ProductParameterDoc): ProductParameter => ({
  id: String(doc.id ?? doc._id),
  name: doc.name_en,
  name_en: doc.name_en,
  name_pl: doc.name_pl ?? null,
  name_de: doc.name_de ?? null,
  selectorType: normalizeSelectorType(doc.selectorType),
  optionLabels: normalizeOptionLabels(doc.optionLabels),
  catalogId: doc.catalogId?.toString(),
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const buildParameterIdFilter = (id: string): Filter<ProductParameterDoc> => {
  const trimmed = id.trim();
  const filters: Filter<ProductParameterDoc>[] = [
    { _id: trimmed } as Filter<ProductParameterDoc>,
    { id: trimmed } as Filter<ProductParameterDoc>,
  ];

  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    filters.push({ _id: new ObjectId(trimmed) } as Filter<ProductParameterDoc>);
  }

  return { $or: filters };
};

export const mongoParameterRepository: ParameterRepository = {
  async listParameters(filters: ParameterFilters): Promise<ProductParameter[]> {
    const db = await getMongoDb();
    const query: Filter<ProductParameterDoc> = {};
    if (filters.catalogId) query.catalogId = filters.catalogId;
    if (filters.search) {
      query.$or = [
        { name_en: { $regex: filters.search, $options: 'i' } },
        { name_pl: { $regex: filters.search, $options: 'i' } },
        { name_de: { $regex: filters.search, $options: 'i' } },
      ] as Filter<ProductParameterDoc>[];
    }

    const cursor = db.collection<ProductParameterDoc>(COLLECTION).find(query).sort({ name_en: 1 });

    if (typeof filters.skip === 'number') cursor.skip(filters.skip);
    if (typeof filters.limit === 'number') cursor.limit(filters.limit);

    const params = await cursor.toArray();
    return params.map(toParameterDomain);
  },

  async getParameterById(id: string): Promise<ProductParameter | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductParameterDoc>(COLLECTION)
      .findOne(buildParameterIdFilter(id));
    return doc ? toParameterDomain(doc) : null;
  },

  async createParameter(data: ParameterCreateInput): Promise<ProductParameter> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProductParameterDoc, '_id'> = {
      id: randomUUID(),
      name_en: data.name_en,
      name_pl: data.name_pl ?? null,
      name_de: data.name_de ?? null,
      selectorType: normalizeSelectorType(data.selectorType),
      optionLabels: normalizeOptionLabels(data.optionLabels ?? []),
      catalogId: data.catalogId,
      createdAt: now,
      updatedAt: now,
    };
    const result = await db.collection<Omit<ProductParameterDoc, '_id'>>(COLLECTION).insertOne(doc);
    return toParameterDomain({ ...doc, _id: result.insertedId } as ProductParameterDoc);
  },

  async updateParameter(id: string, data: ParameterUpdateInput): Promise<ProductParameter> {
    const db = await getMongoDb();

    const set: Partial<ProductParameterDoc> = {
      updatedAt: new Date(),
    };

    if (data.name_en !== undefined) set.name_en = data.name_en;
    if (data.name_pl !== undefined) set.name_pl = data.name_pl;
    if (data.name_de !== undefined) set.name_de = data.name_de;
    if (data.selectorType !== undefined)
      set.selectorType = normalizeSelectorType(data.selectorType);
    if (data.optionLabels !== undefined)
      set.optionLabels = normalizeOptionLabels(data.optionLabels);

    await db
      .collection<ProductParameterDoc>(COLLECTION)
      .updateOne(buildParameterIdFilter(id), { $set: set } as UpdateFilter<ProductParameterDoc>);

    const updated = await this.getParameterById(id);
    if (!updated) throw internalError('Failed to update parameter', { parameterId: id });
    return updated;
  },

  async deleteParameter(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ProductParameterDoc>(COLLECTION).deleteOne(buildParameterIdFilter(id));
  },

  async findByName(catalogId: string, name_en: string): Promise<ProductParameter | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductParameterDoc>(COLLECTION)
      .findOne({ catalogId, name_en });
    return doc ? toParameterDomain(doc) : null;
  },

  async bulkCreateParameters(data: ParameterCreateInput[]): Promise<ProductParameter[]> {
    const db = await getMongoDb();
    const now = new Date();
    const docs: ProductParameterDoc[] = data.map((item) => ({
      _id: new ObjectId(),
      id: randomUUID(),
      catalogId: item.catalogId,
      name_en: item.name_en,
      name_pl: item.name_pl ?? null,
      name_de: item.name_de ?? null,
      selectorType: normalizeSelectorType(item.selectorType),
      optionLabels: normalizeOptionLabels(item.optionLabels ?? []),
      createdAt: now,
      updatedAt: now,
    }));

    if (docs.length === 0) return [];

    await db.collection<ProductParameterDoc>(COLLECTION).insertMany(docs);
    return docs.map(toParameterDomain);
  },
};
