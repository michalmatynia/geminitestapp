'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { cn } from '@/features/kangur/shared/utils';
import {
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { kangurInfoCardVariants } from '@/features/kangur/ui/design/primitives/KangurInfoCard';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { usePointerDrag } from './PointerDragProvider';
import type { DraggableBallProps, BallProps, SlotZoneProps, BallItem } from './types';
import { getBallSurfaceStyle, getRectDropZoneSurface } from './utils';

const renderBallFace = ({
  ball,
  isSelected,
  sizeClass,
}: {
  ball: BallItem;
  isSelected: boolean;
  sizeClass: string;
}): React.JSX.Element => (
  <div
    className={cn(
      'relative flex items-center justify-center overflow-hidden rounded-full border text-white shadow-md select-none transition',
      sizeClass,
      isSelected && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white'
    )}
    style={getBallSurfaceStyle(ball.color)}
  >
    <span className='pointer-events-none absolute inset-x-[18%] top-[14%] h-[20%] rounded-full bg-white/55 blur-[1px]' />
    <span className='pointer-events-none absolute inset-x-[20%] bottom-[14%] h-[28%] rounded-full bg-black/10 blur-[7px]' />
    <span className='relative z-10 font-extrabold drop-shadow-[0_1px_2px_rgba(15,23,42,0.35)]'>
      {ball.num}
    </span>
  </div>
);

export function Ball({
  ball,
  small = false,
  isSelected = false,
  isCoarsePointer = false,
}: BallProps & { isSelected?: boolean }): React.JSX.Element {
  const sizeClass = small
    ? isCoarsePointer
      ? 'h-12 w-12 text-base'
      : 'h-9 w-9 text-sm'
    : isCoarsePointer
      ? 'h-16 w-16 text-xl'
      : 'h-14 w-14 text-lg';

  return renderBallFace({ ball, isSelected, sizeClass });
}

export function DraggableBall({
  ball,
  index,
  isDragDisabled = false,
  small = false,
  isSelected = false,
  onSelect,
}: DraggableBallProps): React.ReactElement | React.ReactPortal {
  const isCoarsePointer = useKangurCoarsePointer();
  const draggableBall = ball;
  const dragDisabled = isDragDisabled;
  const selected = isSelected;
  const compact = small;

  return (
    <Draggable
      draggableId={draggableBall.id}
      index={index}
      isDragDisabled={dragDisabled}
      disableInteractiveElementBlocking
    >
      {(draggableProvided, snapshot) => {
        const content = (
          <button
            type='button'
            ref={draggableProvided.innerRef}
            {...draggableProvided.draggableProps}
            {...draggableProvided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              draggableProvided.draggableProps.style,
              isCoarsePointer
            )}
            className={cn(
              'touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer && 'active:scale-[0.98]',
              selected && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white',
              dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
            )}
            aria-label={`Piłka: ${draggableBall.num}`}
            aria-pressed={selected}
            disabled={dragDisabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (dragDisabled || !onSelect) return;
              onSelect();
            }}
          >
            <Ball
              ball={draggableBall}
              small={compact}
              isSelected={selected}
              isCoarsePointer={isCoarsePointer}
            />
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

export function SlotZone({
  id,
  items,
  label,
  checked,
  correct,
  selectedBallId,
  onSelectBall,
  onActivateZone,
}: SlotZoneProps): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const slotZoneTestId = `adding-ball-${id}`;
  const dragDisabled = checked;
  const selectedId = selectedBallId;
  const handleSelectBall = onSelectBall;
  const sizeClass = isCoarsePointer ? 'h-12 w-12 text-base' : 'h-9 w-9 text-sm';

  return (
    <Droppable droppableId={id} direction='horizontal'>
      {(provided, snapshot) => {
        const surface = getRectDropZoneSurface({
          isDraggingOver: snapshot.isDraggingOver,
          checked,
          correct,
        });

        return (
          <div>
            <p className='mb-1 text-center text-xs [color:var(--kangur-page-muted-text)]'>
              {label}
            </p>
            <div
              ref={provided.innerRef}
              className={cn(
                kangurInfoCardVariants({ tone: surface.tone, padding: 'sm' }),
                surface.tone === 'accent' &&
                  cn(
                    KANGUR_ACCENT_STYLES[surface.accent].activeCard,
                    KANGUR_ACCENT_STYLES[surface.accent].activeText
                  ),
                'kangur-panel-shell',
                surface.className,
                'min-h-[52px] min-w-[60px] w-full max-w-[160px] touch-manipulation select-none transition',
                isCoarsePointer && 'min-h-[88px] min-w-[104px]',
                selectedId && 'bg-amber-50/60'
              )}
              data-testid={slotZoneTestId}
              onClick={() => {
                if (!isCoarsePointer || checked || !selectedId || !onActivateZone) return;
                onActivateZone();
              }}
              {...provided.droppableProps}
            >
              {items.map((ball, index) => (
                <Draggable
                  key={ball.id}
                  draggableId={ball.id}
                  index={index}
                  isDragDisabled={dragDisabled}
                  disableInteractiveElementBlocking
                >
                  {(draggableProvided, snapshot) => {
                    const isSelected = selectedId === ball.id;
                    const content = (
                      <button
                        type='button'
                        ref={draggableProvided.innerRef}
                        {...draggableProvided.draggableProps}
                        {...draggableProvided.dragHandleProps}
                        style={getKangurMobileDragHandleStyle(
                          draggableProvided.draggableProps.style,
                          isCoarsePointer
                        )}
                        className={cn(
                          'touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
                          isCoarsePointer && 'active:scale-[0.98]',
                          isSelected && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white',
                          dragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
                        )}
                        aria-label={`Piłka: ${ball.num}`}
                        aria-pressed={isSelected}
                        disabled={dragDisabled}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (dragDisabled || !handleSelectBall) return;
                          handleSelectBall(ball.id);
                        }}
                      >
                        {renderBallFace({ ball, isSelected, sizeClass })}
                      </button>
                    );

                    return renderKangurDragPreview(content, snapshot.isDragging);
                  }}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </div>
        );
      }}
    </Droppable>
  );
}

// ---------------------------------------------------------------------------
// Pointer-based drag components (mobile single-touch drag)
// ---------------------------------------------------------------------------

export type PointerDraggableBallProps = {
  ball: BallItem;
  zoneId: string;
  isDragDisabled?: boolean;
  small?: boolean;
};

export function PointerDraggableBall({
  ball,
  zoneId,
  isDragDisabled = false,
  small = false,
}: PointerDraggableBallProps): React.JSX.Element {
  const { dragState, startDrag } = usePointerDrag();
  const isDragging = dragState?.ballId === ball.id;
  const sizeClass = small ? 'h-12 w-12 text-base' : 'h-16 w-16 text-xl';

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (isDragDisabled || event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();
      startDrag(
        ball.id,
        ball,
        zoneId,
        event.clientX,
        event.clientY,
        event.currentTarget,
      );
    },
    [ball, zoneId, isDragDisabled, startDrag],
  );

  return (
    <button
      type='button'
      aria-label={`Piłka: ${ball.num}`}
      className={cn(
        'touch-none select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
        isDragDisabled ? 'cursor-default' : 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
      )}
      disabled={isDragDisabled}
      onPointerDown={handlePointerDown}
    >
      {renderBallFace({ ball, isSelected: false, sizeClass })}
    </button>
  );
}

export type PointerDropZoneProps = {
  id: string;
  items: BallItem[];
  label: string;
  checked: boolean;
  correct: boolean;
  small?: boolean;
};

type PointerDropZoneResolvedProps = PointerDropZoneProps & {
  surface: ReturnType<typeof getRectDropZoneSurface>;
  ref: React.RefObject<HTMLDivElement | null>;
};

const renderPointerDropZone = ({
  id,
  items,
  label,
  checked,
  small = false,
  surface,
  ref,
}: PointerDropZoneResolvedProps): React.JSX.Element => (
  <div>
    <p className='mb-1 text-center text-xs [color:var(--kangur-page-muted-text)]'>
      {label}
    </p>
    <KangurInfoCard
      ref={ref}
      accent={surface.accent}
      className={cn(
        surface.className,
        'min-h-[88px] min-w-[104px] w-full max-w-[160px] touch-none select-none transition',
      )}
      data-testid={`adding-ball-${id}`}
      padding='sm'
      tone={surface.tone}
    >
      {items.map((ball) => (
        <PointerDraggableBall
          key={ball.id}
          ball={ball}
          zoneId={id}
          isDragDisabled={checked}
          small={small}
        />
      ))}
    </KangurInfoCard>
  </div>
);

export function PointerDropZone({
  id,
  items,
  label,
  checked,
  correct,
  small = false,
}: PointerDropZoneProps): React.JSX.Element {
  const { dragState, hoveredZoneId, registerDropZone, unregisterDropZone } = usePointerDrag();
  const ref = useRef<HTMLDivElement>(null);
  const isDraggingOver = hoveredZoneId === id && dragState !== null;

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    registerDropZone(id, element);
    return () => unregisterDropZone(id);
  }, [id, registerDropZone, unregisterDropZone]);

  const surface = getRectDropZoneSurface({
    isDraggingOver,
    checked,
    correct,
  });

  return renderPointerDropZone({
    id,
    items,
    label,
    checked,
    correct,
    small,
    surface,
    ref,
  });
}
