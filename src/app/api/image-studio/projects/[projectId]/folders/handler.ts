import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  deleteImageStudioSlotCascade,
  listImageStudioSlots,
} from '@/features/ai/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
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

export async function POST_handler(
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

export async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const query = (_ctx.query ?? {}) as z.infer<typeof deleteQuerySchema>;
  const safeFolder = sanitizeFolderPath(query.folder ?? '');
  if (!safeFolder) {
    throw badRequestError('Folder query param is required');
  }

  const slots = await listImageStudioSlots(projectId);
  const targetRootSlots = slots.filter((slot) =>
    isTreePathWithin(slot.folderPath ?? '', safeFolder)
  );

  const deletedSlotIds = new Set<string>();
  const failedRootSlotIds: string[] = [];
  const warnings: string[] = [];

  for (const slot of targetRootSlots) {
    if (deletedSlotIds.has(slot.id)) continue;
    try {
      const result = await deleteImageStudioSlotCascade(slot.id);
      if ((result.deletedSlotIds ?? []).length === 0) {
        failedRootSlotIds.push(slot.id);
        continue;
      }
      (result.deletedSlotIds ?? []).forEach((deletedSlotId) => {
        deletedSlotIds.add(deletedSlotId);
      });
    } catch (error) {
      void ErrorSystem.captureException(error);
      failedRootSlotIds.push(slot.id);
    }
  }

  if (failedRootSlotIds.length > 0) {
    warnings.push(`Some cards in folder "${safeFolder}" could not be deleted.`);
  }

  const payload: DeleteFolderResult = {
    ok: true,
    folder: safeFolder,
    targetSlotCount: targetRootSlots.length,
    deletedSlotIds: Array.from(deletedSlotIds),
    failedRootSlotIds,
    warnings,
  };
  z.unknown().parse(payload);

  return NextResponse.json(payload);
}
