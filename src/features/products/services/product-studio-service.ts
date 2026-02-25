/* eslint-disable */
import 'server-only';

import fs from 'fs/promises';

import sharp from 'sharp';

import {
  imageStudioRunRequestSchema,
  resolveExpectedOutputCount,
  type ImageStudioRunRequest,
} from '@/features/ai/image-studio/server/run-executor';
import {
  createImageStudioRun,
  getImageStudioRunById,
  updateImageStudioRun,
  type ImageStudioRunRecord,
} from '@/features/ai/image-studio/server/run-repository';
import { startImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
  updateImageStudioSlot,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server/slot-repository';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  buildImageStudioSequenceSnapshot,
  defaultImageStudioSettings,
  getImageStudioProjectSettingsKey,
  parseImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/utils/studio-settings';
import { uploadFile } from '@/features/files/server';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/features/image-slots';
import {
  enqueueImageStudioRunJob,
  startImageStudioRunQueue,
  type ImageStudioRunDispatchMode,
} from '@/features/jobs/workers/imageStudioRunQueue';
import { PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY } from '@/features/products/constants';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { getProductRepository } from '@/features/products/services/product-repository';
import {
  getProductStudioConfig,
  setProductStudioProject,
  setProductStudioSourceSlot,
  type ProductStudioConfig,
} from '@/features/products/services/product-studio-config';
import { productService } from '@/features/products/services/productService';
import {
  normalizeProductStudioSequenceGenerationMode,
  type ProductStudioExecutionRoute,
  type ProductStudioSequenceGenerationMode,
  type ProductStudioSequencingConfig,
  type ProductStudioSequencingDiagnostics,
  type ProductStudioSequenceReadiness,
  type ProductWithImages,
} from '@/shared/contracts/products';
import {
  badRequestError,
  notFoundError,
  operationFailedError,
} from '@/shared/errors/app-error';

import {
  asRecord,
  buildSequencingDiagnostics,
  buildSettingsSnapshotHash,
  normalizeImageSlotIndex,
  pickProductName,
  trimString,
  hasPersistedSettingValue,
} from './product-studio-service.helpers';
import {
  buildProductStudioSequenceStepPlan,
  buildSequenceStepPlanWarnings,
  doesRequestedModeRequireProjectSequence,
  isSequenceExecutionRoute,
  resolveFirstSequenceCropRect,
  resolvePostProductionRoute,
  resolveSequenceReadiness,
  validateProductStudioSequenceSteps,
  type ProductStudioSequenceStepPlanEntry,
} from './product-studio-service.sequencing';
import {
  buildGenerationPrompt,
  buildModelNativeSequencePrompt,
} from './product-studio-service.prompts';
import {
  toProductImageFileSource,
  type ProductImageFileSource,
} from './product-studio-service.images';
import {
  appendFilenameSuffix,
  buildUpscaledImage,
  clampUpscaleScale,
  importSourceProductImageToStudio,
  resolveBufferFromImagePath,
} from './product-studio-service.io';
import {
  resolveGenerationVariants,
} from './product-studio-service.analysis';
import {
  ensureProduct,
  resolveProductAndStudioTarget,
  resolveSourceSlotIdForIndex,
} from './product-studio-service.resolution';
import {
  buildAuditSettingsContext,
  logProductStudioRunAudit,
} from './product-studio-service.audits';

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
  const resolved = await resolveProductAndStudioTarget(params);
  const {
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
  const auditSettingsContext = buildAuditSettingsContext(sequencingDiagnostics);
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
    await logProductStudioRunAudit({
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
      auditSettingsContext,
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
    });
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
      await logProductStudioRunAudit({
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
        auditSettingsContext,
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
      });
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
      await logProductStudioRunAudit({
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
        auditSettingsContext,
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
      });
      throw error;
    }
    const fallbackReason = warnings[0] ?? null;
    await logProductStudioRunAudit({
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
      auditSettingsContext,
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
    });

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
    await logProductStudioRunAudit({
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
      auditSettingsContext,
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
    });

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
  await logProductStudioRunAudit({
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
    auditSettingsContext,
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
  });

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
