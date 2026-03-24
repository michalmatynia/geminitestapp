import type { MongoImageFileDoc, MongoImageStudioSlotDoc } from '../database-sync-types';
import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

type BatchResult = { count: number };
type EntityWithId = { id: string };

type ImageFileSeed = {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
};

type ImageStudioSlotSeed = {
  id: string;
  projectId: string;
  name: string;
  folderPath: string;
  position: number | null;
  imageFileId: string | null;
  imageUrl: string | null;
  imageBase64: string | null;
  asset3dId: string | null;
  screenshotFileId: string | null;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type ImageFileRow = ImageFileSeed;
type ImageStudioSlotRow = ImageStudioSlotSeed;

export const syncImageFiles: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('image_files')
    .find({})
    .toArray()) as MongoImageFileDoc[];
  const data = docs
    .map((doc: MongoImageFileDoc): ImageFileSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        filename: doc.filename ?? '',
        filepath: doc.filepath ?? '',
        mimetype: doc.mimetype ?? '',
        size: doc.size ?? 0,
        width: doc.width ?? null,
        height: doc.height ?? null,
        tags: doc.tags ?? [],
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is ImageFileSeed => item !== null);
  const deleted = (await prisma.imageFile.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.imageFile.createMany({
      data: data as Prisma.ImageFileCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncImageStudioSlots: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const imageFileRows = (await prisma.imageFile.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableImageFileIds = new Set<string>(
    imageFileRows.map((entry) => entry.id)
  );
  const assetRows = (await prisma.asset3D.findMany({
    select: { id: true },
  })) as EntityWithId[];
  const availableAssetIds = new Set<string>(
    assetRows.map((entry) => entry.id)
  );
  const docs = (await mongo
    .collection('image_studio_slots')
    .find({})
    .toArray()) as MongoImageStudioSlotDoc[];
  const warnings: string[] = [];
  const data = docs
    .map((doc: MongoImageStudioSlotDoc): ImageStudioSlotSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      const projectId = doc.projectId ?? '';
      if (!projectId) {
        warnings.push(`Image studio slot ${id}: missing projectId`);
        return null;
      }
      const imageFileId = doc.imageFileId ?? null;
      const screenshotFileId = doc.screenshotFileId ?? null;
      const asset3dId = doc.asset3dId ?? null;
      const resolvedImageFileId =
        imageFileId && availableImageFileIds.has(imageFileId) ? imageFileId : null;
      const resolvedScreenshotFileId =
        screenshotFileId && availableImageFileIds.has(screenshotFileId) ? screenshotFileId : null;
      const resolvedAsset3dId = asset3dId && availableAssetIds.has(asset3dId) ? asset3dId : null;
      if (imageFileId && !resolvedImageFileId) {
        warnings.push(`Image studio slot ${id}: missing imageFile ${imageFileId}`);
      }
      if (screenshotFileId && !resolvedScreenshotFileId) {
        warnings.push(`Image studio slot ${id}: missing screenshotFile ${screenshotFileId}`);
      }
      if (asset3dId && !resolvedAsset3dId) {
        warnings.push(`Image studio slot ${id}: missing asset3d ${asset3dId}`);
      }
      return {
        id,
        projectId,
        name: doc.name ?? '',
        folderPath: doc.folderPath ?? '',
        position: doc.position ?? null,
        imageFileId: resolvedImageFileId,
        imageUrl: doc.imageUrl ?? null,
        imageBase64: doc.imageBase64 ?? null,
        asset3dId: resolvedAsset3dId,
        screenshotFileId: resolvedScreenshotFileId,
        metadata: toJsonValue(doc.metadata ?? null) as Prisma.InputJsonValue,
        createdAt: toDate(doc.createdAt) ?? new Date(),
        updatedAt: toDate(doc.updatedAt) ?? new Date(),
      };
    })
    .filter((item): item is ImageStudioSlotSeed => item !== null);
  const deleted = (await prisma.imageStudioSlot.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.imageStudioSlot.createMany({
      data: data as Prisma.ImageStudioSlotCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

// --- Prisma to Mongo handlers ---

export const syncImageFilesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.imageFile.findMany()) as ImageFileRow[];
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    filename: row.filename,
    filepath: row.filepath,
    mimetype: row.mimetype,
    size: row.size,
    width: row.width ?? null,
    height: row.height ?? null,
    tags: row.tags ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection('image_files');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncImageStudioSlotsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.imageStudioSlot.findMany()) as ImageStudioSlotRow[];
  const docs = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    projectId: row.projectId,
    name: row.name ?? '',
    folderPath: row.folderPath ?? '',
    position: row.position ?? null,
    imageFileId: row.imageFileId ?? null,
    imageUrl: row.imageUrl ?? null,
    imageBase64: row.imageBase64 ?? null,
    asset3dId: row.asset3dId ?? null,
    screenshotFileId: row.screenshotFileId ?? null,
    metadata: row.metadata ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
  const collection = mongo.collection('image_studio_slots');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
