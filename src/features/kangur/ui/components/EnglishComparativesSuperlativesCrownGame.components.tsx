'use client';

import React, { useId } from 'react';
import { Draggable } from '@hello-pangea/dnd';

import {
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import {
  ACTION_META,
  COMPARISON_FORM_META,
  getActionLabel,
  getFormDescription,
  getFormLabel,
  type ComparisonToken,
  type EnglishComparisonActionId,
  type EnglishComparisonFormId,
} from './EnglishComparativesSuperlativesCrownGame.utils';

export function DraggableComparisonToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
}: {
  token: ComparisonToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
}): React.JSX.Element | React.ReactPortal {
  const meta = COMPARISON_FORM_META[token.form];
  const selectedClass = isSelected ? 'ring-2 ring-violet-400/80 ring-offset-1 ring-offset-white' : '';

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
            type='button'
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            className={cn(
              'rounded-[18px] border px-3 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[7rem] px-4 py-3 touch-manipulation'
                : 'min-w-[7rem]',
              KANGUR_ACCENT_STYLES[meta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={getFormLabel(token.form)}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={getFormDescription(token.form)}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            <span className='flex items-center gap-1.5'>
              <span aria-hidden='true'>{meta.emoji}</span>
              <span>{getFormLabel(token.form)}</span>
            </span>
            <span className='mt-1.5 block text-[10px] font-semibold opacity-80'>
              {getFormDescription(token.form)}
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

function renderScene(actionId: EnglishComparisonActionId): React.JSX.Element {
  switch (actionId) {
    case 'tall_compare':
    case 'tall_crown':
      return (
        <>
          <rect x='56' y='48' width='22' height='24' rx='6' fill='#f9a8d4' />
          <rect x='104' y='30' width='24' height='42' rx='6' fill='#93c5fd' />
          <rect x='156' y='40' width='22' height='32' rx='6' fill='#fde68a' />
        </>
      );
    case 'fast_compare':
    case 'fast_crown':
      return (
        <>
          <line x1='40' y1='68' x2='200' y2='68' stroke='#94a3b8' strokeDasharray='6 6' strokeWidth='2' />
          <circle cx='80' cy='52' r='10' fill='#fb7185' />
          <circle cx='126' cy='42' r='10' fill='#38bdf8' />
          <circle cx='170' cy='58' r='10' fill='#fbbf24' />
        </>
      );
    case 'big_compare':
    case 'big_crown':
      return (
        <>
          <circle cx='76' cy='56' r='14' fill='#c084fc' />
          <circle cx='124' cy='48' r='20' fill='#34d399' />
          <circle cx='172' cy='58' r='16' fill='#fbbf24' />
        </>
      );
    case 'funny_compare':
    case 'funny_crown':
      return (
        <>
          <circle cx='74' cy='50' r='14' fill='#93c5fd' />
          <path d='M 68 54 Q 74 58 80 54' fill='none' stroke='#0f172a' strokeWidth='2' />
          <circle cx='124' cy='50' r='14' fill='#fb7185' />
          <path d='M 116 54 Q 124 62 132 54' fill='none' stroke='#0f172a' strokeWidth='2' />
          <circle cx='174' cy='50' r='14' fill='#fbbf24' />
          <path d='M 168 54 Q 174 58 180 54' fill='none' stroke='#0f172a' strokeWidth='2' />
        </>
      );
    case 'beautiful_compare':
    case 'beautiful_crown':
      return (
        <>
          <rect x='56' y='34' width='34' height='28' rx='6' fill='#ffffff' stroke='#93c5fd' strokeWidth='2' />
          <text x='68' y='52' fontSize='12'>•</text>
          <rect x='106' y='30' width='42' height='34' rx='6' fill='#ffffff' stroke='#c084fc' strokeWidth='2' />
          <text x='118' y='48' fontSize='12'>✦</text>
          <rect x='164' y='36' width='34' height='26' rx='6' fill='#ffffff' stroke='#fbbf24' strokeWidth='2' />
          <text x='176' y='52' fontSize='12'>•</text>
        </>
      );
    case 'good_compare':
    case 'good_crown':
      return (
        <>
          <circle cx='76' cy='48' r='12' fill='#93c5fd' />
          <line x1='76' y1='60' x2='76' y2='76' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
          <circle cx='124' cy='40' r='12' fill='#fbbf24' />
          <line x1='124' y1='52' x2='124' y2='76' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
          <circle cx='172' cy='54' r='12' fill='#fca5a5' />
          <line x1='172' y1='66' x2='172' y2='76' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
        </>
      );
  }
}

export function ComparisonSceneStrip({
  actionId,
  form,
  dataTestId,
}: {
  actionId: EnglishComparisonActionId;
  form: EnglishComparisonFormId | null;
  dataTestId: string;
}): React.JSX.Element {
  const stripId = useId().replace(/:/g, '-');
  const clipId = `${stripId}-clip`;
  const panelGradientId = `${stripId}-panel`;
  const atmosphereGradientId = `${stripId}-atmosphere`;
  const meta = form ? COMPARISON_FORM_META[form] : null;

  return (
    <svg
      aria-label={`${getActionLabel(actionId)} scene`}
      className='mt-4 h-auto w-full'
      data-testid={dataTestId}
      role='img'
      viewBox='0 0 240 94'
    >
      <style>{`
        .pulse { animation: compareGlow 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes compareGlow { 0%, 100% { opacity: 0.82; } 50% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
      `}</style>
      <defs>
        <clipPath id={clipId}>
          <rect data-testid={`${dataTestId}-clip`} x='6' y='8' width='228' height='78' rx='22' />
        </clipPath>
        <linearGradient id={panelGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.98)' />
          <stop offset='55%' stopColor='rgba(248,250,252,0.96)' />
          <stop offset='100%' stopColor='rgba(237,233,254,0.92)' />
        </linearGradient>
        <radialGradient id={atmosphereGradientId} cx='78%' cy='24%' r='76%'>
          <stop offset='0%' stopColor={meta ? `${meta.fill}28` : 'rgba(148,163,184,0.12)'} />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect fill={`url(#${panelGradientId})`} stroke='#ddd6fe' strokeWidth='2' x='6' y='8' width='228' height='78' rx='22' />
        <g data-testid={`${dataTestId}-atmosphere`}>
          <ellipse cx='176' cy='24' rx='86' ry='34' fill={`url(#${atmosphereGradientId})`} />
          <ellipse cx='90' cy='74' rx='92' ry='18' fill={meta ? `${meta.fill}12` : 'rgba(148,163,184,0.08)'} />
        </g>
        <rect x='12' y='14' width='216' height='66' rx='18' fill='none' stroke='rgba(255,255,255,0.46)' strokeWidth='1.6' data-testid={`${dataTestId}-frame`} />
      </g>
      <text fill='#475569' fontSize='11' fontWeight='700' x='120' y='28' textAnchor='middle'>
        {ACTION_META[actionId].emoji} {getActionLabel(actionId)}
      </text>
      {renderScene(actionId)}
      {form && COMPARISON_FORM_META[form].degree === 'comparative' ? (
        <g className='pulse' data-testid={`${dataTestId}-compare-arrow`}>
          <line x1='76' y1='22' x2='124' y2='22' stroke={meta?.fill ?? '#8b5cf6'} strokeWidth='3' strokeLinecap='round' />
          <path d='M 116 14 L 124 22 L 116 30' fill='none' stroke={meta?.fill ?? '#8b5cf6'} strokeWidth='3' strokeLinecap='round' strokeLinejoin='round' />
        </g>
      ) : null}
      {form && COMPARISON_FORM_META[form].degree === 'superlative' ? (
        <g className='pulse' data-testid={`${dataTestId}-winner-crown`}>
          <path d='M 110 18 L 116 8 L 124 16 L 132 8 L 138 18 L 138 24 L 110 24 Z' fill='#facc15' stroke='#eab308' strokeWidth='2' />
        </g>
      ) : null}
      {meta ? (
        <text fill='#0f172a' fontSize='12' fontWeight='700' x='18' y='28'>
          {getFormLabel(form as EnglishComparisonFormId)}
        </text>
      ) : null}
    </svg>
  );
}

export function SummaryComparisonGuideCard({
  base,
  comparative,
  superlative,
  hint,
  dataTestId,
}: {
  base: string;
  comparative: EnglishComparisonFormId;
  superlative: EnglishComparisonFormId;
  hint: string;
  dataTestId: string;
}): React.JSX.Element {
  return (
    <div
      className='rounded-[18px] border border-slate-200 bg-slate-50/90 px-3 py-3 text-left shadow-sm'
      data-testid={dataTestId}
    >
      <p className='text-sm font-black text-slate-700'>
        {base} → {getFormLabel(comparative)} → {getFormLabel(superlative)}
      </p>
      <p className='mt-1 text-xs font-semibold text-slate-500'>{hint}</p>
    </div>
  );
}
