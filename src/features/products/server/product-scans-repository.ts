import 'server-only';

import type { Collection } from 'mongodb';

import {
  PRODUCT_SCANS_COLLECTION,
  normalizeProductScanRecord,
  type CreateProductScanInput,
  type ProductScanProvider,
  type ProductScanRecord,
  type ProductScanStatus,
  type UpdateProductScanInput,
} from '@/shared/contracts/product-scans';
import { getMongoDb } from '@/shared/lib/db/product-mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import {
  ACTIVE_PRODUCT_PROVIDER_INDEX_NAME,
  ENGINE_RUN_ID_INDEX_NAME,
  LEGACY_ENGINE_RUN_ID_INDEX_NAME,
  buildMongoFilter,
  matchesFilter,
  normalizeIdList,
  sortByCreatedAtDesc,
  toDocUpdate,
  toScanRecord,
  upsertInMemoryProductScan,
  type ProductScanDoc,
} from './product-scans-repository.helpers';

let inMemoryScans: ProductScanRecord[] = [];
let indexesEnsured: Promise<void> | null = null;

const hasMongoUri = (): boolean => (process.env['MONGODB_URI'] ?? '').length > 0;

const ensureIndexes = async (): Promise<void> => {
  if (!hasMongoUri()) {
    return;
  }

  if (indexesEnsured !== null) {
    await indexesEnsured;
    return;
  }

  indexesEnsured = (async () => {
    try {
      const db = await getMongoDb();
      const collection = db.collection<ProductScanDoc>(PRODUCT_SCANS_COLLECTION);
      const existingIndexes = await collection.indexes();

      if (existingIndexes.some((index) => index.name === LEGACY_ENGINE_RUN_ID_INDEX_NAME)) {
        await collection.dropIndex(LEGACY_ENGINE_RUN_ID_INDEX_NAME);
      }

      await Promise.all([
        collection.createIndex({ id: 1 }, { unique: true }),
        collection.createIndex({ productId: 1, createdAt: -1 }),
        collection.createIndex(
          { engineRunId: 1 },
          {
            name: ENGINE_RUN_ID_INDEX_NAME,
            unique: true,
            partialFilterExpression: { engineRunId: { $type: 'string' } },
          }
        ),
        collection.createIndex(
          { productId: 1, provider: 1 },
          {
            name: ACTIVE_PRODUCT_PROVIDER_INDEX_NAME,
            unique: true,
            partialFilterExpression: { status: { $in: ['queued', 'running'] } },
          }
        ),
        collection.createIndex({ status: 1, updatedAt: -1 }),
      ]);
    } catch (error) {
      // Scans reads and writes should stay available even if index bootstrap
      // hits legacy data or an already-conflicting index definition.
      void ErrorSystem.captureException(error, {
        service: 'product-scans.repository',
        action: 'ensureIndexes',
      });
    }
  })();

  await indexesEnsured;
};

const readCollection = async (): Promise<Collection<ProductScanDoc>> => {
  const db = await getMongoDb();
  return db.collection<ProductScanDoc>(PRODUCT_SCANS_COLLECTION);
};

export async function listProductScans(input: {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  statuses?: ProductScanStatus[] | null;
  provider?: ProductScanProvider | null;
  limit?: number | null;
} = {}): Promise<ProductScanRecord[]> {
  const limit =
    input.limit !== null && input.limit !== undefined ? Math.max(1, Math.trunc(input.limit)) : 100;

  if (!hasMongoUri()) {
    return sortByCreatedAtDesc(
      inMemoryScans.filter((scan) =>
        matchesFilter(scan, {
          ids: input.ids,
          productId: input.productId,
          productIds: input.productIds,
          statuses: input.statuses,
          provider: input.provider,
        })
      )
    ).slice(0, limit);
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection
    .find(
      buildMongoFilter({
        ids: input.ids,
        productId: input.productId,
        productIds: input.productIds,
        statuses: input.statuses,
        provider: input.provider,
      })
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(toScanRecord);
}

export async function listLatestProductScansByProductIds(input: {
  productIds: string[];
  statuses?: ProductScanStatus[] | null;
}): Promise<ProductScanRecord[]> {
  const productIds = normalizeIdList(input.productIds);
  if (productIds.length === 0) {
    return [];
  }

  if (!hasMongoUri()) {
    const latestByProductId = new Map<string, ProductScanRecord>();

    for (const scan of sortByCreatedAtDesc(
      inMemoryScans.filter((entry) =>
        matchesFilter(entry, {
          productIds,
          statuses: input.statuses,
        })
      )
    )) {
      if (!latestByProductId.has(scan.productId)) {
        latestByProductId.set(scan.productId, scan);
      }
    }

    return sortByCreatedAtDesc(Array.from(latestByProductId.values()));
  }

  await ensureIndexes();
  const collection = await readCollection();
  const docs = await collection
    .aggregate<ProductScanDoc>([
      {
        $match: buildMongoFilter({
          productIds,
          statuses: input.statuses,
        }),
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$productId',
          doc: { $first: '$$ROOT' },
        },
      },
      { $replaceRoot: { newRoot: '$doc' } },
      { $sort: { createdAt: -1 } },
    ])
    .toArray();

  return docs.map(toScanRecord);
}

export async function getProductScanById(id: string): Promise<ProductScanRecord | null> {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    return null;
  }

  if (!hasMongoUri()) {
    return inMemoryScans.find((scan) => scan.id === normalizedId) ?? null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const doc = await collection.findOne({ id: normalizedId });
  return doc !== null ? toScanRecord(doc) : null;
}

export async function findLatestActiveProductScan(input: {
  productId: string;
  provider?: ProductScanRecord['provider'];
}): Promise<ProductScanRecord | null> {
  const productId = input.productId.trim();
  if (productId.length === 0) {
    return null;
  }

  const provider = input.provider ?? 'amazon';

  if (!hasMongoUri()) {
    return (
      sortByCreatedAtDesc(
        inMemoryScans.filter(
          (scan) =>
            scan.productId === productId &&
            scan.provider === provider &&
            (scan.status === 'queued' || scan.status === 'running')
        )
      )[0] ?? null
    );
  }

  await ensureIndexes();
  const collection = await readCollection();
  const doc = await collection.findOne(
    {
      productId,
      provider,
      status: { $in: ['queued', 'running'] },
    },
    { sort: { createdAt: -1 } }
  );

  return doc !== null ? toScanRecord(doc) : null;
}

export async function upsertProductScan(scan: CreateProductScanInput): Promise<ProductScanRecord> {
  const normalized = normalizeProductScanRecord(scan);
  const now = new Date();

  if (!hasMongoUri()) {
    const result = upsertInMemoryProductScan({ normalized, now, scans: inMemoryScans });
    inMemoryScans = result.scans;
    return result.record;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const update = toDocUpdate(normalized);
  const result = await collection.findOneAndUpdate(
    { id: normalized.id },
    {
      $set: {
        ...update,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt:
          normalized.createdAt.length > 0 ? new Date(normalized.createdAt) : now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  if (result === null) {
    return {
      ...normalized,
      createdAt: normalized.createdAt,
      updatedAt: now.toISOString(),
    };
  }

  return toScanRecord(result);
}

export async function updateProductScan(
  id: string,
  updates: UpdateProductScanInput
): Promise<ProductScanRecord | null> {
  const existing = await getProductScanById(id);
  if (existing === null) {
    return null;
  }

  return await upsertProductScan(
    normalizeProductScanRecord({
      ...existing,
      ...updates,
      id: existing.id,
      productId: existing.productId,
    })
  );
}

export async function deleteProductScan(id: string): Promise<boolean> {
  const normalizedId = id.trim();
  if (normalizedId.length === 0) {
    return false;
  }

  if (!hasMongoUri()) {
    const initialLength = inMemoryScans.length;
    inMemoryScans = inMemoryScans.filter((scan) => scan.id !== normalizedId);
    return inMemoryScans.length < initialLength;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const result = await collection.deleteOne({ id: normalizedId });
  return result.deletedCount > 0;
}
