import './load-app-env';

import { MongoClient, type Collection, type Db, type Document, type Filter } from 'mongodb';

type CliOptions = {
  limit: number;
  rewriteLocalUploads: boolean;
  write: boolean;
};

type ImageFileDoc = {
  _id: string;
  id?: string;
  filepath?: string;
  updatedAt?: Date;
};

type ProductImageEntry = {
  imageFileId?: string;
  imageFile?: { filepath?: string; [key: string]: unknown };
  [key: string]: unknown;
};

type ProductImageDoc = {
  _id: unknown;
  id?: string;
  imageLinks?: unknown;
  images?: unknown;
  updatedAt?: Date;
};

type FieldStats = {
  changed: number;
  legacyUploadUrls: number;
  localUploads: number;
  scanned: number;
  syncedFromImageFile: number;
};

const CURRENT_FILE_BASE_URL = 'https://sparksofsindri.com';
const IMAGE_FILE_COLLECTION = 'image_files';
const PRODUCT_COLLECTIONS = ['products', 'product_drafts'] as const;
const DEFAULT_LIMIT = 0;

const currentFileBase = new URL(CURRENT_FILE_BASE_URL);
const currentHostnames = new Set([currentFileBase.hostname.toLowerCase()]);
const legacyHostnames = new Set(['qubrick.io', 'www.qubrick.io']);
const loopbackHostnames = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

const readEnv = (key: string): string => process.env[key]?.trim() ?? '';

const parsePositiveInt = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    limit: parsePositiveInt(process.env['PRODUCT_IMAGE_URL_MIGRATION_LIMIT'], DEFAULT_LIMIT),
    rewriteLocalUploads: process.env['PRODUCT_IMAGE_URL_MIGRATION_REWRITE_LOCAL'] === 'true',
    write: false,
  };

  argv.forEach((arg) => {
    if (arg === '--write') options.write = true;
    if (arg === '--dry-run') options.write = false;
    if (arg === '--rewrite-local-uploads') options.rewriteLocalUploads = true;
    if (arg.startsWith('--limit=')) {
      options.limit = parsePositiveInt(arg.slice('--limit='.length), options.limit);
    }
  });

  return options;
};

const resolveMainUri = (): string =>
  readEnv('MONGODB_URI') || readEnv('MONGODB_LOCAL_URI') || 'mongodb://127.0.0.1:27017/app';

const resolveMainDb = (): string =>
  readEnv('MONGODB_DB') || readEnv('MONGODB_LOCAL_DB') || 'app';

const resolveProductsUri = (): string =>
  readEnv('PRODUCTS_MONGODB_LOCAL_URI') ||
  readEnv('MONGODB_PRODUCTS_LOCAL_URI') ||
  readEnv('PRODUCTS_MONGODB_URI') ||
  readEnv('MONGODB_PRODUCTS_URI') ||
  'mongodb://127.0.0.1:27017/app';

const resolveProductsDb = (): string =>
  readEnv('PRODUCTS_MONGODB_LOCAL_DB') ||
  readEnv('MONGODB_PRODUCTS_LOCAL_DB') ||
  readEnv('PRODUCTS_MONGODB_DB') ||
  readEnv('MONGODB_PRODUCTS_DB') ||
  'app';

const isLoopbackHostname = (hostname: string): boolean =>
  loopbackHostnames.has(hostname.replace(/^\[|\]$/g, '').toLowerCase());

const isUploadPath = (pathname: string): boolean => pathname.startsWith('/uploads/');

const isKnownRemoteUploadReference = (value: string): boolean => {
  try {
    const url = new URL(value.trim());
    if (!isUploadPath(url.pathname)) return false;
    const hostname = url.hostname.toLowerCase();
    return currentHostnames.has(hostname) || legacyHostnames.has(hostname);
  } catch {
    return false;
  }
};

const normalizeUploadPath = (value: string): string | null => {
  const normalized = value.trim().replaceAll('\\', '/');
  const withoutPublicPrefix = normalized.startsWith('public/uploads/')
    ? normalized.slice('public'.length)
    : normalized;
  const withSlash = withoutPublicPrefix.startsWith('/') ? withoutPublicPrefix : `/${withoutPublicPrefix}`;
  return isUploadPath(withSlash) ? withSlash : null;
};

const canonicalUploadUrl = (pathname: string, suffix = ''): string =>
  `${CURRENT_FILE_BASE_URL}${pathname}${suffix}`;

const canonicalizeUploadReference = (
  value: string,
  options: Pick<CliOptions, 'rewriteLocalUploads'>
): { changed: boolean; localUpload: boolean; legacyUploadUrl: boolean; value: string } => {
  const raw = value.trim();
  if (raw.length === 0 || raw.startsWith('data:') || raw.startsWith('blob:')) {
    return { changed: raw !== value, localUpload: false, legacyUploadUrl: false, value: raw };
  }

  try {
    const url = new URL(raw);
    if (!isUploadPath(url.pathname)) {
      return { changed: raw !== value, localUpload: false, legacyUploadUrl: false, value: raw };
    }

    const hostname = url.hostname.toLowerCase();
    const shouldCanonicalizeRemote =
      legacyHostnames.has(hostname) || currentHostnames.has(hostname);
    const shouldCanonicalizeLocal = isLoopbackHostname(hostname) && options.rewriteLocalUploads;
    const suffix = `${url.search}${url.hash}`;
    if (shouldCanonicalizeRemote || shouldCanonicalizeLocal) {
      const nextValue = canonicalUploadUrl(url.pathname, suffix);
      return {
        changed: nextValue !== raw,
        localUpload: isLoopbackHostname(hostname),
        legacyUploadUrl: legacyHostnames.has(hostname),
        value: nextValue,
      };
    }

    return {
      changed: raw !== value,
      localUpload: isLoopbackHostname(hostname),
      legacyUploadUrl: false,
      value: raw,
    };
  } catch {
    const uploadPath = normalizeUploadPath(raw);
    if (uploadPath === null || !options.rewriteLocalUploads) {
      return {
        changed: raw !== value,
        localUpload: uploadPath !== null,
        legacyUploadUrl: false,
        value: raw,
      };
    }
    const nextValue = canonicalUploadUrl(uploadPath);
    return {
      changed: nextValue !== raw,
      localUpload: true,
      legacyUploadUrl: false,
      value: nextValue,
    };
  }
};

const createStats = (): FieldStats => ({
  changed: 0,
  legacyUploadUrls: 0,
  localUploads: 0,
  scanned: 0,
  syncedFromImageFile: 0,
});

const countCanonicalization = (
  stats: FieldStats,
  result: ReturnType<typeof canonicalizeUploadReference>
): void => {
  stats.scanned += 1;
  if (result.changed) stats.changed += 1;
  if (result.legacyUploadUrl) stats.legacyUploadUrls += 1;
  if (result.localUpload) stats.localUploads += 1;
};

const imageFileIdentityKeys = (doc: ImageFileDoc): string[] =>
  [doc._id, doc.id].filter((value): value is string => typeof value === 'string' && value.length > 0);

const readImageFilePathMap = async (db: Db): Promise<Map<string, string>> => {
  const docs = await db
    .collection<ImageFileDoc>(IMAGE_FILE_COLLECTION)
    .find({}, { projection: { _id: 1, id: 1, filepath: 1 } })
    .toArray();
  const byId = new Map<string, string>();
  docs.forEach((doc) => {
    const filepath = typeof doc.filepath === 'string' ? doc.filepath.trim() : '';
    if (filepath.length === 0) return;
    imageFileIdentityKeys(doc).forEach((key) => byId.set(key, filepath));
  });
  return byId;
};

const applyLimit = <T extends Document>(collection: Collection<T>, query: Filter<T>, limit: number) => {
  const cursor = collection.find(query);
  return limit > 0 ? cursor.limit(limit) : cursor;
};

const migrateImageFiles = async (
  db: Db,
  options: CliOptions
): Promise<{ stats: FieldStats; updated: number }> => {
  const stats = createStats();
  const collection = db.collection<ImageFileDoc>(IMAGE_FILE_COLLECTION);
  const docs = await applyLimit(collection, { filepath: { $type: 'string' } }, options.limit).toArray();
  let updated = 0;

  for (const doc of docs) {
    const current = typeof doc.filepath === 'string' ? doc.filepath : '';
    const result = canonicalizeUploadReference(current, { rewriteLocalUploads: false });
    countCanonicalization(stats, result);
    if (!result.changed || !options.write) continue;
    await collection.updateOne({ _id: doc._id }, { $set: { filepath: result.value, updatedAt: new Date() } });
    updated += 1;
  }

  return { stats, updated };
};

const canonicalizeLinks = (
  imageLinks: unknown,
  options: CliOptions,
  stats: FieldStats
): { changed: boolean; value?: string[] } => {
  if (!Array.isArray(imageLinks)) return { changed: false };
  let changed = false;
  const value = imageLinks.map((entry) => {
    if (typeof entry !== 'string') return entry;
    const result = canonicalizeUploadReference(entry, options);
    countCanonicalization(stats, result);
    changed = changed || result.changed;
    return result.value;
  });
  return changed ? { changed, value } : { changed };
};

const canonicalizeProductImages = (
  images: unknown,
  imageFilePaths: Map<string, string>,
  options: CliOptions,
  stats: FieldStats
): { changed: boolean; value?: ProductImageEntry[] } => {
  if (!Array.isArray(images)) return { changed: false };
  let changed = false;
  const value = images.map((entry): ProductImageEntry => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) return entry as ProductImageEntry;
    const image = entry as ProductImageEntry;
    const imageFile = image.imageFile;
    if (imageFile === undefined || typeof imageFile.filepath !== 'string') return image;

    const source = image.imageFileId ? imageFilePaths.get(image.imageFileId) : undefined;
    const shouldSyncFromSource = source !== undefined && isKnownRemoteUploadReference(source);
    const result = canonicalizeUploadReference(
      shouldSyncFromSource ? source : imageFile.filepath,
      source === undefined ? options : { rewriteLocalUploads: false }
    );
    countCanonicalization(stats, result);
    if (!result.changed && result.value === imageFile.filepath) return image;
    changed = true;
    if (shouldSyncFromSource) stats.syncedFromImageFile += 1;
    return { ...image, imageFile: { ...imageFile, filepath: result.value } };
  });
  return changed ? { changed, value } : { changed };
};

const migrateProductCollection = async (
  db: Db,
  collectionName: string,
  imageFilePaths: Map<string, string>,
  options: CliOptions
): Promise<{ stats: FieldStats; updated: number }> => {
  const stats = createStats();
  const collection = db.collection<ProductImageDoc>(collectionName);
  const docs = await applyLimit(
    collection,
    { $or: [{ imageLinks: { $type: 'array' } }, { images: { $type: 'array' } }] },
    options.limit
  ).toArray();
  let updated = 0;

  for (const doc of docs) {
    const links = canonicalizeLinks(doc.imageLinks, options, stats);
    const images = canonicalizeProductImages(doc.images, imageFilePaths, options, stats);
    const set: Document = {};
    if (links.changed) set['imageLinks'] = links.value;
    if (images.changed) set['images'] = images.value;
    if (Object.keys(set).length === 0 || !options.write) continue;
    set['updatedAt'] = new Date();
    await collection.updateOne({ _id: doc._id }, { $set: set });
    updated += 1;
  }

  return { stats, updated };
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const mainClient = new MongoClient(resolveMainUri());
  const productsClient = new MongoClient(resolveProductsUri());
  await mainClient.connect();
  await productsClient.connect();

  try {
    const mainDb = mainClient.db(resolveMainDb());
    const productsDb = productsClient.db(resolveProductsDb());
    const imageFilePaths = await readImageFilePathMap(mainDb);
    const imageFiles = await migrateImageFiles(mainDb, options);
    const productResults: Record<string, Awaited<ReturnType<typeof migrateProductCollection>>> = {};

    for (const collectionName of PRODUCT_COLLECTIONS) {
      productResults[collectionName] = await migrateProductCollection(
        productsDb,
        collectionName,
        imageFilePaths,
        options
      );
    }

    console.log(
      JSON.stringify(
        {
          mode: options.write ? 'write' : 'dry-run',
          rewriteLocalUploads: options.rewriteLocalUploads,
          imageFiles,
          productCollections: productResults,
        },
        null,
        2
      )
    );
  } finally {
    await Promise.allSettled([mainClient.close(), productsClient.close()]);
  }
}

void main().catch((error: unknown) => {
  console.error('Failed to migrate product image URLs:', error);
  process.exit(1);
});
