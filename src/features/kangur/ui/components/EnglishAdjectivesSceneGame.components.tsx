'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  KangurButton,
  KangurHeadline,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';
import {
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  ADJECTIVE_TOKEN_META,
  getAdjectiveFocusLabel,
  getTokenLabel,
  type AdjectiveToken,
} from './EnglishAdjectivesSceneGame.utils';
import type { KangurMiniGameTranslate } from '@/features/kangur/ui/constants/mini-game-i18n';

export function DraggableAdjectiveToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
  translate,
}: {
  token: AdjectiveToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element | React.ReactPortal {
  const meta = ADJECTIVE_TOKEN_META[token.adjective];
  const selectedClass = isSelected ? 'ring-2 ring-indigo-400/80 ring-offset-1 ring-offset-white' : '';

  return (
    <Draggable
      draggableId={token.id}
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
              'rounded-[18px] border px-3 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[5.5rem] px-4 py-3 touch-manipulation'
                : 'min-w-[5rem]',
              KANGUR_ACCENT_STYLES[meta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={getTokenLabel(translate, token.adjective)}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={getTokenLabel(translate, token.adjective)}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            <span className='flex items-center gap-1.5'>
              <span aria-hidden='true'>{meta.emoji}</span>
              <span>{getTokenLabel(translate, token.adjective)}</span>
            </span>
            <span className='mt-1 block text-[10px] font-semibold tracking-[0.08em] opacity-80'>
              {getAdjectiveFocusLabel(translate, token.adjective)}
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}
