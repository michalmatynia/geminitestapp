import './load-app-env';

import { MongoClient, type Db, type Document } from 'mongodb';

type MongoSource = 'local' | 'cloud';
type SourceSelection = MongoSource | 'all';

type CliOptions = {
  cutoffIso: string;
  productSource: SourceSelection;
  sku: string;
  write: boolean;
};

type MongoTarget = {
  dbName: string;
  label: string;
  source: MongoSource;
  uri: string;
};

type ProductImageEntry = {
  imageFileId?: unknown;
  imageFile?: unknown;
  [key: string]: unknown;
};

type ProductDoc = {
  _id: unknown;
  id?: unknown;
  sku?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  images?: unknown;
};

type ImageFileDoc = {
  _id: unknown;
  id?: unknown;
  metadata?: unknown;
  storageProvider?: unknown;
};

type ProductSourceResult = {
  anchor: {
    createdAt: string | null;
    found: boolean;
    id: string | null;
    sku: string;
  };
  db: string;
  imageFileIds: number;
  imageFiles: Array<{
    db: string;
    matched: number;
    modified: number;
    target: string;
  }>;
  matchedProducts: number;
  mode: 'dry-run' | 'write';
  productSnapshotsModified: number;
  productSnapshotsNeedingUpdate: number;
  productsWithImages: number;
  source: MongoSource;
  target: string;
};

const PRODUCT_COLLECTION = 'products';
const IMAGE_FILE_COLLECTION = 'image_files';
const DEFAULT_CUTOFF_ISO = '2026-05-10T12:26:49.939Z';
const DEFAULT_SKU = 'KEYCHA1452';
const IMAGE_FILE_ID_BATCH_SIZE = 500;

const readEnv = (key: string): string => process.env[key]?.trim() ?? '';

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    cutoffIso: DEFAULT_CUTOFF_ISO,
    productSource: 'all',
    sku: DEFAULT_SKU,
    write: false,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.write = true;
      continue;
    }
    if (arg === '--dry-run') {
      options.write = false;
      continue;
    }
    if (arg.startsWith('--cutoff=')) {
      options.cutoffIso = arg.slice('--cutoff='.length).trim();
      continue;
    }
    if (arg.startsWith('--sku=')) {
      options.sku = arg.slice('--sku='.length).trim() || DEFAULT_SKU;
      continue;
    }
    if (arg.startsWith('--product-source=')) {
      const source = arg.slice('--product-source='.length).trim();
      if (source === 'local' || source === 'cloud' || source === 'all') {
        options.productSource = source;
      }
    }
  }

  const cutoff = new Date(options.cutoffIso);
  if (Number.isNaN(cutoff.getTime())) {
    throw new Error(`Invalid cutoff timestamp: ${options.cutoffIso}`);
  }
  options.cutoffIso = cutoff.toISOString();
  return options;
};

const resolveMainTarget = (source: MongoSource): MongoTarget | null => {
  const uri = readEnv(source === 'local' ? 'MONGODB_LOCAL_URI' : 'MONGODB_CLOUD_URI');
  const dbName = readEnv(source === 'local' ? 'MONGODB_LOCAL_DB' : 'MONGODB_CLOUD_DB');
  if (!uri || !dbName) return null;
  return {
    dbName,
    label: `main:${source}`,
    source,
    uri,
  };
};

const resolveProductsTarget = (source: MongoSource): MongoTarget | null => {
  const uri =
    readEnv(source === 'local' ? 'PRODUCTS_MONGODB_LOCAL_URI' : 'PRODUCTS_MONGODB_CLOUD_URI') ||
    readEnv(source === 'local' ? 'MONGODB_PRODUCTS_LOCAL_URI' : 'MONGODB_PRODUCTS_CLOUD_URI') ||
    (source === 'local' ? readEnv('MONGODB_LOCAL_URI') : '');
  const dbName =
    readEnv(source === 'local' ? 'PRODUCTS_MONGODB_LOCAL_DB' : 'PRODUCTS_MONGODB_CLOUD_DB') ||
    readEnv(source === 'local' ? 'MONGODB_PRODUCTS_LOCAL_DB' : 'MONGODB_PRODUCTS_CLOUD_DB') ||
    (source === 'local' ? readEnv('MONGODB_LOCAL_DB') : '');
  if (!uri || !dbName) return null;
  return {
    dbName,
    label: `products:${source}`,
    source,
    uri,
  };
};

const sourceTargets = (selection: SourceSelection): MongoSource[] =>
  selection === 'all' ? ['local', 'cloud'] : [selection];

const targetKey = (target: MongoTarget): string => `${target.uri}::${target.dbName}`;

const dedupeTargets = (targets: Array<MongoTarget | null>): MongoTarget[] => {
  const byKey = new Map<string, MongoTarget>();
  for (const target of targets) {
    if (!target) continue;
    byKey.set(targetKey(target), target);
  }
  return [...byKey.values()];
};

const connectTarget = async (target: MongoTarget): Promise<{ client: MongoClient; db: Db }> => {
  const client = new MongoClient(target.uri, {
    serverSelectionTimeoutMS: 8_000,
    connectTimeoutMS: 8_000,
    ...(target.uri.includes('127.0.0.1') || target.uri.includes('localhost')
      ? { directConnection: true }
      : {}),
  });
  await client.connect();
  return { client, db: client.db(target.dbName) };
};

const stringifyId = (value: unknown): string | null => {
  if (typeof value === 'string') return value.trim() || null;
  if (value && typeof value === 'object' && 'toString' in value) {
    const text = String(value).trim();
    return text === '[object Object]' ? null : text || null;
  }
  return null;
};

const isoString = (value: unknown): string | null => {
  if (value instanceof Date) return value.toISOString();
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
};

const buildProductQuery = (cutoffIso: string): Document => {
  const cutoffDate = new Date(cutoffIso);
  return {
    $and: [
      {
        $or: [
          { createdAt: { $lt: cutoffDate } },
          { createdAt: { $lt: cutoffIso } },
        ],
      },
      { images: { $type: 'array' } },
      { images: { $ne: [] } },
    ],
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const metadataWithFastComet = (metadata: unknown, markedAt: string): Record<string, unknown> => ({
  ...(isRecord(metadata) ? metadata : {}),
  storageSource: 'fastcomet',
  uploadedToFastCometAt: markedAt,
});

const imageSnapshotNeedsUpdate = (imageFile: unknown): boolean => {
  if (!isRecord(imageFile)) return false;
  const metadata = imageFile['metadata'];
  return (
    imageFile['storageProvider'] !== 'fastcomet' ||
    !isRecord(metadata) ||
    metadata['storageSource'] !== 'fastcomet'
  );
};

const markProductImages = (
  images: unknown,
  markedAt: string
): { changed: boolean; imageFileIds: string[]; nextImages: unknown; snapshotUpdates: number } => {
  if (!Array.isArray(images)) {
    return { changed: false, imageFileIds: [], nextImages: images, snapshotUpdates: 0 };
  }

  let changed = false;
  let snapshotUpdates = 0;
  const imageFileIds: string[] = [];
  const nextImages = images.map((entry: unknown): unknown => {
    if (!isRecord(entry)) return entry;
    const image = entry as ProductImageEntry;
    const imageFileId = stringifyId(image.imageFileId);
    if (imageFileId) imageFileIds.push(imageFileId);

    if (!imageSnapshotNeedsUpdate(image.imageFile)) return entry;
    changed = true;
    snapshotUpdates += 1;
    const imageFile = image.imageFile as Record<string, unknown>;
    return {
      ...image,
      imageFile: {
        ...imageFile,
        metadata: metadataWithFastComet(imageFile['metadata'], markedAt),
        storageProvider: 'fastcomet',
      },
    };
  });

  return { changed, imageFileIds, nextImages, snapshotUpdates };
};

const imageFileNeedsUpdate = (doc: ImageFileDoc): boolean => {
  if (doc.storageProvider !== 'fastcomet') return true;
  return !isRecord(doc.metadata) || doc.metadata['storageSource'] !== 'fastcomet';
};

const markImageFiles = async (params: {
  db: Db;
  imageFileIds: string[];
  markedAt: string;
  write: boolean;
}): Promise<{ matched: number; modified: number }> => {
  const { db, imageFileIds, markedAt, write } = params;
  if (imageFileIds.length === 0) return { matched: 0, modified: 0 };

  let matched = 0;
  let modified = 0;
  const collection = db.collection<ImageFileDoc>(IMAGE_FILE_COLLECTION);

  for (let index = 0; index < imageFileIds.length; index += IMAGE_FILE_ID_BATCH_SIZE) {
    const ids = imageFileIds.slice(index, index + IMAGE_FILE_ID_BATCH_SIZE);
    const docs = await collection
      .find({ $or: [{ _id: { $in: ids } }, { id: { $in: ids } }] })
      .project<ImageFileDoc>({ _id: 1, id: 1, metadata: 1, storageProvider: 1 })
      .toArray();
    matched += docs.length;

    const docsNeedingUpdate = docs.filter(imageFileNeedsUpdate);
    if (docsNeedingUpdate.length === 0) continue;

    if (!write) {
      modified += docsNeedingUpdate.length;
      continue;
    }

    const result = await collection.bulkWrite(
      docsNeedingUpdate.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              metadata: metadataWithFastComet(doc.metadata, markedAt),
              storageProvider: 'fastcomet',
              updatedAt: new Date(),
            },
          },
        },
      })),
      { ordered: false }
    );
    modified += result.modifiedCount;
  }

  return { matched, modified };
};

const runForProductsTarget = async (
  productsTarget: MongoTarget,
  options: CliOptions,
  markedAt: string
): Promise<ProductSourceResult> => {
  const { client, db } = await connectTarget(productsTarget);
  try {
    const collection = db.collection<ProductDoc>(PRODUCT_COLLECTION);
    const anchor = await collection.findOne(
      { sku: options.sku },
      { projection: { _id: 1, id: 1, sku: 1, createdAt: 1 } }
    );
    const docs = await collection
      .find(buildProductQuery(options.cutoffIso), {
        projection: { _id: 1, id: 1, sku: 1, createdAt: 1, images: 1 },
      })
      .sort({ createdAt: 1 })
      .toArray();

    let productSnapshotsModified = 0;
    let productSnapshotsNeedingUpdate = 0;
    const imageFileIds = new Set<string>();
    const productsWithImages = docs.filter((doc) => Array.isArray(doc.images) && doc.images.length > 0).length;

    for (const doc of docs) {
      const marked = markProductImages(doc.images, markedAt);
      marked.imageFileIds.forEach((id) => imageFileIds.add(id));
      productSnapshotsNeedingUpdate += marked.snapshotUpdates;
      if (!marked.changed || !options.write) continue;

      const result = await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            images: marked.nextImages,
            updatedAt: new Date(),
          },
        }
      );
      productSnapshotsModified += result.modifiedCount;
    }

    if (!options.write) {
      productSnapshotsModified = productSnapshotsNeedingUpdate;
    }

    const imageFileTargets = dedupeTargets([
      resolveMainTarget(productsTarget.source),
      productsTarget,
    ]);
    const imageFiles: ProductSourceResult['imageFiles'] = [];
    for (const target of imageFileTargets) {
      const imageClient = targetKey(target) === targetKey(productsTarget) ? client : null;
      const imageDb = targetKey(target) === targetKey(productsTarget) ? db : null;
      const resolved =
        imageDb !== null && imageClient !== null
          ? { client: imageClient, db: imageDb, owned: false }
          : { ...(await connectTarget(target)), owned: true };
      try {
        const markedImageFiles = await markImageFiles({
          db: resolved.db,
          imageFileIds: [...imageFileIds],
          markedAt,
          write: options.write,
        });
        imageFiles.push({
          db: target.dbName,
          matched: markedImageFiles.matched,
          modified: markedImageFiles.modified,
          target: target.label,
        });
      } finally {
        if (resolved.owned) await resolved.client.close();
      }
    }

    return {
      anchor: {
        createdAt: isoString(anchor?.createdAt),
        found: Boolean(anchor),
        id: stringifyId(anchor?.id) ?? stringifyId(anchor?._id),
        sku: options.sku,
      },
      db: productsTarget.dbName,
      imageFileIds: imageFileIds.size,
      imageFiles,
      matchedProducts: docs.length,
      mode: options.write ? 'write' : 'dry-run',
      productSnapshotsModified,
      productSnapshotsNeedingUpdate,
      productsWithImages,
      source: productsTarget.source,
      target: productsTarget.label,
    };
  } finally {
    await client.close();
  }
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const markedAt = new Date().toISOString();
  const productsTargets = sourceTargets(options.productSource)
    .map(resolveProductsTarget)
    .filter((target): target is MongoTarget => target !== null);

  if (productsTargets.length === 0) {
    throw new Error('No configured products MongoDB targets matched the requested source selection.');
  }

  const results: ProductSourceResult[] = [];
  for (const target of productsTargets) {
    results.push(await runForProductsTarget(target, options, markedAt));
  }

  console.log(
    JSON.stringify(
      {
        cutoff: options.cutoffIso,
        markedAt,
        mode: options.write ? 'write' : 'dry-run',
        productSource: options.productSource,
        results,
      },
      null,
      2
    )
  );
}

void main().catch((error: unknown) => {
  console.error('Failed to mark product images as FastComet:', error);
  process.exit(1);
});
