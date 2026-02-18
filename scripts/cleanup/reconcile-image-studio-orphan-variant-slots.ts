import 'dotenv/config';

import fs from 'fs/promises';
import path from 'path';

import {
  deleteImageStudioSlotCascade,
  listImageStudioSlots,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server/slot-repository';
import { getImageFileRepository } from '@/features/files/server';
import { getDiskPathFromPublicPath } from '@/features/files/utils/fileUploader';

const LOG_PREFIX = '[reconcile-image-studio-orphans]';
const PROJECTS_ROOT = path.join(process.cwd(), 'public', 'uploads', 'studio');

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

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

const isGenerationLikeSlot = (slot: ImageStudioSlotRecord): boolean => {
  const metadata =
    slot.metadata && typeof slot.metadata === 'object' && !Array.isArray(slot.metadata)
      ? slot.metadata
      : null;
  if (!metadata) return false;

  const role = asTrimmedString(metadata['role']).toLowerCase();
  if (role === 'generation') return true;

  const relationType = asTrimmedString(metadata['relationType']).toLowerCase();
  return (
    relationType.startsWith('generation:') ||
    relationType.startsWith('crop:') ||
    relationType.startsWith('center:') ||
    relationType.startsWith('upscale:')
  );
};

const parseProjectArgs = (): {
  apply: boolean;
  projectIds: Set<string>;
} => {
  const apply = process.argv.some((arg) => arg === '--apply');
  const projectIds = new Set<string>();

  for (const arg of process.argv) {
    if (!arg.startsWith('--project=')) continue;
    const projectId = arg.slice('--project='.length).trim();
    if (!projectId) continue;
    projectIds.add(projectId);
  }

  return { apply, projectIds };
};

const resolveProjectIds = async (filterProjectIds: Set<string>): Promise<string[]> => {
  const entries = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true }).catch(() => []);
  const allProjectIds = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  if (filterProjectIds.size === 0) {
    return allProjectIds;
  }

  return allProjectIds.filter((projectId) => filterProjectIds.has(projectId));
};

const diskPathExists = async (publicPath: string): Promise<boolean> => {
  try {
    const diskPath = getDiskPathFromPublicPath(publicPath);
    await fs.access(diskPath);
    return true;
  } catch {
    return false;
  }
};

const run = async (): Promise<void> => {
  const { apply, projectIds: filterProjectIds } = parseProjectArgs();
  const projectIds = await resolveProjectIds(filterProjectIds);
  const imageRepo = await getImageFileRepository();

  const imageFileExistsCache = new Map<string, boolean>();
  const slotRenderableCache = new Map<string, boolean>();

  let scannedProjects = 0;
  let scannedGenerationSlots = 0;
  let orphanCandidates = 0;
  let deletedSlots = 0;

  console.log(
    `${LOG_PREFIX} mode=${apply ? 'apply' : 'dry-run'} projects=${projectIds.length}`,
  );

  for (const projectId of projectIds) {
    scannedProjects += 1;
    const slots = await listImageStudioSlots(projectId);
    const generationSlots = slots.filter((slot) => isGenerationLikeSlot(slot));
    scannedGenerationSlots += generationSlots.length;

    const orphansInProject: ImageStudioSlotRecord[] = [];
    for (const slot of generationSlots) {
      const cacheKey = `${projectId}:${slot.id}`;
      const cached = slotRenderableCache.get(cacheKey);
      if (typeof cached === 'boolean') {
        if (!cached) {
          orphansInProject.push(slot);
        }
        continue;
      }

      const imageFileId = asTrimmedString(slot.imageFileId);
      let renderable = false;

      if (imageFileId) {
        const existing = imageFileExistsCache.get(imageFileId);
        if (typeof existing === 'boolean') {
          renderable = existing;
        } else {
          const imageFile = await imageRepo.getImageFileById(imageFileId).catch(() => null);
          const normalizedPath = normalizePublicPath(imageFile?.filepath);
          const existsOnDisk = normalizedPath ? await diskPathExists(normalizedPath) : false;
          renderable = Boolean(imageFile && (!normalizedPath || existsOnDisk));
          imageFileExistsCache.set(imageFileId, renderable);
        }
      } else {
        const normalizedPath = normalizePublicPath(slot.imageUrl ?? slot.imageFile?.filepath);
        if (normalizedPath) {
          renderable = await diskPathExists(normalizedPath);
        }
      }

      slotRenderableCache.set(cacheKey, renderable);
      if (!renderable) {
        orphansInProject.push(slot);
      }
    }

    orphanCandidates += orphansInProject.length;

    if (orphansInProject.length === 0) {
      console.log(`${LOG_PREFIX} ${projectId}: no orphan generation slots`);
      continue;
    }

    console.log(
      `${LOG_PREFIX} ${projectId}: orphan generation slots=${orphansInProject.length}`,
    );
    orphansInProject.forEach((slot) => {
      console.log(`${LOG_PREFIX}   - ${slot.id} (${slot.name ?? 'unnamed'})`);
    });

    if (!apply) continue;

    for (const slot of orphansInProject) {
      const result = await deleteImageStudioSlotCascade(slot.id);
      deletedSlots += result.deletedSlotIds.length;
    }
  }

  console.log(`${LOG_PREFIX} scanned projects=${scannedProjects}`);
  console.log(`${LOG_PREFIX} scanned generation slots=${scannedGenerationSlots}`);
  console.log(`${LOG_PREFIX} orphan candidates=${orphanCandidates}`);
  if (apply) {
    console.log(`${LOG_PREFIX} deleted slots=${deletedSlots}`);
  } else {
    console.log(`${LOG_PREFIX} dry-run only, no data changed`);
  }
};

void run().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${LOG_PREFIX} failed: ${message}`);
  process.exitCode = 1;
});

