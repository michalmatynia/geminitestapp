import 'server-only';

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import sharp from 'sharp';

import {
  imageStudioRunRequestSchema,
  resolveExpectedOutputCount,
  sanitizeImageStudioProjectId,
  type ImageStudioRunRequest,
} from '@/features/ai/image-studio/server/run-executor';
import {
  createImageStudioRun,
  getImageStudioRunById,
  updateImageStudioRun,
  type ImageStudioRunRecord,
} from '@/features/ai/image-studio/server/run-repository';
import { startImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import { listImageStudioSlotLinks } from '@/features/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
  listImageStudioSlots,
  updateImageStudioSlot,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server/slot-repository';
import { supportsImageSequenceGeneration } from '@/features/ai/image-studio/utils/image-models';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  buildImageStudioSequenceSnapshot,
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
  parseImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceStep,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { getDiskPathFromPublicPath, uploadFile } from '@/features/files/server';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/features/image-slots';
import {
  enqueueImageStudioRunJob,
  startImageStudioRunQueue,
  type ImageStudioRunDispatchMode,
} from '@/features/jobs/workers/imageStudioRunQueue';
import { PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY } from '@/features/products/constants';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { getProductRepository } from '@/features/products/services/product-repository';
import { createProductStudioRunAudit } from '@/features/products/services/product-studio-audit-service';
import {
  getProductStudioConfig,
  setProductStudioProject,
  setProductStudioSourceSlot,
  type ProductStudioConfig,
} from '@/features/products/services/product-studio-config';
import { productService } from '@/features/products/services/productService';
import type { ProductWithImages } from '@/shared/contracts/products';
import {
  DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS,
  normalizeProductStudioSequenceGenerationMode,
  type ProductStudioExecutionRoute,
  type ProductStudioSequenceGenerationMode,
  type ProductStudioSequencingConfig,
  type ProductStudioSequencingDiagnostics,
  type ProductStudioSequenceReadiness,
} from '@/shared/contracts/products';
import {
  badRequestError,
  notFoundError,
  operationFailedError,
} from '@/shared/errors/app-error';

type ProductStudioVariantsResult = {
  config: ProductStudioConfig;
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  sequenceReadiness: ProductStudioSequenceReadiness;
  sequenceStepPlan: ProductStudioSequenceStepPlanEntry[];
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  projectId: string | null;
  sourceSlotId: string | null;
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
};

export type ProductStudioLinkResult = {
  config: ProductStudioConfig;
  projectId: string;
  imageSlotIndex: number;
  sourceSlot: ImageStudioSlotRecord;
};

export type ProductStudioSendResult = {
  config: ProductStudioConfig;
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  sequenceReadiness: ProductStudioSequenceReadiness;
  sequenceStepPlan: ProductStudioSequenceStepPlanEntry[];
  projectId: string;
  imageSlotIndex: number;
  sourceSlot: ImageStudioSlotRecord;
  runId: string;
  runStatus: ImageStudioRunRecord['status'] | 'cancelled';
  expectedOutputs: number;
  dispatchMode: ImageStudioRunDispatchMode;
  runKind: 'generation' | 'sequence';
  sequenceRunId: string | null;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  warnings?: string[];
};

export type ProductStudioSequencePreflightResult = {
  config: ProductStudioConfig;
  projectId: string;
  imageSlotIndex: number;
  sequenceStepPlan: ProductStudioSequenceStepPlanEntry[];
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  requestedSequenceMode: ProductStudioSequenceGenerationMode;
  resolvedSequenceMode: ProductStudioSequenceGenerationMode;
  executionRoute: ProductStudioExecutionRoute;
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  sequenceReadiness: ProductStudioSequenceReadiness;
  modelId: string;
  warnings: string[];
};

type ProductImageFileSource = {
  id: string;
  filepath: string;
  filename: string | null;
  mimetype: string | null;
};

type ProductStudioSequenceStepPlanEntry = {
  index: number;
  stepId: string;
  stepType: ImageStudioSequenceStep['type'];
  inputSource: 'previous' | 'source';
  resolvedInput: 'previous' | 'source';
  producesOutput: boolean;
};

type UpsertProductStudioSourceSlotResult = {
  sourceSlot: ImageStudioSlotRecord;
  config: ProductStudioConfig;
  sourceImageSize: {
    width: number;
    height: number;
  } | null;
  importMs: number;
  sourceSlotUpsertMs: number;
};

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

const DATA_URL_REGEX = /^data:([^;]+);base64,(.+)$/i;

type ResolvePostProductionRouteInput = {
  sequencing: ProductStudioSequencingConfig;
  requestedMode: ProductStudioSequenceGenerationMode;
  modelId: string;
};

type ResolvePostProductionRouteResult = {
  executionRoute: ProductStudioExecutionRoute;
  runKind: ProductStudioSendResult['runKind'];
  resolvedMode: ProductStudioSequenceGenerationMode;
  warnings: string[];
};

const PRODUCT_STUDIO_STRICT_SEQUENCE_MODE =
  process.env['PRODUCT_STUDIO_STRICT_SEQUENCE_MODE'] !== 'false';

const normalizeProjectId = (
  value: string | null | undefined,
): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = sanitizeImageStudioProjectId(value);
  return normalized.length > 0 ? normalized : null;
};

const normalizeImageSlotIndex = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw badRequestError('Image slot index must be a number.');
  }
  const normalized = Math.floor(value);
  if (normalized < 0 || normalized >= DEFAULT_IMAGE_SLOT_COUNT) {
    throw badRequestError(
      `Image slot index must be between 0 and ${DEFAULT_IMAGE_SLOT_COUNT - 1}.`,
    );
  }
  return normalized;
};

const trimString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const hasPersistedSettingValue = (
  value: unknown,
): value is string => typeof value === 'string' && value.trim().length > 0;

const buildSequencingDiagnostics = (params: {
  projectId: string;
  projectSettingsKey: string | null;
  projectSettingsRaw: unknown;
  globalSettingsRaw: unknown;
  selectedSettings: ImageStudioSettings;
}): ProductStudioSequencingDiagnostics => {
  const projectSettingsRaw = hasPersistedSettingValue(params.projectSettingsRaw)
    ? params.projectSettingsRaw
    : null;
  const globalSettingsRaw = hasPersistedSettingValue(params.globalSettingsRaw)
    ? params.globalSettingsRaw
    : null;
  const hasProjectSettings = projectSettingsRaw !== null;
  const hasGlobalSettings = globalSettingsRaw !== null;
  const selectedScope = hasProjectSettings ? 'project' : 'default';
  const selectedSettingsKey = params.projectSettingsKey;
  const projectSettings = projectSettingsRaw
    ? parseImageStudioSettings(projectSettingsRaw)
    : null;
  const globalSettings = globalSettingsRaw
    ? parseImageStudioSettings(globalSettingsRaw)
    : null;

  return {
    projectId: trimString(params.projectId),
    projectSettingsKey: params.projectSettingsKey,
    selectedSettingsKey,
    selectedScope,
    hasProjectSettings,
    hasGlobalSettings,
    projectSequencingEnabled: Boolean(projectSettings?.projectSequencing.enabled),
    globalSequencingEnabled: Boolean(globalSettings?.projectSequencing.enabled),
    selectedSequencingEnabled: Boolean(
      params.selectedSettings.projectSequencing.enabled,
    ),
    selectedSnapshotHash: trimString(
      params.selectedSettings.projectSequencing.snapshotHash,
    ),
    selectedSnapshotSavedAt: trimString(
      params.selectedSettings.projectSequencing.snapshotSavedAt,
    ),
    selectedSnapshotStepCount: Number.isFinite(
      params.selectedSettings.projectSequencing.snapshotStepCount,
    )
      ? Math.max(
        0,
        Math.floor(params.selectedSettings.projectSequencing.snapshotStepCount),
      )
      : 0,
    selectedSnapshotModelId: trimString(
      params.selectedSettings.projectSequencing.snapshotModelId,
    ),
  };
};

const sanitizeSkuSegment = (value: string | null): string | null => {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : null;
};

const resolvePostProductionRoute = (
  input: ResolvePostProductionRouteInput,
): ResolvePostProductionRouteResult => {
  const warnings: string[] = [];
  const modelSupportsFullSequence = supportsImageSequenceGeneration(input.modelId);
  const sequencerEnabled = input.sequencing.enabled && input.sequencing.runViaSequence;
  const hasConfiguredSequenceSteps = input.sequencing.sequenceStepCount > 0;

  if (input.requestedMode === 'studio_prompt_then_sequence') {
    return {
      executionRoute: 'studio_sequencer',
      runKind: 'sequence',
      resolvedMode: 'studio_prompt_then_sequence',
      warnings,
    };
  }

  if (input.requestedMode === 'studio_native_sequencer_prior_generation') {
    return {
      executionRoute: 'studio_native_sequencer_prior_generation',
      runKind: 'sequence',
      resolvedMode: 'studio_native_sequencer_prior_generation',
      warnings,
    };
  }

  if (sequencerEnabled && PRODUCT_STUDIO_STRICT_SEQUENCE_MODE) {
    if (input.requestedMode === 'model_full_sequence') {
      warnings.push(
        'Project sequencing is enabled, so Product Studio runs the Image Studio sequence exactly as configured.',
      );
    }
    return {
      executionRoute: 'studio_sequencer',
      runKind: 'sequence',
      resolvedMode: 'studio_prompt_then_sequence',
      warnings,
    };
  }

  if (!sequencerEnabled) {
    if (input.requestedMode === 'model_full_sequence') {
      if (modelSupportsFullSequence) {
        return {
          executionRoute: 'ai_model_full_sequence',
          runKind: 'generation',
          resolvedMode: 'model_full_sequence',
          warnings,
        };
      }
      if (hasConfiguredSequenceSteps) {
        warnings.push(
          `Model "${input.modelId || 'selected model'}" does not support full-sequence generation and persisted project sequencing is disabled, so Product Studio will run direct generation only.`,
        );
      }
      return {
        executionRoute: 'ai_direct_generation',
        runKind: 'generation',
        resolvedMode: 'model_full_sequence',
        warnings,
      };
    }

    if (input.requestedMode === 'auto' && modelSupportsFullSequence) {
      return {
        executionRoute: 'ai_model_full_sequence',
        runKind: 'generation',
        resolvedMode: 'model_full_sequence',
        warnings,
      };
    }

    if (hasConfiguredSequenceSteps) {
      warnings.push(
        'Persisted project sequencing is disabled, so Product Studio cannot run project sequence steps until Image Studio Sequencing defaults are saved.',
      );
    }

    return {
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      resolvedMode: input.requestedMode === 'auto' ? 'studio_prompt_then_sequence' : input.requestedMode,
      warnings,
    };
  }

  if (input.requestedMode === 'model_full_sequence') {
    if (modelSupportsFullSequence) {
      return {
        executionRoute: 'ai_model_full_sequence',
        runKind: 'generation',
        resolvedMode: 'model_full_sequence',
        warnings,
      };
    }
    const modelLabel = input.modelId || 'selected model';
    warnings.push(
      `Model "${modelLabel}" does not support full-sequence generation. Falling back to native Image Studio sequencer with prior generation.`,
    );
    return {
      executionRoute: 'studio_native_sequencer_prior_generation',
      runKind: 'sequence',
      resolvedMode: 'studio_native_sequencer_prior_generation',
      warnings,
    };
  }

  if (modelSupportsFullSequence) {
    return {
      executionRoute: 'ai_model_full_sequence',
      runKind: 'generation',
      resolvedMode: 'model_full_sequence',
      warnings,
    };
  }

  return {
    executionRoute: 'studio_native_sequencer_prior_generation',
    runKind: 'sequence',
    resolvedMode: 'studio_native_sequencer_prior_generation',
    warnings,
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const toProductImageFileSource = (
  value: unknown,
): ProductImageFileSource | null => {
  const record = asRecord(value);
  if (!record) return null;

  const id = trimString(record['id']);
  const filepath = trimString(record['filepath']);
  if (!id || !filepath) return null;

  return {
    id,
    filepath,
    filename: trimString(record['filename']),
    mimetype: trimString(record['mimetype']),
  };
};

const pickProductName = (product: ProductWithImages): string => {
  return (
    product.name_en?.trim() ||
    product.name_pl?.trim() ||
    product.name_de?.trim() ||
    product.sku?.trim() ||
    product.id
  );
};

const buildGenerationPrompt = (product: ProductWithImages): string => {
  const productName = pickProductName(product);
  return `Create a high-quality e-commerce studio image for "${productName}". Keep the exact product identity, shape, color, texture, and branding. Use clean neutral lighting and background. No text or watermark.`;
};

const buildModelNativeSequencePrompt = (params: {
  basePrompt: string;
  sequenceStepTypes: string[];
}): string => {
  if (params.sequenceStepTypes.length === 0) {
    return params.basePrompt;
  }
  const sequencePlan = params.sequenceStepTypes
    .map((stepType, index) => `${index + 1}. ${stepType}`)
    .join('\n');
  return `${params.basePrompt}

Apply this sequence plan in one model-native pass:
${sequencePlan}

Return only the final post-produced image output.`;
};

const validateProductStudioSequenceSteps = (
  inputSteps: ImageStudioSequenceStep[],
): void => {
  const errors: string[] = [];
  if (inputSteps.length === 0) {
    errors.push('No enabled sequence steps are available for execution.');
  } else if (inputSteps.length > 20) {
    errors.push(
      `Project sequence has ${inputSteps.length} enabled steps. Product Studio supports up to 20 enabled sequence steps.`,
    );
  }

  const seenStepIds = new Set<string>();
  for (const step of inputSteps) {
    const stepId = trimString(step.id);
    if (!stepId) {
      errors.push(`Sequence step "${step.type}" is missing a valid step id.`);
    } else if (seenStepIds.has(stepId)) {
      errors.push(`Sequence step id "${stepId}" is duplicated. Use unique step ids.`);
    } else {
      seenStepIds.add(stepId);
    }

    if (step.runtime !== 'server') {
      errors.push(
        `Step "${step.id}" (${step.type}) is configured for "${step.runtime}" runtime. Product Studio executes project sequences on server runtime only.`,
      );
    }

    if (step.type !== 'crop_center') continue;
    if (step.config.kind !== 'selected_shape') continue;
    const hasBbox = Boolean(step.config.bbox);
    const hasPolygon =
      Array.isArray(step.config.polygon) && step.config.polygon.length >= 3;
    if (hasBbox || hasPolygon) continue;
    const selectedShapeId = trimString(step.config.selectedShapeId);
    errors.push(
      selectedShapeId
        ? `Sequence step "${step.id}" uses selected shape "${selectedShapeId}" but no crop geometry snapshot was saved. Open Image Studio for this project, re-select the shape in the sequence step, save project, and retry.`
        : `Sequence step "${step.id}" uses selected shape crop but has no selected shape. Configure the shape in Image Studio and retry.`,
    );
  }

  if (errors.length > 0) {
    throw badRequestError(errors[0] ?? 'Sequence preflight validation failed.', {
      errors,
    });
  }
};

const stepProducesRenderableOutput = (
  step: ImageStudioSequenceStep,
): boolean => {
  if (step.type === 'mask') {
    return Boolean(step.config.persistMaskSlot);
  }
  return (
    step.type === 'crop_center' ||
    step.type === 'generate' ||
    step.type === 'regenerate' ||
    step.type === 'upscale'
  );
};

const buildProductStudioSequenceStepPlan = (
  steps: ImageStudioSequenceStep[],
): ProductStudioSequenceStepPlanEntry[] => {
  let hasProducedOutput = false;
  return steps.map((step, index) => {
    const inputSource = step.inputSource === 'source' ? 'source' : 'previous';
    const resolvedInput =
      inputSource === 'source' || hasProducedOutput ? inputSource : 'source';
    const producesOutput = stepProducesRenderableOutput(step);
    if (producesOutput) {
      hasProducedOutput = true;
    }
    return {
      index,
      stepId: step.id,
      stepType: step.type,
      inputSource,
      resolvedInput,
      producesOutput,
    };
  });
};

const buildSequenceStepPlanWarnings = (
  plan: ProductStudioSequenceStepPlanEntry[],
): string[] =>
  plan
    .filter(
      (entry) =>
        entry.index > 0 &&
        entry.inputSource === 'previous' &&
        entry.resolvedInput === 'source',
    )
    .map(
      (entry) =>
        `Step ${entry.index + 1} (${entry.stepType}) is set to use previous output, but no prior step output exists yet. It will run on the source image.`,
    );

const buildSettingsSnapshotHash = (settings: Record<string, unknown>): string => {
  const payload = JSON.stringify(settings);
  return createHash('sha1').update(payload).digest('hex').slice(0, 20);
};

const isSequenceExecutionRoute = (
  route: ProductStudioExecutionRoute,
): boolean =>
  route === 'studio_sequencer' ||
  route === 'studio_native_sequencer_prior_generation';

const doesRequestedModeRequireProjectSequence = (
  mode: ProductStudioSequenceGenerationMode,
): boolean =>
  mode === 'studio_prompt_then_sequence' ||
  mode === 'studio_native_sequencer_prior_generation';

const resolveSequenceReadiness = (params: {
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  requestedMode: ProductStudioSequenceGenerationMode;
  route: ProductStudioExecutionRoute;
}): ProductStudioSequenceReadiness => {
  const projectSettingsKey =
    params.sequencingDiagnostics.projectSettingsKey ?? 'project settings key';

  const requiresSequence =
    doesRequestedModeRequireProjectSequence(params.requestedMode) ||
    isSequenceExecutionRoute(params.route);
  if (!requiresSequence) {
    return {
      ...DEFAULT_PRODUCT_STUDIO_SEQUENCE_READINESS,
      requiresProjectSequence: false,
    };
  }

  if (
    params.sequencingDiagnostics.selectedScope === 'project' &&
    !params.sequencing.persistedEnabled &&
    params.sequencingDiagnostics.globalSequencingEnabled
  ) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_sequence_disabled',
      message: `Project sequencing is disabled in "${projectSettingsKey}" while global sequencing is enabled. Product Studio always uses project-scoped settings. Enable Sequencing and click "Save Project" in this project.`,
    };
  }

  if (!params.sequencing.persistedEnabled) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_sequence_disabled',
      message:
        'Image Studio project sequencing is disabled in persisted project settings. Enable Sequencing and click "Save Project" in Image Studio.',
    };
  }

  if (params.sequencing.sequenceStepCount <= 0) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_steps_empty',
      message:
        'Image Studio project sequencing has no enabled steps. Configure at least one enabled step and click "Save Project".',
    };
  }

  if (!params.sequencing.runViaSequence || params.sequencing.needsSaveDefaults) {
    return {
      ready: false,
      requiresProjectSequence: true,
      state: 'project_snapshot_stale',
      message:
        params.sequencing.needsSaveDefaultsReason ??
        'Image Studio sequence configuration changed and is not saved. Click "Save Project" in Image Studio.',
    };
  }

  return {
    ready: true,
    requiresProjectSequence: true,
    state: 'ready',
    message: null,
  };
};

const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

const resolveFirstSequenceCropRect = (
  steps: ImageStudioSequenceStep[],
): { x: number; y: number; width: number; height: number } | null => {
  for (const step of steps) {
    if (step.type !== 'crop_center') continue;
    if (step.config.kind !== 'selected_shape') continue;
    if (step.config.bbox) {
      return {
        x: clamp01(step.config.bbox.x),
        y: clamp01(step.config.bbox.y),
        width: clamp01(step.config.bbox.width),
        height: clamp01(step.config.bbox.height),
      };
    }

    if (Array.isArray(step.config.polygon) && step.config.polygon.length >= 3) {
      const xs = step.config.polygon.map((point) => clamp01(point.x));
      const ys = step.config.polygon.map((point) => clamp01(point.y));
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(0, maxX - minX),
        height: Math.max(0, maxY - minY),
      };
    }
  }

  return null;
};

const ensureProduct = async (productId: string): Promise<ProductWithImages> => {
  const normalizedId = trimString(productId);
  if (!normalizedId) {
    throw badRequestError('Product id is required.');
  }

  const product = await productService.getProductById(normalizedId);
  if (!product) {
    throw notFoundError('Product not found', { productId: normalizedId });
  }
  return product;
};

const parseDataUrlToBuffer = (
  value: string,
): { buffer: Buffer; mime: string | null } | null => {
  const match = value.match(DATA_URL_REGEX);
  if (!match) return null;
  try {
    return {
      mime: match[1] ?? null,
      buffer: Buffer.from(match[2] ?? '', 'base64'),
    };
  } catch {
    return null;
  }
};

const resolveBufferFromImagePath = async (
  filepath: string,
): Promise<{ buffer: Buffer; mime: string | null }> => {
  const normalized = filepath.trim();
  if (!normalized) {
    throw badRequestError('Source product image path is empty.');
  }

  if (normalized.startsWith('data:')) {
    const parsed = parseDataUrlToBuffer(normalized);
    if (!parsed) {
      throw badRequestError('Invalid data URL in source product image.');
    }
    return parsed;
  }

  if (/^https?:\/\//i.test(normalized)) {
    const response = await fetch(normalized);
    if (!response.ok) {
      throw operationFailedError('Failed to fetch source product image.', {
        filepath: normalized,
        status: response.status,
      });
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      mime: response.headers.get('content-type'),
    };
  }

  const normalizedPublicPath = normalized.startsWith('/')
    ? normalized
    : `/${normalized.replace(/^\/+/, '')}`;
  const diskPath = getDiskPathFromPublicPath(normalizedPublicPath);
  const buffer = await fs.readFile(diskPath);
  return {
    buffer,
    mime: null,
  };
};

const resolveMimeType = (params: {
  preferredMime: string | null;
  fallbackMime: string | null;
  filename: string;
}): string => {
  const preferred = trimString(params.preferredMime);
  if (preferred) return preferred;
  const fallback = trimString(params.fallbackMime);
  if (fallback) return fallback;

  const dotIndex = params.filename.lastIndexOf('.');
  const extension =
    dotIndex >= 0 ? params.filename.slice(dotIndex).toLowerCase() : '';
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
};

const clampUpscaleScale = (value: number): number =>
  Number(Math.max(1.1, Math.min(8, value)).toFixed(2));

const appendFilenameSuffix = (
  filename: string,
  suffix: string,
  extOverride?: string,
): string => {
  const parsed = path.parse(filename);
  const extension = extOverride ?? (parsed.ext || '');
  const basename = parsed.name || 'image';
  return `${basename}${suffix}${extension}`;
};

const buildUpscaledImage = async (
  sourceBuffer: Buffer,
  scaleInput: number,
): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  scale: number;
}> => {
  const metadata = await sharp(sourceBuffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!(width > 0 && height > 0)) {
    throw badRequestError(
      'Accepted variant has invalid dimensions for upscaling.',
    );
  }

  const scale = clampUpscaleScale(scaleInput);
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const buffer = await sharp(sourceBuffer)
    .resize({
      width: targetWidth,
      height: targetHeight,
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .png()
    .toBuffer();

  return {
    buffer,
    width: targetWidth,
    height: targetHeight,
    scale,
  };
};

const importSourceProductImageToStudio = async (params: {
  imageFile: ProductImageFileSource;
  productId: string;
  projectId: string;
  imageSlotIndex: number;
  rotateBeforeSendDeg: 90 | null;
  productFolderSegment: string;
}): Promise<{
  id: string;
  filepath: string;
  filename: string;
  mimetype: string;
  width: number | null;
  height: number | null;
}> => {
  const sourceImage = params.imageFile;
  const sourcePath = trimString(sourceImage.filepath);
  if (!sourcePath) {
    throw badRequestError('Selected product image has no filepath.');
  }

  const sourceFilename =
    trimString(sourceImage.filename) ??
    `product-image-${params.imageSlotIndex + 1}.png`;
  const sourceMime = trimString(sourceImage.mimetype);
  const { buffer, mime } = await resolveBufferFromImagePath(sourcePath);
  const mimeType = resolveMimeType({
    preferredMime: sourceMime,
    fallbackMime: mime,
    filename: sourceFilename,
  });

  let uploadBuffer = buffer;
  let uploadMimeType = mimeType;
  let uploadFilename = sourceFilename;

  if (params.rotateBeforeSendDeg === 90) {
    uploadBuffer = await sharp(uploadBuffer).rotate(90).toBuffer();
    uploadFilename = appendFilenameSuffix(
      uploadFilename,
      '-rot90',
    );
  }

  const uploadMetadata = await sharp(uploadBuffer).metadata();
  const uploadWidth =
    typeof uploadMetadata.width === 'number' && Number.isFinite(uploadMetadata.width)
      ? Math.max(1, Math.floor(uploadMetadata.width))
      : null;
  const uploadHeight =
    typeof uploadMetadata.height === 'number' && Number.isFinite(uploadMetadata.height)
      ? Math.max(1, Math.floor(uploadMetadata.height))
      : null;

  const bytes = new Uint8Array(uploadBuffer);
  const file = new File([bytes], uploadFilename, { type: uploadMimeType });
  const uploaded = await uploadFile(file, {
    category: 'studio',
    projectId: params.projectId,
    folder: `products/${params.productFolderSegment}`,
    filenameOverride: uploadFilename,
  });

  return {
    id: uploaded.id,
    filepath: uploaded.filepath,
    filename: uploaded.filename,
    mimetype: uploaded.mimetype,
    width: uploadWidth,
    height: uploadHeight,
  };
};

const createUpscaledAcceptedProductImage = async (params: {
  generationSlot: ImageStudioSlotRecord;
  product: ProductWithImages;
  imageSlotIndex: number;
  sequencing: ProductStudioSequencingConfig;
}): Promise<{ imageFileId: string; filepath: string; scale: number }> => {
  const sourcePath =
    trimString(params.generationSlot.imageFile?.filepath) ??
    trimString(params.generationSlot.imageUrl);
  if (!sourcePath) {
    throw badRequestError(
      'Selected generation card has no image path to upscale.',
    );
  }

  const sourceFilename =
    trimString(params.generationSlot.imageFile?.filename) ??
    trimString(params.generationSlot.name) ??
    `product-${params.product.id}-slot-${params.imageSlotIndex + 1}`;

  const { buffer } = await resolveBufferFromImagePath(sourcePath);
  const upscaled = await buildUpscaledImage(
    buffer,
    params.sequencing.upscaleScale,
  );
  const scaleLabel = `${upscaled.scale.toFixed(2).replace(/\.00$/, '')}x`;
  const targetFilename = appendFilenameSuffix(
    sourceFilename,
    `-upscaled-${scaleLabel}`,
    '.png',
  );

  const file = new File([new Uint8Array(upscaled.buffer)], targetFilename, {
    type: 'image/png',
  });
  const uploaded = await uploadFile(file, {
    category: 'products',
    sku: params.product.sku?.trim() ?? undefined,
    filenameOverride: targetFilename,
  });

  return {
    imageFileId: uploaded.id,
    filepath: uploaded.filepath,
    scale: upscaled.scale,
  };
};

const resolveSequencingFromStudioSettings = (
  studioSettings: ImageStudioSettings,
): ProductStudioSequencingConfig => {
  const sequenceConfig = studioSettings.projectSequencing;
  const activeSteps = resolveImageStudioSequenceActiveSteps(
    sequenceConfig,
  ).filter((step) => step.enabled);
  const persistedEnabled = Boolean(sequenceConfig.enabled);
  const enabled = persistedEnabled && activeSteps.length > 0;
  const firstUpscaleStep = activeSteps.find((step) => step.type === 'upscale');
  const firstGenerateStep = activeSteps.find(
    (step) => step.type === 'generate' || step.type === 'regenerate',
  );
  const currentSnapshot = buildImageStudioSequenceSnapshot(studioSettings);
  const savedSnapshotHash = trimString(sequenceConfig.snapshotHash);
  const savedSnapshotSavedAt = trimString(sequenceConfig.snapshotSavedAt);
  const savedSnapshotModelId = trimString(sequenceConfig.snapshotModelId);
  const savedSnapshotStepCount = Number.isFinite(sequenceConfig.snapshotStepCount)
    ? Math.max(0, Math.floor(sequenceConfig.snapshotStepCount))
    : 0;
  const snapshotMatchesCurrent =
    enabled &&
    Boolean(savedSnapshotHash) &&
    savedSnapshotHash === currentSnapshot.hash &&
    savedSnapshotStepCount === currentSnapshot.stepCount &&
    (savedSnapshotModelId ?? null) === (currentSnapshot.modelId ?? null);
  const needsSaveDefaults = enabled && !snapshotMatchesCurrent;
  const needsSaveDefaultsReason = !needsSaveDefaults
    ? null
    : !savedSnapshotHash
      ? 'Project sequence snapshot is not saved yet. In Image Studio click "Save Project".'
      : 'Project sequence snapshot is out of date. In Image Studio click "Save Project" to persist the exact stack and crop geometry.';
  const expectedOutputs =
    firstGenerateStep?.type === 'generate' ||
    firstGenerateStep?.type === 'regenerate'
      ? (firstGenerateStep.config.outputCount ??
        studioSettings.targetAi.openai.image.n ??
        1)
      : (studioSettings.targetAi.openai.image.n ?? 1);
  return {
    persistedEnabled,
    enabled,
    cropCenterBeforeGeneration:
      enabled && activeSteps.some((step) => step.type === 'crop_center'),
    upscaleOnAccept:
      enabled && activeSteps.some((step) => step.type === 'upscale'),
    upscaleScale: clampUpscaleScale(
      firstUpscaleStep?.type === 'upscale'
        ? firstUpscaleStep.config.scale
        : sequenceConfig.upscaleScale,
    ),
    runViaSequence: enabled && !needsSaveDefaults,
    sequenceStepCount: activeSteps.length,
    expectedOutputs: Math.max(
      1,
      Math.min(10, Math.floor(expectedOutputs || 1)),
    ),
    snapshotHash: savedSnapshotHash,
    snapshotSavedAt: savedSnapshotSavedAt,
    snapshotStepCount: savedSnapshotStepCount,
    snapshotModelId: savedSnapshotModelId,
    currentSnapshotHash: currentSnapshot.hash,
    snapshotMatchesCurrent,
    needsSaveDefaults,
    needsSaveDefaultsReason,
  };
};

const resolveStudioSettingsBundle = async (
  projectId: string,
): Promise<{
  parsedStudioSettings: ImageStudioSettings;
  studioSettings: Record<string, unknown>;
  sequencing: ProductStudioSequencingConfig;
  sequencingDiagnostics: ProductStudioSequencingDiagnostics;
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
  modelId: string;
}> => {
  const projectSettingsKey = getImageStudioProjectSettingsKey(projectId);
  if (!projectSettingsKey) {
    throw badRequestError('Invalid Image Studio project id for settings lookup.');
  }

  const [projectSettingsRaw, globalSettingsRaw, sequenceGenerationModeRaw] = await Promise.all([
    getSettingValue(projectSettingsKey),
    getSettingValue(IMAGE_STUDIO_SETTINGS_KEY),
    getSettingValue(PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY),
  ]);

  const parsedSettings = hasPersistedSettingValue(projectSettingsRaw)
    ? parseImageStudioSettings(projectSettingsRaw)
    : defaultImageStudioSettings;
  const sequencingDiagnostics = buildSequencingDiagnostics({
    projectId,
    projectSettingsKey,
    projectSettingsRaw,
    globalSettingsRaw,
    selectedSettings: parsedSettings,
  });
  const sequenceGenerationMode = normalizeProductStudioSequenceGenerationMode(
    sequenceGenerationModeRaw,
  );
  const modelId = trimString(parsedSettings.targetAi.openai.model) ?? '';
  return {
    parsedStudioSettings: parsedSettings,
    studioSettings: parsedSettings as unknown as Record<string, unknown>,
    sequencing: resolveSequencingFromStudioSettings(parsedSettings),
    sequencingDiagnostics,
    sequenceGenerationMode,
    modelId,
  };
};

const resolveProductStudioSequencePreflight = async (params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  sequenceGenerationMode?: ProductStudioSequenceGenerationMode | null | undefined;
}): Promise<ProductStudioSequencePreflightResult> => {
  const resolved = await resolveProductAndStudioTarget(params);
  const {
    parsedStudioSettings,
    sequencing,
    sequencingDiagnostics,
    sequenceGenerationMode,
    modelId,
  } = await resolveStudioSettingsBundle(resolved.projectId);
  const activeSequenceSteps = resolveImageStudioSequenceActiveSteps(
    parsedStudioSettings.projectSequencing,
  ).filter((step) => step.enabled);
  const sequenceStepPlan = buildProductStudioSequenceStepPlan(activeSequenceSteps);
  const requestedSequenceMode = normalizeProductStudioSequenceGenerationMode(
    params.sequenceGenerationMode ?? sequenceGenerationMode,
  );
  const routeDecision = resolvePostProductionRoute({
    sequencing,
    requestedMode: requestedSequenceMode,
    modelId,
  });
  const warnings = [
    ...routeDecision.warnings,
    ...buildSequenceStepPlanWarnings(sequenceStepPlan),
  ];
  const sequenceReadiness = resolveSequenceReadiness({
    sequencing,
    sequencingDiagnostics,
    requestedMode: requestedSequenceMode,
    route: routeDecision.executionRoute,
  });
  return {
    config: resolved.config,
    projectId: resolved.projectId,
    imageSlotIndex: resolved.imageSlotIndex,
    sequenceStepPlan,
    sequenceGenerationMode,
    requestedSequenceMode,
    resolvedSequenceMode: routeDecision.resolvedMode,
    executionRoute: routeDecision.executionRoute,
    sequencing,
    sequencingDiagnostics,
    sequenceReadiness,
    modelId,
    warnings,
  };
};

const buildSourceSlotMetadata = (params: {
  productId: string;
  imageSlotIndex: number;
  sourceImageFileId: string;
  rotateBeforeSendDeg: 90 | null;
}): Record<string, unknown> => ({
  role: 'import',
  source: 'product-studio',
  productId: params.productId,
  imageSlotIndex: params.imageSlotIndex,
  productImageFileId: params.sourceImageFileId,
  rotateBeforeSendDeg: params.rotateBeforeSendDeg,
  updatedAt: new Date().toISOString(),
});

const resolveSourceSlotIdForIndex = (
  config: ProductStudioConfig,
  imageSlotIndex: number,
): string | null => {
  return trimString(config.sourceSlotByImageIndex[String(imageSlotIndex)]);
};

const sortSlotsNewestFirst = (
  input: ImageStudioSlotRecord[],
): ImageStudioSlotRecord[] => {
  return [...input].sort((a, b) => {
    const bTime = Date.parse(b.updatedAt ?? b.createdAt ?? '') || 0;
    const aTime = Date.parse(a.updatedAt ?? a.createdAt ?? '') || 0;
    return bTime - aTime;
  });
};

const resolveGenerationVariants = async (params: {
  projectId: string;
  sourceSlotIds: string[];
}): Promise<{
  sourceSlot: ImageStudioSlotRecord | null;
  variants: ImageStudioSlotRecord[];
}> => {
  const [slots, links] = await Promise.all([
    listImageStudioSlots(params.projectId),
    listImageStudioSlotLinks(params.projectId),
  ]);

  const slotById = new Map<string, ImageStudioSlotRecord>(
    slots.map((slot: ImageStudioSlotRecord) => [slot.id, slot]),
  );

  const sourceSlotId = params.sourceSlotIds.find((id) => slotById.has(id)) ?? null;
  const sourceSlot = sourceSlotId ? slotById.get(sourceSlotId) ?? null : null;
  if (!sourceSlotId) {
    return {
      sourceSlot: null,
      variants: [],
    };
  }

  const linkAdjacency = new Map<string, string[]>();
  links.forEach((link) => {
    const relationType = trimString(link.relationType)?.toLowerCase() ?? '';
    const isOutputRelation =
      relationType.includes('output') ||
      relationType.startsWith('sequence:step:') ||
      relationType.startsWith('generation:output:');
    if (!isOutputRelation) return;
    const sourceId = trimString(link.sourceSlotId);
    const targetId = trimString(link.targetSlotId);
    if (!sourceId || !targetId) return;
    const bucket = linkAdjacency.get(sourceId) ?? [];
    if (!bucket.includes(targetId)) {
      bucket.push(targetId);
      linkAdjacency.set(sourceId, bucket);
    }
  });

  const descendantSlotIds = new Set<string>();
  const visited = new Set<string>([sourceSlotId]);
  const queue: string[] = [sourceSlotId];
  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;
    const targets = linkAdjacency.get(current) ?? [];
    targets.forEach((targetId) => {
      if (visited.has(targetId)) return;
      visited.add(targetId);
      descendantSlotIds.add(targetId);
      queue.push(targetId);
    });
  }

  const linkedVariants = Array.from(descendantSlotIds)
    .map((slotId) => slotById.get(slotId) ?? null)
    .filter((slot): slot is ImageStudioSlotRecord => Boolean(slot));

  const metadataVariants = slots.filter((slot) => {
    if (slot.id === sourceSlotId) return false;
    const metadata = asRecord(slot.metadata);
    if (!metadata) return false;

    const role = trimString(metadata['role']);
    if (role !== 'generation') return false;

    const directSourceSlotId = trimString(metadata['sourceSlotId']);
    if (directSourceSlotId === sourceSlotId) return true;

    const sourceSlotIdsRaw = metadata['sourceSlotIds'];
    if (!Array.isArray(sourceSlotIdsRaw)) return false;

    return sourceSlotIdsRaw.some(
      (value: unknown): boolean => trimString(value) === sourceSlotId,
    );
  });

  const dedupedById = new Map<string, ImageStudioSlotRecord>();
  [...linkedVariants, ...metadataVariants].forEach((slot) => {
    dedupedById.set(slot.id, slot);
  });

  return {
    sourceSlot,
    variants: sortSlotsNewestFirst(Array.from(dedupedById.values())),
  };
};

const resolveProductAndStudioTarget = async (params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
}): Promise<{
  product: ProductWithImages;
  imageSlotIndex: number;
  config: ProductStudioConfig;
  projectId: string;
}> => {
  const imageSlotIndex = normalizeImageSlotIndex(params.imageSlotIndex);
  const product = await ensureProduct(params.productId);
  const overrideProjectId = normalizeProjectId(params.projectId);

  const existingConfig = await getProductStudioConfig(product.id);
  const existingProjectId = normalizeProjectId(existingConfig.projectId);
  const config =
    overrideProjectId !== null && overrideProjectId !== existingProjectId
      ? await setProductStudioProject(product.id, overrideProjectId)
      : existingConfig;

  const projectId = normalizeProjectId(config.projectId);
  if (!projectId) {
    throw badRequestError(
      'Image Studio project is not selected for this product.',
    );
  }

  return {
    product,
    imageSlotIndex,
    config,
    projectId,
  };
};

const upsertProductStudioSourceSlot = async (params: {
  product: ProductWithImages;
  projectId: string;
  imageSlotIndex: number;
  sourceImage: ProductImageFileSource;
  rotateBeforeSendDeg: 90 | null;
  productFolderSegment: string;
}): Promise<UpsertProductStudioSourceSlotResult> => {
  const importStartedAt = Date.now();
  const imported = await importSourceProductImageToStudio({
    imageFile: params.sourceImage,
    imageSlotIndex: params.imageSlotIndex,
    productId: params.product.id,
    projectId: params.projectId,
    rotateBeforeSendDeg: params.rotateBeforeSendDeg,
    productFolderSegment: params.productFolderSegment,
  });
  const importMs = Date.now() - importStartedAt;

  const slotName = `${pickProductName(params.product)} • Slot ${params.imageSlotIndex + 1}`;
  const folderPath = `products/${params.productFolderSegment}`;

  const sourceSlotUpsertStartedAt = Date.now();
  const created = await createImageStudioSlots(params.projectId, [
    {
      name: slotName,
      folderPath,
      imageFileId: imported.id,
      imageUrl: imported.filepath,
      imageBase64: null,
      metadata: buildSourceSlotMetadata({
        productId: params.product.id,
        imageSlotIndex: params.imageSlotIndex,
        sourceImageFileId: params.sourceImage.id,
        rotateBeforeSendDeg: params.rotateBeforeSendDeg,
      }),
    },
  ]);
  const sourceSlot = created[0] ?? null;

  if (!sourceSlot) {
    throw operationFailedError(
      'Failed to create or update the Studio source card.',
    );
  }

  const config = await setProductStudioSourceSlot(
    params.product.id,
    params.imageSlotIndex,
    sourceSlot.id,
  );
  const sourceSlotUpsertMs = Date.now() - sourceSlotUpsertStartedAt;
  const sourceImageSize =
    imported.width && imported.height
      ? { width: imported.width, height: imported.height }
      : null;

  return {
    sourceSlot,
    config,
    sourceImageSize,
    importMs,
    sourceSlotUpsertMs,
  };
};

export async function getProductStudioVariants(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
}): Promise<ProductStudioVariantsResult> {
  const preflight = await resolveProductStudioSequencePreflight({
    productId: params.productId,
    imageSlotIndex: params.imageSlotIndex,
    projectId: params.projectId,
  });
  const sourceSlotId = resolveSourceSlotIdForIndex(
    preflight.config,
    preflight.imageSlotIndex,
  );
  const sourceSlotHistory = Array.isArray(
    preflight.config.sourceSlotHistoryByImageIndex[String(preflight.imageSlotIndex)],
  )
    ? preflight.config.sourceSlotHistoryByImageIndex[String(preflight.imageSlotIndex)] ?? []
    : [];
  const sourceSlotCandidates = Array.from(
    new Set<string>(
      [sourceSlotId, ...sourceSlotHistory]
        .filter((value): value is string => typeof value === 'string')
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

  if (sourceSlotCandidates.length === 0) {
    return {
      config: preflight.config,
      sequencing: preflight.sequencing,
      sequencingDiagnostics: preflight.sequencingDiagnostics,
      sequenceReadiness: preflight.sequenceReadiness,
      sequenceStepPlan: preflight.sequenceStepPlan,
      sequenceGenerationMode: preflight.sequenceGenerationMode,
      projectId: preflight.projectId,
      sourceSlotId: null,
      sourceSlot: null,
      variants: [],
    };
  }

  const { sourceSlot, variants } = await resolveGenerationVariants({
    projectId: preflight.projectId,
    sourceSlotIds: sourceSlotCandidates,
  });

  return {
    config: preflight.config,
    sequencing: preflight.sequencing,
    sequencingDiagnostics: preflight.sequencingDiagnostics,
    sequenceReadiness: preflight.sequenceReadiness,
    sequenceStepPlan: preflight.sequenceStepPlan,
    sequenceGenerationMode: preflight.sequenceGenerationMode,
    projectId: preflight.projectId,
    sourceSlotId: sourceSlot?.id ?? sourceSlotCandidates[0] ?? null,
    sourceSlot,
    variants,
  };
}

export async function getProductStudioSequencePreflight(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  sequenceGenerationMode?: ProductStudioSequenceGenerationMode | null | undefined;
}): Promise<ProductStudioSequencePreflightResult> {
  return await resolveProductStudioSequencePreflight(params);
}

export async function linkProductImageToStudio(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  rotateBeforeSendDeg?: 90 | null | undefined;
}): Promise<ProductStudioLinkResult> {
  const resolved = await resolveProductAndStudioTarget(params);
  const sourceImage = toProductImageFileSource(
    resolved.product.images[resolved.imageSlotIndex]?.imageFile,
  );
  const skuFolderSegment =
    sanitizeSkuSegment(trimString(resolved.product.sku)) ??
    sanitizeSkuSegment(trimString(resolved.product.id)) ??
    resolved.product.id;

  if (!sourceImage) {
    throw badRequestError(
      'Selected product image slot has no uploaded source image.',
    );
  }

  const sourceSlotResult = await upsertProductStudioSourceSlot({
    product: resolved.product,
    projectId: resolved.projectId,
    imageSlotIndex: resolved.imageSlotIndex,
    sourceImage,
    rotateBeforeSendDeg: params.rotateBeforeSendDeg === 90 ? 90 : null,
    productFolderSegment: skuFolderSegment,
  });

  return {
    config: sourceSlotResult.config,
    projectId: resolved.projectId,
    imageSlotIndex: resolved.imageSlotIndex,
    sourceSlot: sourceSlotResult.sourceSlot,
  };
}

export async function sendProductImageToStudio(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  rotateBeforeSendDeg?: 90 | null | undefined;
  sequenceGenerationMode?: ProductStudioSequenceGenerationMode | null | undefined;
  }): Promise<ProductStudioSendResult> {
  const startedAtMs = Date.now();
  let importMs = 0;
  let sourceSlotUpsertMs = 0;
  let routeDecisionMs: number;
  let dispatchMs = 0;
  const resolved = await resolveProductAndStudioTarget(params);  const {
    parsedStudioSettings,
    studioSettings,
    sequencing,
    sequencingDiagnostics,
    sequenceGenerationMode,
    modelId,
  } = await resolveStudioSettingsBundle(resolved.projectId);
  const requestedSequenceMode = normalizeProductStudioSequenceGenerationMode(
    params.sequenceGenerationMode ?? sequenceGenerationMode,
  );
  const sourceImage = toProductImageFileSource(
    resolved.product.images[resolved.imageSlotIndex]?.imageFile,
  );
  const skuFolderSegment =
    sanitizeSkuSegment(trimString(resolved.product.sku)) ??
    sanitizeSkuSegment(trimString(resolved.product.id)) ??
    resolved.product.id;

  if (!sourceImage) {
    throw badRequestError(
      'Selected product image slot has no uploaded source image.',
    );
  }

  const generationPrompt = buildGenerationPrompt(resolved.product);
  const routeDecisionStartMs = Date.now();
  const routeDecision = resolvePostProductionRoute({
    sequencing,
    requestedMode: requestedSequenceMode,
    modelId,
  });
  const resolvedActiveSteps = resolveImageStudioSequenceActiveSteps(
    parsedStudioSettings.projectSequencing,
  ).filter((step) => step.enabled);
  const sequenceStepPlan = buildProductStudioSequenceStepPlan(resolvedActiveSteps);
  const warnings = [
    ...routeDecision.warnings,
    ...buildSequenceStepPlanWarnings(sequenceStepPlan),
  ];
  routeDecisionMs = Date.now() - routeDecisionStartMs;
  const sequenceSnapshot = buildImageStudioSequenceSnapshot(
    parsedStudioSettings,
  );
  const auditSettingsContext = {
    settingsScope: sequencingDiagnostics.selectedScope,
    settingsKey: sequencingDiagnostics.selectedSettingsKey,
    projectSettingsKey: sequencingDiagnostics.projectSettingsKey,
    settingsScopeValid: sequencingDiagnostics.selectedScope === 'project',
  } as const;
  const sequenceReadiness = resolveSequenceReadiness({
    sequencing,
    sequencingDiagnostics,
    requestedMode: requestedSequenceMode,
    route: routeDecision.executionRoute,
  });
  if (!sequenceReadiness.ready) {
    const readinessMessage =
      sequenceReadiness.message ??
      'Image Studio project sequencing is not ready.';
    const fallbackReason = warnings[0] ?? null;
    const runKind =
      isSequenceExecutionRoute(routeDecision.executionRoute) ||
      doesRequestedModeRequireProjectSequence(requestedSequenceMode)
        ? 'sequence'
        : routeDecision.runKind;
    await createProductStudioRunAudit({
      productId: resolved.product.id,
      imageSlotIndex: resolved.imageSlotIndex,
      projectId: resolved.projectId,
      status: 'failed',
      requestedSequenceMode,
      resolvedSequenceMode: routeDecision.resolvedMode,
      executionRoute: routeDecision.executionRoute,
      runKind,
      runId: null,
      sequenceRunId: null,
      dispatchMode: null,
      fallbackReason,
      warnings,
      ...auditSettingsContext,
      sequenceSnapshotHash: sequenceSnapshot.hash,
      stepOrderUsed: resolvedActiveSteps.map((step) => step.type),
      resolvedCropRect: resolveFirstSequenceCropRect(resolvedActiveSteps),
      sourceImageSize: null,
      timings: {
        importMs,
        sourceSlotUpsertMs,
        routeDecisionMs,
        dispatchMs,
        totalMs: Date.now() - startedAtMs,
      },
      errorMessage: readinessMessage,
    }).catch(() => {});
    throw badRequestError(readinessMessage, {
      sequenceReadinessState: sequenceReadiness.state,
    });
  }

  const folderPath = `products/${skuFolderSegment}`;
  const sourceSlotResult = await upsertProductStudioSourceSlot({
    product: resolved.product,
    projectId: resolved.projectId,
    imageSlotIndex: resolved.imageSlotIndex,
    sourceImage,
    rotateBeforeSendDeg: params.rotateBeforeSendDeg === 90 ? 90 : null,
    productFolderSegment: skuFolderSegment,
  });
  importMs = sourceSlotResult.importMs;
  sourceSlotUpsertMs = sourceSlotResult.sourceSlotUpsertMs;
  const sourceSlot = sourceSlotResult.sourceSlot;
  const config = sourceSlotResult.config;
  const sourceImageSize = sourceSlotResult.sourceImageSize;

  if (
    routeDecision.executionRoute === 'studio_sequencer' ||
    routeDecision.executionRoute === 'studio_native_sequencer_prior_generation'
  ) {
    const stepsForSequenceRun = resolvedActiveSteps;
    const stepOrderUsed = stepsForSequenceRun.map((step) => step.type);
    const resolvedCropRect = resolveFirstSequenceCropRect(stepsForSequenceRun);
    const settingsSnapshotHash = buildSettingsSnapshotHash(studioSettings);
    const projectModelId = trimString(parsedStudioSettings.targetAi.openai.model);
    try {
      validateProductStudioSequenceSteps(stepsForSequenceRun);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Product Studio sequence preflight validation failed.';
      const fallbackReason = warnings[0] ?? null;
      await createProductStudioRunAudit({
        productId: resolved.product.id,
        imageSlotIndex: resolved.imageSlotIndex,
        projectId: resolved.projectId,
        status: 'failed',
        requestedSequenceMode,
        resolvedSequenceMode: routeDecision.resolvedMode,
        executionRoute: routeDecision.executionRoute,
        runKind: 'sequence',
        runId: null,
        sequenceRunId: null,
        dispatchMode: null,
        fallbackReason,
        warnings,
        ...auditSettingsContext,
        sequenceSnapshotHash: sequenceSnapshot.hash,
        stepOrderUsed,
        resolvedCropRect,
        sourceImageSize,
        timings: {
          importMs,
          sourceSlotUpsertMs,
          routeDecisionMs,
          dispatchMs,
          totalMs: Date.now() - startedAtMs,
        },
        errorMessage: message,
      }).catch(() => {});
      throw error;
    }
    let sequenceRun;
    try {
      const dispatchStartMs = Date.now();
      sequenceRun = await startImageStudioSequenceRun({
        projectId: resolved.projectId,
        sourceSlotId: sourceSlot.id,
        prompt: generationPrompt,
        paramsState: null,
        referenceSlotIds: [],
        studioSettings,
        steps: stepsForSequenceRun,
        metadata: {
          source: 'product-studio',
          productId: resolved.product.id,
          imageSlotIndex: resolved.imageSlotIndex,
          executionRoute: routeDecision.executionRoute,
          requestedSequenceMode,
          resolvedSequenceMode: routeDecision.resolvedMode,
          sourceFolderPath: folderPath,
          sourceSku: trimString(resolved.product.sku),
          sequenceSnapshotHash: sequenceSnapshot.hash,
          sequenceSnapshotStepCount: sequenceSnapshot.stepCount,
          settingsSnapshotHash,
          projectModelId,
        },
      });
      dispatchMs = Date.now() - dispatchStartMs;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Failed to dispatch Image Studio sequence run from Product Studio.';
      const fallbackReason = warnings[0] ?? null;
      await createProductStudioRunAudit({
        productId: resolved.product.id,
        imageSlotIndex: resolved.imageSlotIndex,
        projectId: resolved.projectId,
        status: 'failed',
        requestedSequenceMode,
        resolvedSequenceMode: routeDecision.resolvedMode,
        executionRoute: routeDecision.executionRoute,
        runKind: 'sequence',
        runId: null,
        sequenceRunId: null,
        dispatchMode: null,
        fallbackReason,
        warnings,
        ...auditSettingsContext,
        sequenceSnapshotHash: sequenceSnapshot.hash,
        stepOrderUsed,
        resolvedCropRect,
        sourceImageSize,
        timings: {
          importMs,
          sourceSlotUpsertMs,
          routeDecisionMs,
          dispatchMs,
          totalMs: Date.now() - startedAtMs,
        },
        errorMessage: message,
      }).catch(() => {});
      throw error;
    }
    const fallbackReason = warnings[0] ?? null;
    await createProductStudioRunAudit({
      productId: resolved.product.id,
      imageSlotIndex: resolved.imageSlotIndex,
      projectId: resolved.projectId,
      status: 'completed',
      requestedSequenceMode,
      resolvedSequenceMode: routeDecision.resolvedMode,
      executionRoute: routeDecision.executionRoute,
      runKind: 'sequence',
      runId: sequenceRun.runId,
      sequenceRunId: sequenceRun.runId,
      dispatchMode: sequenceRun.dispatchMode,
      fallbackReason,
      warnings,
      ...auditSettingsContext,
      sequenceSnapshotHash: sequenceSnapshot.hash,
      stepOrderUsed,
      resolvedCropRect,
      sourceImageSize,
      timings: {
        importMs,
        sourceSlotUpsertMs,
        routeDecisionMs,
        dispatchMs,
        totalMs: Date.now() - startedAtMs,
      },
      errorMessage: null,
    }).catch(() => {});

    return {
      config,
      sequencing,
      sequencingDiagnostics,
      sequenceReadiness,
      sequenceStepPlan,
      projectId: resolved.projectId,
      imageSlotIndex: resolved.imageSlotIndex,
      sourceSlot,
      runId: sequenceRun.runId,
      runStatus: sequenceRun.status,
      expectedOutputs: sequencing.expectedOutputs,
      dispatchMode: sequenceRun.dispatchMode,
      runKind: 'sequence',
      sequenceRunId: sequenceRun.runId,
      requestedSequenceMode: requestedSequenceMode,
      resolvedSequenceMode: routeDecision.resolvedMode,
      executionRoute: routeDecision.executionRoute,
      ...(warnings.length > 0 ? { warnings } : {}),
    };
  }

  const sequenceStepTypes = resolvedActiveSteps.map((step) => step.type);
  const effectivePrompt =
    routeDecision.executionRoute === 'ai_model_full_sequence'
      ? buildModelNativeSequencePrompt({
        basePrompt: generationPrompt,
        sequenceStepTypes,
      })
      : generationPrompt;
  const sourceSlotFilepath =
    trimString(sourceSlot.imageFile?.filepath) ??
    trimString(sourceSlot.imageUrl);
  if (!sourceSlotFilepath) {
    throw operationFailedError(
      'Studio source card is missing an image filepath.',
      { sourceSlotId: sourceSlot.id },
    );
  }

  const runRequestCandidate: ImageStudioRunRequest = {
    projectId: resolved.projectId,
    asset: {
      id: sourceSlot.id,
      filepath: sourceSlotFilepath,
    },
    prompt: effectivePrompt,
    studioSettings,
  };

  const parsedRequest =
    imageStudioRunRequestSchema.safeParse(runRequestCandidate);
  if (!parsedRequest.success) {
    throw badRequestError('Invalid Image Studio run request payload.', {
      errors: parsedRequest.error.format(),
    });
  }

  const request = {
    ...parsedRequest.data,
    projectId: resolved.projectId,
  };

  const expectedOutputs = resolveExpectedOutputCount(request);
  const run = await createImageStudioRun({
    projectId: resolved.projectId,
    request,
    expectedOutputs,
  });

  let dispatchMode: ImageStudioRunDispatchMode;
  try {
    const dispatchStartMs = Date.now();
    startImageStudioRunQueue();
    dispatchMode = await enqueueImageStudioRunJob(run.id);
    dispatchMs = Date.now() - dispatchStartMs;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to dispatch Image Studio run from Product Studio.';

    await updateImageStudioRun(run.id, {
      status: 'failed',
      errorMessage,
      finishedAt: new Date().toISOString(),
    });
    const fallbackReason = warnings[0] ?? null;
    await createProductStudioRunAudit({
      productId: resolved.product.id,
      imageSlotIndex: resolved.imageSlotIndex,
      projectId: resolved.projectId,
      status: 'failed',
      requestedSequenceMode,
      resolvedSequenceMode: routeDecision.resolvedMode,
      executionRoute: routeDecision.executionRoute,
      runKind: 'generation',
      runId: run.id,
      sequenceRunId: null,
      dispatchMode: null,
      fallbackReason,
      warnings,
      ...auditSettingsContext,
      sequenceSnapshotHash: sequenceSnapshot.hash,
      stepOrderUsed: sequenceStepTypes,
      resolvedCropRect: resolveFirstSequenceCropRect(resolvedActiveSteps),
      sourceImageSize,
      timings: {
        importMs,
        sourceSlotUpsertMs,
        routeDecisionMs,
        dispatchMs,
        totalMs: Date.now() - startedAtMs,
      },
      errorMessage,
    }).catch(() => {});

    throw operationFailedError(
      'Failed to dispatch Image Studio run from Product Studio.',
      {
        runId: run.id,
        reason: errorMessage,
      },
    );
  }

  const latestRun =
    (await updateImageStudioRun(run.id, {
      dispatchMode,
    })) ??
    (await getImageStudioRunById(run.id)) ??
    run;
  const fallbackReason = warnings[0] ?? null;
  await createProductStudioRunAudit({
    productId: resolved.product.id,
    imageSlotIndex: resolved.imageSlotIndex,
    projectId: resolved.projectId,
    status: 'completed',
    requestedSequenceMode,
    resolvedSequenceMode: routeDecision.resolvedMode,
    executionRoute: routeDecision.executionRoute,
    runKind: 'generation',
    runId: latestRun.id,
    sequenceRunId: null,
    dispatchMode,
    fallbackReason,
    warnings,
    ...auditSettingsContext,
    sequenceSnapshotHash: sequenceSnapshot.hash,
    stepOrderUsed: sequenceStepTypes,
    resolvedCropRect: resolveFirstSequenceCropRect(resolvedActiveSteps),
    sourceImageSize,
    timings: {
      importMs,
      sourceSlotUpsertMs,
      routeDecisionMs,
      dispatchMs,
      totalMs: Date.now() - startedAtMs,
    },
    errorMessage: null,
  }).catch(() => {});

  return {
    config,
    sequencing,
    sequencingDiagnostics,
    sequenceReadiness,
    sequenceStepPlan,
    projectId: resolved.projectId,
    imageSlotIndex: resolved.imageSlotIndex,
    sourceSlot,
    runId: latestRun.id,
    runStatus: latestRun.status,
    expectedOutputs: latestRun.expectedOutputs,
    dispatchMode,
    runKind: 'generation',
    sequenceRunId: null,
    requestedSequenceMode: requestedSequenceMode,
    resolvedSequenceMode: routeDecision.resolvedMode,
    executionRoute: routeDecision.executionRoute,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}

export async function acceptProductStudioVariant(params: {
  productId: string;
  imageSlotIndex: number;
  generationSlotId: string;
  projectId?: string | null | undefined;
}): Promise<ProductWithImages> {
  const resolved = await resolveProductAndStudioTarget(params);
  const generationSlotId = trimString(params.generationSlotId);
  if (!generationSlotId) {
    throw badRequestError('Generation slot id is required.');
  }

  const generationSlot = await getImageStudioSlotById(generationSlotId);
  if (generationSlot?.projectId !== resolved.projectId) {
    throw notFoundError(
      'Generation slot not found in selected Studio project.',
      {
        generationSlotId,
        projectId: resolved.projectId,
      },
    );
  }

  const generationImageFileId =
    trimString(generationSlot.imageFileId) ??
    trimString(generationSlot.imageFile?.id);
  if (!generationImageFileId) {
    throw badRequestError(
      'Selected generation card has no image file to accept.',
    );
  }

  const { sequencing } = await resolveStudioSettingsBundle(resolved.projectId);
  let acceptedImageFileId = generationImageFileId;
  if (sequencing.enabled && sequencing.upscaleOnAccept) {
    const upscaled = await createUpscaledAcceptedProductImage({
      generationSlot,
      product: resolved.product,
      imageSlotIndex: resolved.imageSlotIndex,
      sequencing,
    });
    acceptedImageFileId = upscaled.imageFileId;
  }

  const nextImageFileIds = resolved.product.images
    .slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    .map((image) => trimString(image.imageFileId) ?? '')
    .filter(Boolean);

  while (nextImageFileIds.length <= resolved.imageSlotIndex) {
    nextImageFileIds.push('');
  }

  nextImageFileIds[resolved.imageSlotIndex] = acceptedImageFileId;

  const compactedImageIds = nextImageFileIds.filter((id) => id.length > 0);

  const productRepository = await getProductRepository();
  await productRepository.replaceProductImages(
    resolved.product.id,
    compactedImageIds,
  );

  const updatedProduct = await productService.getProductById(
    resolved.product.id,
  );
  if (!updatedProduct) {
    throw operationFailedError(
      'Product image was updated, but failed to reload product.',
    );
  }

  return updatedProduct;
}

export async function rotateProductStudioImageSlot(params: {
  productId: string;
  imageSlotIndex: number;
  direction: 'left' | 'right';
}): Promise<ProductWithImages> {
  const imageSlotIndex = normalizeImageSlotIndex(params.imageSlotIndex);
  const product = await ensureProduct(params.productId);
  const sourceImage = toProductImageFileSource(
    product.images[imageSlotIndex]?.imageFile,
  );

  if (!sourceImage) {
    throw badRequestError('Selected product image slot has no uploaded source image.');
  }

  const sourcePath = trimString(sourceImage.filepath);
  if (!sourcePath) {
    throw badRequestError('Selected product image has no filepath.');
  }

  const sourceFilename =
    trimString(sourceImage.filename) ?? `product-image-${imageSlotIndex + 1}.png`;
  const { buffer } = await resolveBufferFromImagePath(sourcePath);
  const rotationDegrees = params.direction === 'left' ? -90 : 90;
  const rotatedBuffer = await sharp(buffer)
    .rotate(rotationDegrees)
    .png()
    .toBuffer();
  const targetFilename = appendFilenameSuffix(
    sourceFilename,
    params.direction === 'left' ? '-rotl90' : '-rotr90',
    '.png',
  );

  const file = new File([new Uint8Array(rotatedBuffer)], targetFilename, {
    type: 'image/png',
  });
  const uploaded = await uploadFile(file, {
    category: 'products',
    sku: product.sku?.trim() ?? undefined,
    filenameOverride: targetFilename,
  });

  // Keep mapped Image Studio source card in sync with the rotated product slot image.
  const existingConfig = await getProductStudioConfig(product.id);
  const sourceSlotId = resolveSourceSlotIdForIndex(existingConfig, imageSlotIndex);
  if (sourceSlotId) {
    const sourceSlot = await getImageStudioSlotById(sourceSlotId);
    if (sourceSlot) {
      const currentMetadata = asRecord(sourceSlot.metadata) ?? {};
      await updateImageStudioSlot(sourceSlot.id, {
        imageFileId: uploaded.id,
        imageUrl: uploaded.filepath,
        imageBase64: null,
        metadata: {
          ...currentMetadata,
          source: 'product-studio',
          rotateUpdatedAt: new Date().toISOString(),
          rotateDirection: params.direction,
        },
      });
    }
  }

  const nextImageFileIds = product.images
    .slice(0, DEFAULT_IMAGE_SLOT_COUNT)
    .map((image) => trimString(image.imageFileId) ?? '')
    .filter(Boolean);

  while (nextImageFileIds.length <= imageSlotIndex) {
    nextImageFileIds.push('');
  }

  nextImageFileIds[imageSlotIndex] = uploaded.id;

  const compactedImageIds = nextImageFileIds.filter((id) => id.length > 0);
  const productRepository = await getProductRepository();
  await productRepository.replaceProductImages(product.id, compactedImageIds);

  const updatedProduct = await productService.getProductById(product.id);
  if (!updatedProduct) {
    throw operationFailedError(
      'Product image was rotated, but failed to reload product.',
    );
  }

  return updatedProduct;
}
