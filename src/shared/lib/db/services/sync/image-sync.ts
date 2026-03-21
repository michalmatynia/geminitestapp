/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import type { MongoImageFileDoc, MongoImageStudioSlotDoc } from '../database-sync-types';
import type { DatabaseSyncHandler } from './types';
import type { Prisma } from '@prisma/client';

export const syncImageFiles: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = (await mongo
    .collection('image_files')
    .find({})
    .toArray()) as unknown as MongoImageFileDoc[];
  const data = docs
    .map((doc: MongoImageFileDoc): Prisma.ImageFileCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
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
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.ImageFileCreateManyInput => item !== null);
  const deleted = await prisma.imageFile.deleteMany();
  const created = data.length ? await prisma.imageFile.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncImageStudioSlots: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const availableImageFileIds = new Set<string>(
    (await prisma.imageFile.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const availableAssetIds = new Set<string>(
    (await prisma.asset3D.findMany({ select: { id: true } })).map(
      (entry: { id: string }) => entry.id
    )
  );
  const docs = (await mongo
    .collection('image_studio_slots')
    .find({})
    .toArray()) as unknown as MongoImageStudioSlotDoc[];
  const warnings: string[] = [];
  const data = docs
    .map((doc: MongoImageStudioSlotDoc): Prisma.ImageStudioSlotCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
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
    .filter((item): item is Prisma.ImageStudioSlotCreateManyInput => item !== null);
  const deleted = await prisma.imageStudioSlot.deleteMany();
  const created = data.length ? await prisma.imageStudioSlot.createMany({ data }) : { count: 0 };
  return {
    sourceCount: data.length,
    targetDeleted: deleted.count,
    targetInserted: created.count,
    ...(warnings.length ? { warnings } : null),
  };
};

// --- Prisma to Mongo handlers ---

export const syncImageFilesPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.imageFile.findMany();
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
  const rows = await prisma.imageStudioSlot.findMany();
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
