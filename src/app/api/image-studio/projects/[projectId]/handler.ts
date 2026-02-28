import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteImageStudioRunsByProject } from '@/features/ai/image-studio/server/run-repository';
import { deleteImageStudioSlotLinksForProject } from '@/features/ai/image-studio/server/slot-link-repository';
import { deleteImageStudioSlotsByProject } from '@/features/ai/image-studio/server/slot-repository';
import { getImageStudioProjectSettingsKey } from '@/features/ai/image-studio/studio-settings';
import { getImageFileRepository } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError, operationFailedError } from '@/shared/errors/app-error';
import { getAppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { clearSettingsCache } from '@/shared/lib/settings-cache';

const projectsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio');
const projectsRootResolved = path.resolve(projectsRoot);
const patchProjectSchema = z
  .object({
    projectId: z.string().trim().min(1).max(120).optional(),
    canvasWidthPx: z.number().int().min(64).max(32_768).nullable().optional(),
    canvasHeightPx: z.number().int().min(64).max(32_768).nullable().optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.projectId === undefined &&
      value.canvasWidthPx === undefined &&
      value.canvasHeightPx === undefined
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['projectId'],
        message: 'Patch payload must include at least one field to update.',
      });
    }
  });
const SLOT_COLLECTION = 'image_studio_slots';
const RUN_COLLECTION = 'image_studio_runs';
const SLOT_LINK_COLLECTION = 'image_studio_slot_links';
const PROJECT_METADATA_FILENAME = '.image-studio-project.json';
const SETTINGS_COLLECTION = 'settings';

const sanitizeProjectId = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const isSafeProjectIdCandidate = (value: string): boolean =>
  value.length > 0 && !value.includes('/') && !value.includes('\\');

const toProjectIdCandidates = (rawProjectId: string): string[] =>
  Array.from(
    new Set(
      [rawProjectId, sanitizeProjectId(rawProjectId)]
        .map((value) => value.trim())
        .filter((value) => isSafeProjectIdCandidate(value))
    )
  );

const toProjectSettingsKeys = (projectIds: string[]): string[] =>
  Array.from(
    new Set(
      projectIds
        .map((projectId) => getImageStudioProjectSettingsKey(projectId))
        .filter((key): key is string => typeof key === 'string' && key.trim().length > 0)
    )
  );

const canUsePrismaSettings = (): boolean =>
  Boolean(process.env['DATABASE_URL']) && 'setting' in prisma;

const readSettingByKey = async (
  key: string,
  provider: 'prisma' | 'mongodb'
): Promise<string | null> => {
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) return null;
    const mongo = await getMongoDb();
    const doc = await mongo
      .collection<{ key?: string; value?: string }>(SETTINGS_COLLECTION)
      .findOne({ key }, { projection: { value: 1 } });
    return typeof doc?.value === 'string' ? doc.value : null;
  }
  if (!canUsePrismaSettings()) return null;
  const doc = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return doc?.value ?? null;
};

const upsertSettingByKey = async (
  key: string,
  value: string,
  provider: 'prisma' | 'mongodb'
): Promise<void> => {
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) {
      throw operationFailedError('Mongo settings store is unavailable.');
    }
    const mongo = await getMongoDb();
    const now = new Date();
    await mongo
      .collection(SETTINGS_COLLECTION)
      .updateOne(
        { key },
        { $set: { value, updatedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true }
      );
    return;
  }
  if (!canUsePrismaSettings()) {
    throw operationFailedError('Prisma settings store is unavailable.');
  }
  await prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
};

const deleteSettingsByKeys = async (
  keys: string[],
  provider: 'prisma' | 'mongodb'
): Promise<number> => {
  if (keys.length === 0) return 0;
  if (provider === 'mongodb') {
    if (!process.env['MONGODB_URI']) return 0;
    const mongo = await getMongoDb();
    const result = await mongo.collection(SETTINGS_COLLECTION).deleteMany({ key: { $in: keys } });
    return result.deletedCount ?? 0;
  }
  if (!canUsePrismaSettings()) return 0;
  const result = await prisma.setting.deleteMany({
    where: { key: { in: keys } },
  });
  return result.count ?? 0;
};

const migrateProjectScopedSettings = async (params: {
  fromProjectIds: string[];
  toProjectId: string;
}): Promise<{
  migrated: boolean;
  deletedLegacyKeys: number;
  targetKey: string | null;
}> => {
  const provider = await getAppDbProvider();
  const fromKeys = toProjectSettingsKeys(params.fromProjectIds);
  const targetKey = getImageStudioProjectSettingsKey(params.toProjectId);
  if (!targetKey) {
    throw badRequestError('Invalid target project settings key.');
  }

  const targetExisting = await readSettingByKey(targetKey, provider);
  if (targetExisting && targetExisting.trim().length > 0) {
    throw badRequestError('Target project settings key already exists.');
  }

  let sourceValue: string | null = null;
  for (const key of fromKeys) {
    const value = await readSettingByKey(key, provider);
    if (value && value.trim().length > 0) {
      sourceValue = value;
      break;
    }
  }

  if (sourceValue) {
    await upsertSettingByKey(targetKey, sourceValue, provider);
  }
  const deletedLegacyKeys = await deleteSettingsByKeys(fromKeys, provider);
  if (sourceValue || deletedLegacyKeys > 0) {
    clearSettingsCache();
  }

  return {
    migrated: Boolean(sourceValue),
    deletedLegacyKeys,
    targetKey,
  };
};

const resolveProjectDir = (candidate: string): string | null => {
  if (!candidate) return null;
  if (candidate.includes('/') || candidate.includes('\\')) return null;
  const resolved = path.resolve(projectsRootResolved, candidate);
  if (!resolved.startsWith(`${projectsRootResolved}${path.sep}`)) return null;
  return resolved;
};

const parseTimestamp = (value: unknown, fallback: string): string => {
  if (typeof value !== 'string') return fallback;
  const parsedMs = Date.parse(value);
  if (!Number.isFinite(parsedMs)) return fallback;
  return new Date(parsedMs).toISOString();
};

const parseCanvasDimension = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  const normalized = Math.floor(value);
  if (normalized < 64 || normalized > 32_768) return null;
  return normalized;
};

const resolveProjectSummaryFromDirectory = async (
  projectId: string
): Promise<{
  createdAt: string;
  updatedAt: string;
  canvasWidthPx: number | null;
  canvasHeightPx: number | null;
} | null> => {
  const projectDir = resolveProjectDir(projectId);
  if (!projectDir) return null;

  const dirStats = await fs.stat(projectDir).catch(() => null);
  if (!dirStats?.isDirectory()) return null;

  const createdMs =
    Number.isFinite(dirStats.birthtimeMs) && dirStats.birthtimeMs > 0
      ? dirStats.birthtimeMs
      : Date.now();
  const updatedMs =
    Number.isFinite(dirStats.mtimeMs) && dirStats.mtimeMs > 0 ? dirStats.mtimeMs : createdMs;
  const fallbackCreatedAt = new Date(createdMs).toISOString();
  const fallbackUpdatedAt = new Date(updatedMs).toISOString();

  const metadataPath = path.join(projectDir, PROJECT_METADATA_FILENAME);
  const metadataRaw = await fs.readFile(metadataPath, 'utf8').catch(() => null);
  if (!metadataRaw) {
    return {
      createdAt: fallbackCreatedAt,
      updatedAt: fallbackUpdatedAt,
      canvasWidthPx: null,
      canvasHeightPx: null,
    };
  }

  try {
    const parsed = JSON.parse(metadataRaw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {
        createdAt: fallbackCreatedAt,
        updatedAt: fallbackUpdatedAt,
        canvasWidthPx: null,
        canvasHeightPx: null,
      };
    }
    const metadata = parsed as Record<string, unknown>;
    return {
      createdAt: parseTimestamp(metadata['createdAt'], fallbackCreatedAt),
      updatedAt: parseTimestamp(metadata['updatedAt'], fallbackUpdatedAt),
      canvasWidthPx: parseCanvasDimension(metadata['canvasWidthPx']),
      canvasHeightPx: parseCanvasDimension(metadata['canvasHeightPx']),
    };
  } catch {
    return {
      createdAt: fallbackCreatedAt,
      updatedAt: fallbackUpdatedAt,
      canvasWidthPx: null,
      canvasHeightPx: null,
    };
  }
};

const upsertProjectSummary = async (
  projectId: string,
  options?: {
    canvasWidthPx?: number | null;
    canvasHeightPx?: number | null;
  }
): Promise<{
  id: string;
  createdAt: string;
  updatedAt: string;
  canvasWidthPx: number | null;
  canvasHeightPx: number | null;
}> => {
  const projectDir = resolveProjectDir(projectId);
  if (!projectDir) {
    throw badRequestError('Invalid target project id.');
  }
  const existing = await resolveProjectSummaryFromDirectory(projectId);
  const nowIso = new Date().toISOString();
  const summary = {
    id: projectId,
    createdAt: existing?.createdAt ?? nowIso,
    updatedAt: nowIso,
    canvasWidthPx:
      options?.canvasWidthPx !== undefined
        ? options.canvasWidthPx
        : (existing?.canvasWidthPx ?? null),
    canvasHeightPx:
      options?.canvasHeightPx !== undefined
        ? options.canvasHeightPx
        : (existing?.canvasHeightPx ?? null),
  };
  await fs.mkdir(projectDir, { recursive: true });
  const metadataPath = path.join(projectDir, PROJECT_METADATA_FILENAME);
  await fs.writeFile(metadataPath, JSON.stringify(summary, null, 2), 'utf8');
  return summary;
};

const normalizePublicPath = (filepath: string | null | undefined): string | null => {
  const raw = typeof filepath === 'string' ? filepath.trim() : '';
  if (!raw) return null;

  let normalized = raw.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      normalized = new URL(normalized).pathname;
    } catch {
      return raw;
    }
  }

  if (normalized.startsWith('public/')) {
    normalized = `/${normalized}`;
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
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
};

const isProjectAssetPath = (
  filepath: string | null | undefined,
  projectIdCandidates: string[]
): boolean => {
  const normalized = normalizePublicPath(filepath);
  if (!normalized) return false;
  return projectIdCandidates.some((projectId) => {
    const prefix = `/uploads/studio/${projectId}/`;
    return normalized.startsWith(prefix);
  });
};

async function deleteProjectImageFileRecords(projectIdCandidates: string[]): Promise<number> {
  if (projectIdCandidates.length === 0) return 0;
  const repo = await getImageFileRepository();
  const allImageFiles = await repo.listImageFiles();
  const projectFiles = allImageFiles.filter((file) =>
    isProjectAssetPath(file.filepath, projectIdCandidates)
  );
  let deletedCount = 0;
  for (const file of projectFiles) {
    const deleted = await repo.deleteImageFile(file.id);
    if (deleted) deletedCount += 1;
  }
  return deletedCount;
}

const replaceProjectAssetPath = (
  filepath: string | null | undefined,
  fromProjectIds: string[],
  toProjectId: string
): string | null => {
  if (typeof filepath !== 'string') return null;
  const trimmed = filepath.trim();
  if (!trimmed) return null;

  let next = trimmed;
  for (const sourceProjectId of fromProjectIds) {
    const sourcePrefix = `/uploads/studio/${sourceProjectId}/`;
    const targetPrefix = `/uploads/studio/${toProjectId}/`;
    if (next.includes(sourcePrefix)) {
      next = next.replace(sourcePrefix, targetPrefix);
    }
  }

  return next !== trimmed ? next : null;
};

async function migrateImageFilePaths(
  fromProjectIds: string[],
  toProjectId: string
): Promise<number> {
  const repo = await getImageFileRepository();
  const imageFiles = await repo.listImageFiles();
  const projectFiles = imageFiles.filter((file) =>
    isProjectAssetPath(file.filepath, fromProjectIds)
  );
  let updatedCount = 0;
  for (const file of projectFiles) {
    const nextPath = replaceProjectAssetPath(file.filepath, fromProjectIds, toProjectId);
    if (!nextPath || nextPath === file.filepath) continue;
    const updated = await repo.updateImageFilePath(file.id, nextPath);
    if (updated) updatedCount += 1;
  }
  return updatedCount;
}

async function migrateSlotRecords(
  fromProjectIds: string[],
  toProjectId: string
): Promise<{ updatedSlots: number; updatedImageUrls: number }> {
  const db = await getMongoDb();
  const collection = db.collection<{
    _id: string;
    projectId: string;
    imageUrl?: string | null;
  }>(SLOT_COLLECTION);
  const docs = await collection.find({ projectId: { $in: fromProjectIds } }).toArray();

  let updatedSlots = 0;
  let updatedImageUrls = 0;
  for (const doc of docs) {
    const nextImageUrl = replaceProjectAssetPath(doc.imageUrl ?? null, fromProjectIds, toProjectId);
    const setPayload: Record<string, unknown> = {
      projectId: toProjectId,
    };
    if (nextImageUrl) {
      setPayload['imageUrl'] = nextImageUrl;
      updatedImageUrls += 1;
    }
    const result = await collection.updateOne({ _id: doc._id }, { $set: setPayload });
    if (result.modifiedCount > 0) {
      updatedSlots += 1;
    }
  }

  return { updatedSlots, updatedImageUrls };
}

async function migrateRunRecords(fromProjectIds: string[], toProjectId: string): Promise<number> {
  const db = await getMongoDb();
  const collection = db.collection(RUN_COLLECTION);
  const result = await collection.updateMany(
    { projectId: { $in: fromProjectIds } },
    {
      $set: {
        projectId: toProjectId,
        'request.projectId': toProjectId,
      },
    }
  );
  return result.modifiedCount ?? 0;
}

async function migrateSlotLinkRecords(
  fromProjectIds: string[],
  toProjectId: string
): Promise<number> {
  const db = await getMongoDb();
  const collection = db.collection(SLOT_LINK_COLLECTION);
  const result = await collection.updateMany(
    { projectId: { $in: fromProjectIds } },
    { $set: { projectId: toProjectId } }
  );
  return result.modifiedCount ?? 0;
}

async function ensureProjectDirectoryRename(
  fromProjectIds: string[],
  toProjectId: string
): Promise<{ movedDirectory: boolean; createdDirectory: boolean }> {
  const toDir = resolveProjectDir(toProjectId);
  if (!toDir) {
    throw badRequestError('Invalid target project id.');
  }

  const sourceDirs = fromProjectIds
    .map((projectId) => resolveProjectDir(projectId))
    .filter((dir): dir is string => Boolean(dir))
    .filter((dir) => dir !== toDir);

  const existingSourceDirs: string[] = [];
  for (const sourceDir of sourceDirs) {
    const stats = await fs.stat(sourceDir).catch(() => null);
    if (stats?.isDirectory()) {
      existingSourceDirs.push(sourceDir);
    }
  }

  const targetExists = Boolean((await fs.stat(toDir).catch(() => null))?.isDirectory());
  if (targetExists && existingSourceDirs.length > 0) {
    throw badRequestError('Target project id already exists.');
  }

  if (existingSourceDirs.length > 0) {
    await fs.rename(existingSourceDirs[0]!, toDir);
    for (let index = 1; index < existingSourceDirs.length; index += 1) {
      const extraDir = existingSourceDirs[index];
      if (!extraDir) continue;
      await fs.rm(extraDir, { recursive: true, force: true });
    }
    return { movedDirectory: true, createdDirectory: false };
  }

  if (!targetExists) {
    await fs.mkdir(toDir, { recursive: true });
    return { movedDirectory: false, createdDirectory: true };
  }

  return { movedDirectory: false, createdDirectory: false };
}

async function hasProjectData(projectId: string): Promise<boolean> {
  const db = await getMongoDb();
  const [slotsCount, runsCount, slotLinksCount] = await Promise.all([
    db.collection(SLOT_COLLECTION).countDocuments({ projectId }),
    db.collection(RUN_COLLECTION).countDocuments({ projectId }),
    db.collection(SLOT_LINK_COLLECTION).countDocuments({ projectId }),
  ]);
  return slotsCount > 0 || runsCount > 0 || slotLinksCount > 0;
}

export async function deleteImageStudioProjectHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const rawProjectId = params.projectId?.trim() ?? '';
  if (!rawProjectId) throw badRequestError('Project id is required');
  const candidates = toProjectIdCandidates(rawProjectId);

  const stats = {
    directoriesDeleted: 0,
    slotsDeleted: 0,
    slotLinksDeleted: 0,
    runsDeleted: 0,
    imageFileRecordsDeleted: 0,
    settingsKeysDeleted: 0,
  };

  for (const candidate of candidates) {
    stats.slotLinksDeleted += await deleteImageStudioSlotLinksForProject(candidate);
    stats.slotsDeleted += await deleteImageStudioSlotsByProject(candidate);
    stats.runsDeleted += await deleteImageStudioRunsByProject(candidate);
  }

  stats.imageFileRecordsDeleted = await deleteProjectImageFileRecords(candidates);
  stats.settingsKeysDeleted = await deleteSettingsByKeys(
    toProjectSettingsKeys(candidates),
    await getAppDbProvider()
  );
  if (stats.settingsKeysDeleted > 0) {
    clearSettingsCache();
  }

  for (const candidate of candidates) {
    const projectDir = resolveProjectDir(candidate);
    if (!projectDir) continue;
    const projectDirStats = await fs.stat(projectDir).catch(() => null);
    if (!projectDirStats?.isDirectory()) continue;
    await fs.rm(projectDir, { recursive: true, force: true });
    stats.directoriesDeleted += 1;
  }

  const deleted = Object.values(stats).some((count) => count > 0);
  if (!deleted) {
    throw notFoundError('Project not found', { projectId: rawProjectId });
  }

  return NextResponse.json({ projectId: rawProjectId, deleted: true, stats });
}

export async function patchImageStudioProjectHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const rawProjectId = params.projectId?.trim() ?? '';
  if (!rawProjectId) throw badRequestError('Project id is required');
  const fromProjectIds = toProjectIdCandidates(rawProjectId);
  if (fromProjectIds.length === 0) {
    throw badRequestError('Invalid source project id.');
  }

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = patchProjectSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const projectSummaryUpsertOptions = {
    ...(parsed.data.canvasWidthPx !== undefined
      ? { canvasWidthPx: parsed.data.canvasWidthPx }
      : {}),
    ...(parsed.data.canvasHeightPx !== undefined
      ? { canvasHeightPx: parsed.data.canvasHeightPx }
      : {}),
  };

  const sourceStates = await Promise.all(
    fromProjectIds.map(async (projectId) => {
      const [hasData, hasDirectory] = await Promise.all([
        hasProjectData(projectId),
        (async (): Promise<boolean> => {
          const dir = resolveProjectDir(projectId);
          if (!dir) return false;
          const stats = await fs.stat(dir).catch(() => null);
          return Boolean(stats?.isDirectory());
        })(),
      ]);
      return {
        projectId,
        hasData,
        hasDirectory,
      };
    })
  );
  const sourceExists = sourceStates.some((state) => state.hasData || state.hasDirectory);
  if (!sourceExists) {
    throw notFoundError('Project not found', { projectId: rawProjectId });
  }
  const resolvedSourceProjectId =
    sourceStates.find((state) => state.hasData || state.hasDirectory)?.projectId ??
    fromProjectIds[0]!;

  if (parsed.data.projectId === undefined) {
    const project = await upsertProjectSummary(
      resolvedSourceProjectId,
      projectSummaryUpsertOptions
    );
    return NextResponse.json({
      projectId: resolvedSourceProjectId,
      project,
      fromProjectId: rawProjectId,
      renamed: false,
      stats: {
        movedDirectory: false,
        createdDirectory: false,
        updatedSlots: 0,
        updatedSlotImageUrls: 0,
        updatedRuns: 0,
        updatedSlotLinks: 0,
        updatedImageFiles: 0,
      },
    });
  }

  const toProjectId = sanitizeProjectId(parsed.data.projectId);
  if (!toProjectId) {
    throw badRequestError('Target project id is required.');
  }

  if (fromProjectIds.includes(toProjectId)) {
    const project = await upsertProjectSummary(toProjectId, projectSummaryUpsertOptions);
    return NextResponse.json({
      projectId: toProjectId,
      project,
      fromProjectId: rawProjectId,
      renamed: false,
      stats: {
        movedDirectory: false,
        createdDirectory: false,
        updatedSlots: 0,
        updatedSlotImageUrls: 0,
        updatedRuns: 0,
        updatedSlotLinks: 0,
        updatedImageFiles: 0,
      },
    });
  }

  const targetDir = resolveProjectDir(toProjectId);
  if (!targetDir) {
    throw badRequestError('Invalid target project id.');
  }
  const [targetDirExists, targetHasData] = await Promise.all([
    fs
      .stat(targetDir)
      .then((stats) => stats.isDirectory())
      .catch(() => false),
    hasProjectData(toProjectId),
  ]);
  if (targetDirExists || targetHasData) {
    throw badRequestError('Target project id already exists.');
  }

  const directoryStats = await ensureProjectDirectoryRename(fromProjectIds, toProjectId);
  const slotStats = await migrateSlotRecords(fromProjectIds, toProjectId);
  const updatedRuns = await migrateRunRecords(fromProjectIds, toProjectId);
  const updatedSlotLinks = await migrateSlotLinkRecords(fromProjectIds, toProjectId);
  const updatedImageFiles = await migrateImageFilePaths(fromProjectIds, toProjectId);
  const settingsStats = await migrateProjectScopedSettings({
    fromProjectIds,
    toProjectId,
  });
  const project = await upsertProjectSummary(toProjectId, projectSummaryUpsertOptions);

  return NextResponse.json({
    projectId: toProjectId,
    project,
    fromProjectId: rawProjectId,
    renamed: true,
    stats: {
      movedDirectory: directoryStats.movedDirectory,
      createdDirectory: directoryStats.createdDirectory,
      updatedSlots: slotStats.updatedSlots,
      updatedSlotImageUrls: slotStats.updatedImageUrls,
      updatedRuns,
      updatedSlotLinks,
      updatedImageFiles,
      migratedSettings: settingsStats.migrated,
      deletedLegacySettingsKeys: settingsStats.deletedLegacyKeys,
      settingsKey: settingsStats.targetKey,
    },
  });
}
