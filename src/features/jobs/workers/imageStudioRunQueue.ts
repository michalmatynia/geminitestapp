import 'server-only';

import { executeImageStudioRun } from '@/features/ai/image-studio/server/run-executor';
import {
  getImageStudioRunById,
  updateImageStudioRun,
  type ImageStudioRunRecord,
} from '@/features/ai/image-studio/server/run-repository';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
  updateImageStudioSlot,
} from '@/features/ai/image-studio/server/slot-repository';
import {
  estimateGenerationCost,
  type GenerationCostEstimate,
} from '@/features/ai/image-studio/utils/generation-cost';
import { parseImageStudioSettings } from '@/features/ai/image-studio/utils/studio-settings';
import { ErrorSystem, logSystemEvent } from '@/features/observability/server';
import { createManagedQueue } from '@/shared/lib/queue';
import { publishRunEvent } from '@/shared/lib/redis-pubsub';

const LOG_SOURCE = 'image-studio-run-queue';

type ImageStudioRunJobData = {
  runId: string;
};

export type ImageStudioRunDispatchMode = 'queued' | 'inline';

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

const toJsonSafe = <T,>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const buildGenerationOutputRelationType = (runId: string, outputIndex: number): string =>
  `generation:output:${runId}:${outputIndex}`;

const collectGenerationSourceContext = async (
  run: ImageStudioRunRecord
): Promise<GenerationSourceContext> => {
  const sourceIds = new Set<string>();

  const baseSourceId = trimString(run.request.asset?.id);
  if (baseSourceId) sourceIds.add(baseSourceId);

  (run.request.referenceAssets ?? []).forEach((asset: { id?: string | undefined }) => {
    const referenceId = trimString(asset.id);
    if (referenceId) sourceIds.add(referenceId);
  });

  const sourceSlotIds = Array.from(sourceIds);
  const primarySourceSlotId = sourceSlotIds[0] ?? null;

  if (!primarySourceSlotId) {
    return {
      sourceSlotIds,
      primarySourceSlotId: null,
      primarySourceSlotName: 'Generated',
      primarySourceSlotFolderPath: '',
    };
  }

  const primarySourceSlot = await getImageStudioSlotById(primarySourceSlotId);
  if (!primarySourceSlot) {
    return {
      sourceSlotIds,
      primarySourceSlotId,
      primarySourceSlotName: 'Generated',
      primarySourceSlotFolderPath: '',
    };
  }

  return {
    sourceSlotIds,
    primarySourceSlotId,
    primarySourceSlotName:
      primarySourceSlot.name?.trim() || primarySourceSlot.id || 'Generated',
    primarySourceSlotFolderPath: primarySourceSlot.folderPath?.trim() ?? '',
  };
};

const resolveGenerationModel = (run: ImageStudioRunRecord): string | null => {
  if (!isRecord(run.request.studioSettings)) return null;
  const parsed = parseImageStudioSettings(JSON.stringify(run.request.studioSettings));
  const model = parsed.targetAi.openai.model?.trim();
  return model ? model : null;
};

const createGenerationSlotMetadata = (params: {
  run: ImageStudioRunRecord;
  finishedAt: string;
  outputIndex: number;
  outputCount: number;
  output: {
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    width: number | null;
    height: number | null;
    tags: string[];
  };
  sourceContext: GenerationSourceContext;
  model: string | null;
  generationCost: GenerationCostEstimate | null;
}): Record<string, unknown> => {
  const sourceReferenceIds = params.sourceContext.primarySourceSlotId
    ? params.sourceContext.sourceSlotIds.filter((id) => id !== params.sourceContext.primarySourceSlotId)
    : params.sourceContext.sourceSlotIds;
  return {
    role: 'generation',
    ...(params.sourceContext.primarySourceSlotId
      ? { sourceSlotId: params.sourceContext.primarySourceSlotId }
      : {}),
    ...(params.sourceContext.sourceSlotIds.length > 0
      ? { sourceSlotIds: params.sourceContext.sourceSlotIds }
      : {}),
    ...(sourceReferenceIds.length > 0 ? { sourceReferenceIds } : {}),
    relationType: 'generation:output',
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
    ...(params.generationCost
      ? {
        generationCosts: {
          ...params.generationCost,
          actualCostUsd: params.generationCost.totalCostUsdPerOutput,
          tokenCostUsd: params.generationCost.promptCostUsdPerOutput,
        },
      }
      : {}),
    generationParams: {
      prompt: params.run.request.prompt,
      ...(params.model ? { model: params.model } : {}),
      timestamp: params.finishedAt,
      runId: params.run.id,
      outputIndex: params.outputIndex,
      outputCount: params.outputCount,
    },
  };
};

const materializeGenerationOutputSlots = async (params: {
  run: ImageStudioRunRecord;
  finishedAt: string;
  outputs: Array<{
    id: string;
    filename: string;
    filepath: string;
    mimetype: string;
    size: number;
    width: number | null;
    height: number | null;
    tags: string[];
  }>;
}): Promise<string[]> => {
  if (params.outputs.length === 0) return [];
  const sourceContext = await collectGenerationSourceContext(params.run);
  const model = resolveGenerationModel(params.run);
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
    const relationTypeForLink = buildGenerationOutputRelationType(params.run.id, outputIndex);
    const slotName = outputCount > 1
      ? `${sourceContext.primarySourceSlotName} • Gen ${outputIndex}`
      : `${sourceContext.primarySourceSlotName} • Gen`;
    const metadata = createGenerationSlotMetadata({
      run: params.run,
      finishedAt: params.finishedAt,
      outputIndex,
      outputCount,
      output,
      sourceContext,
      model,
      generationCost,
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
      throw new Error(`Failed to materialize generation slot for run ${params.run.id} output ${outputIndex}.`);
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
            relationType: 'generation:output',
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

    const startedAt = new Date().toISOString();
    await updateImageStudioRun(run.id, {
      status: 'running',
      startedAt,
      finishedAt: null,
      errorMessage: null,
    });

    publishRunEvent(`image-studio:run:${run.id}`, {
      type: 'run',
      data: { runId: run.id, status: 'running', startedAt },
      ts: Date.now(),
    });

    try {
      const result = await executeImageStudioRun(run.request);
      const finishedAt = new Date().toISOString();
      const createdSlotIds = await materializeGenerationOutputSlots({
        run,
        finishedAt,
        outputs: result.outputs,
      });
      await updateImageStudioRun(run.id, {
        status: 'completed',
        outputs: result.outputs,
        finishedAt,
        errorMessage: null,
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

export const enqueueImageStudioRunJob = async (runId: string): Promise<ImageStudioRunDispatchMode> => {
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

    try {
      await queue.processInline({ runId });
      return 'inline';
    } catch (inlineError) {
      await ErrorSystem.captureException(inlineError, {
        service: LOG_SOURCE,
        action: 'inline-fallback-failed',
        runId,
      });
      throw inlineError;
    }
  }
};
