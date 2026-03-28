'use client';

import React, { useId } from 'react';
import { Draggable } from '@hello-pangea/dnd';
import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import { cn } from '@/features/kangur/shared/utils';
import {
  FREQUENCY_META,
  ACTION_META,
  getFrequencyLabel,
  getFrequencyDescription,
  getFrequencyDaysLitLabel,
  countFrequencyActiveDays,
  WEEKDAY_LABELS,
  type FrequencyToken,
  type EnglishAdverbFrequencyId,
  type EnglishAdverbFrequencyActionId,
} from './EnglishAdverbsFrequencyRoutineGame.utils';
import type { KangurMiniGameTranslate } from '@/features/kangur/ui/constants/mini-game-i18n';

export function DraggableFrequencyToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
  translate,
}: {
  token: FrequencyToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element | React.ReactPortal {
  const meta = FREQUENCY_META[token.frequency];
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
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            type='button'
            className={cn(
              'rounded-[18px] border px-3 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[6.5rem] px-4 py-3 touch-manipulation'
                : 'min-w-[5.75rem]',
              KANGUR_ACCENT_STYLES[meta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={getFrequencyLabel(translate, token.frequency)}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={getFrequencyDescription(translate, token.frequency)}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            <span className='flex items-center gap-1.5'>
              <span aria-hidden='true'>{meta.emoji}</span>
              <span>{getFrequencyLabel(translate, token.frequency)}</span>
            </span>
            <span className='mt-1.5 block text-[10px] font-semibold tracking-[0.08em] opacity-80'>
              {getFrequencyDaysLitLabel(translate, token.frequency)}
            </span>
            <span className='mt-1.5 flex items-center justify-center gap-1'>
              {meta.activeDays.map((isActive, index) => (
                <span
                  key={`${token.id}-preview-${index}`}
                  aria-hidden='true'
                  className={cn(
                    'h-1.5 w-1.5 rounded-full border border-white/70 transition',
                    isActive ? 'bg-current opacity-95' : 'bg-white/45 opacity-60'
                  )}
                  data-active={isActive ? 'true' : 'false'}
                />
              ))}
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

export function RoutineWeekStrip({
  actionId,
  actionLabel,
  dataTestId,
  frequency,
  translate,
}: {
  actionId: EnglishAdverbFrequencyActionId;
  actionLabel: string;
  dataTestId: string;
  frequency: EnglishAdverbFrequencyId | null;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const stripId = useId().replace(/:/g, '-');
  const meta = frequency ? FREQUENCY_META[frequency] : null;
  const actionEmoji = ACTION_META[actionId].emoji;
  const clipId = `${stripId}-clip`;
  const panelGradientId = `${stripId}-panel-gradient`;
  const accentGradientId = `${stripId}-accent-gradient`;
  const atmosphereGradientId = `${stripId}-atmosphere-gradient`;
  const activePointXs = WEEKDAY_LABELS.map((_, index) => ({
    active: meta?.activeDays[index] ?? false,
    x: 28 + index * 28,
  }))
    .filter((point) => point.active)
    .map((point) => point.x);
  const activePath =
    activePointXs.length > 1
      ? `M ${activePointXs
          .map((x, index) => `${index === 0 ? x : `L ${x}`} 48`)
          .join(' ')}`
      : null;

  return (
    <svg
      aria-label={translate('englishAdverbsFrequency.inRound.studio.weekAria', {
        action: actionLabel,
        frequency: frequency ? getFrequencyLabel(translate, frequency) : 'empty',
      })}
      className='mt-4 h-auto w-full'
      data-testid={dataTestId}
      role='img'
      viewBox='0 0 240 94'
    >
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
          <stop offset='100%' stopColor={meta ? `${meta.fill}66` : 'rgba(148,163,184,0.28)'} />
        </linearGradient>
        <radialGradient id={atmosphereGradientId} cx='80%' cy='20%' r='76%'>
          <stop offset='0%' stopColor={meta ? `${meta.fill}30` : 'rgba(148,163,184,0.14)'} />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect fill={`url(#${panelGradientId})`} stroke='#dbeafe' strokeWidth='2' x='6' y='8' width='228' height='78' rx='22' />
        <g data-testid={`${dataTestId}-atmosphere`}>
          <ellipse cx='186' cy='24' rx='82' ry='34' fill={`url(#${atmosphereGradientId})`} />
          <ellipse cx='74' cy='74' rx='92' ry='18' fill={meta ? `${meta.fill}12` : 'rgba(148,163,184,0.08)'} />
        </g>
        <rect x='12' y='14' width='216' height='66' rx='18' fill='none' stroke='rgba(255,255,255,0.46)' strokeWidth='1.6' data-testid={`${dataTestId}-frame`} />
      </g>
      <rect x='16' y='16' width='62' height='18' rx='9' fill={`url(#${accentGradientId})`} opacity='0.92' />
      <text fill='#0f172a' fontSize='12' fontWeight='700' x='20' y='28'>
        {frequency ? getFrequencyLabel(translate, frequency) : '...'}
      </text>
      {activePath ? <path d={activePath} fill='none' stroke={meta?.fill} strokeWidth='4' strokeLinecap='round' strokeLinejoin='round' opacity='0.45' strokeDasharray='8 6' /> : null}
      {WEEKDAY_LABELS.map((label, index) => {
        const isActive = meta?.activeDays[index] ?? false;
        const x = 28 + index * 28;
        return (
          <g key={`${label}-${index}`} transform={`translate(${x}, 48)`}>
            <text fill='#64748b' fontSize='10' fontWeight='700' x='0' y='-14' textAnchor='middle'>{label}</text>
            <circle cx='0' cy='0' r='10' fill={isActive ? meta?.fill : '#e2e8f0'} stroke={isActive ? 'none' : '#cbd5e1'} strokeWidth={isActive ? 0 : 2} />
            {isActive ? (
              <text textAnchor='middle' dominantBaseline='middle' fontSize='11' x='0' y='1'>{actionEmoji}</text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function CompactFrequencyDots({
  dataTestId,
  frequency,
  label,
  compareAgainst,
}: {
  dataTestId: string;
  frequency: EnglishAdverbFrequencyId;
  label: string;
  compareAgainst?: EnglishAdverbFrequencyId;
}): React.JSX.Element {
  const meta = FREQUENCY_META[frequency];
  const compareMeta = compareAgainst ? FREQUENCY_META[compareAgainst] : null;

  return (
    <div className='space-y-1' data-testid={dataTestId}>
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>{label}</p>
      <div className='flex items-center gap-1.5'>
        {meta.activeDays.map((isActive, index) => {
          const isChanged = compareMeta ? compareMeta.activeDays[index] !== isActive : false;
          return (
            <span
              key={`${dataTestId}-${index}`}
              className={cn(
                'h-2.5 w-2.5 rounded-full border border-rose-200 transition',
                isActive ? 'bg-rose-400' : 'bg-white/90',
                isChanged ? 'ring-2 ring-rose-300/80 ring-offset-1 ring-offset-rose-50' : undefined
              )}
              data-testid={`${dataTestId}-day-${index}`}
              data-active={isActive ? 'true' : 'false'}
              data-changed={isChanged ? 'true' : 'false'}
            />
          );
        })}
      </div>
    </div>
  );
}

export function SummaryFrequencyGuideCard({
  dataTestId,
  frequency,
  translate,
}: {
  dataTestId: string;
  frequency: EnglishAdverbFrequencyId;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const meta = FREQUENCY_META[frequency];

  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[meta.accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm font-black text-slate-800'>
          <span aria-hidden='true' className='mr-1'>
            {meta.emoji}
          </span>
          {getFrequencyLabel(translate, frequency)}
        </p>
        <div className='rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-bold text-slate-600'>
          {countFrequencyActiveDays(frequency)}/7
        </div>
      </div>
      <p className='mt-1 text-xs text-slate-600'>{getFrequencyDescription(translate, frequency)}</p>
      <div className='mt-2 flex items-center gap-1.5'>
        {meta.activeDays.map((isActive, index) => (
          <span
            key={`${dataTestId}-day-${index}`}
            className={cn(
              'h-2.5 w-2.5 rounded-full border border-white/80 shadow-sm transition',
              isActive ? 'opacity-100' : 'bg-white/70 opacity-60'
            )}
            style={isActive ? { backgroundColor: meta.fill } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

export function SummaryPatternGuideCard({
  accent,
  dataTestId,
  label,
  sentence,
  parts,
  pattern,
  translate,
}: {
  accent: KangurAccent;
  dataTestId: string;
  label: string;
  sentence: string;
  parts: readonly string[];
  pattern: string;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>{label}</p>
      <p className='mt-1 text-sm font-semibold text-slate-700'>{sentence}</p>
      <div className='mt-3 flex flex-wrap items-center gap-2'>
        {parts.map((part, index) => (
          <span
            key={`${dataTestId}-part-${index}-${part}`}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm',
              index === 1
                ? KANGUR_ACCENT_STYLES[accent].badge
                : 'border-slate-200 bg-white/90 text-slate-700'
            )}
          >
            {part}
          </span>
        ))}
      </div>
      <p className='mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
        {translate('englishAdverbsFrequency.inRound.studio.patternLabel')}{' '}
        <span className='text-slate-700'>
          {translate(`englishAdverbsFrequency.inRound.studio.patterns.${pattern}`)}
        </span>
      </p>
    </div>
  );
}

export function SummaryStarterCard({
  accent,
  dataTestId,
  emoji,
  text,
}: {
  accent: KangurAccent;
  dataTestId: string;
  emoji: string;
  text: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>
        <span aria-hidden='true' className='mr-1.5'>
          {emoji}
        </span>
        {text}
      </p>
    </div>
  );
}

export function SummaryQuestionCard({
  accent,
  dataTestId,
  emoji,
  prompt,
  starter,
}: {
  accent: KangurAccent;
  dataTestId: string;
  emoji: string;
  prompt: string;
  starter: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>
        <span aria-hidden='true' className='mr-1.5'>
          {emoji}
        </span>
        {prompt}
      </p>
      <p className='mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500'>
        {starter}
      </p>
    </div>
  );
}
