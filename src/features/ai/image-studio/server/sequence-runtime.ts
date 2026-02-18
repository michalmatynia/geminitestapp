import 'server-only';

import {
  createImageStudioSequenceRun,
  getImageStudioSequenceRunById,
  updateImageStudioSequenceRun,
  type ImageStudioSequenceMaskContext,
  type ImageStudioSequenceRunRecord,
  type ImageStudioSequenceRunStatus,
} from '@/features/ai/image-studio/server/sequence-run-repository';
import { getImageStudioSlotById } from '@/features/ai/image-studio/server/slot-repository';
import {
  IMAGE_STUDIO_SETTINGS_KEY,
  getImageStudioProjectSettingsKey,
  normalizeImageStudioSequenceSteps,
  parseImageStudioSettings,
  resolveImageStudioSequenceActiveSteps,
  type ImageStudioSequenceStep,
} from '@/features/ai/image-studio/utils/studio-settings';
import {
  enqueueImageStudioSequenceJob,
  startImageStudioSequenceQueue,
  type ImageStudioSequenceDispatchMode,
} from '@/features/jobs/workers/imageStudioSequenceQueue';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import { badRequestError, notFoundError, operationFailedError } from '@/shared/errors/app-error';

type SequenceStepInputLike = {
  type?: unknown;
  enabled?: unknown;
  config?: unknown;
};

export type StartImageStudioSequenceInput = {
  projectId: string;
  sourceSlotId: string;
  prompt: string;
  paramsState?: Record<string, unknown> | null;
  referenceSlotIds?: string[] | null;
  mask?: ImageStudioSequenceMaskContext;
  studioSettings?: Record<string, unknown> | null;
  steps?: unknown;
  presetId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type StartImageStudioSequenceResult = {
  runId: string;
  status: ImageStudioSequenceRunStatus;
  dispatchMode: ImageStudioSequenceDispatchMode;
  currentSlotId: string;
  stepCount: number;
};

const asTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const toMaskContext = (
  value: ImageStudioSequenceMaskContext | null | undefined,
): ImageStudioSequenceMaskContext => {
  if (!value || !Array.isArray(value.polygons) || value.polygons.length === 0) {
    return null;
  }

  const polygons = value.polygons
    .map((polygon: Array<{ x: number; y: number }> | unknown) => {
      if (!Array.isArray(polygon)) return null;
      const points = polygon
        .map((point) => {
          if (!point || typeof point !== 'object' || Array.isArray(point)) return null;
          const record = point as Record<string, unknown>;
          const x = typeof record['x'] === 'number' && Number.isFinite(record['x'])
            ? Math.max(0, Math.min(1, record['x']))
            : null;
          const y = typeof record['y'] === 'number' && Number.isFinite(record['y'])
            ? Math.max(0, Math.min(1, record['y']))
            : null;
          if (x === null || y === null) return null;
          return { x, y };
        })
        .filter((point): point is { x: number; y: number } => Boolean(point));
      return points.length >= 3 ? points : null;
    })
    .filter((polygon): polygon is Array<{ x: number; y: number }> => Boolean(polygon));

  if (polygons.length === 0) return null;

  return {
    polygons,
    invert: Boolean(value.invert),
    feather:
      typeof value.feather === 'number' && Number.isFinite(value.feather)
        ? Math.max(0, Math.min(50, Number(value.feather.toFixed(2))))
        : 0,
  };
};

const isSequenceStepArray = (value: unknown): value is SequenceStepInputLike[] =>
  Array.isArray(value);

const normalizeReferenceSlotIds = (value: string[] | null | undefined): string[] => {
  if (!Array.isArray(value)) return [];
  const deduped = new Set<string>();
  for (const entry of value) {
    const normalized = asTrimmedString(entry);
    if (!normalized) continue;
    deduped.add(normalized);
  }
  return Array.from(deduped);
};

const resolveProjectScopedSettings = async (params: {
  projectId: string;
  studioSettings: Record<string, unknown> | null | undefined;
}): Promise<Record<string, unknown>> => {
  if (params.studioSettings && typeof params.studioSettings === 'object' && !Array.isArray(params.studioSettings)) {
    const parsed = parseImageStudioSettings(JSON.stringify(params.studioSettings));
    return parsed as unknown as Record<string, unknown>;
  }

  const projectSettingsKey = getImageStudioProjectSettingsKey(params.projectId);
  const [projectSettingsRaw, globalSettingsRaw] = await Promise.all([
    projectSettingsKey ? getSettingValue(projectSettingsKey) : Promise.resolve(null),
    getSettingValue(IMAGE_STUDIO_SETTINGS_KEY),
  ]);

  const parsed = parseImageStudioSettings(projectSettingsRaw ?? globalSettingsRaw);
  return parsed as unknown as Record<string, unknown>;
};

const resolveSequenceSteps = (params: {
  parsedSettings: ReturnType<typeof parseImageStudioSettings>;
  requestedSteps: unknown;
  presetId: string | null;
}): ImageStudioSequenceStep[] => {
  const sequenceSettings = params.parsedSettings.projectSequencing;
  const activePresetId = params.presetId
    ? sequenceSettings.presets.some((preset) => preset.id === params.presetId)
      ? params.presetId
      : null
    : sequenceSettings.activePresetId;

  const fallbackSteps = activePresetId
    ? sequenceSettings.presets.find((preset) => preset.id === activePresetId)?.steps
      ?? resolveImageStudioSequenceActiveSteps(sequenceSettings)
    : resolveImageStudioSequenceActiveSteps(sequenceSettings);

  if (isSequenceStepArray(params.requestedSteps)) {
    const fallbackOperations = fallbackSteps.map((step) => step.type);
    return normalizeImageStudioSequenceSteps(params.requestedSteps, {
      fallbackOperations,
    });
  }

  return fallbackSteps;
};

export async function startImageStudioSequenceRun(
  input: StartImageStudioSequenceInput,
): Promise<StartImageStudioSequenceResult> {
  const projectId = asTrimmedString(input.projectId);
  if (!projectId) {
    throw badRequestError('Project id is required.');
  }

  const sourceSlotId = asTrimmedString(input.sourceSlotId);
  if (!sourceSlotId) {
    throw badRequestError('Source slot id is required.');
  }

  const sourceSlot = await getImageStudioSlotById(sourceSlotId);
  if (sourceSlot?.projectId !== projectId) {
    throw notFoundError('Source slot not found in selected project.', {
      sourceSlotId,
      projectId,
    });
  }

  const resolvedPrompt = asTrimmedString(input.prompt);
  if (!resolvedPrompt) {
    throw badRequestError('Sequence prompt is required.');
  }

  const settingsSnapshot = await resolveProjectScopedSettings({
    projectId,
    studioSettings: input.studioSettings,
  });
  const parsedSettings = parseImageStudioSettings(JSON.stringify(settingsSnapshot));

  const sequenceSteps = resolveSequenceSteps({
    parsedSettings,
    requestedSteps: input.steps,
    presetId: asTrimmedString(input.presetId),
  }).filter((step) => step.enabled);

  if (sequenceSteps.length === 0) {
    throw badRequestError('No enabled sequence steps to execute.');
  }

  const run = await createImageStudioSequenceRun({
    projectId,
    sourceSlotId,
    request: {
      projectId,
      sourceSlotId,
      prompt: resolvedPrompt,
      paramsState: input.paramsState ?? null,
      referenceSlotIds: normalizeReferenceSlotIds(input.referenceSlotIds),
      steps: sequenceSteps,
      mask: toMaskContext(input.mask),
      studioSettings: settingsSnapshot,
      metadata: input.metadata ?? null,
    },
  });

  let dispatchMode: ImageStudioSequenceDispatchMode;
  try {
    startImageStudioSequenceQueue();
    dispatchMode = await enqueueImageStudioSequenceJob(run.id);
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Failed to dispatch Image Studio sequence run.';

    await updateImageStudioSequenceRun(run.id, {
      status: 'failed',
      errorMessage,
      finishedAt: new Date().toISOString(),
      appendHistoryEvents: [
        {
          type: 'dispatch_failed',
          source: 'queue',
          message: 'Failed to dispatch sequence run.',
          payload: {
            runId: run.id,
            reason: errorMessage,
          },
        },
      ],
    });

    throw operationFailedError('Failed to dispatch Image Studio sequence run.', {
      runId: run.id,
      reason: errorMessage,
    });
  }

  const latestRun =
    (await updateImageStudioSequenceRun(run.id, {
      dispatchMode,
      appendHistoryEvents: [
        {
          type: 'dispatched',
          source: 'queue',
          message:
            dispatchMode === 'queued'
              ? 'Sequence run dispatched to Redis queue.'
              : 'Sequence run dispatched inline (Redis unavailable).',
          payload: {
            runId: run.id,
            dispatchMode,
            stepCount: sequenceSteps.length,
          },
        },
      ],
    })) ??
    (await getImageStudioSequenceRunById(run.id)) ??
    run;

  return {
    runId: latestRun.id,
    status: latestRun.status,
    dispatchMode,
    currentSlotId: latestRun.currentSlotId,
    stepCount: sequenceSteps.length,
  };
}

export async function cancelImageStudioSequenceRun(
  runId: string,
): Promise<ImageStudioSequenceRunRecord> {
  const normalizedRunId = asTrimmedString(runId);
  if (!normalizedRunId) {
    throw badRequestError('Run id is required.');
  }

  const existing = await getImageStudioSequenceRunById(normalizedRunId);
  if (!existing) {
    throw notFoundError('Sequence run not found.', { runId: normalizedRunId });
  }

  if (
    existing.status === 'completed' ||
    existing.status === 'failed' ||
    existing.status === 'cancelled'
  ) {
    return existing;
  }

  const finishedAt = new Date().toISOString();
  if (existing.status === 'queued') {
    const cancelled = await updateImageStudioSequenceRun(existing.id, {
      status: 'cancelled',
      cancelRequested: true,
      finishedAt,
      errorMessage: 'Sequence cancelled before execution.',
      appendHistoryEvents: [
        {
          type: 'cancelled',
          source: 'api',
          message: 'Sequence cancelled before execution.',
          payload: {
            runId: existing.id,
            status: 'cancelled',
            finishedAt,
          },
        },
      ],
    });

    if (!cancelled) {
      throw operationFailedError('Failed to cancel sequence run.', {
        runId: existing.id,
      });
    }

    return cancelled;
  }

  const requested = await updateImageStudioSequenceRun(existing.id, {
    cancelRequested: true,
    appendHistoryEvents: [
      {
        type: 'cancel_requested',
        source: 'api',
        message: 'Cancellation requested.',
        payload: {
          runId: existing.id,
          status: existing.status,
        },
      },
    ],
  });

  if (!requested) {
    throw operationFailedError('Failed to request sequence cancellation.', {
      runId: existing.id,
    });
  }

  return requested;
}
