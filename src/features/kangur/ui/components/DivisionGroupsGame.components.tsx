'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { cn } from '@/features/kangur/shared/utils';
import type { TokenItem } from './DivisionGroupsGame.types';

export function DraggableToken({
  token,
  index,
  ariaLabel,
  isDragDisabled,
  isCoarsePointer,
  isSelected,
  onClick,
  onSelect,
}: {
  token: TokenItem;
  index: number;
  ariaLabel: string;
  isDragDisabled: boolean;
  isCoarsePointer: boolean;
  isSelected: boolean;
  onClick: () => void;
  onSelect: () => void;
}): React.ReactElement | React.ReactPortal {
  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(draggableProvided, snapshot) => {
        const content = (
          <div
            ref={draggableProvided.innerRef}
            {...draggableProvided.draggableProps}
            {...draggableProvided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              draggableProvided.draggableProps.style,
              isCoarsePointer
            )}
            className={cn(
              'flex items-center justify-center rounded-full touch-manipulation select-none transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white active:scale-[0.97]',
              isCoarsePointer
                ? 'h-12 w-12 text-lg sm:h-14 sm:w-14 sm:text-xl lg:h-16 lg:w-16'
                : 'h-10 w-10 text-base sm:h-12 sm:w-12 sm:text-lg lg:h-14 lg:w-14',
              token.style,
              isSelected && 'ring-2 ring-amber-300/80 ring-offset-2 ring-offset-white',
              snapshot.isDragging ? 'scale-110' : null,
              isDragDisabled ? 'cursor-default opacity-80' : 'cursor-grab active:cursor-grabbing'
            )}
            onClick={(event) => {
              event.stopPropagation();
              if (!isDragDisabled) {
                if (isCoarsePointer) {
                  onSelect();
                  return;
                }
                onClick();
              }
            }}
            role='button'
            aria-label={ariaLabel}
            aria-pressed={isSelected}
            aria-disabled={isDragDisabled}
            tabIndex={isDragDisabled ? -1 : 0}
            onKeyDown={(event) => {
              if (isDragDisabled) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
              }
            }}
          >
            <span aria-hidden='true'>{token.emoji}</span>
          </div>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}
