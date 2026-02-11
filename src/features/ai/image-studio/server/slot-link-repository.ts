import 'server-only';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type ImageStudioSlotLinkDocument = {
  _id: string;
  projectId: string;
  sourceSlotId: string;
  targetSlotId: string;
  relationType: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

export type ImageStudioSlotLinkRecord = {
  id: string;
  projectId: string;
  sourceSlotId: string;
  targetSlotId: string;
  relationType: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
};

type UpsertImageStudioSlotLinkInput = {
  projectId: string;
  sourceSlotId: string;
  targetSlotId: string;
  relationType: string;
  metadata?: Record<string, unknown> | null;
};

const COLLECTION = 'image_studio_slot_links';

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
      const collection = db.collection<ImageStudioSlotLinkDocument>(COLLECTION);
      await Promise.all([
        collection.createIndex({ projectId: 1, sourceSlotId: 1 }),
        collection.createIndex({ projectId: 1, targetSlotId: 1 }),
        collection.createIndex(
          { projectId: 1, sourceSlotId: 1, relationType: 1 },
          { unique: true, name: 'project_source_relation_unique' }
        ),
      ]);
    } catch {
      // best-effort indexing
    }
  };
})();

const toRecord = (doc: ImageStudioSlotLinkDocument): ImageStudioSlotLinkRecord => ({
  id: doc._id,
  projectId: doc.projectId,
  sourceSlotId: doc.sourceSlotId,
  targetSlotId: doc.targetSlotId,
  relationType: doc.relationType,
  metadata: doc.metadata ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export async function upsertImageStudioSlotLink(
  input: UpsertImageStudioSlotLinkInput
): Promise<ImageStudioSlotLinkRecord> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const now = new Date().toISOString();
  const collection = db.collection<ImageStudioSlotLinkDocument>(COLLECTION);

  const result = await collection.findOneAndUpdate(
    {
      projectId: input.projectId,
      sourceSlotId: input.sourceSlotId,
      relationType: input.relationType,
    },
    {
      $set: {
        targetSlotId: input.targetSlotId,
        metadata: input.metadata ?? null,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: createId(),
        projectId: input.projectId,
        sourceSlotId: input.sourceSlotId,
        relationType: input.relationType,
        createdAt: now,
      },
    },
    { upsert: true, returnDocument: 'after' }
  );

  if (!result) {
    throw new Error('Failed to upsert image studio slot link');
  }
  return toRecord(result);
}

export async function getImageStudioSlotLinkBySourceAndRelation(
  projectId: string,
  sourceSlotId: string,
  relationType: string
): Promise<ImageStudioSlotLinkRecord | null> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const collection = db.collection<ImageStudioSlotLinkDocument>(COLLECTION);
  const doc = await collection.findOne({ projectId, sourceSlotId, relationType });
  return doc ? toRecord(doc) : null;
}

export async function listImageStudioSlotLinks(projectId: string): Promise<ImageStudioSlotLinkRecord[]> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const collection = db.collection<ImageStudioSlotLinkDocument>(COLLECTION);
  const docs = await collection
    .find({ projectId })
    .sort({ createdAt: 1, _id: 1 })
    .toArray();
  return docs.map((doc: ImageStudioSlotLinkDocument) => toRecord(doc));
}

export async function deleteImageStudioSlotLinksForSlot(slotId: string): Promise<number> {
  await ensureIndexesOnce();
  const db = await getMongoDb();
  const collection = db.collection<ImageStudioSlotLinkDocument>(COLLECTION);
  const result = await collection.deleteMany({
    $or: [{ sourceSlotId: slotId }, { targetSlotId: slotId }],
  });
  return result.deletedCount ?? 0;
}
