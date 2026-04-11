import 'server-only';

import type { Filter } from 'mongodb';

import {
  PRODUCT_SCANS_COLLECTION,
  normalizeProductScanRecord,
  type ProductScanRecord,
  type ProductScanStatus,
  type UpdateProductScanInput,
} from '@/shared/contracts/product-scans';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';

type ProductScanDoc = Omit<ProductScanRecord, 'createdAt' | 'updatedAt' | 'completedAt'> & {
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
};

const ENGINE_RUN_ID_INDEX_NAME = 'product_scans_engineRunId_unique';
const ACTIVE_PRODUCT_PROVIDER_INDEX_NAME = 'product_scans_active_product_provider_unique';
const LEGACY_ENGINE_RUN_ID_INDEX_NAME = 'engineRunId_1';

let indexesEnsured: Promise<void> | null = null;
let inMemoryScans: ProductScanRecord[] = [];

const createDuplicateConstraintError = (message: string): Error => {
  const error = new Error(message) as Error & { code?: number };
  error.code = 11000;
  return error;
};

const ensureIndexes = async (): Promise<void> => {
  if (!process.env['MONGODB_URI']) {
    return;
  }

  if (indexesEnsured) {
    return indexesEnsured;
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

  return indexesEnsured;
};

const readCollection = async () => {
  const db = await getMongoDb();
  return db.collection<ProductScanDoc>(PRODUCT_SCANS_COLLECTION);
};

const toScanRecord = (doc: ProductScanDoc): ProductScanRecord =>
  normalizeProductScanRecord({
    ...doc,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    completedAt: doc.completedAt ? doc.completedAt.toISOString() : null,
  });

const toDocUpdate = (
  scan: ProductScanRecord
): Omit<ProductScanDoc, 'createdAt' | 'updatedAt' | 'completedAt'> & {
  completedAt: Date | null;
} => {
  const { createdAt: _createdAt, updatedAt: _updatedAt, completedAt, ...rest } = scan;
  return {
    ...rest,
    completedAt: completedAt ? new Date(completedAt) : null,
  };
};

const sortByCreatedAtDesc = (scans: ProductScanRecord[]): ProductScanRecord[] =>
  [...scans].sort((left, right) => {
    const leftTs = left.createdAt ? Date.parse(left.createdAt) : 0;
    const rightTs = right.createdAt ? Date.parse(right.createdAt) : 0;
    return rightTs - leftTs;
  });

const normalizeIdList = (value: string[] | null | undefined): string[] =>
  Array.from(
    new Set(
      (Array.isArray(value) ? value : [])
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    )
  );

const buildMongoFilter = (input: {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  statuses?: ProductScanStatus[] | null;
}): Filter<ProductScanDoc> => {
  const filter: Filter<ProductScanDoc> = {};
  const ids = normalizeIdList(input.ids);
  const productIds = normalizeIdList(input.productIds);
  const productId = input.productId?.trim() || null;
  const statuses = normalizeIdList(input.statuses ?? []) as ProductScanStatus[];

  if (ids.length > 0) {
    filter['id'] = { $in: ids };
  }
  if (productId) {
    filter['productId'] = productId;
  } else if (productIds.length > 0) {
    filter['productId'] = { $in: productIds };
  }
  if (statuses.length > 0) {
    filter['status'] = { $in: statuses };
  }

  return filter;
};

const matchesFilter = (
  scan: ProductScanRecord,
  input: {
    ids?: string[] | null;
    productId?: string | null;
    productIds?: string[] | null;
    statuses?: ProductScanStatus[] | null;
  }
): boolean => {
  const ids = normalizeIdList(input.ids);
  const productIds = normalizeIdList(input.productIds);
  const productId = input.productId?.trim() || null;
  const statuses = normalizeIdList(input.statuses ?? []) as ProductScanStatus[];

  if (ids.length > 0 && !ids.includes(scan.id)) {
    return false;
  }
  if (productId && scan.productId !== productId) {
    return false;
  }
  if (!productId && productIds.length > 0 && !productIds.includes(scan.productId)) {
    return false;
  }
  if (statuses.length > 0 && !statuses.includes(scan.status)) {
    return false;
  }
  return true;
};

export async function listProductScans(input: {
  ids?: string[] | null;
  productId?: string | null;
  productIds?: string[] | null;
  statuses?: ProductScanStatus[] | null;
  limit?: number | null;
} = {}): Promise<ProductScanRecord[]> {
  const limit = input.limit != null ? Math.max(1, Math.trunc(input.limit)) : 100;

  if (!process.env['MONGODB_URI']) {
    return sortByCreatedAtDesc(
      inMemoryScans.filter((scan) =>
        matchesFilter(scan, {
          ids: input.ids,
          productId: input.productId,
          productIds: input.productIds,
          statuses: input.statuses,
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
      })
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  return docs.map(toScanRecord);
}

export async function getProductScanById(id: string): Promise<ProductScanRecord | null> {
  const normalizedId = id.trim();
  if (!normalizedId) {
    return null;
  }

  if (!process.env['MONGODB_URI']) {
    return inMemoryScans.find((scan) => scan.id === normalizedId) ?? null;
  }

  await ensureIndexes();
  const collection = await readCollection();
  const doc = await collection.findOne({ id: normalizedId });
  return doc ? toScanRecord(doc) : null;
}

export async function findLatestActiveProductScan(input: {
  productId: string;
  provider?: ProductScanRecord['provider'];
}): Promise<ProductScanRecord | null> {
  const productId = input.productId.trim();
  if (!productId) {
    return null;
  }

  const provider = input.provider ?? 'amazon';

  if (!process.env['MONGODB_URI']) {
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

  return doc ? toScanRecord(doc) : null;
}

export async function upsertProductScan(scan: ProductScanRecord): Promise<ProductScanRecord> {
  const normalized = normalizeProductScanRecord(scan);
  const now = new Date();

  if (!process.env['MONGODB_URI']) {
    const conflictingActiveScan = inMemoryScans.find(
      (entry) =>
        entry.id !== normalized.id &&
        entry.productId === normalized.productId &&
        entry.provider === normalized.provider &&
        (entry.status === 'queued' || entry.status === 'running') &&
        (normalized.status === 'queued' || normalized.status === 'running')
    );
    if (conflictingActiveScan) {
      throw createDuplicateConstraintError(
        'Another active product scan already exists for this product and provider.'
      );
    }

    const normalizedEngineRunId = normalized.engineRunId?.trim() || null;
    if (normalizedEngineRunId) {
      const conflictingEngineRunScan = inMemoryScans.find(
        (entry) => entry.id !== normalized.id && entry.engineRunId === normalizedEngineRunId
      );
      if (conflictingEngineRunScan) {
        throw createDuplicateConstraintError(
          `Another product scan already uses engine run id ${normalizedEngineRunId}.`
        );
      }
    }

    const next = {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
      updatedAt: now.toISOString(),
      completedAt: normalized.completedAt ?? null,
    };
    const existingIndex = inMemoryScans.findIndex((entry) => entry.id === normalized.id);
    if (existingIndex >= 0) {
      inMemoryScans[existingIndex] = next;
    } else {
      inMemoryScans = [next, ...inMemoryScans];
    }
    return next;
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
        createdAt: normalized.createdAt ? new Date(normalized.createdAt) : now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  if (!result) {
    return {
      ...normalized,
      createdAt: normalized.createdAt ?? now.toISOString(),
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
  if (!existing) {
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
