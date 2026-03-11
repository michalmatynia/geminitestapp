import 'server-only';

import { randomUUID } from 'crypto';

import type {
  Asset3DCreateInput,
  Asset3DListFilters,
  Asset3DRecord,
  Asset3DRepository,
  Asset3DUpdateInput,
} from '@/shared/contracts/viewer3d';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { ObjectId, type Db, type Document, type Filter } from 'mongodb';

const PRIMARY_COLLECTION = 'Asset3D';
const LEGACY_COLLECTION = 'asset3d';

type Asset3DDocument = Document & {
  _id: ObjectId | string;
  id?: string;
  name?: string | null;
  description?: string | null;
  fileId?: string;
  thumbnailId?: string | null;
  categoryId?: string | null;
  category?: string | null;
  tagIds?: string[] | null;
  tags?: string[] | null;
  fileUrl?: string;
  thumbnailUrl?: string | null;
  filename?: string;
  filepath?: string;
  mimetype?: string;
  size?: number;
  fileSize?: number;
  format?: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown> | null;
  viewerConfig?: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date | null;
};

let cachedCollectionName: string | null = null;

const normalizeString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const unique = new Set<string>();
  value.forEach((entry: unknown): void => {
    if (typeof entry !== 'string') return;
    const trimmed = entry.trim();
    if (!trimmed) return;
    unique.add(trimmed);
  });
  return Array.from(unique);
};

const normalizeRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entryValue]: [string, unknown]) => entryValue !== undefined)
  ) as T;

const normalizeDate = (value: unknown, fallback: Date): Date =>
  value instanceof Date ? value : fallback;

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toStringId = (value: ObjectId | string | undefined, fallback?: string | null): string => {
  if (fallback) return fallback;
  if (typeof value === 'string') return value;
  if (value instanceof ObjectId) return value.toHexString();
  return '';
};

const deriveFormat = (filename: unknown, mimetype: unknown): string | undefined => {
  const normalizedFilename = normalizeString(filename);
  const filenameExtension = normalizedFilename?.split('.').pop()?.toLowerCase();
  if (filenameExtension) return filenameExtension;
  const normalizedMimetype = normalizeString(mimetype);
  return normalizedMimetype?.split('/').pop()?.toLowerCase();
};

const buildIdFilter = (id: string): Filter<Asset3DDocument> => {
  const clauses: Filter<Asset3DDocument>[] = [{ id }];
  const idVariants: Array<ObjectId | string> = [id];
  if (ObjectId.isValid(id)) {
    idVariants.push(new ObjectId(id));
  }
  const dedupedVariants = Array.from(
    new Map(idVariants.map((value: ObjectId | string) => [value.toString(), value])).values()
  );
  dedupedVariants.forEach((value: ObjectId | string): void => {
    clauses.push({ _id: value });
  });
  return clauses.length === 1 ? clauses[0]! : { $or: clauses };
};

const getCategoryFilter = (
  filters?: Asset3DListFilters
): string | null => {
  const categoryId = normalizeString(filters?.categoryId);
  if (categoryId) return categoryId;

  const legacyCategory = normalizeString(
    (filters as (Asset3DListFilters & { category?: string | null }) | undefined)?.category
  );
  return legacyCategory ?? null;
};

const toRecord = (doc: Asset3DDocument): Asset3DRecord => {
  const createdAt = normalizeDate(doc.createdAt, new Date());
  const updatedAt = normalizeDate(doc.updatedAt, createdAt);
  const tags = normalizeStringArray(doc.tags ?? doc.tagIds);
  const categoryId = normalizeString(doc.categoryId ?? doc.category) ?? null;
  const filepath = normalizeString(doc.filepath ?? doc.fileUrl) ?? undefined;
  const fileUrl = normalizeString(doc.fileUrl ?? doc.filepath) ?? undefined;
  const size =
    typeof doc.size === 'number'
      ? doc.size
      : typeof doc.fileSize === 'number'
        ? doc.fileSize
        : 0;
  const fileSize =
    typeof doc.fileSize === 'number'
      ? doc.fileSize
      : typeof doc.size === 'number'
        ? doc.size
        : size;

  return {
    id: toStringId(doc._id, normalizeString(doc.id)),
    name: normalizeString(doc.name) ?? normalizeString(doc.filename) ?? '',
    description: normalizeString(doc.description) ?? null,
    fileId: normalizeString(doc.fileId) ?? undefined,
    thumbnailId: normalizeString(doc.thumbnailId) ?? null,
    categoryId,
    tagIds: normalizeStringArray(doc.tagIds ?? doc.tags),
    fileUrl,
    thumbnailUrl: normalizeString(doc.thumbnailUrl) ?? null,
    filename: normalizeString(doc.filename) ?? undefined,
    filepath,
    mimetype: normalizeString(doc.mimetype) ?? 'application/octet-stream',
    size,
    fileSize,
    format: normalizeString(doc.format) ?? deriveFormat(doc.filename, doc.mimetype),
    isPublic: doc.isPublic ?? false,
    tags,
    metadata: normalizeRecord(doc.metadata),
    viewerConfig: normalizeRecord(doc.viewerConfig),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
};

const resolveCollectionName = async (db: Db): Promise<string> => {
  if (cachedCollectionName) return cachedCollectionName;

  try {
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    if (collections.some((collection: { name: string }) => collection.name === PRIMARY_COLLECTION)) {
      cachedCollectionName = PRIMARY_COLLECTION;
      return cachedCollectionName;
    }
    if (collections.some((collection: { name: string }) => collection.name === LEGACY_COLLECTION)) {
      cachedCollectionName = LEGACY_COLLECTION;
      return cachedCollectionName;
    }
  } catch {
    // Fall back to the primary collection name if collection enumeration is unavailable.
  }

  cachedCollectionName = PRIMARY_COLLECTION;
  return cachedCollectionName;
};

const getCollection = async (db: Db) =>
  db.collection<Asset3DDocument>(await resolveCollectionName(db));

const createDocument = (data: Asset3DCreateInput): Asset3DDocument => {
  const now = new Date();
  const id = randomUUID();
  const tags = normalizeStringArray(data.tags ?? data.tagIds);
  const categoryId = normalizeString(data.categoryId) ?? null;
  const filepath = normalizeString(data.filepath ?? data.fileUrl) ?? '';
  const size =
    typeof data.size === 'number'
      ? data.size
      : typeof data.fileSize === 'number'
        ? data.fileSize
        : 0;

  return {
    _id: id,
    id,
    name: normalizeString(data.name) ?? normalizeString(data.filename) ?? '',
    description: normalizeString(data.description) ?? null,
    fileId: normalizeString(data.fileId) ?? undefined,
    thumbnailId: normalizeString(data.thumbnailId) ?? null,
    categoryId,
    category: categoryId,
    tagIds: tags,
    tags,
    fileUrl: normalizeString(data.fileUrl ?? data.filepath) ?? filepath,
    thumbnailUrl: normalizeString(data.thumbnailUrl) ?? null,
    filename: normalizeString(data.filename) ?? 'unnamed',
    filepath,
    mimetype: normalizeString(data.mimetype) ?? 'application/octet-stream',
    size,
    fileSize:
      typeof data.fileSize === 'number'
        ? data.fileSize
        : typeof data.size === 'number'
          ? data.size
          : size,
    format: normalizeString(data.format) ?? deriveFormat(data.filename, data.mimetype),
    isPublic: data.isPublic ?? false,
    metadata: normalizeRecord(data.metadata),
    viewerConfig: normalizeRecord(data.viewerConfig),
    createdAt: now,
    updatedAt: now,
  };
};

async function createAsset3D(data: Asset3DCreateInput): Promise<Asset3DRecord> {
  const db = await getMongoDb();
  const collection = await getCollection(db);
  const doc = stripUndefined(createDocument(data)) as Asset3DDocument;
  await collection.insertOne(doc);
  return toRecord(doc);
}

async function getAsset3DById(id: string): Promise<Asset3DRecord | null> {
  const db = await getMongoDb();
  const collection = await getCollection(db);
  const doc = await collection.findOne(buildIdFilter(id));
  return doc ? toRecord(doc) : null;
}

async function listAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
  const db = await getMongoDb();
  const collection = await getCollection(db);
  const clauses: Record<string, unknown>[] = [];

  const filename = normalizeString(filters?.filename);
  if (filename) {
    clauses.push({
      filename: { $regex: escapeRegex(filename), $options: 'i' },
    });
  }

  const categoryId = getCategoryFilter(filters);
  if (categoryId) {
    clauses.push({
      $or: [{ category: categoryId }, { categoryId }],
    });
  }

  if (typeof filters?.isPublic === 'boolean') {
    clauses.push({ isPublic: filters.isPublic });
  }

  const filteredTags = normalizeStringArray([
    ...(filters?.tags ?? []),
    ...(filters?.tagId ? [filters.tagId] : []),
  ]);
  if (filteredTags.length > 0) {
    clauses.push({
      $or: [{ tags: { $in: filteredTags } }, { tagIds: { $in: filteredTags } }],
    });
  }

  const search = normalizeString(filters?.search);
  if (search) {
    clauses.push({
      $or: [
        { name: { $regex: escapeRegex(search), $options: 'i' } },
        { description: { $regex: escapeRegex(search), $options: 'i' } },
        { filename: { $regex: escapeRegex(search), $options: 'i' } },
      ],
    });
  }

  const query =
    clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0]! : { $and: clauses };
  const docs = await collection
    .find(query as Filter<Asset3DDocument>)
    .sort({ createdAt: -1 })
    .toArray();

  return docs.map(toRecord);
}

async function updateAsset3D(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord | null> {
  const db = await getMongoDb();
  const collection = await getCollection(db);
  const updateData: Partial<Asset3DDocument> = {
    updatedAt: new Date(),
  };

  if (data.name !== undefined) {
    updateData.name = normalizeString(data.name) ?? '';
  }
  if (data.description !== undefined) {
    updateData.description = normalizeString(data.description) ?? null;
  }
  if (data.fileId !== undefined) {
    updateData.fileId = normalizeString(data.fileId) ?? undefined;
  }
  if (data.thumbnailId !== undefined) {
    updateData.thumbnailId = normalizeString(data.thumbnailId) ?? null;
  }
  if (data.categoryId !== undefined) {
    const categoryId = normalizeString(data.categoryId) ?? null;
    updateData.categoryId = categoryId;
    updateData.category = categoryId;
  }
  if (data.tags !== undefined || data.tagIds !== undefined) {
    const tags = normalizeStringArray(data.tags ?? data.tagIds);
    updateData.tags = tags;
    updateData.tagIds = tags;
  }
  if (data.filepath !== undefined) {
    const filepath = normalizeString(data.filepath) ?? '';
    updateData.filepath = filepath;
    if (data.fileUrl === undefined) {
      updateData.fileUrl = filepath;
    }
  }
  if (data.fileUrl !== undefined) {
    const fileUrl = normalizeString(data.fileUrl) ?? '';
    updateData.fileUrl = fileUrl;
    if (data.filepath === undefined) {
      updateData.filepath = fileUrl;
    }
  }
  if (data.thumbnailUrl !== undefined) {
    updateData.thumbnailUrl = normalizeString(data.thumbnailUrl) ?? null;
  }
  if (data.filename !== undefined) {
    updateData.filename = normalizeString(data.filename) ?? 'unnamed';
  }
  if (data.mimetype !== undefined) {
    updateData.mimetype = normalizeString(data.mimetype) ?? 'application/octet-stream';
  }
  if (data.size !== undefined) {
    updateData.size = data.size;
    if (data.fileSize === undefined) {
      updateData.fileSize = data.size;
    }
  }
  if (data.fileSize !== undefined) {
    updateData.fileSize = data.fileSize;
    if (data.size === undefined) {
      updateData.size = data.fileSize;
    }
  }
  if (data.format !== undefined) {
    updateData.format = normalizeString(data.format) ?? undefined;
  }
  if (data.isPublic !== undefined) {
    updateData.isPublic = data.isPublic;
  }
  if (data.metadata !== undefined) {
    updateData.metadata = normalizeRecord(data.metadata);
  }
  if (data.viewerConfig !== undefined) {
    updateData.viewerConfig = normalizeRecord(data.viewerConfig);
  }

  const updated = await collection.findOneAndUpdate(
    buildIdFilter(id),
    { $set: stripUndefined(updateData as Record<string, unknown>) },
    { returnDocument: 'after' }
  );

  return updated ? toRecord(updated) : null;
}

async function deleteAsset3D(id: string): Promise<Asset3DRecord | null> {
  const db = await getMongoDb();
  const collection = await getCollection(db);
  const deleted = await collection.findOneAndDelete(buildIdFilter(id));
  return deleted ? toRecord(deleted) : null;
}

async function getCategories(): Promise<string[]> {
  const db = await getMongoDb();
  const collection = await getCollection(db);
  const docs = await collection
    .find(
      { $or: [{ category: { $ne: null } }, { categoryId: { $ne: null } }] } as Filter<Asset3DDocument>,
      { projection: { category: 1, categoryId: 1 } }
    )
    .toArray();

  const categories = new Set<string>();
  docs.forEach((doc: Asset3DDocument): void => {
    const categoryId = normalizeString(doc.categoryId ?? doc.category);
    if (categoryId) {
      categories.add(categoryId);
    }
  });

  return Array.from(categories).sort((left: string, right: string) => left.localeCompare(right));
}

async function getTags(): Promise<string[]> {
  const db = await getMongoDb();
  const collection = await getCollection(db);
  const docs = await collection
    .find(
      { $or: [{ tags: { $exists: true, $ne: [] } }, { tagIds: { $exists: true, $ne: [] } }] } as Filter<Asset3DDocument>,
      { projection: { tags: 1, tagIds: 1 } }
    )
    .toArray();

  const tags = new Set<string>();
  docs.forEach((doc: Asset3DDocument): void => {
    normalizeStringArray(doc.tags ?? doc.tagIds).forEach((tag: string): void => {
      tags.add(tag);
    });
  });

  return Array.from(tags).sort((left: string, right: string) => left.localeCompare(right));
}

export const mongoAsset3DRepository: Asset3DRepository = {
  createAsset: createAsset3D,
  createAsset3D,
  getAssetById: getAsset3DById,
  getAsset3DById,
  listAssets: listAssets3D,
  listAssets3D,
  updateAsset: updateAsset3D,
  updateAsset3D,
  deleteAsset: deleteAsset3D,
  deleteAsset3D,
  getCategories,
  getTags,
};
