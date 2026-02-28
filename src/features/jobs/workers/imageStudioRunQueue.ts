import 'server-only';

import type { ImageFileRecord } from '@/shared/contracts/files';
import {
  executeImageStudioRun,
  type ImageStudioRunExecutionMeta,
} from '@/shared/lib/ai/image-studio/server/run-executor';
import {
  getImageStudioRunById,
  updateImageStudioRun,
  type ImageStudioRunRecord,
} from '@/shared/lib/ai/image-studio/server/run-repository';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/shared/lib/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
  listImageStudioSlots,
  updateImageStudioSlot,
} from '@/shared/lib/ai/image-studio/server/slot-repository';
import {
  estimateGenerationCost,
  type GenerationCostEstimate,
} from '@/shared/lib/ai/image-studio/generation-cost';
import { parseImageStudioSettings } from '@/shared/lib/ai/image-studio/studio-settings';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { ImageStudioRunDispatchMode } from '@/shared/contracts/image-studio';
export type { ImageStudioRunDispatchMode };
import { createManagedQueue, isRedisAvailable } from '@/shared/lib/queue';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';

const LOG_SOURCE = 'image-studio-run-queue';

type ImageStudioRunJobData = {
  runId: string;
};

type GenerationSourceContext = {
  sourceSlotIds: string[];
  primarySourceSlotId: string | null;
  primarySourceSlotName: string;
  primarySourceSlotFolderPath: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const trimString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeAssetPath = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toJsonSafe = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const buildGenerationOutputRelationType = (runId: string, outputIndex: number): string =>
  `generation:output:${runId}:${outputIndex}`;

const resolveRunOperation = (run: ImageStudioRunRecord): 'generate' | 'center_object' =>
  run.request.operation === 'center_object' ? 'center_object' : 'generate';

const buildRunOutputRelationType = (
  operation: 'generate' | 'center_object',
  runId: string,
  outputIndex: number
): string =>
  operation === 'center_object'
    ? `center:output:${runId}:${outputIndex}`
    : buildGenerationOutputRelationType(runId, outputIndex);

const collectGenerationSourceContext = async (
  run: ImageStudioRunRecord
): Promise<GenerationSourceContext> => {
  const requestedSourceIds: string[] = [];
  const seenRequestedSourceIds = new Set<string>();

  const pushRequestedSourceId = (value: string | null): void => {
    if (!value || seenRequestedSourceIds.has(value)) return;
    seenRequestedSourceIds.add(value);
    requestedSourceIds.push(value);
  };

  const baseSourceId = trimString(run.request.asset?.id);
  pushRequestedSourceId(baseSourceId);

  (run.request.referenceAssets ?? []).forEach((asset: { id?: string | undefined }) => {
    const referenceId = trimString(asset.id);
    pushRequestedSourceId(referenceId);
  });

  const sourceSlotsById = new Map<string, Awaited<ReturnType<typeof getImageStudioSlotById>>>();

  if (requestedSourceIds.length > 0) {
    const resolvedSlots = await Promise.all(
      requestedSourceIds.map(async (slotId: string) => ({
        slotId,
        slot: await getImageStudioSlotById(slotId),
      }))
    );
    resolvedSlots.forEach(({ slotId, slot }) => {
      if (slot?.projectId !== run.projectId) return;
      sourceSlotsById.set(slotId, slot);
    });
  }

  const sourceSlotIds: string[] = [];
  const seenSourceIds = new Set<string>();
  const pushSourceId = (slotId: string | null): void => {
    if (!slotId || seenSourceIds.has(slotId)) return;
    seenSourceIds.add(slotId);
    sourceSlotIds.push(slotId);
  };

  requestedSourceIds.forEach((slotId) => {
    if (sourceSlotsById.has(slotId)) {
      pushSourceId(slotId);
    }
  });

  const baseAssetPath = normalizeAssetPath(run.request.asset?.filepath) ?? '';
  const referenceAssetPaths = (run.request.referenceAssets ?? [])
    .map((asset) => normalizeAssetPath(asset.filepath))
    .filter((value): value is string => Boolean(value));

  const needsPathFallback =
    sourceSlotIds.length === 0 || (baseSourceId !== null && !sourceSlotsById.has(baseSourceId));

  if (needsPathFallback) {
    const projectSlots = await listImageStudioSlots(run.projectId);
    const slotIdByPath = new Map<string, string>();
    projectSlots.forEach((slot) => {
      const imagePath =
        normalizeAssetPath(slot.imageFile?.filepath) ?? normalizeAssetPath(slot.imageUrl);
      if (!imagePath || slotIdByPath.has(imagePath)) return;
      slotIdByPath.set(imagePath, slot.id);
    });

    const baseSourceFromPath = baseAssetPath ? (slotIdByPath.get(baseAssetPath) ?? null) : null;
    if (baseSourceFromPath) {
      pushSourceId(baseSourceFromPath);
      if (!sourceSlotsById.has(baseSourceFromPath)) {
        const baseSlot = projectSlots.find((slot) => slot.id === baseSourceFromPath) ?? null;
        if (baseSlot) {
          sourceSlotsById.set(baseSourceFromPath, baseSlot);
        }
      }
    }

    referenceAssetPaths.forEach((referencePath) => {
      const sourceId = slotIdByPath.get(referencePath) ?? null;
      if (!sourceId) return;
      pushSourceId(sourceId);
      if (!sourceSlotsById.has(sourceId)) {
        const sourceSlot = projectSlots.find((slot) => slot.id === sourceId) ?? null;
        if (sourceSlot) {
          sourceSlotsById.set(sourceId, sourceSlot);
        }
      }
    });
  }

  const primarySourceSlotId =
    (baseSourceId && sourceSlotIds.includes(baseSourceId) ? baseSourceId : null) ??
    (baseAssetPath
      ? (sourceSlotIds.find((slotId) => {
          const slot = sourceSlotsById.get(slotId);
          if (!slot) return false;
          const slotPath =
            normalizeAssetPath(slot.imageFile?.filepath) ?? normalizeAssetPath(slot.imageUrl);
          return slotPath === baseAssetPath;
        }) ?? null)
      : null) ??
    sourceSlotIds[0] ??
    null;

  const primarySourceSlot = primarySourceSlotId
    ? (sourceSlotsById.get(primarySourceSlotId) ??
      (await getImageStudioSlotById(primarySourceSlotId)))
    : null;

  if (primarySourceSlot?.projectId !== run.projectId) {
    return {
      sourceSlotIds,
      primarySourceSlotId: null,
      primarySourceSlotName: 'Generated',
      primarySourceSlotFolderPath: '',
    };
  }

  return {
    sourceSlotIds,
    primarySourceSlotId: primarySourceSlot.id,
    primarySourceSlotName: primarySourceSlot.name?.trim() || primarySourceSlot.id || 'Generated',
    primarySourceSlotFolderPath: primarySourceSlot.folderPath?.trim() ?? '',
  };
};

const resolveGenerationModel = (run: ImageStudioRunRecord): string | null => {
  if (!isRecord(run.request.studioSettings)) return null;
  const parsed = parseImageStudioSettings(JSON.stringify(run.request.studioSettings));
  const model = parsed.targetAi.openai.model?.trim();
  return model ? model : null;
};

const createRunOutputSlotMetadata = (params: {
  run: ImageStudioRunRecord;
  finishedAt: string;
  outputIndex: number;
  outputCount: number;
  output: ImageFileRecord;
  sourceContext: GenerationSourceContext;
  operation: 'generate' | 'center_object';
  model: string | null;
  generationCost: GenerationCostEstimate | null;
  executionMeta: ImageStudioRunExecutionMeta;
}): Record<string, unknown> => {
  const isCenterOperation = params.operation === 'center_object';
  const relationType = isCenterOperation ? 'center:output' : 'generation:output';
  const sourceReferenceIds = params.sourceContext.primarySourceSlotId
    ? params.sourceContext.sourceSlotIds.filter(
        (id) => id !== params.sourceContext.primarySourceSlotId
      )
    : params.sourceContext.sourceSlotIds;
  const centerMeta =
    isCenterOperation && isRecord(params.executionMeta) ? params.executionMeta : null;

  return {
    role: 'generation',
    ...(params.sourceContext.primarySourceSlotId
      ? { sourceSlotId: params.sourceContext.primarySourceSlotId }
      : {}),
    ...(params.sourceContext.sourceSlotIds.length > 0
      ? { sourceSlotIds: params.sourceContext.sourceSlotIds }
      : {}),
    ...(sourceReferenceIds.length > 0 ? { sourceReferenceIds } : {}),
    relationType,
    generationFileId: params.output.id,
    generationRunId: params.run.id,
    generationOutputIndex: params.outputIndex,
    generationOutputCount: params.outputCount,
    outputFile: {
      id: params.output.id,
      filename: params.output.filename,
      filepath: params.output.filepath,
      mimetype: params.output.mimetype,
      size: params.output.size,
      width: params.output.width,
      height: params.output.height,
      tags: params.output.tags,
    },
    generationRequest: toJsonSafe(params.run.request),
    ...(isRecord(params.run.request.studioSettings)
      ? { generationSettings: toJsonSafe(params.run.request.studioSettings) }
      : {}),
    ...(!isCenterOperation && params.generationCost
      ? {
          generationCosts: {
            ...params.generationCost,
            actualCostUsd: params.generationCost.totalCostUsdPerOutput,
            tokenCostUsd: params.generationCost.promptCostUsdPerOutput,
          },
        }
      : {}),
    ...(isCenterOperation
      ? {
          center: {
            mode: centerMeta?.operation === 'center_object' ? centerMeta.mode : 'server_alpha_bbox',
            sourceObjectBounds:
              centerMeta?.operation === 'center_object' ? centerMeta.sourceObjectBounds : null,
            targetObjectBounds:
              centerMeta?.operation === 'center_object' ? centerMeta.targetObjectBounds : null,
            layout: centerMeta?.operation === 'center_object' ? (centerMeta.layout ?? null) : null,
            timestamp: params.finishedAt,
          },
        }
      : {}),
    generationParams: {
      prompt: params.run.request.prompt,
      ...(params.model && !isCenterOperation ? { model: params.model } : {}),
      timestamp: params.finishedAt,
      runId: params.run.id,
      outputIndex: params.outputIndex,
      outputCount: params.outputCount,
    },
  };
};

const materializeRunOutputSlots = async (params: {
  run: ImageStudioRunRecord;
  finishedAt: string;
  executionMeta: ImageStudioRunExecutionMeta;
  outputs: ImageFileRecord[];
}): Promise<string[]> => {
  if (params.outputs.length === 0) return [];
  const sourceContext = await collectGenerationSourceContext(params.run);
  const operation = resolveRunOperation(params.run);
  const model = operation === 'generate' ? resolveGenerationModel(params.run) : null;
  const outputCount = params.outputs.length;
  const generationCost = model
    ? estimateGenerationCost({
        prompt: params.run.request.prompt ?? '',
        model,
        outputCount,
      })
    : null;
  const createdSlotIds: string[] = [];

  for (let index = 0; index < params.outputs.length; index += 1) {
    const output = params.outputs[index];
    if (!output) continue;
    const outputIndex = index + 1;
    const relationTypeForLink = buildRunOutputRelationType(operation, params.run.id, outputIndex);
    const slotName =
      operation === 'center_object'
        ? outputCount > 1
          ? `${sourceContext.primarySourceSlotName} • Center ${outputIndex}`
          : `${sourceContext.primarySourceSlotName} • Centered`
        : outputCount > 1
          ? `${sourceContext.primarySourceSlotName} • Gen ${outputIndex}`
          : `${sourceContext.primarySourceSlotName} • Gen`;
    const metadata = createRunOutputSlotMetadata({
      run: params.run,
      finishedAt: params.finishedAt,
      outputIndex,
      outputCount,
      output,
      sourceContext,
      operation,
      model,
      generationCost,
      executionMeta: params.executionMeta,
    });

    let generationSlotId: string | null = null;

    if (sourceContext.primarySourceSlotId) {
      const existingLink = await getImageStudioSlotLinkBySourceAndRelation(
        params.run.projectId,
        sourceContext.primarySourceSlotId,
        relationTypeForLink
      );
      if (existingLink?.targetSlotId) {
        const existingSlot = await getImageStudioSlotById(existingLink.targetSlotId);
        if (existingSlot) {
          const updatedSlot = await updateImageStudioSlot(existingSlot.id, {
            name: slotName,
            folderPath: sourceContext.primarySourceSlotFolderPath,
            imageFileId: output.id,
            imageUrl: output.filepath,
            imageBase64: null,
            metadata,
          });
          generationSlotId = updatedSlot?.id ?? null;
        }
      }
    }

    if (!generationSlotId) {
      const created = await createImageStudioSlots(params.run.projectId, [
        {
          name: slotName,
          folderPath: sourceContext.primarySourceSlotFolderPath,
          imageFileId: output.id,
          imageUrl: output.filepath,
          imageBase64: null,
          metadata,
        },
      ]);
      generationSlotId = created[0]?.id ?? null;
    }

    if (!generationSlotId) {
      throw new Error(
        `Failed to materialize generation slot for run ${params.run.id} output ${outputIndex}.`
      );
    }

    if (sourceContext.sourceSlotIds.length > 0) {
      for (const sourceSlotId of sourceContext.sourceSlotIds) {
        await upsertImageStudioSlotLink({
          projectId: params.run.projectId,
          sourceSlotId,
          targetSlotId: generationSlotId,
          relationType: relationTypeForLink,
          metadata: {
            role: 'generation',
            relationType: operation === 'center_object' ? 'center:output' : 'generation:output',
            runId: params.run.id,
            outputIndex,
            outputCount,
            generationFileId: output.id,
            ...(model ? { model } : {}),
          },
        });
      }
    }

    createdSlotIds.push(generationSlotId);
  }

  return createdSlotIds;
};

const queue = createManagedQueue<ImageStudioRunJobData>({
  name: 'image-studio-run',
  concurrency: 1,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1500,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
  processor: async (data) => {
    const run = await getImageStudioRunById(data.runId);
    if (!run) {
      await logSystemEvent({
        level: 'warn',
        source: LOG_SOURCE,
        message: `Run ${data.runId} not found, skipping`,
        context: { runId: data.runId },
      });
      return;
    }

    if (run.status === 'completed' || run.status === 'failed') {
      await logSystemEvent({
        level: 'info',
        source: LOG_SOURCE,
        message: `Run ${run.id} already terminal (${run.status}), skipping`,
        context: { runId: run.id, status: run.status },
      });
      return;
    }

    const operation = resolveRunOperation(run);
    const operationLabel = operation === 'center_object' ? 'Center object' : 'Generation';
    const startedAt = new Date().toISOString();
    await updateImageStudioRun(run.id, {
      status: 'running',
      startedAt,
      finishedAt: null,
      errorMessage: null,
      appendHistoryEvents: [
        {
          type: 'running',
          source: 'worker',
          message: `${operationLabel} started.`,
          payload: {
            runId: run.id,
            operation,
            status: 'running',
            startedAt,
          },
        },
      ],
    });

    publishRunEvent(`image-studio:run:${run.id}`, {
      type: 'run',
      data: { runId: run.id, status: 'running', startedAt },
      ts: Date.now(),
    });

    try {
      const result = await executeImageStudioRun(run.request);
      if (!Array.isArray(result.outputs) || result.outputs.length === 0) {
        throw new Error('Image API run produced no output images.');
      }
      const finishedAt = new Date().toISOString();
      const createdSlotIds = await materializeRunOutputSlots({
        run,
        finishedAt,
        executionMeta: result.executionMeta,
        outputs: result.outputs,
      });
      await updateImageStudioRun(run.id, {
        status: 'completed',
        outputs: result.outputs,
        finishedAt,
        errorMessage: null,
        appendHistoryEvents: [
          {
            type: 'completed',
            source: 'worker',
            message: `${operationLabel} completed successfully.`,
            payload: {
              runId: run.id,
              operation,
              status: 'completed',
              finishedAt,
              outputCount: result.outputs.length,
              createdSlotCount: createdSlotIds.length,
              createdSlotIds,
              executionMeta: result.executionMeta,
              callbackPayload: {
                runId: run.id,
                status: 'completed',
                finishedAt,
                outputCount: result.outputs.length,
                createdSlotCount: createdSlotIds.length,
                createdSlotIds,
                outputs: result.outputs,
                executionMeta: result.executionMeta,
              },
            },
          },
        ],
      });

      publishRunEvent(`image-studio:run:${run.id}`, {
        type: 'done',
        data: {
          runId: run.id,
          status: 'completed',
          finishedAt,
          outputCount: result.outputs.length,
          createdSlotCount: createdSlotIds.length,
          createdSlotIds,
          outputs: result.outputs,
          executionMeta: result.executionMeta,
        },
        ts: Date.now(),
      });

      return {
        outputCount: result.outputs.length,
        createdSlotCount: createdSlotIds.length,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Image Studio run failed.';
      const finishedAt = new Date().toISOString();

      await updateImageStudioRun(run.id, {
        status: 'failed',
        errorMessage: message,
        finishedAt,
        appendHistoryEvents: [
          {
            type: 'failed',
            source: 'worker',
            message: `${operationLabel} failed.`,
            payload: {
              runId: run.id,
              operation,
              status: 'failed',
              finishedAt,
              message,
              callbackPayload: {
                runId: run.id,
                status: 'failed',
                finishedAt,
                message,
              },
            },
          },
        ],
      });

      publishRunEvent(`image-studio:run:${run.id}`, {
        type: 'error',
        data: {
          runId: run.id,
          status: 'failed',
          finishedAt,
          message,
        },
        ts: Date.now(),
      });

      await ErrorSystem.captureException(error, {
        service: LOG_SOURCE,
        runId: run.id,
      });

      throw error;
    }
  },
  onFailed: async (jobId, error, data) => {
    await ErrorSystem.captureException(error, {
      service: LOG_SOURCE,
      action: 'onFailed',
      jobId,
      runId: data.runId,
    });
  },
});

export const startImageStudioRunQueue = (): void => {
  queue.startWorker();
};

const processInlineRunInBackground = (
  runId: string,
  reason: 'redis_unavailable' | 'enqueue_failed'
): void => {
  void queue.processInline({ runId }).catch(async (inlineError: unknown) => {
    await ErrorSystem.captureException(inlineError, {
      service: LOG_SOURCE,
      action: 'inline-background-failed',
      runId,
      reason,
    });
  });
};

export const enqueueImageStudioRunJob = async (
  runId: string
): Promise<ImageStudioRunDispatchMode> => {
  if (!isRedisAvailable()) {
    await logSystemEvent({
      level: 'info',
      source: LOG_SOURCE,
      message: `Redis unavailable for run ${runId}; processing inline in background`,
      context: { runId },
    });
    processInlineRunInBackground(runId, 'redis_unavailable');
    return 'inline';
  }

  try {
    await queue.enqueue({ runId }, { jobId: runId });
    return 'queued';
  } catch (enqueueError) {
    await logSystemEvent({
      level: 'warn',
      source: LOG_SOURCE,
      message: `Queue enqueue failed for run ${runId}; falling back to inline processing`,
      context: {
        runId,
        error: enqueueError instanceof Error ? enqueueError.message : String(enqueueError),
      },
    });

    processInlineRunInBackground(runId, 'enqueue_failed');
    return 'inline';
  }
};
