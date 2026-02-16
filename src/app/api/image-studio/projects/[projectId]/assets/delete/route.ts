export const runtime = 'nodejs';

import fs from 'fs/promises';
import path from 'path';

import { NextRequest } from 'next/server';
import { z } from 'zod';

import { removeImageStudioRunOutputs } from '@/features/ai/image-studio/server/run-repository';
import {
  deleteImageStudioSlot,
  listImageStudioSlots,
} from '@/features/ai/image-studio/server/slot-repository';
import { getImageFileRepository } from '@/features/files/server';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads');

const sanitizeProjectId = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const isProjectScopedStudioPath = (filepath: string, projectId: string): boolean => {
  const scopes = [
    `/uploads/studio/${projectId}`,
    `/uploads/studio/crops/${projectId}`,
    `/uploads/studio/center/${projectId}`,
    `/uploads/studio/upscale/${projectId}`,
  ];
  return scopes.some((scope) => filepath === scope || filepath.startsWith(`${scope}/`));
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asTrimmedLowerString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
};

const isGenerationDerivedSlot = (metadata: unknown): boolean => {
  const record = asRecord(metadata);
  if (!record) return false;

  const role = asTrimmedLowerString(record['role']);
  if (role === 'generation') return true;

  const relationType = asTrimmedLowerString(record['relationType']);
  return (
    relationType.startsWith('generation:') ||
    relationType.startsWith('center:') ||
    relationType.startsWith('crop:') ||
    relationType.startsWith('upscale:')
  );
};

function normalizePublicPath(filepath: string | null | undefined): string | null {
  const raw = typeof filepath === 'string' ? filepath.trim() : '';
  if (!raw) return null;
  let normalized = raw.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
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
}

function resolveDiskPathFromPublicUploadPath(filepath: string): string | null {
  const normalized = normalizePublicPath(filepath);
  if (!normalized?.startsWith('/uploads/')) return null;
  const resolved = path.resolve(process.cwd(), 'public', normalized.replace(/^\/+/, ''));
  const uploadsResolved = path.resolve(uploadsRoot);
  if (!resolved.startsWith(`${uploadsResolved}${path.sep}`)) return null;
  return resolved;
}

const deleteSchema = z.object({
  id: z.string().optional(),
  filepath: z.string().optional(),
});

async function deleteGenerationSlotsLinkedToAsset(params: {
  projectId: string;
  assetId?: string | null;
  filepath?: string | null;
}): Promise<void> {
  const normalizedFilepath = normalizePublicPath(params.filepath ?? null);
  if (!params.assetId && !normalizedFilepath) return;

  const slots = await listImageStudioSlots(params.projectId);
  const matchedSlots = slots.filter((slot) => {
    if (!isGenerationDerivedSlot(slot.metadata)) return false;

    if (params.assetId && slot.imageFileId === params.assetId) {
      return true;
    }

    if (!normalizedFilepath) return false;
    const slotImagePath = normalizePublicPath(slot.imageFile?.filepath ?? null);
    if (slotImagePath && slotImagePath === normalizedFilepath) return true;
    const slotImageUrl = normalizePublicPath(slot.imageUrl);
    return Boolean(slotImageUrl && slotImageUrl === normalizedFilepath);
  });

  await Promise.allSettled(
    matchedSlots.map(async (slot) => {
      await deleteImageStudioSlot(slot.id);
    })
  );
}

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { projectId: string }
): Promise<Response> {
  const projectId = sanitizeProjectId(params.projectId);
  if (!projectId) throw badRequestError('Project id is required');

  const body = (await req.json().catch(() => null)) as unknown;
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    throw badRequestError('Invalid payload', { errors: parsed.error.format() });
  }

  const assetId = parsed.data.id?.trim() ?? '';
  const isDiskOnly = assetId.startsWith('disk:');
  let filepath = parsed.data.filepath?.trim() ?? '';

  if (assetId && !isDiskOnly) {
    const repo = await getImageFileRepository();
    const record = await repo.getImageFileById(assetId);
    if (!record) {
      throw notFoundError('Asset not found');
    }
    filepath = record.filepath;
    const normalized = normalizePublicPath(filepath);
    if (!normalized || !isProjectScopedStudioPath(normalized, projectId)) {
      throw badRequestError('Asset not in this project');
    }
    const diskPath = resolveDiskPathFromPublicUploadPath(normalized);
    if (diskPath) {
      await fs.unlink(diskPath).catch((error: unknown) => {
        if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw error;
        }
      });
    }
    await repo.deleteImageFile(assetId);
    await removeImageStudioRunOutputs({
      projectId,
      outputFileId: assetId,
      outputFilepath: normalized,
    }).catch(() => {});
    await deleteGenerationSlotsLinkedToAsset({
      projectId,
      assetId,
      filepath: normalized,
    }).catch(() => {});
    return new Response(null, { status: 204 });
  }

  if (isDiskOnly && !filepath) {
    filepath = assetId.replace(/^disk:/, '');
  }

  const normalized = normalizePublicPath(filepath);
  if (!normalized || !isProjectScopedStudioPath(normalized, projectId)) {
    throw notFoundError('Asset not found');
  }
  const diskPath = resolveDiskPathFromPublicUploadPath(normalized);
  if (!diskPath) {
    throw notFoundError('Asset not found');
  }
  await fs.unlink(diskPath).catch((error: unknown) => {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  });
  await removeImageStudioRunOutputs({
    projectId,
    outputFilepath: normalized,
  }).catch(() => {});
  await deleteGenerationSlotsLinkedToAsset({
    projectId,
    filepath: normalized,
  }).catch(() => {});

  return new Response(null, { status: 204 });
}

export const POST = apiHandlerWithParams<{ projectId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { projectId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.projects.[projectId].assets.delete.POST' }
);
