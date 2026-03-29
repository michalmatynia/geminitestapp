'use client';

import { Draggable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { createPortal } from 'react-dom';

import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

export type TileId = 'point' | 'segment' | 'side' | 'angle';

export type LabelTile = {
  id: TileId;
  icon: string;
  accent: KangurAccent;
};

export const LABEL_TILES: LabelTile[] = [
  { id: 'point', icon: '●', accent: 'sky' },
  { id: 'segment', icon: '—', accent: 'teal' },
  { id: 'side', icon: '▭', accent: 'slate' },
  { id: 'angle', icon: '∟', accent: 'amber' },
];

const dragPortal = typeof document === 'undefined' ? null : document.body;

const ringClasses: Record<KangurAccent, string> = {
  indigo: 'ring-indigo-400/70',
  violet: 'ring-violet-400/70',
  emerald: 'ring-emerald-400/70',
  sky: 'ring-sky-400/70',
  amber: 'ring-amber-400/70',
  rose: 'ring-rose-400/70',
  teal: 'ring-teal-400/70',
  slate: 'ring-slate-400/70',
};

const buildTileClassName = ({
  accent,
  isSelected,
  isDragging,
  isDisabled,
  isCoarsePointer,
  isCompact,
}: {
  accent: KangurAccent;
  isSelected: boolean;
  isDragging: boolean;
  isDisabled: boolean;
  isCoarsePointer: boolean;
  isCompact: boolean;
}): string =>
  cn(
    'inline-flex items-center justify-center gap-2 rounded-full border font-semibold transition touch-manipulation select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
    isCompact ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm',
    isCoarsePointer && (isCompact ? 'min-h-[3rem] min-w-[3rem] active:scale-[0.98] active:shadow-sm' : 'min-h-[4rem] min-w-[4rem] active:scale-[0.98] active:shadow-sm'),
    KANGUR_ACCENT_STYLES[accent].badge,
    !isDisabled && KANGUR_ACCENT_STYLES[accent].hoverCard,
    isSelected && `ring-2 ${ringClasses[accent]} ring-offset-2 ring-offset-white`,
    isDragging && 'scale-[1.03] shadow-[0_18px_40px_-24px_rgba(59,130,246,0.25)]',
    isDisabled ? 'cursor-default opacity-70' : 'cursor-grab active:cursor-grabbing'
  );

const getGeometryBasicsTileLabel = (
  translate: ReturnType<typeof useTranslations>,
  tileId: TileId
): string => translate(`geometryBasics.inRound.tiles.${tileId}`);

export function BoardIllustration({ board }: { board: TileId }): React.JSX.Element {
  switch (board) {
    case 'point':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: point on a coordinate plane'>
          <line x1='40' y1='110' x2='280' y2='110' stroke='currentColor' strokeWidth='2' />
          <line x1='160' y1='30' x2='160' y2='190' stroke='currentColor' strokeWidth='2' />
          <circle cx='90' cy='70' r='6' fill='currentColor' />
          <circle cx='90' cy='70' r='12' fill='none' stroke='currentColor' strokeWidth='2' />
        </svg>
      );
    case 'segment':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: line segment between two endpoints'>
          <circle cx='80' cy='110' r='6' fill='currentColor' />
          <circle cx='240' cy='110' r='6' fill='currentColor' />
          <line x1='80' y1='110' x2='240' y2='110' stroke='currentColor' strokeWidth='5' />
        </svg>
      );
    case 'side':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: side of a rectangle highlighted'>
          <rect x='80' y='50' width='160' height='120' fill='none' stroke='currentColor' strokeWidth='4' />
          <line x1='80' y1='50' x2='240' y2='50' stroke='currentColor' strokeWidth='7' />
        </svg>
      );
    case 'angle':
      return (
        <svg viewBox='0 0 320 220' className='h-full w-full text-slate-300' role='img' aria-label='Diagram: right angle formed by two line segments'>
          <line x1='160' y1='150' x2='160' y2='60' stroke='currentColor' strokeWidth='5' />
          <line x1='160' y1='150' x2='250' y2='150' stroke='currentColor' strokeWidth='5' />
          <path
            d='M160 130 A20 20 0 0 1 180 150'
            fill='none'
            stroke='currentColor'
            strokeWidth='4'
          />
        </svg>
      );
    default:
      return <div />;
  }
}

export function DraggableTile({
  tile,
  index,
  isSelected,
  isDisabled,
  isCoarsePointer,
  isCompact = false,
  onClick,
}: {
  tile: LabelTile;
  index: number;
  isSelected: boolean;
  isDisabled: boolean;
  isCoarsePointer: boolean;
  isCompact?: boolean;
  onClick?: () => void;
}): React.ReactElement | React.ReactPortal {
  const translations = useTranslations('KangurMiniGames');
  const tileLabel = getGeometryBasicsTileLabel(translations, tile.id);

  return (
    <Draggable
      draggableId={tile.id}
      index={index}
      isDragDisabled={isDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const content = (
          <button
            type='button'
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            className={buildTileClassName({
              accent: tile.accent,
              isSelected,
              isDragging: snapshot.isDragging,
              isDisabled,
              isCoarsePointer,
              isCompact,
            })}
            onClick={(event) => {
              event.preventDefault();
              if (onClick && !snapshot.isDragging) {
                onClick();
              }
            }}
            aria-pressed={isSelected}
            aria-label={translations('geometryBasics.inRound.tileAria', { label: tileLabel })}
          >
            <span className='text-base'>{tile.icon}</span>
            <span>{tileLabel}</span>
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
