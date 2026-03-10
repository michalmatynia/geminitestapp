import { GripVertical, Trash2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import {
  IMAGE_STUDIO_SEQUENCE_MAX_STEPS,
  IMAGE_STUDIO_SEQUENCE_OPERATIONS,
  type ImageStudioSequenceOperation,
  type ImageStudioSequenceStep,
} from '@/features/ai/image-studio/utils/studio-settings';
import { useToast } from '@/shared/ui';

import { StudioCard } from '../StudioCard';
import { SequenceStepEditor } from './SequenceStepEditor';
import { SequenceStepEditorRuntimeContext } from './SequenceStepEditorRuntimeContext';
import { PROJECT_SEQUENCE_OPERATION_LABELS } from './sequencing-constants';
import { useSequencingPanelContext } from './SequencingPanelContext';

const createSequenceStepId = (operation: ImageStudioSequenceOperation, index: number): string => {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (typeof randomUuid === 'string' && randomUuid.trim().length > 0) {
    return `step_${operation}_${randomUuid.replace(/-/g, '').slice(0, 12)}`;
  }
  return `step_${index + 1}_${operation}_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
};

const createStepForOperation = (
  operation: ImageStudioSequenceOperation,
  index: number
): ImageStudioSequenceStep => {
  const id = createSequenceStepId(operation, index);

  if (operation === 'crop_center') {
    return {
      id,
      type: 'crop_center',
      runtime: 'server',
      inputSource: 'previous',
      enabled: false,
      label: null,
      onFailure: 'stop',
      retries: 0,
      retryBackoffMs: 1000,
      timeoutMs: null,
      config: {
        kind: 'center_square',
        selectedShapeId: null,
        aspectRatio: null,
        paddingPercent: 0,
        bbox: null,
        polygon: null,
      },
    };
  }

  if (operation === 'mask') {
    return {
      id,
      type: 'mask',
      runtime: 'server',
      inputSource: 'previous',
      enabled: false,
      label: null,
      onFailure: 'stop',
      retries: 0,
      retryBackoffMs: 1000,
      timeoutMs: null,
      config: {
        source: 'current_shapes',
        polygons: [],
        invert: false,
        feather: 0,
        variant: 'white',
        persistMaskSlot: false,
      },
    };
  }

  if (operation === 'upscale') {
    return {
      id,
      type: 'upscale',
      runtime: 'server',
      inputSource: 'previous',
      enabled: false,
      label: null,
      onFailure: 'stop',
      retries: 0,
      retryBackoffMs: 1000,
      timeoutMs: null,
      config: {
        strategy: 'scale',
        scale: 2,
        targetWidth: 2048,
        targetHeight: 2048,
        smoothingQuality: 'high',
      },
    };
  }

  return {
    id,
    type: operation,
    runtime: 'server',
    inputSource: 'previous',
    enabled: false,
    label: null,
    onFailure: 'stop',
    retries: 0,
    retryBackoffMs: 1000,
    timeoutMs: null,
    config: {
      promptMode: 'inherit',
      promptTemplate: null,
      modelOverride: null,
      outputCount: null,
      referencePolicy: 'inherit',
    },
  };
};

export function SequenceStackCard(): React.JSX.Element {
  const {
    editableSequenceSteps,
    enabledRuntimeSteps,
    activeGenerationModel,
    sequencerFieldTooltipsEnabled,
    cropShapeOptions,
    cropShapeGeometryById,
    mutateSteps,
  } = useSequencingPanelContext();

  const { toast } = useToast();
  const [draggingStepId, setDraggingStepId] = useState<string | null>(null);
  const [draggingCatalogOperation, setDraggingCatalogOperation] =
    useState<ImageStudioSequenceOperation | null>(null);
  const [dragSource, setDragSource] = useState<'stack' | 'catalog' | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    stepId: string;
    position: 'before' | 'after';
  } | null>(null);

  const orderedRows = useMemo(
    () =>
      editableSequenceSteps.map((step, index) => ({
        step,
        index,
      })),
    [editableSequenceSteps]
  );

  const enabledOperationSet = useMemo(
    () => new Set(editableSequenceSteps.filter((step) => step.enabled).map((step) => step.type)),
    [editableSequenceSteps]
  );

  const activeStackLabel = useMemo(
    () =>
      enabledRuntimeSteps.map((step) => PROJECT_SEQUENCE_OPERATION_LABELS[step.type]).join(' -> '),
    [enabledRuntimeSteps]
  );

  const notifyStepLimit = useCallback((): void => {
    toast(`You can add up to ${IMAGE_STUDIO_SEQUENCE_MAX_STEPS} sequence steps.`, {
      variant: 'info',
    });
  }, [toast]);

  const updateStep = useCallback(
    (stepId: string, updater: (step: ImageStudioSequenceStep) => ImageStudioSequenceStep): void => {
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.id === stepId);
        if (index < 0) return next;
        next[index] = updater(next[index]!);
        return next;
      });
    },
    [mutateSteps]
  );

  const toggleSequenceStep = useCallback(
    (stepId: string, checked: boolean): void => {
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.id === stepId);
        if (index < 0) return next;
        next[index] = {
          ...next[index]!,
          enabled: checked,
        };
        return next;
      });
    },
    [mutateSteps]
  );

  const appendSequenceOperationToEnd = useCallback(
    (operation: ImageStudioSequenceOperation, options?: { enableStep?: boolean }): void => {
      if (editableSequenceSteps.length >= IMAGE_STUDIO_SEQUENCE_MAX_STEPS) {
        notifyStepLimit();
        return;
      }
      const enableStep = options?.enableStep ?? true;
      mutateSteps((steps) => {
        if (steps.length >= IMAGE_STUDIO_SEQUENCE_MAX_STEPS) return steps;
        const next = [...steps];
        const created = createStepForOperation(operation, next.length);
        next.push(enableStep ? { ...created, enabled: true } : created);
        return next;
      });
    },
    [editableSequenceSteps.length, mutateSteps, notifyStepLimit]
  );

  const insertSequenceOperationRelative = useCallback(
    (
      operation: ImageStudioSequenceOperation,
      targetStepId: string,
      position: 'before' | 'after',
      options?: { enableStep?: boolean }
    ): void => {
      if (editableSequenceSteps.length >= IMAGE_STUDIO_SEQUENCE_MAX_STEPS) {
        notifyStepLimit();
        return;
      }
      const enableStep = options?.enableStep ?? true;
      mutateSteps((steps) => {
        if (steps.length >= IMAGE_STUDIO_SEQUENCE_MAX_STEPS) return steps;
        const next = [...steps];
        const pivotIndex = next.findIndex((step) => step.id === targetStepId);
        if (pivotIndex < 0) return next;
        const created = createStepForOperation(operation, next.length);
        const insertIndex = position === 'before' ? pivotIndex : pivotIndex + 1;
        next.splice(insertIndex, 0, enableStep ? { ...created, enabled: true } : created);
        return next;
      });
    },
    [editableSequenceSteps.length, mutateSteps, notifyStepLimit]
  );

  const moveSequenceStep = useCallback(
    (sourceStepId: string, targetStepId: string, position: 'before' | 'after'): void => {
      if (sourceStepId === targetStepId) return;
      mutateSteps((steps) => {
        const next = [...steps];
        const sourceIndex = next.findIndex((step) => step.id === sourceStepId);
        const pivotIndex = next.findIndex((step) => step.id === targetStepId);
        if (sourceIndex < 0 || pivotIndex < 0) return next;

        const [moved] = next.splice(sourceIndex, 1);
        if (!moved) return next;

        const resolvedPivotIndex = next.findIndex((step) => step.id === targetStepId);
        if (resolvedPivotIndex < 0) {
          next.splice(sourceIndex, 0, moved);
          return next;
        }

        const insertIndex = position === 'before' ? resolvedPivotIndex : resolvedPivotIndex + 1;
        next.splice(insertIndex, 0, moved);
        return next;
      });
    },
    [mutateSteps]
  );

  const moveSequenceStepToEnd = useCallback(
    (stepId: string): void => {
      mutateSteps((steps) => {
        const next = [...steps];
        const sourceIndex = next.findIndex((step) => step.id === stepId);
        if (sourceIndex < 0) return next;
        const [moved] = next.splice(sourceIndex, 1);
        if (!moved) return next;
        next.push(moved);
        return next;
      });
    },
    [mutateSteps]
  );

  const removeSequenceStepFromStack = useCallback(
    (stepId: string): void => {
      mutateSteps((steps) => steps.filter((step) => step.id !== stepId));
    },
    [mutateSteps]
  );

  const clearDragState = useCallback((): void => {
    setDraggingStepId(null);
    setDraggingCatalogOperation(null);
    setDragSource(null);
    setDropIndicator(null);
  }, []);

  const resolveDropPosition = useCallback(
    (event: React.DragEvent<HTMLDivElement>): 'before' | 'after' => {
      const rect = event.currentTarget.getBoundingClientRect();
      const midpoint = rect.top + rect.height / 2;
      if (event.clientY <= midpoint) return 'before';
      return 'after';
    },
    []
  );

  const handleStackItemDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, stepId: string): void => {
      setDraggingStepId(stepId);
      setDraggingCatalogOperation(null);
      setDragSource('stack');
      setDropIndicator(null);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', stepId);
    },
    []
  );

  const handleCatalogItemDragStart = useCallback(
    (event: React.DragEvent<HTMLButtonElement>, operation: ImageStudioSequenceOperation): void => {
      setDraggingCatalogOperation(operation);
      setDraggingStepId(null);
      setDragSource('catalog');
      setDropIndicator(null);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', operation);
    },
    []
  );

  const handleStackItemDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>, stepId: string): void => {
      if (dragSource === 'catalog' && !draggingCatalogOperation) return;
      if (dragSource === 'stack' && !draggingStepId) return;
      if (dragSource === 'stack' && draggingStepId === stepId) return;
      if (!dragSource) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const position = resolveDropPosition(event);
      setDropIndicator((current) => {
        if (current?.stepId === stepId && current.position === position) {
          return current;
        }
        return { stepId, position };
      });
    },
    [dragSource, draggingCatalogOperation, draggingStepId, resolveDropPosition]
  );

  const handleStackItemDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>, targetStepId: string): void => {
      if (!dragSource) return;
      event.preventDefault();

      if (dragSource === 'catalog') {
        if (!draggingCatalogOperation) {
          clearDragState();
          return;
        }
        const position = resolveDropPosition(event);
        insertSequenceOperationRelative(draggingCatalogOperation, targetStepId, position, {
          enableStep: true,
        });
        clearDragState();
        return;
      }

      if (!draggingStepId) {
        clearDragState();
        return;
      }
      if (draggingStepId === targetStepId) {
        clearDragState();
        return;
      }
      const position = resolveDropPosition(event);
      moveSequenceStep(draggingStepId, targetStepId, position);
      clearDragState();
    },
    [
      clearDragState,
      dragSource,
      draggingCatalogOperation,
      draggingStepId,
      insertSequenceOperationRelative,
      moveSequenceStep,
      resolveDropPosition,
    ]
  );

  const hasActiveDrag = Boolean(
    (dragSource === 'catalog' && draggingCatalogOperation) ||
    (dragSource === 'stack' && draggingStepId)
  );

  const handleStackAppendDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (!hasActiveDrag) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      setDropIndicator(null);
    },
    [hasActiveDrag]
  );

  const handleStackAppendDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>): void => {
      if (!hasActiveDrag) return;
      event.preventDefault();
      if (dragSource === 'catalog' && draggingCatalogOperation) {
        appendSequenceOperationToEnd(draggingCatalogOperation, {
          enableStep: true,
        });
        clearDragState();
        return;
      }
      if (dragSource === 'stack' && draggingStepId) {
        moveSequenceStepToEnd(draggingStepId);
        clearDragState();
        return;
      }
      clearDragState();
    },
    [
      appendSequenceOperationToEnd,
      clearDragState,
      dragSource,
      draggingCatalogOperation,
      draggingStepId,
      hasActiveDrag,
      moveSequenceStepToEnd,
    ]
  );
  const sequenceStepEditorRuntimeValue = useMemo(
    () => ({
      activeGenerationModel,
      cropShapeOptions,
      cropShapeGeometryById,
      sequencerFieldTooltipsEnabled,
      updateStep,
    }),
    [
      activeGenerationModel,
      cropShapeGeometryById,
      cropShapeOptions,
      sequencerFieldTooltipsEnabled,
      updateStep,
    ]
  );

  return (
    <SequenceStepEditorRuntimeContext.Provider value={sequenceStepEditorRuntimeValue}>
      <StudioCard label='Stack' className='shrink-0'>
        <div className='space-y-1.5'>
          <div className='rounded border border-border/50 bg-card/30 p-[7px]'>
            <div className='mb-1.5 flex items-center justify-between gap-2 text-[10px] text-gray-400'>
              <span
                className='min-w-0 truncate'
                title='Step Catalog (drag or click to add at stack end)'
              >
                Step Catalog (drag or click to add at stack end)
              </span>
              <span>
                {editableSequenceSteps.length}/{IMAGE_STUDIO_SEQUENCE_MAX_STEPS}
              </span>
            </div>
            <div className='flex flex-wrap gap-1.5'>
              {IMAGE_STUDIO_SEQUENCE_OPERATIONS.map((operation) => {
                const enabled = enabledOperationSet.has(operation);
                return (
                  <button
                    key={`catalog_${operation}`}
                    type='button'
                    draggable
                    onClick={() => {
                      appendSequenceOperationToEnd(operation);
                    }}
                    onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                      handleCatalogItemDragStart(event, operation);
                    }}
                    onDragEnd={clearDragState}
                    className={`inline-flex min-w-0 items-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors ${
                      enabled
                        ? 'border-blue-400/60 bg-blue-500/10 text-blue-200'
                        : 'border-border/60 bg-card/40 text-gray-200 hover:text-gray-100'
                    }`}
                    title={`Add ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} to stack`}
                    aria-label={`Add ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} to stack`}
                  >
                    <GripVertical className='size-3' />
                    {PROJECT_SEQUENCE_OPERATION_LABELS[operation]}
                  </button>
                );
              })}
            </div>
          </div>
          <div className='text-[10px] text-gray-500'>Drag step handles to reorder the stack.</div>
          {orderedRows.map(({ step, index }) => {
            const operation = step.type;
            const enabled = step.enabled;
            const isDragSource = dragSource === 'stack' && draggingStepId === step.id;
            const showDropBefore =
              dropIndicator?.stepId === step.id && dropIndicator.position === 'before';
            const showDropAfter =
              dropIndicator?.stepId === step.id && dropIndicator.position === 'after';
            return (
              <div
                key={step.id}
                className='rounded border border-border/50 bg-card/40 px-2 py-[7px]'
                onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                  handleStackItemDragOver(event, step.id);
                }}
                onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                  handleStackItemDrop(event, step.id);
                }}
                onDragLeave={(event: React.DragEvent<HTMLDivElement>) => {
                  if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                  setDropIndicator((current) => (current?.stepId === step.id ? null : current));
                }}
              >
                {showDropBefore ? (
                  <div className='mb-2 h-0.5 rounded bg-blue-400/80' aria-hidden='true' />
                ) : null}
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-2 text-[10px] text-gray-200'>
                    <button
                      type='button'
                      draggable
                      className='inline-flex h-6 w-6 cursor-grab items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 hover:text-gray-100 active:cursor-grabbing'
                      onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                        handleStackItemDragStart(event, step.id);
                      }}
                      onDragEnd={clearDragState}
                      aria-label={`Drag to reorder ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]}`}
                      title={`Drag to reorder ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]}`}
                    >
                      <GripVertical className='size-3.5' />
                    </button>
                    <label className='flex min-w-0 items-center gap-2 text-[10px] text-gray-200'>
                      <input
                        type='checkbox'
                        className='h-3.5 w-3.5'
                        checked={enabled}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                          toggleSequenceStep(step.id, event.target.checked)
                        }
                      />
                      <span
                        className='truncate'
                        title={PROJECT_SEQUENCE_OPERATION_LABELS[operation]}
                      >
                        {PROJECT_SEQUENCE_OPERATION_LABELS[operation]}
                      </span>
                      <span className='text-gray-500'>#{index + 1}</span>
                    </label>
                  </div>
                  <div className='flex items-center gap-2'>
                    {isDragSource ? (
                      <span className='text-[9px] uppercase tracking-wide text-blue-300'>
                        Dragging
                      </span>
                    ) : null}
                    <button
                      type='button'
                      onClick={(): void => removeSequenceStepFromStack(step.id)}
                      className='inline-flex h-6 w-6 items-center justify-center rounded border border-red-400/40 bg-red-500/10 text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100'
                      aria-label={`Remove ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} from stack`}
                      title={`Remove ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} from stack`}
                    >
                      <Trash2 className='size-3.5' />
                    </button>
                  </div>
                </div>

                {enabled ? (
                  <SequenceStepEditor stepId={step.id} operation={operation} step={step} />
                ) : null}

                {showDropAfter ? (
                  <div className='mt-2 h-0.5 rounded bg-blue-400/80' aria-hidden='true' />
                ) : null}
              </div>
            );
          })}
          <div
            className={`rounded border border-dashed px-2 py-[7px] text-center text-[10px] ${
              hasActiveDrag
                ? 'border-blue-400/70 bg-blue-500/10 text-blue-200'
                : 'border-border/60 bg-card/20 text-gray-500'
            }`}
            onDragOver={handleStackAppendDragOver}
            onDrop={handleStackAppendDrop}
          >
            Drop step here to append it to the end of stack.
          </div>
          <div className='text-[10px] text-gray-500'>
            {enabledRuntimeSteps.length > 0
              ? `Current stack: ${activeStackLabel}`
              : 'No enabled operations.'}
          </div>
        </div>
      </StudioCard>
    </SequenceStepEditorRuntimeContext.Provider>
  );
}
