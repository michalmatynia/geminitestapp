import "server-only";

import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { getImageFileRepository } from "@/features/files/server";
import type { ImageFileRecord } from "@/shared/types/files";
import type { Asset3DRecord } from "@/features/viewer3d/types";

type ImageStudioSlotDocument = {
  _id: string;
  projectId: string;
  name: string | null;
  folderPath: string | null;
  position?: number | null;
  imageFileId?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  asset3dId?: string | null;
  screenshotFileId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type ImageStudioSlotRecord = {
  id: string;
  projectId: string;
  name: string | null;
  folderPath: string | null;
  position: number | null;
  imageFileId: string | null;
  imageUrl: string | null;
  imageBase64: string | null;
  asset3dId: string | null;
  screenshotFileId: string | null;
  metadata: Record<string, unknown> | null;
  imageFile: ImageFileRecord | null;
  screenshotFile: ImageFileRecord | null;
  asset3d: Asset3DRecord | null;
  createdAt: string;
  updatedAt: string;
};

type SlotCreateInput = {
  name?: string | null;
  folderPath?: string | null;
  imageUrl?: string | null;
  imageBase64?: string | null;
  imageFileId?: string | null;
  asset3dId?: string | null;
  screenshotFileId?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SlotUpdateInput = Partial<SlotCreateInput> & {
  position?: number | null;
};

const COLLECTION = "image_studio_slots";

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const ensureIndexesOnce = (() => {
  let started = false;
  return async (): Promise<void> => {
    if (started) return;
    started = true;
    try {
      const db = await getMongoDb();
      await Promise.all([
        db.collection<ImageStudioSlotDocument>(COLLECTION).createIndex({ projectId: 1, createdAt: -1 }),
        db.collection<ImageStudioSlotDocument>(COLLECTION).createIndex({ projectId: 1, folderPath: 1 }),
      ]);
    } catch {
      // best-effort indexing
    }
  };
})();

const toRecord = (
  doc: ImageStudioSlotDocument,
  imageFileMap: Map<string, ImageFileRecord>,
  screenshotMap: Map<string, ImageFileRecord>
): ImageStudioSlotRecord => ({
  id: doc._id,
  projectId: doc.projectId,
  name: doc.name ?? null,
  folderPath: doc.folderPath ?? null,
  position: doc.position ?? null,
  imageFileId: doc.imageFileId ?? null,
  imageUrl: doc.imageUrl ?? null,
  imageBase64: doc.imageBase64 ?? null,
  asset3dId: doc.asset3dId ?? null,
  screenshotFileId: doc.screenshotFileId ?? null,
  metadata: doc.metadata ?? null,
  imageFile: doc.imageFileId ? imageFileMap.get(doc.imageFileId) ?? null : null,
  screenshotFile: doc.screenshotFileId ? screenshotMap.get(doc.screenshotFileId) ?? null : null,
  asset3d: null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const resolveImageFiles = async (docs: ImageStudioSlotDocument[]): Promise<{
  imageFileMap: Map<string, ImageFileRecord>;
  screenshotMap: Map<string, ImageFileRecord>;
}> => {
  const imageFileIds = new Set<string>();
  const screenshotIds = new Set<string>();
  docs.forEach((doc: ImageStudioSlotDocument) => {
    if (doc.imageFileId) imageFileIds.add(doc.imageFileId);
    if (doc.screenshotFileId) screenshotIds.add(doc.screenshotFileId);
  });
  if (imageFileIds.size === 0 && screenshotIds.size === 0) {
    return { imageFileMap: new Map(), screenshotMap: new Map() };
  }
  const repo = await getImageFileRepository();
  const imageFiles = imageFileIds.size > 0 ? await repo.findImageFilesByIds(Array.from(imageFileIds)) : [];
  const screenshots = screenshotIds.size > 0 ? await repo.findImageFilesByIds(Array.from(screenshotIds)) : [];
  return {
    imageFileMap: new Map(imageFiles.map((file: ImageFileRecord) => [file.id, file])),
    screenshotMap: new Map(screenshots.map((file: ImageFileRecord) => [file.id, file])),
  };
};

export async function listImageStudioSlots(projectId: string): Promise<ImageStudioSlotRecord[]> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const docs = await db
    .collection<ImageStudioSlotDocument>(COLLECTION)
    .find({ projectId })
    .sort({ createdAt: -1 })
    .toArray();
  const { imageFileMap, screenshotMap } = await resolveImageFiles(docs);
  return docs.map((doc: ImageStudioSlotDocument) => toRecord(doc, imageFileMap, screenshotMap));
}

export async function countImageStudioSlots(projectId: string): Promise<number> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  return db.collection<ImageStudioSlotDocument>(COLLECTION).countDocuments({ projectId });
}

export async function getImageStudioSlotById(slotId: string): Promise<ImageStudioSlotRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const doc = await db.collection<ImageStudioSlotDocument>(COLLECTION).findOne({ _id: slotId });
  if (!doc) return null;
  const { imageFileMap, screenshotMap } = await resolveImageFiles([doc]);
  return toRecord(doc, imageFileMap, screenshotMap);
}

export async function createImageStudioSlots(
  projectId: string,
  inputs: SlotCreateInput[]
): Promise<ImageStudioSlotRecord[]> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const docs: ImageStudioSlotDocument[] = inputs.map((slot: SlotCreateInput) => ({
    _id: createId(),
    projectId,
    name: slot.name ?? null,
    folderPath: slot.folderPath ?? null,
    position: null,
    imageUrl: slot.imageUrl ?? null,
    imageBase64: slot.imageBase64 ?? null,
    imageFileId: slot.imageFileId ?? null,
    asset3dId: slot.asset3dId ?? null,
    screenshotFileId: slot.screenshotFileId ?? null,
    metadata: slot.metadata ?? null,
    createdAt: now,
    updatedAt: now,
  }));
  if (docs.length === 0) return [];
  await db.collection<ImageStudioSlotDocument>(COLLECTION).insertMany(docs);
  const { imageFileMap, screenshotMap } = await resolveImageFiles(docs);
  return docs.map((doc: ImageStudioSlotDocument) => toRecord(doc, imageFileMap, screenshotMap));
}

export async function updateImageStudioSlot(slotId: string, update: SlotUpdateInput): Promise<ImageStudioSlotRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const collection = db.collection<ImageStudioSlotDocument>(COLLECTION);
  const result = await collection.updateOne(
    { _id: slotId },
    {
      $set: {
        ...update,
        updatedAt: now,
      },
    }
  );
  if (!result.matchedCount) return null;
  const doc = await collection.findOne({ _id: slotId });
  if (!doc) return null;
  const { imageFileMap, screenshotMap } = await resolveImageFiles([doc]);
  return toRecord(doc, imageFileMap, screenshotMap);
}

export async function deleteImageStudioSlot(slotId: string): Promise<boolean> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<ImageStudioSlotDocument>(COLLECTION).deleteOne({ _id: slotId });
  return result.deletedCount > 0;
}