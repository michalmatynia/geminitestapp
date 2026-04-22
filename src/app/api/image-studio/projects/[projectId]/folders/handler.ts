import fs from 'fs/promises';
import path from 'path';

import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteImageStudioSlotCascade,
  listImageStudioSlots,
} from '@/features/ai/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError } from '@/shared/errors/app-error';
import { optionalTrimmedQueryString } from '@/shared/lib/api/query-schema';
import { studioRoot } from '@/shared/lib/files/server-constants';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const projectsRoot = studioRoot;

const sanitizeProjectId = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFolderPath = (value: string): string => {
  const normalized = value.replace(/\\/g, '/').trim();
  const parts = normalized
    .split('/')
    .map((part) => part.trim())
    .filter((part) => part && part !== '.' && part !== '..');

  return parts.join('/');
};

const createFolderSchema = z.object({
  folder: z.string().min(1),
});

export const deleteQuerySchema = z.object({
  folder: optionalTrimmedQueryString(),
});

const normalizeTreePath = (value: string): string => sanitizeFolderPath(value);

const isTreePathWithin = (candidatePath: string, parentPath: string): boolean => {
  const candidate = normalizeTreePath(candidatePath);
  const parent = normalizeTreePath(parentPath);
  if (!candidate || !parent) return false;
  if (candidate === parent) return true;
  return candidate.startsWith(`${parent}/`);
};

export async function postHandler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = createFolderSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const safeFolder = sanitizeFolderPath(parsed.data.folder);
  if (!safeFolder) {
    throw badRequestError('Folder name is required');
  }

  const folderPath = path.join(projectsRoot, projectId, safeFolder);
  await fs.mkdir(folderPath, { recursive: true });

  return NextResponse.json({ folder: safeFolder }, { status: 201 });
}

type DeleteFolderResult = {
  ok: true;
  folder: string;
  targetSlotCount: number;
  deletedSlotIds: string[];
  failedRootSlotIds: string[];
  warnings: string[];
};

type DeleteFolderProgress = {
  deletedSlotIds: Set<string>;
  failedRootSlotIds: string[];
  warnings: string[];
};

const createDeleteFolderProgress = (): DeleteFolderProgress => ({
  deletedSlotIds: new Set<string>(),
  failedRootSlotIds: [],
  warnings: [],
});

const validateProjectFolderDeleteRequest = (
  ctx: ApiHandlerContext,
  params: { projectId: string }
): { projectId: string; safeFolder: string } => {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const query = (ctx.query ?? {}) as z.infer<typeof deleteQuerySchema>;
  const safeFolder = sanitizeFolderPath(query.folder ?? '');
  if (!safeFolder) {
    throw badRequestError('Folder query param is required');
  }

  return { projectId, safeFolder };
};

const listTargetFolderRootSlots = async ({
  projectId,
  safeFolder,
}: {
  projectId: string;
  safeFolder: string;
}) => {
  const slots = await listImageStudioSlots(projectId);
  return slots.filter((slot) => isTreePathWithin(slot.folderPath ?? '', safeFolder));
};

const applyDeletedFolderSlotIds = ({
  deletedSlotIds,
  result,
}: {
  deletedSlotIds: Set<string>;
  result: Awaited<ReturnType<typeof deleteImageStudioSlotCascade>>;
}): boolean => {
  const nextDeletedSlotIds = result.deletedSlotIds ?? [];
  if (nextDeletedSlotIds.length === 0) {
    return false;
  }
  nextDeletedSlotIds.forEach((deletedSlotId) => {
    deletedSlotIds.add(deletedSlotId);
  });
  return true;
};

const deleteTargetFolderRootSlot = async ({
  deletedSlotIds,
  slotId,
}: {
  deletedSlotIds: Set<string>;
  slotId: string;
}): Promise<boolean> => {
  const result = await deleteImageStudioSlotCascade(slotId);
  return applyDeletedFolderSlotIds({ deletedSlotIds, result });
};

const deleteTargetFolderRootSlots = async (
  targetRootSlots: Array<{ id: string }>,
  progress: DeleteFolderProgress
): Promise<void> => {
  for (const slot of targetRootSlots) {
    if (progress.deletedSlotIds.has(slot.id)) {
      continue;
    }
    try {
      const deleted = await deleteTargetFolderRootSlot({
        deletedSlotIds: progress.deletedSlotIds,
        slotId: slot.id,
      });
      if (!deleted) {
        progress.failedRootSlotIds.push(slot.id);
      }
    } catch (error) {
      void ErrorSystem.captureException(error);
      progress.failedRootSlotIds.push(slot.id);
    }
  }
};

const finalizeDeleteFolderResult = ({
  progress,
  safeFolder,
  targetSlotCount,
}: {
  progress: DeleteFolderProgress;
  safeFolder: string;
  targetSlotCount: number;
}): DeleteFolderResult => {
  if (progress.failedRootSlotIds.length > 0) {
    progress.warnings.push(`Some cards in folder "${safeFolder}" could not be deleted.`);
  }

  return {
    ok: true,
    folder: safeFolder,
    targetSlotCount,
    deletedSlotIds: Array.from(progress.deletedSlotIds),
    failedRootSlotIds: progress.failedRootSlotIds,
    warnings: progress.warnings,
  };
};

export async function deleteHandler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const { projectId, safeFolder } = validateProjectFolderDeleteRequest(_ctx, params);
  const targetRootSlots = await listTargetFolderRootSlots({ projectId, safeFolder });
  const progress = createDeleteFolderProgress();
  await deleteTargetFolderRootSlots(targetRootSlots, progress);

  const payload = finalizeDeleteFolderResult({
    progress,
    safeFolder,
    targetSlotCount: targetRootSlots.length,
  });
  z.unknown().parse(payload);

  return NextResponse.json(payload);
}
