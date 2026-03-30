'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import {
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { cn } from '@/features/kangur/shared/utils';
import type { NumberBalanceTile } from '@/features/kangur/games/number-balance/number-balance-generator';
import { TILE_STYLES } from './NumberBalanceRushGame.utils';

export function NumberTile({
  tile,
  index,
  isDragDisabled,
  isSelected,
  isCoarsePointer,
  onClick,
}: {
  tile: NumberBalanceTile;
  index: number;
  isDragDisabled: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
  onClick: () => void;
}): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  return (
    <Draggable
      draggableId={tile.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const content = (
          <button
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            type='button'
            className={cn(
              'flex items-center justify-center rounded-2xl border border-white/70 font-extrabold shadow-[0_12px_28px_-20px_rgba(15,23,42,0.45)] transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'h-20 w-20 text-2xl active:scale-[0.98] active:shadow-sm'
                : 'h-16 w-16 text-xl',
              TILE_STYLES[index % TILE_STYLES.length],
              snapshot.isDragging ? 'scale-105 shadow-[0_18px_36px_-18px_rgba(15,23,42,0.55)]' : '',
              isSelected ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white' : ''
            )}
            aria-label={translations('numberBalance.inRound.tileAria', {
              value: tile.value,
            })}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick();
            }}
          >
            {tile.value}
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}
