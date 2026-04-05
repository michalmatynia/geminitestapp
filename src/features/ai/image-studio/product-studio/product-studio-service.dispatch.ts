import 'server-only';

import { z } from 'zod';

import {
  createImageStudioRun,
  getImageStudioRunById,
  updateImageStudioRun,
} from '@/features/ai/image-studio/server';
import {
  createImageStudioSlots,
  type ImageStudioSlotRecord,
} from '@/features/ai/image-studio/server';
import {
  buildImageStudioSequenceSnapshot,
  resolveImageStudioSequenceActiveSteps,
} from '@/features/ai/image-studio/server';
import {
  imageStudioRunRequestSchema,
  resolveExpectedOutputCount,
  type ImageStudioRunRequest,
} from '@/features/ai/image-studio/server/run-executor';
import { startImageStudioSequenceRun } from '@/features/ai/image-studio/server/sequence-runtime';
import {
  enqueueImageStudioRunJob,
  startImageStudioRunQueue,
  type ImageStudioRunDispatchMode,
} from '@/features/ai/image-studio/workers/imageStudioRunQueue';
import type { ContextRegistryConsumerEnvelope } from '@/shared/contracts/ai-context-registry';
import { normalizeProductStudioSequenceGenerationMode } from '@/shared/contracts/products/studio';
import { type ProductStudioLinkResponse, type ProductStudioSendResponse, type ProductStudioSequenceGenerationMode, type ProductStudioConfig, type ProductWithImages } from '@/shared/contracts/products';
import { badRequestError, operationFailedError } from '@/shared/errors/app-error';
import { setProductStudioSourceSlot } from '@/shared/lib/products/services/product-studio-config';

import {
  buildAuditSettingsContext,
  logProductStudioRunAudit,
} from './product-studio-service.audits';
import {
  buildSettingsSnapshotHash,
  pickProductName,
  sanitizeSkuSegment,
  trimString,
} from './product-studio-service.helpers';
import {
  toProductImageFileSource,
  type ProductImageFileSource,
} from './product-studio-service.images';
import { importSourceProductImageToStudio } from './product-studio-service.io';
import {
  buildGenerationPrompt,
  buildModelNativeSequencePrompt,
} from './product-studio-service.prompts';
import { resolveProductAndStudioTarget } from './product-studio-service.resolution';
import {
  buildProductStudioSequenceStepPlan,
  buildSequenceStepPlanWarnings,
  doesRequestedModeRequireProjectSequence,
  isSequenceExecutionRoute,
  resolveFirstSequenceCropRect,
  resolvePostProductionRoute,
  resolveSequenceReadiness,
  validateProductStudioSequenceSteps,
} from './product-studio-service.sequencing';
import { resolveStudioSettingsBundle } from './product-studio-service.settings';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


export type ProductStudioLinkResult = ProductStudioLinkResponse;
export type ProductStudioSendResult = ProductStudioSendResponse;

interface UpsertProductStudioSourceSlotResult {
  sourceSlot: ImageStudioSlotRecord;
  config: ProductStudioConfig;
  sourceImageSize: {
    width: number;
    height: number;
  } | null;
  importMs: number;
  sourceSlotUpsertMs: number;
}

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

  const slotName = `${pickProductName(params.product)} • Slot ${String(params.imageSlotIndex + 1)}`;
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
    throw operationFailedError('Failed to create or update the Studio source card.');
  }

  const config = await setProductStudioSourceSlot(
    params.product.id,
    params.imageSlotIndex,
    sourceSlot.id
  );
  const sourceSlotUpsertMs = Date.now() - sourceSlotUpsertStartedAt;
  const sourceImageSize =
    imported.width && imported.height ? { width: imported.width, height: imported.height } : null;

  return {
    sourceSlot,
    config,
    sourceImageSize,
    importMs,
    sourceSlotUpsertMs,
  };
};

export async function linkProductImageToStudio(params: {
  productId: string;
  imageSlotIndex: number;
  projectId?: string | null | undefined;
  rotateBeforeSendDeg?: 90 | null | undefined;
}): Promise<ProductStudioLinkResult> {
  const resolved = await resolveProductAndStudioTarget(params);
  const sourceImage = toProductImageFileSource(
    resolved.product.images[resolved.imageSlotIndex]?.imageFile
  );
  const skuFolderSegment =
    sanitizeSkuSegment(trimString(resolved.product.sku)) ??
    sanitizeSkuSegment(trimString(resolved.product.id)) ??
    resolved.product.id;

  if (!sourceImage) {
    throw badRequestError('Selected product image slot has no uploaded source image.');
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
  contextRegistry?: ContextRegistryConsumerEnvelope | null | undefined;
}): Promise<ProductStudioSendResult> {
  const startedAtMs = Date.now();
  let importMs = 0;
  let sourceSlotUpsertMs = 0;
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
    params.sequenceGenerationMode ?? sequenceGenerationMode
  );
  const sourceImage = toProductImageFileSource(
    resolved.product.images[resolved.imageSlotIndex]?.imageFile
  );
  const skuFolderSegment =
    sanitizeSkuSegment(trimString(resolved.product.sku)) ??
    sanitizeSkuSegment(trimString(resolved.product.id)) ??
    resolved.product.id;

  if (!sourceImage) {
    throw badRequestError('Selected product image slot has no uploaded source image.');
  }

  const generationPrompt = buildGenerationPrompt(resolved.product);
  const routeDecisionStartMs = Date.now();
  const routeDecision = resolvePostProductionRoute({
    sequencing,
    requestedMode: requestedSequenceMode,
    modelId,
  });
  const resolvedActiveSteps = resolveImageStudioSequenceActiveSteps(
    parsedStudioSettings.projectSequencing
  ).filter((step) => step.enabled);
  const sequenceStepPlan = buildProductStudioSequenceStepPlan(resolvedActiveSteps);
  const warnings = [...routeDecision.warnings, ...buildSequenceStepPlanWarnings(sequenceStepPlan)];
  const routeDecisionMs = Date.now() - routeDecisionStartMs;
  const sequenceSnapshot = buildImageStudioSequenceSnapshot(parsedStudioSettings, { modelId });
  const auditSettingsContext = buildAuditSettingsContext(sequencingDiagnostics);
  const sequenceReadiness = resolveSequenceReadiness({
    sequencing,
    sequencingDiagnostics,
    requestedMode: requestedSequenceMode,
    route: routeDecision.executionRoute,
  });
  if (!sequenceReadiness.ready) {
    const readinessMessage =
      sequenceReadiness.message ?? 'Image Studio project sequencing is not ready.';
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
    const projectModelId = trimString(modelId);
    try {
      validateProductStudioSequenceSteps(stepsForSequenceRun);
    } catch (error) {
      void ErrorSystem.captureException(error);
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
        contextRegistry: params.contextRegistry ?? null,
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
      void ErrorSystem.captureException(error);
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
      requestedSequenceMode,
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
    trimString(sourceSlot.imageFile?.filepath) ?? trimString(sourceSlot.imageUrl);
  if (!sourceSlotFilepath) {
    throw operationFailedError('Studio source card is missing an image filepath.', {
      sourceSlotId: sourceSlot.id,
    });
  }

  const runRequestCandidate: ImageStudioRunRequest = {
    projectId: resolved.projectId,
    asset: {
      id: sourceSlot.id,
      filepath: sourceSlotFilepath,
    },
    prompt: effectivePrompt,
    studioSettings,
    ...(params.contextRegistry ? { contextRegistry: params.contextRegistry } : {}),
  };

  const parsedRequest = imageStudioRunRequestSchema.safeParse(runRequestCandidate);
  if (!parsedRequest.success) {
    throw badRequestError('Invalid Image Studio run request payload.', {
      errors: z.treeifyError(parsedRequest.error),
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
    void ErrorSystem.captureException(error);
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

    throw operationFailedError('Failed to dispatch Image Studio run from Product Studio.', {
      runId: run.id,
      reason: errorMessage,
    });
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
    requestedSequenceMode,
    resolvedSequenceMode: routeDecision.resolvedMode,
    executionRoute: routeDecision.executionRoute,
    ...(warnings.length > 0 ? { warnings } : {}),
  };
}
