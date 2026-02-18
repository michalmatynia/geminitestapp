import 'server-only';

import fs from 'fs/promises';

import { getImageFileRepository } from '@/features/files/server';
import { getDiskPathFromPublicPath } from '@/features/files/utils/fileUploader';
import { logSystemEvent } from '@/features/observability/server';

import { removeImageStudioRunOutputs } from './run-repository';
import {
  deleteImageStudioSlotCascade,
  listImageStudioSlots,
  type ImageStudioSlotRecord,
} from './slot-repository';

type DeleteImageStudioVariantInput = {
  projectId: string;
  slotId?: string | null;
  assetId?: string | null;
  filepath?: string | null;
  generationRunId?: string | null;
  generationOutputIndex?: number | null;
  sourceSlotId?: string | null;
};

export type DeleteImageStudioVariantMode = 'slot_cascade' | 'asset_only' | 'noop';

export type DeleteImageStudioVariantResult = {
  ok: true;
  modeUsed: DeleteImageStudioVariantMode;
  matchedSlotIds: string[];
  deletedSlotIds: string[];
  deletedFileIds: string[];
  deletedFilepaths: string[];
  warnings: string[];
};

type DeleteImageStudioVariantDeps = {
  listSlots: (projectId: string) => Promise<ImageStudioSlotRecord[]>;
  deleteSlotCascade: (slotId: string) => Promise<{ deleted: boolean; deletedSlotIds: string[] }>;
  removeRunOutputs: (input: {
    projectId: string;
    runId?: string | null;
    outputFileId?: string | null;
    outputFilepath?: string | null;
  }) => Promise<number>;
  getImageFileById: (id: string) => Promise<{ id: string; filepath: string } | null>;
  deleteImageFileById: (id: string) => Promise<void>;
  deleteDiskPath: (publicPath: string) => Promise<boolean>;
  logMetric: (input: {
    level: 'info' | 'warn' | 'error';
    message: string;
    context: Record<string, unknown>;
  }) => Promise<void>;
};

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

const resolveSlotIdAliases = (slotIdRaw: unknown): string[] => {
  const normalized = asTrimmedString(slotIdRaw);
  if (!normalized) return [];

  const unprefixed = normalized.startsWith('slot:')
    ? asTrimmedString(normalized.slice('slot:'.length))
    : normalized.startsWith('card:')
      ? asTrimmedString(normalized.slice('card:'.length))
      : normalized;

  const set = new Set<string>([normalized]);
  if (unprefixed) {
    set.add(unprefixed);
    set.add(`slot:${unprefixed}`);
    set.add(`card:${unprefixed}`);
  }

  return Array.from(set);
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const asFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
};

const extractSlotSourceAliases = (slot: ImageStudioSlotRecord): Set<string> => {
  const metadata = asRecord(slot.metadata);
  const sourceAliases = new Set<string>();

  resolveSlotIdAliases(metadata?.['sourceSlotId']).forEach((candidate) => sourceAliases.add(candidate));
  const sourceSlotIds = metadata?.['sourceSlotIds'];
  if (Array.isArray(sourceSlotIds)) {
    sourceSlotIds.forEach((value: unknown) => {
      resolveSlotIdAliases(value).forEach((candidate) => sourceAliases.add(candidate));
    });
  }

  return sourceAliases;
};

const matchesVariantRunSelectors = (
  slot: ImageStudioSlotRecord,
  params: {
    generationRunId: string;
    generationOutputIndex: number | null;
    sourceSlotAliases: string[];
  },
): boolean => {
  const metadata = asRecord(slot.metadata);
  if (!metadata) return false;
  const slotRunId = asTrimmedString(metadata['generationRunId']);
  if (!slotRunId || slotRunId !== params.generationRunId) return false;

  if (params.generationOutputIndex !== null) {
    const slotOutputIndex = asFiniteNumber(metadata['generationOutputIndex']);
    if (slotOutputIndex !== params.generationOutputIndex) return false;
  }

  if (params.sourceSlotAliases.length === 0) return true;
  const slotSources = extractSlotSourceAliases(slot);
  return params.sourceSlotAliases.some((candidate) => slotSources.has(candidate));
};

const collectMatchingVariantSlots = (
  slots: ImageStudioSlotRecord[],
  input: {
    slotAliases: string[];
    assetId: string;
    normalizedFilepath: string | null;
    generationRunId: string;
    generationOutputIndex: number | null;
    sourceSlotAliases: string[];
  },
): ImageStudioSlotRecord[] => {
  const matchesById = new Set<string>();

  for (const slot of slots) {
    const slotAliases = resolveSlotIdAliases(slot.id);
    if (input.slotAliases.length > 0 && slotAliases.some((alias) => input.slotAliases.includes(alias))) {
      matchesById.add(slot.id);
      continue;
    }

    if (input.assetId) {
      if (slot.imageFileId === input.assetId) {
        matchesById.add(slot.id);
        continue;
      }
      const metadata = asRecord(slot.metadata);
      if (asTrimmedString(metadata?.['generationFileId']) === input.assetId) {
        matchesById.add(slot.id);
        continue;
      }
      const outputFile = asRecord(metadata?.['outputFile']);
      if (asTrimmedString(outputFile?.['id']) === input.assetId) {
        matchesById.add(slot.id);
        continue;
      }
    }

    if (input.normalizedFilepath) {
      const slotImageFilePath = normalizePublicPath(slot.imageFile?.filepath);
      if (slotImageFilePath && slotImageFilePath === input.normalizedFilepath) {
        matchesById.add(slot.id);
        continue;
      }

      const slotImageUrlPath = normalizePublicPath(slot.imageUrl);
      if (slotImageUrlPath && slotImageUrlPath === input.normalizedFilepath) {
        matchesById.add(slot.id);
        continue;
      }

      const metadata = asRecord(slot.metadata);
      const outputFile = asRecord(metadata?.['outputFile']);
      const outputPath = normalizePublicPath(outputFile?.['filepath']);
      if (outputPath && outputPath === input.normalizedFilepath) {
        matchesById.add(slot.id);
        continue;
      }
    }

    if (input.generationRunId) {
      if (
        matchesVariantRunSelectors(slot, {
          generationRunId: input.generationRunId,
          generationOutputIndex: input.generationOutputIndex,
          sourceSlotAliases: input.sourceSlotAliases,
        })
      ) {
        matchesById.add(slot.id);
      }
    }
  }

  return slots.filter((slot) => matchesById.has(slot.id));
};

const buildFileSelectorsFromSlot = (slot: ImageStudioSlotRecord): {
  fileIds: string[];
  filepaths: string[];
} => {
  const fileIds = new Set<string>();
  const filepaths = new Set<string>();

  const normalizedImageFileId = asTrimmedString(slot.imageFileId);
  if (normalizedImageFileId) fileIds.add(normalizedImageFileId);

  const imageFilePath = normalizePublicPath(slot.imageFile?.filepath);
  if (imageFilePath) filepaths.add(imageFilePath);
  const imageUrlPath = normalizePublicPath(slot.imageUrl);
  if (imageUrlPath) filepaths.add(imageUrlPath);

  const metadata = asRecord(slot.metadata);
  const generationFileId = asTrimmedString(metadata?.['generationFileId']);
  if (generationFileId) fileIds.add(generationFileId);
  const outputFile = asRecord(metadata?.['outputFile']);
  const outputFileId = asTrimmedString(outputFile?.['id']);
  if (outputFileId) fileIds.add(outputFileId);
  const outputFilepath = normalizePublicPath(outputFile?.['filepath']);
  if (outputFilepath) filepaths.add(outputFilepath);

  return {
    fileIds: Array.from(fileIds),
    filepaths: Array.from(filepaths),
  };
};

const defaultDeps: DeleteImageStudioVariantDeps = {
  listSlots: async (projectId: string) => await listImageStudioSlots(projectId),
  deleteSlotCascade: async (slotId: string) => await deleteImageStudioSlotCascade(slotId),
  removeRunOutputs: async (input) => await removeImageStudioRunOutputs(input),
  getImageFileById: async (id: string) => {
    const repo = await getImageFileRepository();
    const found = await repo.getImageFileById(id);
    if (!found?.id) return null;
    return {
      id: found.id,
      filepath: found.filepath,
    };
  },
  deleteImageFileById: async (id: string) => {
    const repo = await getImageFileRepository();
    await repo.deleteImageFile(id);
  },
  deleteDiskPath: async (publicPath: string) => {
    const normalized = normalizePublicPath(publicPath);
    if (!normalized) return false;
    const diskPath = getDiskPathFromPublicPath(normalized);
    try {
      await fs.unlink(diskPath);
      return true;
    } catch (error: unknown) {
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  },
  logMetric: async (input) => {
    await logSystemEvent({
      level: input.level,
      source: 'image-studio.variant-delete',
      message: input.message,
      context: input.context,
    });
  },
};

const emitDeleteTelemetry = async (
  result: DeleteImageStudioVariantResult,
  input: { projectId: string; requestedSlotId: string; requestedAssetId: string; runId: string },
  deps: DeleteImageStudioVariantDeps,
): Promise<void> => {
  await deps.logMetric({
    level: result.modeUsed === 'noop' ? 'warn' : 'info',
    message: 'Image Studio variant delete processed.',
    context: {
      metric: 'variant_delete_total',
      projectId: input.projectId,
      modeUsed: result.modeUsed,
      requestedSlotId: input.requestedSlotId || null,
      requestedAssetId: input.requestedAssetId || null,
      requestedRunId: input.runId || null,
      matchedSlotCount: result.matchedSlotIds.length,
      deletedSlotCount: result.deletedSlotIds.length,
      deletedFileCount: result.deletedFileIds.length + result.deletedFilepaths.length,
      warningCount: result.warnings.length,
    },
  }).catch(() => {});

  if (result.modeUsed === 'asset_only') {
    await deps.logMetric({
      level: 'warn',
      message: 'Image Studio variant delete fell back to file-only cleanup.',
      context: {
        metric: 'variant_delete_file_only_total',
        projectId: input.projectId,
      },
    }).catch(() => {});
  }

  if (result.warnings.some((warning) => warning.includes('orphan'))) {
    await deps.logMetric({
      level: 'warn',
      message: 'Image Studio orphan slot risk detected during variant delete.',
      context: {
        metric: 'orphan_slot_detected_total',
        projectId: input.projectId,
        warnings: result.warnings,
      },
    }).catch(() => {});
  }
};

export async function deleteImageStudioVariant(
  input: DeleteImageStudioVariantInput,
  deps: DeleteImageStudioVariantDeps = defaultDeps,
): Promise<DeleteImageStudioVariantResult> {
  const projectId = asTrimmedString(input.projectId);
  if (!projectId) {
    return {
      ok: true,
      modeUsed: 'noop',
      matchedSlotIds: [],
      deletedSlotIds: [],
      deletedFileIds: [],
      deletedFilepaths: [],
      warnings: ['Project id is required.'],
    };
  }

  const requestedSlotId = asTrimmedString(input.slotId);
  const requestedAssetId = asTrimmedString(input.assetId);
  const requestedFilepath = normalizePublicPath(input.filepath);
  const requestedRunId = asTrimmedString(input.generationRunId);
  const requestedOutputIndex = asFiniteNumber(input.generationOutputIndex);
  const requestedSourceAliases = resolveSlotIdAliases(input.sourceSlotId);

  const slotAliases = resolveSlotIdAliases(requestedSlotId);
  const slots = await deps.listSlots(projectId);
  const matchedSlots = collectMatchingVariantSlots(slots, {
    slotAliases,
    assetId: requestedAssetId,
    normalizedFilepath: requestedFilepath,
    generationRunId: requestedRunId,
    generationOutputIndex: requestedOutputIndex,
    sourceSlotAliases: requestedSourceAliases,
  });

  const warnings: string[] = [];
  const matchedSlotIds = matchedSlots.map((slot) => slot.id);
  const deletedSlotIdsSet = new Set<string>();
  const fileIdsFromMatchedSlots = new Set<string>();
  const filepathsFromMatchedSlots = new Set<string>();

  matchedSlots.forEach((slot) => {
    const selectors = buildFileSelectorsFromSlot(slot);
    selectors.fileIds.forEach((fileId) => fileIdsFromMatchedSlots.add(fileId));
    selectors.filepaths.forEach((filepath) => filepathsFromMatchedSlots.add(filepath));
  });

  const cascadeTargets = new Set<string>(matchedSlotIds);
  if (cascadeTargets.size === 0 && slotAliases.length > 0) {
    slotAliases.forEach((candidate) => cascadeTargets.add(candidate));
  }

  for (const slotId of cascadeTargets) {
    const result = await deps.deleteSlotCascade(slotId);
    if (result.deletedSlotIds.length > 0) {
      result.deletedSlotIds.forEach((deletedSlotId) => deletedSlotIdsSet.add(deletedSlotId));
    }
  }

  const deletedSlotIds = Array.from(deletedSlotIdsSet);
  const stillReferencedMatchedSlots = matchedSlotIds.filter(
    (slotId) => !deletedSlotIdsSet.has(slotId),
  );

  const fileIdsToCleanup = new Set<string>([...fileIdsFromMatchedSlots]);
  const filepathsToCleanup = new Set<string>([...filepathsFromMatchedSlots]);
  if (requestedAssetId && !requestedAssetId.startsWith('disk:')) {
    fileIdsToCleanup.add(requestedAssetId);
  }
  if (requestedFilepath) {
    filepathsToCleanup.add(requestedFilepath);
  }

  let modeUsed: DeleteImageStudioVariantMode = 'noop';
  if (deletedSlotIds.length > 0) {
    modeUsed = 'slot_cascade';
  }

  const deletedFileIds: string[] = [];
  const deletedFilepaths: string[] = [];

  const hasResidualSlotReferences = stillReferencedMatchedSlots.length > 0;
  if (hasResidualSlotReferences) {
    warnings.push(
      'Skipped file-only fallback to prevent orphan slot nodes. At least one matched slot could not be removed.',
    );
  }

  if (modeUsed === 'noop' && !hasResidualSlotReferences) {
    for (const fileId of Array.from(fileIdsToCleanup)) {
      const imageFile = await deps.getImageFileById(fileId);
      if (!imageFile) continue;
      const normalizedPath = normalizePublicPath(imageFile.filepath);
      if (normalizedPath) {
        await deps.deleteDiskPath(normalizedPath);
        deletedFilepaths.push(normalizedPath);
      }
      await deps.deleteImageFileById(fileId);
      deletedFileIds.push(fileId);
    }

    // disk:<path> payload fallback
    if (requestedAssetId.startsWith('disk:')) {
      const diskPath = normalizePublicPath(requestedAssetId.replace(/^disk:/, ''));
      if (diskPath) {
        const deleted = await deps.deleteDiskPath(diskPath);
        if (deleted) {
          deletedFilepaths.push(diskPath);
        }
      }
    }

    for (const filepath of Array.from(filepathsToCleanup)) {
      if (deletedFilepaths.includes(filepath)) continue;
      const deleted = await deps.deleteDiskPath(filepath);
      if (deleted) {
        deletedFilepaths.push(filepath);
      }
    }

    if (deletedFileIds.length > 0 || deletedFilepaths.length > 0) {
      modeUsed = 'asset_only';
      warnings.push('Variant file was removed without a slot cascade match.');
    }
  }

  const runOutputCleanupPairs = new Set<string>();
  deletedFileIds.forEach((fileId) => {
    runOutputCleanupPairs.add(`id:${fileId}`);
  });
  deletedFilepaths.forEach((filepath) => {
    runOutputCleanupPairs.add(`path:${filepath}`);
  });
  fileIdsToCleanup.forEach((fileId) => runOutputCleanupPairs.add(`id:${fileId}`));
  filepathsToCleanup.forEach((filepath) => runOutputCleanupPairs.add(`path:${filepath}`));

  for (const selector of Array.from(runOutputCleanupPairs)) {
    if (selector.startsWith('id:')) {
      await deps.removeRunOutputs({
        projectId,
        runId: requestedRunId || null,
        outputFileId: selector.slice(3),
      });
      continue;
    }
    if (selector.startsWith('path:')) {
      await deps.removeRunOutputs({
        projectId,
        runId: requestedRunId || null,
        outputFilepath: selector.slice(5),
      });
    }
  }

  const result: DeleteImageStudioVariantResult = {
    ok: true,
    modeUsed,
    matchedSlotIds,
    deletedSlotIds,
    deletedFileIds: Array.from(new Set(deletedFileIds)),
    deletedFilepaths: Array.from(new Set(deletedFilepaths)),
    warnings,
  };

  await emitDeleteTelemetry(
    result,
    {
      projectId,
      requestedSlotId,
      requestedAssetId,
      runId: requestedRunId,
    },
    deps,
  );

  return result;
}
