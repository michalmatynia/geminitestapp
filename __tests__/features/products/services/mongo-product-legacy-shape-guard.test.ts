import type { Collection, Document, Filter } from 'mongodb';
import { describe, expect, it } from 'vitest';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type ProductIdentity = {
  _id?: unknown;
  id?: unknown;
};

type ProductShapeGuardDoc = ProductIdentity & {
  categoryId?: unknown;
  categories?: unknown;
  name?: unknown;
  description?: unknown;
  name_en?: unknown;
  name_pl?: unknown;
  name_de?: unknown;
  description_en?: unknown;
  description_pl?: unknown;
  description_de?: unknown;
  producers?: unknown;
  tags?: unknown;
};

type ProductViolation = {
  id: string;
  violations: string[];
};

const PRODUCTS_COLLECTION = 'products';
const RUN_LEGACY_SHAPE_GUARD =
  process.env['RUN_MONGO_PRODUCT_LEGACY_SHAPE_GUARD'] === '1' ||
  process.env['RUN_MONGO_PRODUCT_LEGACY_SHAPE_GUARD'] === 'true';
const LEGACY_PRODUCER_KEYS = new Set(['producer_id', 'product_id', 'assigned_at', 'id', 'value']);
const LEGACY_TAG_KEYS = new Set(['tag_id', 'product_id', 'assigned_at', 'id', 'value']);
const LOCALIZED_SCALAR_FIELDS = [
  'name_en',
  'name_pl',
  'name_de',
  'description_en',
  'description_pl',
  'description_de',
] as const;

const LEGACY_PRODUCT_SHAPE_CHECKS: Array<{ label: string; filter: Filter<Document> }> = [
  {
    label: 'legacy categories relation field',
    filter: { categories: { $exists: true } },
  },
  {
    label: 'legacy localized name object field',
    filter: { name: { $exists: true } },
  },
  {
    label: 'legacy localized description object field',
    filter: { description: { $exists: true } },
  },
  {
    label: 'legacy producer relation keys',
    filter: {
      $or: [
        { 'producers.producer_id': { $exists: true } },
        { 'producers.product_id': { $exists: true } },
        { 'producers.assigned_at': { $exists: true } },
        { 'producers.id': { $exists: true } },
        { 'producers.value': { $exists: true } },
      ],
    },
  },
  {
    label: 'legacy tag relation keys',
    filter: {
      $or: [
        { 'tags.tag_id': { $exists: true } },
        { 'tags.product_id': { $exists: true } },
        { 'tags.assigned_at': { $exists: true } },
        { 'tags.id': { $exists: true } },
        { 'tags.value': { $exists: true } },
      ],
    },
  },
];

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const hasNonEmptyString = (value: unknown): boolean => toTrimmedString(value).length > 0;
const hasValidAssignedAt = (value: unknown): boolean => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime());
  }
  return hasNonEmptyString(value);
};

const formatSampleIds = (docs: ProductIdentity[]): string => {
  const ids = docs
    .map((doc) => {
      const explicitId = toTrimmedString(doc.id);
      if (explicitId.length > 0) return explicitId;
      const rawId = doc._id;
      return rawId === undefined || rawId === null ? '' : String(rawId);
    })
    .filter((id) => id.length > 0);

  return ids.length > 0 ? ids.join(', ') : 'n/a';
};

const assertNoLegacyMatches = async (
  collection: Collection<Document>,
  label: string,
  filter: Filter<Document>
): Promise<void> => {
  const count = await collection.countDocuments(filter);
  if (count === 0) {
    expect(count, label).toBe(0);
    return;
  }

  const sampleDocs = (await collection
    .find(filter, { projection: { _id: 1, id: 1 } })
    .limit(5)
    .toArray()) as ProductIdentity[];
  const sampleIds = formatSampleIds(sampleDocs);

  expect(
    count,
    `${label}: found ${count} products (sample ids: ${sampleIds}). Run npm run products:normalize:v2 -- --write`
  ).toBe(0);
};

const resolveDocId = (doc: ProductIdentity): string =>
  toTrimmedString(doc.id) || (doc._id === undefined || doc._id === null ? 'unknown' : String(doc._id));

const collectRelationViolations = (
  relationName: 'producers' | 'tags',
  value: unknown,
  requiredIdField: 'producerId' | 'tagId',
  legacyKeys: Set<string>
): string[] => {
  const violations: string[] = [];

  if (value === undefined || value === null) return violations;
  if (!Array.isArray(value)) {
    violations.push(`${relationName} must be an array or null`);
    return violations;
  }

  value.forEach((entry: unknown, index: number) => {
    if (!isRecord(entry)) {
      violations.push(`${relationName}[${index}] must be an object`);
      return;
    }

    const matchedLegacyKeys = Object.keys(entry).filter((key) => legacyKeys.has(key));
    if (matchedLegacyKeys.length > 0) {
      violations.push(`${relationName}[${index}] uses legacy keys: ${matchedLegacyKeys.join(', ')}`);
    }

    if (!hasNonEmptyString(entry[requiredIdField])) {
      violations.push(`${relationName}[${index}] missing ${requiredIdField}`);
    }
    if (!hasNonEmptyString(entry['productId'])) {
      violations.push(`${relationName}[${index}] missing productId`);
    }
    if (!hasValidAssignedAt(entry['assignedAt'])) {
      violations.push(`${relationName}[${index}] missing assignedAt`);
    }
  });

  return violations;
};

const collectShapeViolations = (doc: ProductShapeGuardDoc): string[] => {
  const violations: string[] = [];

  if (doc.categories !== undefined && doc.categories !== null) {
    violations.push('categories field must not exist');
  }
  if (doc.name !== undefined && doc.name !== null) {
    violations.push('name field must not exist');
  }
  if (doc.description !== undefined && doc.description !== null) {
    violations.push('description field must not exist');
  }

  if (doc.categoryId !== undefined && doc.categoryId !== null && typeof doc.categoryId !== 'string') {
    violations.push('categoryId must be string or null');
  }

  for (const field of LOCALIZED_SCALAR_FIELDS) {
    const value = doc[field];
    if (value !== undefined && value !== null && typeof value !== 'string') {
      violations.push(`${field} must be string or null`);
    }
  }

  violations.push(
    ...collectRelationViolations('producers', doc.producers, 'producerId', LEGACY_PRODUCER_KEYS)
  );
  violations.push(...collectRelationViolations('tags', doc.tags, 'tagId', LEGACY_TAG_KEYS));

  return violations;
};

const assertNoInvalidCanonicalShapes = async (collection: Collection<Document>): Promise<void> => {
  const docs = (await collection
    .find(
      {},
      {
        projection: {
          _id: 1,
          id: 1,
          categoryId: 1,
          categories: 1,
          name: 1,
          description: 1,
          name_en: 1,
          name_pl: 1,
          name_de: 1,
          description_en: 1,
          description_pl: 1,
          description_de: 1,
          producers: 1,
          tags: 1,
        },
      }
    )
    .toArray()) as ProductShapeGuardDoc[];

  const offenders: ProductViolation[] = [];
  docs.forEach((doc: ProductShapeGuardDoc) => {
    const violations = collectShapeViolations(doc);
    if (violations.length === 0) return;
    offenders.push({
      id: resolveDocId(doc),
      violations,
    });
  });

  if (offenders.length === 0) {
    expect(offenders.length).toBe(0);
    return;
  }

  const sample = offenders
    .slice(0, 5)
    .map((offender: ProductViolation) => `${offender.id}: ${offender.violations.join('; ')}`)
    .join(' | ');

  expect(
    offenders.length,
    `invalid canonical product shapes found: ${offenders.length} documents (sample: ${sample}). Run npm run products:normalize:v2 -- --write`
  ).toBe(0);
};

describe('Mongo products legacy shape guard', () => {
  const legacyShapeGuardIt = RUN_LEGACY_SHAPE_GUARD ? it : it.skip;
  legacyShapeGuardIt(
    'has no legacy product fields left in Mongo documents',
    async () => {
      const db = await getMongoDb();
      const products = db.collection<Document>(PRODUCTS_COLLECTION);

      for (const check of LEGACY_PRODUCT_SHAPE_CHECKS) {
        await assertNoLegacyMatches(products, check.label, check.filter);
      }
      await assertNoInvalidCanonicalShapes(products);
    },
    30_000
  );
});
