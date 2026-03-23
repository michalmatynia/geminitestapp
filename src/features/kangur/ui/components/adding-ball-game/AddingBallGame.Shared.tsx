'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { cn } from '@/features/kangur/shared/utils';
import { getKangurMobileDragHandleStyle } from '@/features/kangur/ui/components/KangurDragDropContext';
import { KangurInfoCard } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type { DraggableBallProps, BallProps, SlotZoneProps } from './types';
import { getRectDropZoneSurface } from './utils';

const dragPortal = typeof document === 'undefined' ? null : document.body;

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

  return (
    <div
      className={cn(
        `${sizeClass} rounded-full ${ball.color} flex items-center justify-center shadow-md select-none transition`,
        isSelected && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white'
      )}
    >
      <span className='text-white font-extrabold'>{ball.num}</span>
    </div>
  );
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

        if (snapshot.isDragging && dragPortal) {
          return createPortal(content, dragPortal);
        }

        return content;
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
            <KangurInfoCard
              ref={provided.innerRef}
              accent={surface.accent}
              className={cn(
                surface.className,
                'min-h-[52px] min-w-[60px] w-full max-w-[160px] touch-manipulation select-none transition',
                isCoarsePointer && 'min-h-[88px] min-w-[104px]',
                selectedId && 'bg-amber-50/60'
              )}
              data-testid={slotZoneTestId}
              padding='sm'
              tone={surface.tone}
              onClick={() => {
                if (!isCoarsePointer || checked || !selectedId || !onActivateZone) return;
                onActivateZone();
              }}
              {...provided.droppableProps}
            >
              {items.map((ball, i) => (
                <DraggableBall
                  key={ball.id}
                  ball={ball}
                  index={i}
                  isDragDisabled={dragDisabled}
                  small
                  isSelected={selectedId === ball.id}
                  onSelect={handleSelectBall ? () => handleSelectBall(ball.id) : undefined}
                />
              ))}
              {provided.placeholder}
            </KangurInfoCard>
          </div>
        );
      }}
    </Droppable>
  );
}
