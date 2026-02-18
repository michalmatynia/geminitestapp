import 'server-only';

import fs from 'fs/promises';

import { getImageFileRepository } from '@/features/files/server';
import { getDiskPathFromPublicPath } from '@/features/files/utils/fileUploader';
import type { Asset3DRecord } from '@/features/viewer3d/types';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { ImageFileRecord } from '@/shared/types/domain/files';

import { removeImageStudioRunOutputs } from './run-repository';
import { deleteImageStudioSlotLinksForSlot } from './slot-link-repository';

import type { Collection } from 'mongodb';

export type ImageStudioSlotDocument = {
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

export type ImageStudioSlotRecord = {
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
  id?: string;
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

const COLLECTION = 'image_studio_slots';

const createId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
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

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizePublicUploadPath = (value: string | null | undefined): string | null => {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return null;

  let normalized = raw.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const parsed = new URL(normalized);
      normalized = parsed.pathname;
    } catch {
      return null;
    }
  }

  const publicIndex = normalized.indexOf('/public/');
  if (publicIndex >= 0) {
    normalized = normalized.slice(publicIndex + '/public'.length);
  }
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    normalized = normalized.slice(uploadsIndex);
  } else if (normalized.startsWith('uploads/')) {
    normalized = `/${normalized}`;
  }
  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  return normalized.startsWith('/uploads/') ? normalized : null;
};

const deletePublicUploadFileBestEffort = async (filepath: string | null | undefined): Promise<void> => {
  const normalized = normalizePublicUploadPath(filepath);
  if (!normalized) return;
  try {
    const diskPath = getDiskPathFromPublicPath(normalized);
    await fs.unlink(diskPath).catch((error: unknown) => {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      throw error;
    });
  } catch {
    // Best-effort cleanup should not block slot deletion.
  }
};

const removeImageFileIfOrphaned = async (params: {
  collection: Collection<ImageStudioSlotDocument>;
  fileId: string | null;
  excludedSlotId: string;
}): Promise<void> => {
  const normalizedFileId = asTrimmedString(params.fileId);
  if (!normalizedFileId) return;

  const remainingReferences = await params.collection.countDocuments({
    _id: { $ne: params.excludedSlotId },
    $or: [
      { imageFileId: normalizedFileId },
      { screenshotFileId: normalizedFileId },
    ],
  });
  if (remainingReferences > 0) return;

  const repo = await getImageFileRepository();
  const imageFileRecord = await repo.getImageFileById(normalizedFileId).catch(() => null);
  if (imageFileRecord?.filepath) {
    await deletePublicUploadFileBestEffort(imageFileRecord.filepath);
  }
  await repo.deleteImageFile(normalizedFileId).catch(() => null);
};

const resolveSlotIdAliases = (slotId: string): string[] => {
  const normalized = asTrimmedString(slotId);
  if (!normalized) return [];

  const unprefixed = normalized.startsWith('slot:')
    ? asTrimmedString(normalized.slice('slot:'.length))
    : normalized.startsWith('card:')
      ? asTrimmedString(normalized.slice('card:'.length))
      : normalized;
  const candidates = new Set<string>([normalized]);
  if (unprefixed) {
    candidates.add(unprefixed);
    candidates.add(`slot:${unprefixed}`);
    candidates.add(`card:${unprefixed}`);
  }

  return Array.from(candidates);
};

const getSourceSlotIdsFromMetadata = (metadata: Record<string, unknown> | null): string[] => {
  if (!metadata) return [];
  const sourceIds = new Set<string>();

  const primarySourceSlotId = asTrimmedString(metadata['sourceSlotId']);
  if (primarySourceSlotId) {
    resolveSlotIdAliases(primarySourceSlotId).forEach((candidate: string) => {
      sourceIds.add(candidate);
    });
  }

  const nestedSourceSlotIds = metadata['sourceSlotIds'];
  if (Array.isArray(nestedSourceSlotIds)) {
    nestedSourceSlotIds.forEach((value: unknown) => {
      const sourceId = asTrimmedString(value);
      if (!sourceId) return;
      resolveSlotIdAliases(sourceId).forEach((candidate: string) => {
        sourceIds.add(candidate);
      });
    });
  }

  return Array.from(sourceIds);
};

const collectCascadeSlotIds = (
  rootSlotId: string,
  docs: ImageStudioSlotDocument[]
): string[] => {
  if (docs.length === 0) return [];

  const docsById = new Map<string, ImageStudioSlotDocument>(
    docs.map((doc: ImageStudioSlotDocument) => [doc._id, doc])
  );
  const rootCandidates = resolveSlotIdAliases(rootSlotId).filter((candidate: string) =>
    docsById.has(candidate)
  );
  const resolvedRootSlotId = rootCandidates[0];
  if (!resolvedRootSlotId) return [];

  const childIdsBySource = new Map<string, Set<string>>();
  docs.forEach((doc: ImageStudioSlotDocument) => {
    if (!doc.metadata) return;
    const metadata = asRecord(doc.metadata);
    const sourceSlotIds = getSourceSlotIdsFromMetadata(metadata);
    sourceSlotIds.forEach((sourceSlotId: string) => {
      const normalizedSourceSlotId = resolveSlotIdAliases(sourceSlotId).find((candidate: string) =>
        docsById.has(candidate)
      );
      if (!normalizedSourceSlotId) return;
      const childIds = childIdsBySource.get(normalizedSourceSlotId) ?? new Set<string>();
      childIds.add(doc._id);
      childIdsBySource.set(normalizedSourceSlotId, childIds);
    });
  });

  const deletedSlotIds = new Set<string>();
  const queue: string[] = [resolvedRootSlotId];
  while (queue.length > 0) {
    const currentSlotId = queue.shift();
    if (!currentSlotId || deletedSlotIds.has(currentSlotId)) continue;
    deletedSlotIds.add(currentSlotId);
    const childIds = childIdsBySource.get(currentSlotId);
    if (!childIds || childIds.size === 0) continue;
    childIds.forEach((childId: string) => {
      if (deletedSlotIds.has(childId)) return;
      queue.push(childId);
    });
  }

  return Array.from(deletedSlotIds);
};

const isGenerationDerivedSlotMetadata = (metadata: Record<string, unknown> | null): boolean => {
  if (!metadata) return false;
  const role = asTrimmedString(metadata['role'])?.toLowerCase() ?? '';
  if (role === 'generation') return true;
  const relationType = asTrimmedString(metadata['relationType'])?.toLowerCase() ?? '';
  return relationType.startsWith('generation:') || relationType.startsWith('center:') || relationType.startsWith('crop:') || relationType.startsWith('upscale:');
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

export async function listImageStudioSlotProjectIds(): Promise<string[]> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const values = await db.collection<ImageStudioSlotDocument>(COLLECTION).distinct('projectId');
  return values
    .filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value: string) => value.trim())
    .sort((a: string, b: string) => a.localeCompare(b));
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
    _id: slot.id?.trim() || createId(),
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
  const collection = db.collection<ImageStudioSlotDocument>(COLLECTION);
  const existing = await collection.findOne({ _id: slotId });
  if (!existing) return false;

  const normalizedImageFileId = asTrimmedString(existing.imageFileId);
  const normalizedScreenshotFileId = asTrimmedString(existing.screenshotFileId);
  const imageFileCandidates = new Set<string>();
  if (normalizedImageFileId) {
    imageFileCandidates.add(normalizedImageFileId);
  }
  if (normalizedScreenshotFileId) {
    imageFileCandidates.add(normalizedScreenshotFileId);
  }

  const result = await collection.deleteOne({ _id: slotId });
  const deleted = result.deletedCount > 0;
  if (deleted) {
    await Promise.allSettled(
      Array.from(imageFileCandidates).map(async (fileId: string) => {
        await removeImageFileIfOrphaned({
          collection,
          fileId,
          excludedSlotId: slotId,
        });
      }),
    );

    if (!normalizedImageFileId) {
      await deletePublicUploadFileBestEffort(existing.imageUrl);
    }

    await deleteImageStudioSlotLinksForSlot(slotId).catch(() => {});

    const metadata = asRecord(existing.metadata);
    if (isGenerationDerivedSlotMetadata(metadata)) {
      const outputFile = asRecord(metadata?.['outputFile']);
      const runId = asTrimmedString(metadata?.['generationRunId']);
      const outputFileId =
        asTrimmedString(metadata?.['generationFileId']) ??
        asTrimmedString(existing.imageFileId);
      const outputFilepath =
        asTrimmedString(outputFile?.['filepath']) ??
        asTrimmedString(existing.imageUrl);

      await removeImageStudioRunOutputs({
        projectId: existing.projectId,
        runId,
        outputFileId,
        outputFilepath,
      }).catch(() => {});
    }
  }
  return deleted;
}

export type DeleteImageStudioSlotCascadeResult = {
  deleted: boolean;
  deletedSlotIds: string[];
};

export async function deleteImageStudioSlotCascade(
  slotId: string
): Promise<DeleteImageStudioSlotCascadeResult> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const collection = db.collection<ImageStudioSlotDocument>(COLLECTION);

  const slotIdCandidates = resolveSlotIdAliases(slotId);
  if (slotIdCandidates.length === 0) {
    return { deleted: false, deletedSlotIds: [] };
  }

  const rootDocs = await collection
    .find({ _id: { $in: slotIdCandidates } })
    .toArray();
  if (rootDocs.length === 0) return { deleted: false, deletedSlotIds: [] };

  const projectDocCache = new Map<string, ImageStudioSlotDocument[]>();
  const slotIdsToDeleteSet = new Set<string>();
  for (const rootDoc of rootDocs) {
    const projectId = rootDoc.projectId;
    let projectDocs = projectDocCache.get(projectId);
    if (!projectDocs) {
      projectDocs = await collection
        .find({ projectId })
        .toArray();
      projectDocCache.set(projectId, projectDocs);
    }
    collectCascadeSlotIds(rootDoc._id, projectDocs).forEach((candidateSlotId: string) => {
      slotIdsToDeleteSet.add(candidateSlotId);
    });
  }

  const slotIdsToDelete = Array.from(slotIdsToDeleteSet);
  if (slotIdsToDelete.length === 0) {
    return { deleted: false, deletedSlotIds: [] };
  }

  const deletedSlotIds: string[] = [];
  for (const slotIdToDelete of slotIdsToDelete) {
    const deleted = await deleteImageStudioSlot(slotIdToDelete);
    if (deleted) {
      deletedSlotIds.push(slotIdToDelete);
    }
  }

  const rootSlotIdSet = new Set<string>(rootDocs.map((rootDoc: ImageStudioSlotDocument) => rootDoc._id));
  return {
    deleted: deletedSlotIds.some((deletedSlotId: string) => rootSlotIdSet.has(deletedSlotId)),
    deletedSlotIds,
  };
}

export async function deleteImageStudioSlotsByProject(projectId: string): Promise<number> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const result = await db.collection<ImageStudioSlotDocument>(COLLECTION).deleteMany({ projectId });
  return result.deletedCount ?? 0;
}
