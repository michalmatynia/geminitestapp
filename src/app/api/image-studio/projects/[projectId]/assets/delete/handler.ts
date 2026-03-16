import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { deleteImageStudioVariant } from '@/features/ai/image-studio/server/variant-delete';
import { removeImageStudioRunOutputs } from '@/features/ai/server';
import {
  deleteImageStudioSlotCascade,
  listImageStudioSlots,
} from '@/features/ai/server';
import { getDiskPathFromPublicPath, getImageFileRepository } from '@/features/files/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, notFoundError } from '@/shared/errors/app-error';
import { getFsPromises } from '@/shared/lib/files/runtime-fs';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const sanitizeProjectId = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');
const nodeFs = getFsPromises();

const isProjectScopedStudioPath = (filepath: string, projectId: string): boolean => {
  const scopes = [
    `/uploads/studio/${projectId}`,
    `/uploads/studio/crops/${projectId}`,
    `/uploads/studio/center/${projectId}`,
    `/uploads/studio/upscale/${projectId}`,
    `/uploads/studio/autoscale/${projectId}`,
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
    relationType.startsWith('upscale:') ||
    relationType.startsWith('autoscale:')
  );
};

const asTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const resolveSlotIdAliases = (slotIdRaw: string): string[] => {
  const normalized = asTrimmedString(slotIdRaw);
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

function normalizePublicPath(filepath: string | null | undefined): string | null {
  const raw = typeof filepath === 'string' ? filepath.trim() : '';
  if (!raw) return null;
  let normalized = raw.replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      normalized = url.pathname;
    } catch (error) {
      void ErrorSystem.captureException(error);
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
  try {
    return getDiskPathFromPublicPath(normalized);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
}

const deleteSchema = z.object({
  id: z.string().optional(),
  filepath: z.string().optional(),
  slotId: z.string().optional(),
  generationRunId: z.string().optional(),
  generationOutputIndex: z.number().optional(),
  sourceSlotId: z.string().optional(),
});

async function deleteGenerationSlotsLinkedToAsset(params: {
  projectId: string;
  assetId?: string | null;
  filepath?: string | null;
  slotId?: string | null;
  generationRunId?: string | null;
  generationOutputIndex?: number | null;
  sourceSlotId?: string | null;
}): Promise<void> {
  const normalizedFilepath = normalizePublicPath(params.filepath ?? null);
  const slotIdCandidates = resolveSlotIdAliases(params.slotId ?? '');
  const normalizedRunId = asTrimmedString(params.generationRunId);
  const outputIndex = asFiniteNumber(params.generationOutputIndex);
  const sourceSlotIdCandidates = resolveSlotIdAliases(params.sourceSlotId ?? '');
  if (!params.assetId && !normalizedFilepath && slotIdCandidates.length === 0 && !normalizedRunId)
    return;

  const slots = await listImageStudioSlots(params.projectId);
  const matchedSlots = slots.filter((slot) => {
    if (!isGenerationDerivedSlot(slot.metadata)) return false;

    if (slotIdCandidates.length > 0) {
      const candidates = resolveSlotIdAliases(slot.id);
      if (candidates.some((candidate) => slotIdCandidates.includes(candidate))) {
        return true;
      }
    }

    if (params.assetId && slot.imageFileId === params.assetId) {
      return true;
    }

    if (normalizedFilepath) {
      const slotImagePath = normalizePublicPath(slot.imageFile?.filepath ?? null);
      if (slotImagePath && slotImagePath === normalizedFilepath) return true;
      const slotImageUrl = normalizePublicPath(slot.imageUrl);
      if (slotImageUrl && slotImageUrl === normalizedFilepath) return true;
    }

    if (!normalizedRunId) return false;
    const metadata = asRecord(slot.metadata);
    const slotRunId = asTrimmedString(metadata?.['generationRunId']);
    if (!slotRunId || slotRunId !== normalizedRunId) return false;
    if (outputIndex !== null) {
      const slotOutputIndex = asFiniteNumber(metadata?.['generationOutputIndex']);
      if (slotOutputIndex !== outputIndex) return false;
    }
    if (sourceSlotIdCandidates.length === 0) return true;

    const sourceSlotIds = new Set<string>();
    resolveSlotIdAliases(asTrimmedString(metadata?.['sourceSlotId'])).forEach((candidate) => {
      sourceSlotIds.add(candidate);
    });
    const nestedSourceIds = metadata?.['sourceSlotIds'];
    if (Array.isArray(nestedSourceIds)) {
      nestedSourceIds.forEach((value: unknown) => {
        resolveSlotIdAliases(asTrimmedString(value)).forEach((candidate) => {
          sourceSlotIds.add(candidate);
        });
      });
    }
    return sourceSlotIdCandidates.some((candidate) => sourceSlotIds.has(candidate));
  });

  const deletedSlotIds = new Set<string>();
  for (const slot of matchedSlots) {
    if (deletedSlotIds.has(slot.id)) continue;
    const result = await deleteImageStudioSlotCascade(slot.id).catch(() => ({
      deletedSlotIds: [],
    }));
    (result.deletedSlotIds ?? []).forEach((deletedSlotId) => {
      deletedSlotIds.add(deletedSlotId);
    });
  }
}

export async function POST_handler(
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

  const shouldUseVariantDeleteFlow = Boolean(
    parsed.data.slotId?.trim() ||
    parsed.data.generationRunId?.trim() ||
    parsed.data.sourceSlotId?.trim() ||
    parsed.data.generationOutputIndex !== undefined
  );
  if (shouldUseVariantDeleteFlow) {
    const result = await deleteImageStudioVariant({
      projectId,
      slotId: parsed.data.slotId ?? null,
      assetId: parsed.data.id ?? null,
      filepath: parsed.data.filepath ?? null,
      generationRunId: parsed.data.generationRunId ?? null,
      generationOutputIndex: parsed.data.generationOutputIndex ?? null,
      sourceSlotId: parsed.data.sourceSlotId ?? null,
    });
    return NextResponse.json(result);
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
      await nodeFs.unlink(diskPath).catch((error: unknown) => {
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
      slotId: parsed.data.slotId ?? null,
      generationRunId: parsed.data.generationRunId ?? null,
      generationOutputIndex: parsed.data.generationOutputIndex ?? null,
      sourceSlotId: parsed.data.sourceSlotId ?? null,
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
  await nodeFs.unlink(diskPath).catch((error: unknown) => {
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
    slotId: parsed.data.slotId ?? null,
    generationRunId: parsed.data.generationRunId ?? null,
    generationOutputIndex: parsed.data.generationOutputIndex ?? null,
    sourceSlotId: parsed.data.sourceSlotId ?? null,
  }).catch(() => {});

  return new Response(null, { status: 204 });
}
