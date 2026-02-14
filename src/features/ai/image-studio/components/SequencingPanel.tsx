'use client';

import { useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, Loader2, Play } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import type { VectorShape } from '@/features/vector-drawing';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { Button, SelectSimple, Switch, useToast } from '@/shared/ui';

import { StudioCard } from './StudioCard';
import { useMaskingState } from '../context/MaskingContext';
import { useProjectsState } from '../context/ProjectsContext';
import { usePromptState } from '../context/PromptContext';
import { useSettingsActions, useSettingsState } from '../context/SettingsContext';
import { useSlotsActions, useSlotsState } from '../context/SlotsContext';
import { buildRunRequestPreview } from '../utils/run-request-preview';
import {
  IMAGE_STUDIO_SEQUENCE_OPERATIONS,
  type ImageStudioSequenceOperation,
} from '../utils/studio-settings';

import type { RunStudioEnqueueResult } from '../hooks/useImageStudioMutations';
import type { ImageStudioSlotRecord, StudioSlotsResponse } from '../types';

const POLL_INTERVAL_MS = 1200;
const POLL_MAX_ATTEMPTS = 600;

const UPSCALE_SCALE_OPTIONS = ['1.25', '1.5', '2', '3', '4'].map((value) => ({
  value,
  label: `${value}x`,
}));

const PROJECT_SEQUENCE_OPERATION_LABELS: Record<ImageStudioSequenceOperation, string> = {
  crop_center: 'Center Crop',
  mask: 'Mask',
  generate: 'Generate',
  regenerate: 'Regenerate',
  upscale: 'Upscale',
};

type PolledRunRecord = {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  errorMessage: string | null;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const resolveSlotImageSource = (slot: ImageStudioSlotRecord): string | null =>
  slot.imageFile?.filepath ?? slot.imageUrl ?? null;

const normalizeShapeToPolygons = (shape: VectorShape): Array<Array<{ x: number; y: number }>> => {
  if (shape.type === 'polygon' || shape.type === 'lasso' || shape.type === 'brush') {
    if (!shape.closed || shape.points.length < 3) return [];
    return [shape.points.map((point) => ({ x: clamp01(point.x), y: clamp01(point.y) }))];
  }

  if (shape.type === 'rect') {
    if (shape.points.length < 2) return [];
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];
    return [[
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ]];
  }

  if (shape.type === 'ellipse') {
    if (shape.points.length < 2) return [];
    const xs = shape.points.map((point) => point.x);
    const ys = shape.points.map((point) => point.y);
    const minX = clamp01(Math.min(...xs));
    const maxX = clamp01(Math.max(...xs));
    const minY = clamp01(Math.min(...ys));
    const maxY = clamp01(Math.max(...ys));
    if (maxX <= minX || maxY <= minY) return [];

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rx = (maxX - minX) / 2;
    const ry = (maxY - minY) / 2;
    const steps = 24;

    return [Array.from({ length: steps }, (_value, index) => {
      const theta = (index / steps) * Math.PI * 2;
      return {
        x: clamp01(cx + rx * Math.cos(theta)),
        y: clamp01(cy + ry * Math.sin(theta)),
      };
    })];
  }

  return [];
};

const collectMaskPolygons = (maskShapes: VectorShape[]): Array<Array<{ x: number; y: number }>> => {
  const eligibleShapes = maskShapes.filter((shape) => {
    if (!shape.visible) return false;
    if (shape.type === 'rect' || shape.type === 'ellipse') {
      return shape.points.length >= 2;
    }
    return shape.closed && shape.points.length >= 3;
  });

  return eligibleShapes.flatMap((shape) => normalizeShapeToPolygons(shape));
};

const readGenerationRunId = (slot: ImageStudioSlotRecord): string | null => {
  const metadata = slot.metadata;
  if (!isRecord(metadata)) return null;
  const value = metadata['generationRunId'];
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const readGenerationOutputIndex = (slot: ImageStudioSlotRecord): number => {
  const metadata = slot.metadata;
  if (!isRecord(metadata)) return Number.MAX_SAFE_INTEGER;
  const value = metadata['generationOutputIndex'];
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return Number.MAX_SAFE_INTEGER;
  return Math.floor(parsed);
};

const pickPrimaryGeneratedSlot = (
  slots: ImageStudioSlotRecord[],
  runId: string
): ImageStudioSlotRecord | null => {
  const matches = slots
    .filter((slot) => readGenerationRunId(slot) === runId)
    .sort((a, b) => readGenerationOutputIndex(a) - readGenerationOutputIndex(b));
  return matches[0] ?? null;
};

const resolveSlotDimensions = async (
  slot: ImageStudioSlotRecord
): Promise<{ width: number; height: number }> => {
  const width = slot.imageFile?.width ?? null;
  const height = slot.imageFile?.height ?? null;
  if (width && height && width > 0 && height > 0) {
    return { width, height };
  }

  const source = resolveSlotImageSource(slot);
  if (!source) {
    throw new Error('Working slot has no image source.');
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const target = new Image();
    target.onload = () => resolve(target);
    target.onerror = () => reject(new Error('Failed to load working image dimensions.'));
    target.src = source;
  });

  const resolvedWidth = image.naturalWidth || image.width;
  const resolvedHeight = image.naturalHeight || image.height;
  if (!(resolvedWidth > 0 && resolvedHeight > 0)) {
    throw new Error('Working slot image dimensions are invalid.');
  }
  return { width: resolvedWidth, height: resolvedHeight };
};

export function SequencingPanel(): React.JSX.Element {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { projectId } = useProjectsState();
  const { workingSlot, slots, compositeAssetIds } = useSlotsState();
  const { setWorkingSlotId, setSelectedSlotId } = useSlotsActions();
  const { promptText, paramsState } = usePromptState();
  const { maskShapes, maskInvert, maskFeather } = useMaskingState();
  const { studioSettings } = useSettingsState();
  const { setStudioSettings, saveStudioSettings } = useSettingsActions();

  const [sequenceRunning, setSequenceRunning] = useState(false);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [sequenceLog, setSequenceLog] = useState<string[]>([]);

  const sequenceOperations = useMemo(
    () =>
      studioSettings.projectSequencing.operations.filter((operation): operation is ImageStudioSequenceOperation =>
        IMAGE_STUDIO_SEQUENCE_OPERATIONS.includes(operation)
      ),
    [studioSettings.projectSequencing.operations]
  );

  const appendSequenceLog = useCallback((message: string): void => {
    const timestamp = new Date().toLocaleTimeString();
    setSequenceLog((prev) => [`${timestamp} ${message}`, ...prev].slice(0, 24));
  }, []);

  const toggleSequenceOperation = useCallback(
    (operation: ImageStudioSequenceOperation, checked: boolean): void => {
      setStudioSettings((prev) => {
        const operations = prev.projectSequencing.operations;
        const nextOperations = checked
          ? operations.includes(operation)
            ? operations
            : [...operations, operation]
          : operations.filter((entry) => entry !== operation);
        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            operations: nextOperations,
          },
        };
      });
    },
    [setStudioSettings]
  );

  const moveSequenceOperation = useCallback(
    (operation: ImageStudioSequenceOperation, direction: -1 | 1): void => {
      setStudioSettings((prev) => {
        const operations = [...prev.projectSequencing.operations];
        const index = operations.indexOf(operation);
        if (index < 0) return prev;
        const target = index + direction;
        if (target < 0 || target >= operations.length) return prev;
        [operations[index], operations[target]] = [operations[target]!, operations[index]!];
        return {
          ...prev,
          projectSequencing: {
            ...prev.projectSequencing,
            operations,
          },
        };
      });
    },
    [setStudioSettings]
  );

  const fetchProjectSlots = useCallback(async (): Promise<ImageStudioSlotRecord[]> => {
    if (!projectId) return [];
    const response = await api.get<StudioSlotsResponse>(
      `/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`
    );
    return Array.isArray(response.slots) ? response.slots : [];
  }, [projectId]);

  const waitForRunCompletion = useCallback(async (runId: string): Promise<PolledRunRecord> => {
    for (let attempt = 0; attempt < POLL_MAX_ATTEMPTS; attempt += 1) {
      const response = await api.get<{ run: PolledRunRecord }>(
        `/api/image-studio/runs/${encodeURIComponent(runId)}`
      );
      const run = response.run;
      if (run.status === 'completed' || run.status === 'failed') {
        return run;
      }
      await sleep(POLL_INTERVAL_MS);
    }

    throw new Error('Timed out while waiting for generation run completion.');
  }, []);

  const handleStartSequence = useCallback(async (): Promise<void> => {
    if (!projectId) {
      toast('Select a project first.', { variant: 'info' });
      return;
    }
    if (!workingSlot) {
      toast('Select a working card first.', { variant: 'info' });
      return;
    }
    if (!studioSettings.projectSequencing.enabled) {
      toast('Enable sequencing first.', { variant: 'info' });
      return;
    }
    if (sequenceOperations.length === 0) {
      toast('Select at least one sequence operation.', { variant: 'info' });
      return;
    }
    if (
      sequenceOperations.some((operation) => operation === 'generate' || operation === 'regenerate') &&
      !promptText.trim()
    ) {
      toast('Enter a prompt before running generation steps.', { variant: 'info' });
      return;
    }

    setSequenceRunning(true);
    setSequenceLog([]);
    setActiveStep(null);

    let currentSlot = workingSlot;
    let slotsSnapshot = slots;

    try {
      if (slotsSnapshot.length === 0) {
        slotsSnapshot = await fetchProjectSlots();
      }

      for (let index = 0; index < sequenceOperations.length; index += 1) {
        const operation = sequenceOperations[index]!;
        const operationLabel = PROJECT_SEQUENCE_OPERATION_LABELS[operation];
        setActiveStep(`${index + 1}/${sequenceOperations.length} · ${operationLabel}`);
        appendSequenceLog(`Starting ${operationLabel}.`);

        if (operation === 'crop_center') {
          const dimensions = await resolveSlotDimensions(currentSlot);
          const side = Math.max(1, Math.min(dimensions.width, dimensions.height));
          const cropRect = {
            x: Math.max(0, Math.floor((dimensions.width - side) / 2)),
            y: Math.max(0, Math.floor((dimensions.height - side) / 2)),
            width: side,
            height: side,
          };
          const cropResponse = await api.post<{ slot?: ImageStudioSlotRecord }>(
            `/api/image-studio/slots/${encodeURIComponent(currentSlot.id)}/crop`,
            {
              mode: 'server_bbox',
              cropRect,
            }
          );
          if (!cropResponse.slot?.id) {
            throw new Error('Crop step did not return a slot.');
          }
          currentSlot = cropResponse.slot;
          setWorkingSlotId(currentSlot.id);
          setSelectedSlotId(currentSlot.id);
          slotsSnapshot = await fetchProjectSlots();
          appendSequenceLog(`Center crop created ${currentSlot.name || currentSlot.id}.`);
          continue;
        }

        if (operation === 'mask') {
          const polygons = collectMaskPolygons(maskShapes);
          if (polygons.length === 0) {
            throw new Error('Mask step requires at least one visible closed shape.');
          }
          await api.post<{ masks?: Array<{ slot?: ImageStudioSlotRecord }> }>(
            `/api/image-studio/slots/${encodeURIComponent(currentSlot.id)}/masks`,
            {
              mode: 'server_polygon',
              masks: [
                {
                  variant: 'white',
                  inverted: maskInvert,
                  polygons,
                },
              ],
            }
          );
          appendSequenceLog(`Mask updated using ${polygons.length} polygon(s).`);
          continue;
        }

        if (operation === 'generate' || operation === 'regenerate') {
          const resolvedWorkingSlot =
            slotsSnapshot.find((slot) => slot.id === currentSlot.id) ?? currentSlot;
          const requestPreview = buildRunRequestPreview({
            projectId,
            workingSlot: resolvedWorkingSlot,
            slots: slotsSnapshot,
            compositeAssetIds,
            promptText,
            paramsState,
            maskShapes,
            maskInvert,
            maskFeather,
            studioSettings,
          });
          if (!requestPreview.payload) {
            throw new Error(requestPreview.errors[0] || 'Generation request is invalid.');
          }

          const enqueueResult = await api.post<RunStudioEnqueueResult>(
            '/api/image-studio/run',
            requestPreview.payload
          );
          appendSequenceLog(
            `${operationLabel} run queued (${enqueueResult.dispatchMode === 'inline' ? 'inline runtime' : 'redis runtime'}).`
          );

          const run = await waitForRunCompletion(enqueueResult.runId);
          if (run.status !== 'completed') {
            throw new Error(run.errorMessage || `${operationLabel} failed.`);
          }

          await invalidateImageStudioSlots(queryClient, projectId);
          slotsSnapshot = await fetchProjectSlots();
          const generatedSlot = pickPrimaryGeneratedSlot(slotsSnapshot, enqueueResult.runId);
          if (!generatedSlot) {
            throw new Error('Generation completed but no output slot was found.');
          }

          currentSlot = generatedSlot;
          setWorkingSlotId(currentSlot.id);
          setSelectedSlotId(currentSlot.id);
          appendSequenceLog(`${operationLabel} output set to ${currentSlot.name || currentSlot.id}.`);
          continue;
        }

        if (operation === 'upscale') {
          const upscaleResponse = await api.post<{ slot?: ImageStudioSlotRecord }>(
            `/api/image-studio/slots/${encodeURIComponent(currentSlot.id)}/upscale`,
            {
              mode: 'server_sharp',
              scale: studioSettings.projectSequencing.upscaleScale,
            }
          );
          if (!upscaleResponse.slot?.id) {
            throw new Error('Upscale step did not return a slot.');
          }

          currentSlot = upscaleResponse.slot;
          setWorkingSlotId(currentSlot.id);
          setSelectedSlotId(currentSlot.id);
          slotsSnapshot = await fetchProjectSlots();
          appendSequenceLog(`Upscale created ${currentSlot.name || currentSlot.id}.`);
        }
      }

      appendSequenceLog('Sequence completed.');
      toast('Sequence completed.', { variant: 'success' });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sequence failed.';
      appendSequenceLog(`Failed: ${message}`);
      toast(message, { variant: 'error' });
    } finally {
      setSequenceRunning(false);
      setActiveStep(null);
      await invalidateImageStudioSlots(queryClient, projectId);
    }
  }, [
    appendSequenceLog,
    compositeAssetIds,
    fetchProjectSlots,
    maskFeather,
    maskInvert,
    maskShapes,
    paramsState,
    projectId,
    promptText,
    queryClient,
    sequenceOperations,
    setSelectedSlotId,
    setWorkingSlotId,
    slots,
    studioSettings,
    toast,
    waitForRunCompletion,
    workingSlot,
  ]);

  const operationStackLabel = useMemo(
    () => sequenceOperations.map((operation) => PROJECT_SEQUENCE_OPERATION_LABELS[operation]).join(' → '),
    [sequenceOperations]
  );

  return (
    <div className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-4 pt-2'>
      <StudioCard label='Sequencing' className='shrink-0'>
        <div className='space-y-3'>
          <div className='flex flex-wrap items-center gap-3'>
            <label className='flex items-center gap-2 text-[11px] text-gray-200'>
              <Switch
                checked={studioSettings.projectSequencing.enabled}
                onCheckedChange={(checked: boolean) =>
                  setStudioSettings((prev) => ({
                    ...prev,
                    projectSequencing: {
                      ...prev.projectSequencing,
                      enabled: Boolean(checked),
                    },
                  }))
                }
                aria-label='Enable sequencing'
              />
              <span>Enable Sequencing</span>
            </label>
            <div className='text-[11px] text-gray-500'>
              Trigger: {studioSettings.projectSequencing.trigger}
            </div>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            <SelectSimple
              size='sm'
              className='w-[120px]'
              value={String(studioSettings.projectSequencing.upscaleScale)}
              onValueChange={(value: string) => {
                const numeric = Number(value);
                if (!Number.isFinite(numeric)) return;
                setStudioSettings((prev) => ({
                  ...prev,
                  projectSequencing: {
                    ...prev.projectSequencing,
                    upscaleScale: numeric,
                  },
                }));
              }}
              options={UPSCALE_SCALE_OPTIONS}
              triggerClassName='h-8 text-xs'
              ariaLabel='Sequence upscale scale'
            />
            <Button
              size='xs'
              variant='outline'
              type='button'
              onClick={() => {
                void saveStudioSettings({ silent: true }).then(() => {
                  toast('Sequencing defaults saved.', { variant: 'success' });
                }).catch((error: unknown) => {
                  toast(error instanceof Error ? error.message : 'Failed to save sequencing defaults.', {
                    variant: 'error',
                  });
                });
              }}
            >
              Save Defaults
            </Button>
          </div>
        </div>
      </StudioCard>

      <StudioCard label='Stack' className='shrink-0'>
        <div className='space-y-2'>
          {IMAGE_STUDIO_SEQUENCE_OPERATIONS.map((operation) => {
            const enabled = sequenceOperations.includes(operation);
            const orderIndex = sequenceOperations.indexOf(operation);
            return (
              <div
                key={operation}
                className='flex items-center justify-between rounded border border-border/50 bg-card/40 px-2 py-1.5'
              >
                <label className='flex items-center gap-2 text-[11px] text-gray-200'>
                  <input
                    type='checkbox'
                    className='h-3.5 w-3.5'
                    checked={enabled}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                      toggleSequenceOperation(operation, event.target.checked)
                    }
                  />
                  <span>{PROJECT_SEQUENCE_OPERATION_LABELS[operation]}</span>
                  {enabled ? <span className='text-gray-500'>#{orderIndex + 1}</span> : null}
                </label>
                <div className='flex items-center gap-1'>
                  <Button
                    size='xs'
                    type='button'
                    variant='outline'
                    className='h-7 px-2'
                    onClick={() => moveSequenceOperation(operation, -1)}
                    disabled={!enabled || orderIndex <= 0}
                    aria-label={`Move ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} up`}
                  >
                    <ArrowUp className='size-3.5' />
                  </Button>
                  <Button
                    size='xs'
                    type='button'
                    variant='outline'
                    className='h-7 px-2'
                    onClick={() => moveSequenceOperation(operation, 1)}
                    disabled={!enabled || orderIndex < 0 || orderIndex >= sequenceOperations.length - 1}
                    aria-label={`Move ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} down`}
                  >
                    <ArrowDown className='size-3.5' />
                  </Button>
                </div>
              </div>
            );
          })}
          <div className='text-[11px] text-gray-500'>
            {sequenceOperations.length > 0
              ? `Current stack: ${operationStackLabel}`
              : 'No operations selected.'}
          </div>
        </div>
      </StudioCard>

      <StudioCard label='Run' className='shrink-0'>
        <div className='space-y-2'>
          <Button
            size='xs'
            type='button'
            className='w-full'
            onClick={() => {
              void handleStartSequence();
            }}
            disabled={
              sequenceRunning ||
              !projectId ||
              !workingSlot ||
              !studioSettings.projectSequencing.enabled ||
              sequenceOperations.length === 0
            }
          >
            {sequenceRunning ? (
              <Loader2 className='mr-2 size-4 animate-spin' />
            ) : (
              <Play className='mr-2 size-4' />
            )}
            {sequenceRunning ? 'Running Sequence...' : 'Start Sequence'}
          </Button>
          {activeStep ? (
            <div className='text-[11px] text-gray-400'>Active step: {activeStep}</div>
          ) : null}
          <div className='max-h-44 overflow-y-auto rounded border border-border/50 bg-card/40 p-2 text-[11px] text-gray-300'>
            {sequenceLog.length > 0 ? (
              sequenceLog.map((entry) => (
                <div key={entry} className='leading-5'>
                  {entry}
                </div>
              ))
            ) : (
              <div className='text-gray-500'>Sequence logs will appear here.</div>
            )}
          </div>
        </div>
      </StudioCard>
    </div>
  );
}
