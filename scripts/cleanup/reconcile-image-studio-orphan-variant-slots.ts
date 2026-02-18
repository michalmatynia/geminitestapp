import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';

import { MongoClient, type Db } from 'mongodb';

const LOG_PREFIX = '[reconcile-image-studio-orphans]';

type SlotDoc = {
  _id: string;
  projectId: string;
  imageFileId?: string | null;
  imageUrl?: string | null;
  metadata?: Record<string, unknown> | null;
};

type SlotLinkDoc = {
  projectId: string;
  sourceSlotId: string;
  targetSlotId: string;
};

type ImageFileDoc = {
  _id: string;
  filepath?: string | null;
};

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const normalizePublicPath = (value: unknown): string | null => {
  const raw = asTrimmedString(value);
  if (!raw) return null;
  let normalized = raw.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      return null;
    }
  }
  const publicIndex = normalized.indexOf('/public/');
  if (publicIndex >= 0) normalized = normalized.slice(publicIndex + '/public'.length);
  const uploadsIndex = normalized.indexOf('/uploads/');
  if (uploadsIndex >= 0) normalized = normalized.slice(uploadsIndex);
  else if (normalized.startsWith('uploads/')) normalized = `/${normalized}`;
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized.startsWith('/uploads/') ? normalized : null;
};

const resolveDiskPath = (publicPath: string): string => {
  return path.resolve(process.cwd(), 'public', publicPath.replace(/^\/+/, ''));
};

const diskPathExists = async (publicPath: string | null): Promise<boolean> => {
  if (!publicPath) return false;
  try {
    await fs.access(resolveDiskPath(publicPath));
    return true;
  } catch {
    return false;
  }
};

const isGenerationLikeSlot = (slot: SlotDoc): boolean => {
  const metadata = asRecord(slot.metadata);
  if (!metadata) return false;
  const role = asTrimmedString(metadata['role']).toLowerCase();
  if (role === 'generation') return true;
  const relationType = asTrimmedString(metadata['relationType']).toLowerCase();
  return (
    relationType.startsWith('generation:') ||
    relationType.startsWith('crop:') ||
    relationType.startsWith('center:') ||
    relationType.startsWith('upscale:') ||
    relationType.startsWith('sequence:')
  );
};

const getSourceIds = (slot: SlotDoc): string[] => {
  const metadata = asRecord(slot.metadata);
  if (!metadata) return [];
  const result = new Set<string>();
  const primary = asTrimmedString(metadata['sourceSlotId']);
  if (primary) result.add(primary);
  const nested = metadata['sourceSlotIds'];
  if (Array.isArray(nested)) {
    nested.forEach((value: unknown) => {
      const normalized = asTrimmedString(value);
      if (normalized) result.add(normalized);
    });
  }
  return Array.from(result);
};

const buildCascadeFromRoots = (
  roots: string[],
  slotsById: Map<string, SlotDoc>,
  childIdsBySource: Map<string, Set<string>>,
): Set<string> => {
  const toDelete = new Set<string>();
  const queue = roots.filter((id) => slotsById.has(id));
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || toDelete.has(current)) continue;
    toDelete.add(current);
    const children = childIdsBySource.get(current);
    if (!children) continue;
    children.forEach((childId) => {
      if (!toDelete.has(childId)) queue.push(childId);
    });
  }
  return toDelete;
};

const parseArgs = (): { apply: boolean; projectIds: Set<string> } => {
  const apply = process.argv.some((arg) => arg === '--apply');
  const projectIds = new Set<string>();
  for (const arg of process.argv) {
    if (!arg.startsWith('--project=')) continue;
    const value = arg.slice('--project='.length).trim();
    if (value) projectIds.add(value);
  }
  return { apply, projectIds };
};

const connectDb = async (): Promise<{ client: MongoClient; db: Db }> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI is required');
  }
  const dbName = process.env['MONGODB_DB'] || 'app';
  const client = new MongoClient(uri);
  await client.connect();
  return { client, db: client.db(dbName) };
};

const run = async (): Promise<void> => {
  const { apply, projectIds: requestedProjects } = parseArgs();
  const { client, db } = await connectDb();
  try {
    const allProjects = await db.collection<SlotDoc>('image_studio_slots').distinct('projectId');
    const projectIds = allProjects.filter((projectId: unknown): projectId is string => {
      if (typeof projectId !== 'string') return false;
      const normalized = projectId.trim();
      if (!normalized) return false;
      return requestedProjects.size === 0 || requestedProjects.has(normalized);
    });

    console.log(`${LOG_PREFIX} mode=${apply ? 'apply' : 'dry-run'} projects=${projectIds.length}`);

    let scannedGenerationSlots = 0;
    let orphanRoots = 0;
    let deletedSlots = 0;
    let deletedFiles = 0;

    for (const projectId of projectIds) {
      const slots = await db.collection<SlotDoc>('image_studio_slots').find({ projectId }).toArray();
      const links = await db.collection<SlotLinkDoc>('image_studio_slot_links').find({ projectId }).toArray();
      const generationSlots = slots.filter((slot) => isGenerationLikeSlot(slot));
      scannedGenerationSlots += generationSlots.length;

      const imageFileIds = Array.from(new Set(generationSlots.map((slot) => asTrimmedString(slot.imageFileId)).filter(Boolean)));
      const imageFiles = imageFileIds.length > 0
        ? await db.collection<ImageFileDoc>('image_files').find({ _id: { $in: imageFileIds } }).toArray()
        : [];
      const imageFileById = new Map<string, ImageFileDoc>(imageFiles.map((doc) => [doc._id, doc]));

      const orphanRootIds: string[] = [];
      for (const slot of generationSlots) {
        const fileId = asTrimmedString(slot.imageFileId);
        if (fileId) {
          const imageFile = imageFileById.get(fileId);
          const pathCandidate = normalizePublicPath(imageFile?.filepath ?? slot.imageUrl);
          const renderable = Boolean(imageFile) && (pathCandidate ? await diskPathExists(pathCandidate) : true);
          if (!renderable) orphanRootIds.push(slot._id);
          continue;
        }

        const pathCandidate = normalizePublicPath(slot.imageUrl);
        const renderable = await diskPathExists(pathCandidate);
        if (!renderable) orphanRootIds.push(slot._id);
      }

      orphanRoots += orphanRootIds.length;
      if (orphanRootIds.length === 0) {
        console.log(`${LOG_PREFIX} ${projectId}: no orphan generation slots`);
        continue;
      }

      const slotsById = new Map(slots.map((slot) => [slot._id, slot]));
      const childIdsBySource = new Map<string, Set<string>>();

      slots.forEach((slot) => {
        getSourceIds(slot).forEach((sourceId) => {
          const children = childIdsBySource.get(sourceId) ?? new Set<string>();
          children.add(slot._id);
          childIdsBySource.set(sourceId, children);
        });
      });
      links.forEach((link) => {
        const sourceId = asTrimmedString(link.sourceSlotId);
        const targetId = asTrimmedString(link.targetSlotId);
        if (!sourceId || !targetId) return;
        const children = childIdsBySource.get(sourceId) ?? new Set<string>();
        children.add(targetId);
        childIdsBySource.set(sourceId, children);
      });

      const toDelete = buildCascadeFromRoots(orphanRootIds, slotsById, childIdsBySource);
      console.log(`${LOG_PREFIX} ${projectId}: orphan roots=${orphanRootIds.length}, cascade delete=${toDelete.size}`);
      Array.from(toDelete).forEach((slotId) => {
        const slot = slotsById.get(slotId);
        console.log(`${LOG_PREFIX}   - ${slotId} (${slot?.imageUrl ?? 'n/a'})`);
      });

      if (!apply || toDelete.size === 0) continue;

      const deletedSlotIds = Array.from(toDelete);
      const fileIdsToDelete = Array.from(new Set(
        deletedSlotIds
          .map((slotId) => asTrimmedString(slotsById.get(slotId)?.imageFileId))
          .filter(Boolean)
      ));

      const slotDeleteResult = await db.collection<SlotDoc>('image_studio_slots').deleteMany({
        _id: { $in: deletedSlotIds },
      });
      deletedSlots += slotDeleteResult.deletedCount ?? 0;

      await db.collection<SlotLinkDoc>('image_studio_slot_links').deleteMany({
        projectId,
        $or: [
          { sourceSlotId: { $in: deletedSlotIds } },
          { targetSlotId: { $in: deletedSlotIds } },
        ],
      });

      for (const fileId of fileIdsToDelete) {
        const remaining = await db.collection<SlotDoc>('image_studio_slots').countDocuments({
          $or: [{ imageFileId: fileId }, { screenshotFileId: fileId }],
        });
        if (remaining > 0) continue;
        const fileDoc = await db.collection<ImageFileDoc>('image_files').findOne({ _id: fileId });
        const publicPath = normalizePublicPath(fileDoc?.filepath);
        if (publicPath) {
          await fs.unlink(resolveDiskPath(publicPath)).catch(() => {});
        }
        const result = await db.collection<ImageFileDoc>('image_files').deleteOne({ _id: fileId });
        deletedFiles += result.deletedCount ?? 0;
      }
    }

    console.log(`${LOG_PREFIX} scanned generation slots=${scannedGenerationSlots}`);
    console.log(`${LOG_PREFIX} orphan roots=${orphanRoots}`);
    if (apply) {
      console.log(`${LOG_PREFIX} deleted slots=${deletedSlots}`);
      console.log(`${LOG_PREFIX} deleted files=${deletedFiles}`);
    } else {
      console.log(`${LOG_PREFIX} dry-run only, no data changed`);
    }
  } finally {
    await client.close();
  }
};

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${LOG_PREFIX} failed: ${message}`);
  process.exitCode = 1;
});
