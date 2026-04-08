import { randomUUID } from 'crypto';

import { ObjectId } from 'mongodb';

import type {
  CustomFieldCreateInput,
  CustomFieldFilters,
  CustomFieldRepository,
  CustomFieldUpdateInput,
} from '@/shared/contracts/products/drafts';
import type {
  ProductCustomFieldDefinition,
  ProductCustomFieldOption,
  ProductCustomFieldType,
} from '@/shared/contracts/products/custom-fields';
import { internalError } from '@/shared/errors/app-error';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import type { Document, Filter, UpdateFilter } from 'mongodb';

const COLLECTION = 'product_custom_fields';

interface ProductCustomFieldDoc extends Document {
  _id: ObjectId | string;
  id?: string;
  name: string;
  type: ProductCustomFieldType;
  options: ProductCustomFieldOption[];
  createdAt: Date;
  updatedAt: Date;
}

const ALLOWED_TYPES = new Set<ProductCustomFieldType>(['text', 'checkbox_set']);

const normalizeType = (value: unknown): ProductCustomFieldType => {
  if (typeof value !== 'string') return 'text';
  const normalized = value.trim().toLowerCase();
  return ALLOWED_TYPES.has(normalized as ProductCustomFieldType)
    ? (normalized as ProductCustomFieldType)
    : 'text';
};

const normalizeOptions = (input: unknown): ProductCustomFieldOption[] => {
  if (!Array.isArray(input)) return [];

  const seenById = new Set<string>();
  const seenByLabel = new Set<string>();
  const options: ProductCustomFieldOption[] = [];

  input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
    const record = entry as Record<string, unknown>;
    const label = typeof record['label'] === 'string' ? record['label'].trim() : '';
    if (!label) return;

    const labelKey = label.toLowerCase();
    if (seenByLabel.has(labelKey)) return;
    seenByLabel.add(labelKey);

    const inputId = typeof record['id'] === 'string' ? record['id'].trim() : '';
    const id = inputId || randomUUID();
    if (seenById.has(id)) return;
    seenById.add(id);

    options.push({ id, label });
  });

  return options;
};

const toCustomFieldDomain = (
  doc: ProductCustomFieldDoc
): ProductCustomFieldDefinition => ({
  id: String(doc.id ?? doc._id),
  name: doc.name,
  type: normalizeType(doc.type),
  options: normalizeOptions(doc.options),
  createdAt: doc.createdAt?.toISOString() ?? new Date().toISOString(),
  updatedAt: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
});

const buildCustomFieldIdFilter = (id: string): Filter<ProductCustomFieldDoc> => {
  const trimmed = id.trim();
  const filters: Filter<ProductCustomFieldDoc>[] = [
    { _id: trimmed } as Filter<ProductCustomFieldDoc>,
    { id: trimmed } as Filter<ProductCustomFieldDoc>,
  ];

  if (/^[0-9a-fA-F]{24}$/.test(trimmed)) {
    filters.push({ _id: new ObjectId(trimmed) } as Filter<ProductCustomFieldDoc>);
  }

  return { $or: filters };
};

export const mongoProductCustomFieldRepository: CustomFieldRepository = {
  async listCustomFields(filters: CustomFieldFilters): Promise<ProductCustomFieldDefinition[]> {
    const db = await getMongoDb();
    const query: Filter<ProductCustomFieldDoc> = {};

    if (filters.search) {
      query.$or = [{ name: { $regex: filters.search, $options: 'i' } }] as Filter<
        ProductCustomFieldDoc
      >[];
    }

    const cursor = db.collection<ProductCustomFieldDoc>(COLLECTION).find(query).sort({ name: 1 });

    if (typeof filters.skip === 'number') cursor.skip(filters.skip);
    if (typeof filters.limit === 'number') cursor.limit(filters.limit);

    const fields = await cursor.toArray();
    return fields.map(toCustomFieldDomain);
  },

  async getCustomFieldById(id: string): Promise<ProductCustomFieldDefinition | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ProductCustomFieldDoc>(COLLECTION)
      .findOne(buildCustomFieldIdFilter(id));
    return doc ? toCustomFieldDomain(doc) : null;
  },

  async createCustomField(data: CustomFieldCreateInput): Promise<ProductCustomFieldDefinition> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ProductCustomFieldDoc, '_id'> = {
      id: randomUUID(),
      name: data.name.trim(),
      type: normalizeType(data.type),
      options: normalizeOptions(data.options ?? []),
      createdAt: now,
      updatedAt: now,
    };
    const result = await db
      .collection<Omit<ProductCustomFieldDoc, '_id'>>(COLLECTION)
      .insertOne(doc);
    return toCustomFieldDomain({ ...doc, _id: result.insertedId } as ProductCustomFieldDoc);
  },

  async updateCustomField(
    id: string,
    data: CustomFieldUpdateInput
  ): Promise<ProductCustomFieldDefinition> {
    const db = await getMongoDb();

    const set: Partial<ProductCustomFieldDoc> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) set.name = data.name.trim();
    if (data.type !== undefined) set.type = normalizeType(data.type);
    if (data.options !== undefined) set.options = normalizeOptions(data.options);

    await db
      .collection<ProductCustomFieldDoc>(COLLECTION)
      .updateOne(
        buildCustomFieldIdFilter(id),
        { $set: set } as UpdateFilter<ProductCustomFieldDoc>
      );

    const updated = await this.getCustomFieldById(id);
    if (!updated) {
      throw internalError('Failed to update custom field', { customFieldId: id });
    }
    return updated;
  },

  async deleteCustomField(id: string): Promise<void> {
    const db = await getMongoDb();
    await db.collection<ProductCustomFieldDoc>(COLLECTION).deleteOne(buildCustomFieldIdFilter(id));
  },

  async findByName(name: string): Promise<ProductCustomFieldDefinition | null> {
    const db = await getMongoDb();
    const doc = await db.collection<ProductCustomFieldDoc>(COLLECTION).findOne({ name });
    return doc ? toCustomFieldDomain(doc) : null;
  },
};
