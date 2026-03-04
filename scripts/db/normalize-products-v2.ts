import 'dotenv/config';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type ProductDoc = {
  _id?: unknown;
  id?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  categoryId?: unknown;
  categories?: unknown;
  name?: unknown;
  description?: unknown;
  producers?: unknown;
  tags?: unknown;
};

type CanonicalProducerRelation = {
  productId: string;
  producerId: string;
  assignedAt: string;
  producer?: unknown;
};

type CanonicalTagRelation = {
  productId: string;
  tagId: string;
  assignedAt: string;
  tag?: unknown;
};

type RelationNormalizationResult<T> = {
  next: T[];
  dropped: number;
  repaired: number;
};

type CliOptions = {
  dryRun: boolean;
  batchSize: number;
  limit: number | null;
};

type Summary = {
  scanned: number;
  updated: number;
  categoryBackfilled: number;
  categoriesFieldRemovedDocs: number;
  nameFieldRemovedDocs: number;
  descriptionFieldRemovedDocs: number;
  producerDocsNormalized: number;
  producerEntriesDropped: number;
  producerEntriesRepaired: number;
  tagDocsNormalized: number;
  tagEntriesDropped: number;
  tagEntriesRepaired: number;
};

const PRODUCT_COLLECTION = 'products';
const DEFAULT_BATCH_SIZE = 250;

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toIsoString = (value: unknown): string | null => {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : null;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  }
  return null;
};

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    batchSize: DEFAULT_BATCH_SIZE,
    limit: null,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg.startsWith('--batchSize=')) {
      const raw = Number(arg.slice('--batchSize='.length));
      if (Number.isFinite(raw) && raw > 0) {
        options.batchSize = Math.floor(raw);
      }
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const raw = Number(arg.slice('--limit='.length));
      if (Number.isFinite(raw) && raw > 0) {
        options.limit = Math.floor(raw);
      }
    }
  }

  return options;
};

const resolveRootProductId = (doc: ProductDoc): string =>
  toTrimmedString(doc.id) || toTrimmedString(doc._id);

const resolveCategoryIdFromLegacyRelation = (value: unknown): string | null => {
  if (value === undefined || value === null) return null;

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
      const record = entry as Record<string, unknown>;
      const candidate =
        toTrimmedString(record['categoryId']) ||
        toTrimmedString(record['category_id']) ||
        toTrimmedString(record['id']) ||
        toTrimmedString(record['value']);
      if (candidate) return candidate;
    }
    return null;
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const candidate =
      toTrimmedString(record['categoryId']) ||
      toTrimmedString(record['category_id']) ||
      toTrimmedString(record['id']) ||
      toTrimmedString(record['value']);
    return candidate || null;
  }

  return null;
};

const normalizeProducerRelations = (args: {
  value: unknown;
  productId: string;
  fallbackAssignedAt: string;
}): RelationNormalizationResult<CanonicalProducerRelation> => {
  if (!Array.isArray(args.value)) {
    return { next: [], dropped: args.value == null ? 0 : 1, repaired: args.value == null ? 0 : 1 };
  }

  const seen = new Set<string>();
  const next: CanonicalProducerRelation[] = [];
  let dropped = 0;
  let repaired = 0;

  for (const entry of args.value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      dropped += 1;
      continue;
    }
    const record = entry as Record<string, unknown>;

    const producerId =
      toTrimmedString(record['producerId']) ||
      toTrimmedString(record['producer_id']) ||
      toTrimmedString(record['id']) ||
      toTrimmedString(record['value']);
    if (!producerId) {
      dropped += 1;
      continue;
    }
    if (seen.has(producerId)) continue;

    const relationProductId =
      toTrimmedString(record['productId']) || toTrimmedString(record['product_id']) || args.productId;
    const assignedAt =
      toIsoString(record['assignedAt']) ||
      toIsoString(record['assigned_at']) ||
      args.fallbackAssignedAt;
    if (!relationProductId || !assignedAt) {
      dropped += 1;
      continue;
    }

    const usedLegacyKeys =
      'producer_id' in record || 'product_id' in record || 'assigned_at' in record;
    const missingCanonicalKeys =
      !toTrimmedString(record['producerId']) ||
      !toTrimmedString(record['productId']) ||
      !toIsoString(record['assignedAt']);
    if (usedLegacyKeys || missingCanonicalKeys) {
      repaired += 1;
    }

    const relation: CanonicalProducerRelation = {
      productId: relationProductId,
      producerId,
      assignedAt,
    };
    if (record['producer'] && typeof record['producer'] === 'object' && !Array.isArray(record['producer'])) {
      relation.producer = record['producer'];
    }

    seen.add(producerId);
    next.push(relation);
  }

  return { next, dropped, repaired };
};

const normalizeTagRelations = (args: {
  value: unknown;
  productId: string;
  fallbackAssignedAt: string;
}): RelationNormalizationResult<CanonicalTagRelation> => {
  if (!Array.isArray(args.value)) {
    return { next: [], dropped: args.value == null ? 0 : 1, repaired: args.value == null ? 0 : 1 };
  }

  const seen = new Set<string>();
  const next: CanonicalTagRelation[] = [];
  let dropped = 0;
  let repaired = 0;

  for (const entry of args.value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      dropped += 1;
      continue;
    }
    const record = entry as Record<string, unknown>;

    const tagId =
      toTrimmedString(record['tagId']) ||
      toTrimmedString(record['tag_id']) ||
      toTrimmedString(record['id']) ||
      toTrimmedString(record['value']);
    if (!tagId) {
      dropped += 1;
      continue;
    }
    if (seen.has(tagId)) continue;

    const relationProductId =
      toTrimmedString(record['productId']) || toTrimmedString(record['product_id']) || args.productId;
    const assignedAt =
      toIsoString(record['assignedAt']) || toIsoString(record['assigned_at']) || args.fallbackAssignedAt;
    if (!relationProductId || !assignedAt) {
      dropped += 1;
      continue;
    }

    const usedLegacyKeys = 'tag_id' in record || 'product_id' in record || 'assigned_at' in record;
    const missingCanonicalKeys =
      !toTrimmedString(record['tagId']) ||
      !toTrimmedString(record['productId']) ||
      !toIsoString(record['assignedAt']);
    if (usedLegacyKeys || missingCanonicalKeys) {
      repaired += 1;
    }

    const relation: CanonicalTagRelation = {
      productId: relationProductId,
      tagId,
      assignedAt,
    };
    if (record['tag'] && typeof record['tag'] === 'object' && !Array.isArray(record['tag'])) {
      relation.tag = record['tag'];
    }

    seen.add(tagId);
    next.push(relation);
  }

  return { next, dropped, repaired };
};

const deepEqual = (a: unknown, b: unknown): boolean => JSON.stringify(a) === JSON.stringify(b);

const formatSummary = (summary: Summary, dryRun: boolean): string =>
  JSON.stringify(
    {
      mode: dryRun ? 'dry-run' : 'write',
      ...summary,
    },
    null,
    2
  );

async function main(): Promise<void> {
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is not set.');
  }

  const options = parseCliOptions(process.argv.slice(2));
  const db = await getMongoDb();
  const collection = db.collection<ProductDoc>(PRODUCT_COLLECTION);

  const summary: Summary = {
    scanned: 0,
    updated: 0,
    categoryBackfilled: 0,
    categoriesFieldRemovedDocs: 0,
    nameFieldRemovedDocs: 0,
    descriptionFieldRemovedDocs: 0,
    producerDocsNormalized: 0,
    producerEntriesDropped: 0,
    producerEntriesRepaired: 0,
    tagDocsNormalized: 0,
    tagEntriesDropped: 0,
    tagEntriesRepaired: 0,
  };

  const cursor = collection.find({}, { batchSize: options.batchSize });
  let reachedLimit = false;

  for await (const doc of cursor) {
    summary.scanned += 1;
    if (options.limit !== null && summary.scanned > options.limit) {
      reachedLimit = true;
      break;
    }

    const productId = resolveRootProductId(doc);
    if (!productId) continue;
    const fallbackAssignedAt =
      toIsoString(doc.updatedAt) || toIsoString(doc.createdAt) || new Date().toISOString();

    const currentCategoryId = toTrimmedString(doc.categoryId);
    const legacyCategoryId = resolveCategoryIdFromLegacyRelation(doc.categories);
    const nextCategoryId = currentCategoryId || legacyCategoryId || null;

    const producerResult = normalizeProducerRelations({
      value: doc.producers,
      productId,
      fallbackAssignedAt,
    });
    const tagResult = normalizeTagRelations({
      value: doc.tags,
      productId,
      fallbackAssignedAt,
    });

    const setPayload: Record<string, unknown> = {};
    const unsetPayload: Record<string, ''> = {};
    let changed = false;

    if ((doc.categoryId ?? null) !== nextCategoryId) {
      setPayload['categoryId'] = nextCategoryId;
      changed = true;
      if (!currentCategoryId && nextCategoryId) {
        summary.categoryBackfilled += 1;
      }
    }

    if ('categories' in doc) {
      unsetPayload['categories'] = '';
      changed = true;
      summary.categoriesFieldRemovedDocs += 1;
    }

    if ('name' in doc) {
      unsetPayload['name'] = '';
      changed = true;
      summary.nameFieldRemovedDocs += 1;
    }

    if ('description' in doc) {
      unsetPayload['description'] = '';
      changed = true;
      summary.descriptionFieldRemovedDocs += 1;
    }

    const normalizedProducersChanged = !deepEqual(
      Array.isArray(doc.producers) ? doc.producers : [],
      producerResult.next
    );
    if (normalizedProducersChanged) {
      setPayload['producers'] = producerResult.next;
      changed = true;
      summary.producerDocsNormalized += 1;
    }
    summary.producerEntriesDropped += producerResult.dropped;
    summary.producerEntriesRepaired += producerResult.repaired;

    const normalizedTagsChanged = !deepEqual(Array.isArray(doc.tags) ? doc.tags : [], tagResult.next);
    if (normalizedTagsChanged) {
      setPayload['tags'] = tagResult.next;
      changed = true;
      summary.tagDocsNormalized += 1;
    }
    summary.tagEntriesDropped += tagResult.dropped;
    summary.tagEntriesRepaired += tagResult.repaired;

    if (!changed) continue;
    summary.updated += 1;

    if (!options.dryRun) {
      const update: { $set?: Record<string, unknown>; $unset?: Record<string, ''> } = {};
      if (Object.keys(setPayload).length > 0) update.$set = setPayload;
      if (Object.keys(unsetPayload).length > 0) update.$unset = unsetPayload;
      await collection.updateOne({ _id: doc._id }, update);
    }
  }

  if (reachedLimit) {
    console.log(
      `[normalize-products-v2] Reached --limit=${options.limit}. Migration stopped early on purpose.`
    );
  }

  console.log('[normalize-products-v2] Summary');
  console.log(formatSummary(summary, options.dryRun));
}

main()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('[normalize-products-v2] Failed:', error);
    process.exit(1);
  });
