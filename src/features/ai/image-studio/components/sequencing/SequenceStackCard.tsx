import { GripVertical, Trash2 } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import { StudioCard } from '../StudioCard';
import { SequenceStepEditor } from './SequenceStepEditor';
import { PROJECT_SEQUENCE_OPERATION_LABELS } from './sequencing-constants';
import {
  IMAGE_STUDIO_SEQUENCE_OPERATIONS,
  type ImageStudioSequenceOperation,
  type ImageStudioSequenceStep,
} from '../../utils/studio-settings';

type SequenceStackCardProps = {
  editableSequenceSteps: ImageStudioSequenceStep[];
  enabledRuntimeSteps: ImageStudioSequenceStep[];
  mutateSteps: (updater: (steps: ImageStudioSequenceStep[]) => ImageStudioSequenceStep[]) => void;
};

const createStepForOperation = (
  operation: ImageStudioSequenceOperation,
  index: number,
): ImageStudioSequenceStep => {
  const id = `step_${index + 1}_${operation}`;

  if (operation === 'crop_center') {
    return {
      id,
      type: 'crop_center',
      runtime: 'server',
      enabled: false,
      label: null,
      onFailure: 'stop',
      retries: 0,
      retryBackoffMs: 1000,
      timeoutMs: null,
      config: {
        kind: 'center_square',
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

export function SequenceStackCard({
  editableSequenceSteps,
  enabledRuntimeSteps,
  mutateSteps,
}: SequenceStackCardProps): React.JSX.Element {
  const [draggingOperation, setDraggingOperation] = useState<ImageStudioSequenceOperation | null>(null);
  const [dragSource, setDragSource] = useState<'stack' | 'catalog' | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    operation: ImageStudioSequenceOperation;
    position: 'before' | 'after';
  } | null>(null);

  const orderedRows = useMemo(
    () =>
      editableSequenceSteps.map((step, index) => ({
        operation: step.type,
        step,
        index,
      })),
    [editableSequenceSteps],
  );

  const enabledOperationSet = useMemo(
    () => new Set(editableSequenceSteps.filter((step) => step.enabled).map((step) => step.type)),
    [editableSequenceSteps],
  );

  const activeStackLabel = useMemo(
    () => enabledRuntimeSteps.map((step) => PROJECT_SEQUENCE_OPERATION_LABELS[step.type]).join(' -> '),
    [enabledRuntimeSteps],
  );

  const updateStep = useCallback(
    (
      operation: ImageStudioSequenceOperation,
      updater: (step: ImageStudioSequenceStep) => ImageStudioSequenceStep,
    ): void => {
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.type === operation);
        if (index < 0) return next;
        next[index] = updater(next[index]!);
        return next;
      });
    },
    [mutateSteps],
  );

  const toggleSequenceOperation = useCallback(
    (operation: ImageStudioSequenceOperation, checked: boolean): void => {
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.type === operation);
        if (index < 0) {
          if (!checked) return next;
          return [...next, { ...createStepForOperation(operation, next.length), enabled: true }];
        }
        next[index] = {
          ...next[index]!,
          enabled: checked,
        };
        return next;
      });
    },
    [mutateSteps],
  );

  const appendSequenceOperationToEnd = useCallback(
    (
      operation: ImageStudioSequenceOperation,
      options?: { enableStep?: boolean },
    ): void => {
      const enableStep = options?.enableStep ?? true;
      mutateSteps((steps) => {
        const next = [...steps];
        const index = next.findIndex((step) => step.type === operation);
        if (index < 0) {
          const created = createStepForOperation(operation, next.length);
          return [
            ...next,
            enableStep ? { ...created, enabled: true } : created,
          ];
        }
        const [moved] = next.splice(index, 1);
        if (!moved) return next;
        next.push({
          ...moved,
          ...(enableStep ? { enabled: true } : {}),
        });
        return next;
      });
    },
    [mutateSteps],
  );

  const moveSequenceOperation = useCallback(
    (
      operation: ImageStudioSequenceOperation,
      targetOperation: ImageStudioSequenceOperation,
      position: 'before' | 'after',
    ): void => {
      if (operation === targetOperation) return;
      mutateSteps((steps) => {
        const next = [...steps];
        const sourceIndex = next.findIndex((step) => step.type === operation);
        const pivotIndex = next.findIndex((step) => step.type === targetOperation);
        if (pivotIndex < 0) return next;

        if (sourceIndex < 0) {
          const created = createStepForOperation(operation, next.length);
          const insertIndex = position === 'before' ? pivotIndex : pivotIndex + 1;
          next.splice(insertIndex, 0, created);
          return next;
        }

        const [moved] = next.splice(sourceIndex, 1);
        if (!moved) return next;

        const resolvedPivotIndex = next.findIndex((step) => step.type === targetOperation);
        if (resolvedPivotIndex < 0) {
          next.splice(sourceIndex, 0, moved);
          return next;
        }

        const insertIndex = position === 'before'
          ? resolvedPivotIndex
          : resolvedPivotIndex + 1;
        next.splice(insertIndex, 0, moved);
        return next;
      });
    },
    [mutateSteps],
  );

  const removeSequenceOperationFromStack = useCallback(
    (operation: ImageStudioSequenceOperation): void => {
      mutateSteps((steps) => steps.filter((step) => step.type !== operation));
    },
    [mutateSteps],
  );

  const clearDragState = useCallback((): void => {
    setDraggingOperation(null);
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
    [],
  );

  const handleStackItemDragStart = useCallback(
    (
      event: React.DragEvent<HTMLButtonElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      setDraggingOperation(operation);
      setDragSource('stack');
      setDropIndicator(null);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', operation);
    },
    [],
  );

  const handleCatalogItemDragStart = useCallback(
    (
      event: React.DragEvent<HTMLButtonElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      setDraggingOperation(operation);
      setDragSource('catalog');
      setDropIndicator(null);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', operation);
    },
    [],
  );

  const handleStackItemDragOver = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      if (!draggingOperation) return;
      if (draggingOperation === operation && dragSource !== 'catalog') return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
      const position = resolveDropPosition(event);
      setDropIndicator((current) => {
        if (current?.operation === operation && current.position === position) {
          return current;
        }
        return { operation, position };
      });
    },
    [dragSource, draggingOperation, resolveDropPosition],
  );

  const handleStackItemDrop = useCallback(
    (
      event: React.DragEvent<HTMLDivElement>,
      operation: ImageStudioSequenceOperation,
    ): void => {
      if (!draggingOperation) return;
      event.preventDefault();
      if (dragSource === 'catalog') {
        if (draggingOperation === operation) {
          toggleSequenceOperation(operation, true);
          clearDragState();
          return;
        }
        const position = resolveDropPosition(event);
        moveSequenceOperation(draggingOperation, operation, position);
        toggleSequenceOperation(draggingOperation, true);
        clearDragState();
        return;
      }
      if (draggingOperation === operation) {
        clearDragState();
        return;
      }
      const position = resolveDropPosition(event);
      moveSequenceOperation(draggingOperation, operation, position);
      clearDragState();
    },
    [
      clearDragState,
      dragSource,
      draggingOperation,
      moveSequenceOperation,
      resolveDropPosition,
      toggleSequenceOperation,
    ],
  );

  const handleStackAppendDragOver = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    if (!draggingOperation) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDropIndicator(null);
  }, [draggingOperation]);

  const handleStackAppendDrop = useCallback((event: React.DragEvent<HTMLDivElement>): void => {
    if (!draggingOperation) return;
    event.preventDefault();
    appendSequenceOperationToEnd(draggingOperation, {
      enableStep: dragSource === 'catalog',
    });
    clearDragState();
  }, [appendSequenceOperationToEnd, clearDragState, dragSource, draggingOperation]);

  return (
    <StudioCard label='Stack' className='shrink-0'>
      <div className='space-y-2'>
        <div className='rounded border border-border/50 bg-card/30 p-2'>
          <div className='mb-2 text-[11px] text-gray-400'>
            Step Catalog (drag or click to add at stack end)
          </div>
          <div className='flex flex-wrap gap-2'>
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
                  className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[11px] transition-colors ${
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
        <div className='text-[11px] text-gray-500'>
          Drag step handles to reorder the stack.
        </div>
        {orderedRows.map(({ operation, step, index }) => {
          const enabled = step.enabled;
          const isDragSource = draggingOperation === operation;
          const showDropBefore =
            dropIndicator?.operation === operation && dropIndicator.position === 'before';
          const showDropAfter =
            dropIndicator?.operation === operation && dropIndicator.position === 'after';
          return (
            <div
              key={operation}
              className='rounded border border-border/50 bg-card/40 px-2 py-2'
              onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                handleStackItemDragOver(event, operation);
              }}
              onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                handleStackItemDrop(event, operation);
              }}
              onDragLeave={(event: React.DragEvent<HTMLDivElement>) => {
                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
                setDropIndicator((current) => (current?.operation === operation ? null : current));
              }}
            >
              {showDropBefore ? (
                <div className='mb-2 h-0.5 rounded bg-blue-400/80' aria-hidden='true' />
              ) : null}
              <div className='flex items-center justify-between gap-2'>
                <div className='flex items-center gap-2 text-[11px] text-gray-200'>
                  <button
                    type='button'
                    draggable
                    className='inline-flex h-6 w-6 cursor-grab items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 hover:text-gray-100 active:cursor-grabbing'
                    onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                      handleStackItemDragStart(event, operation);
                    }}
                    onDragEnd={clearDragState}
                    aria-label={`Drag to reorder ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]}`}
                    title={`Drag to reorder ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]}`}
                  >
                    <GripVertical className='size-3.5' />
                  </button>
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
                    <span className='text-gray-500'>#{index + 1}</span>
                  </label>
                </div>
                <div className='flex items-center gap-2'>
                  {isDragSource ? (
                    <span className='text-[10px] uppercase tracking-wide text-blue-300'>
                      Dragging
                    </span>
                  ) : null}
                  <button
                    type='button'
                    onClick={(): void => removeSequenceOperationFromStack(operation)}
                    className='inline-flex h-6 w-6 items-center justify-center rounded border border-red-400/40 bg-red-500/10 text-red-200 transition-colors hover:bg-red-500/20 hover:text-red-100'
                    aria-label={`Remove ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} from stack`}
                    title={`Remove ${PROJECT_SEQUENCE_OPERATION_LABELS[operation]} from stack`}
                  >
                    <Trash2 className='size-3.5' />
                  </button>
                </div>
              </div>

              {enabled ? (
                <SequenceStepEditor
                  operation={operation}
                  step={step}
                  updateStep={updateStep}
                />
              ) : null}

              {showDropAfter ? (
                <div className='mt-2 h-0.5 rounded bg-blue-400/80' aria-hidden='true' />
              ) : null}
            </div>
          );
        })}
        <div
          className={`rounded border border-dashed px-2 py-2 text-center text-[11px] ${
            draggingOperation
              ? 'border-blue-400/70 bg-blue-500/10 text-blue-200'
              : 'border-border/60 bg-card/20 text-gray-500'
          }`}
          onDragOver={handleStackAppendDragOver}
          onDrop={handleStackAppendDrop}
        >
          Drop step here to append it to the end of stack.
        </div>
        <div className='text-[11px] text-gray-500'>
          {enabledRuntimeSteps.length > 0
            ? `Current stack: ${activeStackLabel}`
            : 'No enabled operations.'}
        </div>
      </div>
    </StudioCard>
  );
}
