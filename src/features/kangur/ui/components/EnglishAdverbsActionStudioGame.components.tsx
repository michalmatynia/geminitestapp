'use client';

import React, { useId } from 'react';
import { Draggable } from '@hello-pangea/dnd';

import {
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  KANGUR_ACCENT_STYLES,
} from '@/features/kangur/ui/design/tokens';
import type { KangurMiniGameTranslate } from '@/features/kangur/ui/constants/mini-game-i18n';
import { cn } from '@/features/kangur/shared/utils';

import {
  ACTION_META,
  ADVERB_TOKEN_META,
  getActionLabel,
  getAdverbDescription,
  getAdverbLabel,
  type AdverbToken,
  type EnglishAdverbActionId,
  type EnglishAdverbId,
} from './EnglishAdverbsActionStudioGame.utils';

export function DraggableAdverbToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
  translate,
}: {
  token: AdverbToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element | React.ReactPortal {
  const meta = ADVERB_TOKEN_META[token.adverb];
  const selectedClass = isSelected ? 'ring-2 ring-sky-400/80 ring-offset-1 ring-offset-white' : '';

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
              'rounded-[18px] border px-3 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[7rem] px-4 py-3 touch-manipulation'
                : 'min-w-[6rem]',
              KANGUR_ACCENT_STYLES[meta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={getAdverbLabel(translate, token.adverb)}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={getAdverbDescription(translate, token.adverb)}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            <span className='flex items-center gap-1.5'>
              <span aria-hidden='true'>{meta.emoji}</span>
              <span>{getAdverbLabel(translate, token.adverb)}</span>
            </span>
            <span className='mt-1.5 block text-[10px] font-semibold opacity-80'>
              {getAdverbDescription(translate, token.adverb)}
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

function ActionProp({
  actionId,
}: {
  actionId: EnglishAdverbActionId;
}): React.JSX.Element {
  switch (actionId) {
    case 'run_race':
      return (
        <>
          <line x1='24' y1='66' x2='208' y2='66' stroke='#94a3b8' strokeDasharray='6 6' strokeWidth='2' />
          <rect x='176' y='24' width='20' height='34' rx='4' fill='#fef3c7' stroke='#f59e0b' strokeWidth='2' />
        </>
      );
    case 'paint_picture':
      return (
        <>
          <rect x='148' y='24' width='40' height='32' rx='8' fill='#f8fafc' stroke='#cbd5e1' strokeWidth='2' />
          <line x1='148' y1='56' x2='138' y2='74' stroke='#a16207' strokeWidth='4' />
          <line x1='188' y1='56' x2='198' y2='74' stroke='#a16207' strokeWidth='4' />
        </>
      );
    case 'carry_books':
      return (
        <>
          <rect x='152' y='34' width='18' height='10' rx='3' fill='#60a5fa' />
          <rect x='154' y='24' width='18' height='10' rx='3' fill='#f59e0b' />
          <rect x='156' y='14' width='18' height='10' rx='3' fill='#22c55e' />
        </>
      );
    case 'play_football':
      return (
        <>
          <rect x='170' y='26' width='34' height='30' rx='6' fill='none' stroke='#cbd5e1' strokeWidth='2' />
          <circle cx='150' cy='60' r='9' fill='#ffffff' stroke='#334155' strokeWidth='2' />
        </>
      );
    case 'write_story':
      return (
        <>
          <rect x='150' y='22' width='44' height='40' rx='10' fill='#ffffff' stroke='#cbd5e1' strokeWidth='2' />
          <line x1='158' y1='36' x2='186' y2='36' stroke='#94a3b8' strokeWidth='2' />
          <line x1='158' y1='46' x2='182' y2='46' stroke='#94a3b8' strokeWidth='2' />
        </>
      );
    case 'sing_song':
      return (
        <>
          <circle cx='178' cy='28' r='10' fill='#0f172a' />
          <rect x='174' y='38' width='8' height='24' rx='4' fill='#0f172a' />
          <line x1='178' y1='62' x2='178' y2='74' stroke='#334155' strokeWidth='3' />
        </>
      );
    case 'dance_show':
      return (
        <>
          <path d='M 164 26 Q 178 12 192 26' fill='none' stroke='#fda4af' strokeWidth='4' />
          <path d='M 160 34 Q 178 48 196 34' fill='none' stroke='#c084fc' strokeWidth='4' />
        </>
      );
  }
}

export function ActionMotionStrip({
  actionId,
  actionLabel,
  dataTestId,
  adverb,
  translate,
}: {
  actionId: EnglishAdverbActionId;
  actionLabel: string;
  dataTestId: string;
  adverb: EnglishAdverbId | null;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const stripId = useId().replace(/:/g, '-');
  const clipId = `${stripId}-clip`;
  const panelGradientId = `${stripId}-panel`;
  const accentGradientId = `${stripId}-accent`;
  const atmosphereGradientId = `${stripId}-atmosphere`;
  const meta = adverb ? ADVERB_TOKEN_META[adverb] : null;

  const actorX =
    adverb === 'fast'
      ? 132
      : adverb === 'carefully'
        ? 108
        : adverb === 'beautifully'
          ? 114
          : adverb === 'happily'
            ? 118
            : adverb === 'well'
              ? 120
              : adverb === 'badly'
                ? 102
                : 108;
  const actorRotation = adverb === 'badly' ? -10 : adverb === 'beautifully' ? 5 : 0;
  const motionClass = adverb === 'fast' ? 'adverb-fast' : adverb === 'badly' ? 'adverb-badly' : 'adverb-soft';

  return (
    <svg
      aria-label={translate('englishAdverbs.inRound.studio.actionAria', {
        action: actionLabel,
        adverb: adverb ? getAdverbLabel(translate, adverb) : 'empty',
      })}
      className='mt-4 h-auto w-full'
      data-testid={dataTestId}
      role='img'
      viewBox='0 0 240 94'
    >
      <style>{`
        .adverb-fast { animation: adverbFast 1.4s ease-in-out infinite; transform-origin: center; }
        .adverb-badly { animation: adverbBadly 1.1s ease-in-out infinite; transform-origin: center; }
        .adverb-soft { animation: adverbSoft 2.4s ease-in-out infinite; transform-origin: center; }
        @keyframes adverbFast { 0%, 100% { transform: translateX(-4px); } 50% { transform: translateX(6px); } }
        @keyframes adverbBadly { 0%, 100% { transform: rotate(-8deg) translateY(1px); } 50% { transform: rotate(7deg) translateY(-1px); } }
        @keyframes adverbSoft { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-2px); } }
        @media (prefers-reduced-motion: reduce) {
          .adverb-fast, .adverb-badly, .adverb-soft { animation: none; }
        }
      `}</style>
      <defs>
        <clipPath id={clipId}>
          <rect data-testid={`${dataTestId}-clip`} x='6' y='8' width='228' height='78' rx='22' />
        </clipPath>
        <linearGradient id={panelGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.98)' />
          <stop offset='55%' stopColor='rgba(248,250,252,0.96)' />
          <stop offset='100%' stopColor='rgba(226,232,240,0.92)' />
        </linearGradient>
        <linearGradient id={accentGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.58)' />
          <stop offset='100%' stopColor={meta ? `${meta.fill}66` : 'rgba(148,163,184,0.24)'} />
        </linearGradient>
        <radialGradient id={atmosphereGradientId} cx='80%' cy='20%' r='76%'>
          <stop offset='0%' stopColor={meta ? `${meta.fill}28` : 'rgba(148,163,184,0.12)'} />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect fill={`url(#${panelGradientId})`} stroke='#dbeafe' strokeWidth='2' x='6' y='8' width='228' height='78' rx='22' />
        <g data-testid={`${dataTestId}-atmosphere`}>
          <ellipse cx='182' cy='24' rx='84' ry='34' fill={`url(#${atmosphereGradientId})`} />
          <ellipse cx='82' cy='74' rx='92' ry='18' fill={meta ? `${meta.fill}12` : 'rgba(148,163,184,0.08)'} />
        </g>
        <rect x='12' y='14' width='216' height='66' rx='18' fill='none' stroke='rgba(255,255,255,0.46)' strokeWidth='1.6' data-testid={`${dataTestId}-frame`} />
      </g>
      <rect x='16' y='16' width='76' height='18' rx='9' fill={`url(#${accentGradientId})`} opacity='0.92' />
      <text fill='#0f172a' fontSize='12' fontWeight='700' x='20' y='28'>
        {adverb ? getAdverbLabel(translate, adverb) : '...'}
      </text>
      <text fill='#475569' fontSize='11' fontWeight='700' x='118' y='28' textAnchor='middle'>
        {ACTION_META[actionId].emoji} {actionLabel}
      </text>
      <ActionProp actionId={actionId} />
      <g
        className={motionClass}
        data-testid={`${dataTestId}-${adverb ?? 'empty'}-motion`}
        transform={`translate(${actorX}, 54) rotate(${actorRotation})`}
      >
        <circle cx='0' cy='-18' r='8' fill='#fcd7c0' stroke='#e2a58f' strokeWidth='1.5' />
        <line x1='0' y1='-10' x2='0' y2='10' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
        <line x1='0' y1='-2' x2='-12' y2='8' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
        <line x1='0' y1='-2' x2='12' y2='8' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
        <line x1='0' y1='10' x2='-12' y2='24' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
        <line x1='0' y1='10' x2='12' y2='24' stroke='#334155' strokeWidth='4' strokeLinecap='round' />
        {adverb === 'happily' ? (
          <>
            <path d='M -4 -20 Q 0 -16 4 -20' fill='none' stroke='#0f172a' strokeWidth='1.5' />
            <text x='16' y='-12' fontSize='12'>♪</text>
          </>
        ) : null}
      </g>
      {adverb === 'fast' ? (
        <g data-testid={`${dataTestId}-speed-lines`}>
          <line x1='84' y1='40' x2='104' y2='40' stroke='#38bdf8' strokeWidth='3' strokeLinecap='round' />
          <line x1='76' y1='52' x2='100' y2='52' stroke='#38bdf8' strokeWidth='3' strokeLinecap='round' />
          <line x1='82' y1='64' x2='102' y2='64' stroke='#38bdf8' strokeWidth='3' strokeLinecap='round' />
        </g>
      ) : null}
      {adverb === 'carefully' ? (
        <g data-testid={`${dataTestId}-care-guides`}>
          <circle cx='108' cy='34' r='3' fill='#22c55e' />
          <circle cx='120' cy='26' r='3' fill='#22c55e' />
          <circle cx='132' cy='34' r='3' fill='#22c55e' />
        </g>
      ) : null}
      {adverb === 'beautifully' ? (
        <g data-testid={`${dataTestId}-beauty-sparkles`}>
          <text x='88' y='34' fontSize='12'>✦</text>
          <text x='140' y='40' fontSize='14'>✦</text>
          <text x='152' y='20' fontSize='10'>✦</text>
        </g>
      ) : null}
      {adverb === 'well' ? (
        <g data-testid={`${dataTestId}-well-stars`}>
          <text x='92' y='36' fontSize='12'>★</text>
          <text x='146' y='26' fontSize='12'>★</text>
        </g>
      ) : null}
      {adverb === 'badly' ? (
        <g data-testid={`${dataTestId}-mistake-splat`}>
          <circle cx='88' cy='62' r='10' fill='rgba(251,113,133,0.22)' />
          <path d='M 80 54 L 96 70 M 96 54 L 80 70' stroke='#fb7185' strokeWidth='3' strokeLinecap='round' />
        </g>
      ) : null}
    </svg>
  );
}

export function SummaryAdverbGuideCard({
  dataTestId,
  adverb,
  translate,
}: {
  dataTestId: string;
  adverb: EnglishAdverbId;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const meta = ADVERB_TOKEN_META[adverb];

  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[meta.accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
        {meta.emoji} {getAdverbLabel(translate, adverb)}
      </p>
      <p className='mt-2 text-sm text-slate-700'>{getAdverbDescription(translate, adverb)}</p>
      <p className='mt-2 text-xs font-semibold text-slate-600'>
        {translate(`englishAdverbs.summary.examples.${adverb}`)}
      </p>
    </div>
  );
}
