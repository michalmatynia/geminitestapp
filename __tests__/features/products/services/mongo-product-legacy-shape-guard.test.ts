import type { Collection, Document, Filter } from 'mongodb';
import { describe, expect, it } from 'vitest';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type ProductIdentity = {
  _id?: unknown;
  id?: unknown;
};

const PRODUCTS_COLLECTION = 'products';

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

describe('Mongo products legacy shape guard', () => {
  it('has no legacy product fields left in Mongo documents', async () => {
    const db = await getMongoDb();
    const products = db.collection<Document>(PRODUCTS_COLLECTION);

    for (const check of LEGACY_PRODUCT_SHAPE_CHECKS) {
      await assertNoLegacyMatches(products, check.label, check.filter);
    }
  });
});
