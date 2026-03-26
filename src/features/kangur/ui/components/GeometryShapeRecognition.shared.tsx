'use client';

import type * as React from 'react';
import { useId } from 'react';

import type { LessonTranslate } from './lesson-copy';

export type ShapeId = 'circle' | 'square' | 'triangle' | 'rectangle' | 'oval' | 'diamond';

export type ShapeDefinition = {
  id: ShapeId;
  label: string;
  clue: string;
  color: string;
};

export type ShapeRound = {
  id: ShapeId;
  shape: ShapeId;
  correct: ShapeId;
  options: readonly ShapeId[];
};

const SHAPE_META: Array<{ id: ShapeId; color: string }> = [
  { id: 'circle', color: '#38bdf8' },
  { id: 'square', color: '#4ade80' },
  { id: 'triangle', color: '#fbbf24' },
  { id: 'rectangle', color: '#fb7185' },
  { id: 'oval', color: '#a78bfa' },
  { id: 'diamond', color: '#f97316' },
];

export const SHAPE_ROUNDS: ShapeRound[] = [
  { id: 'circle', shape: 'circle', correct: 'circle', options: ['circle', 'square', 'triangle'] },
  {
    id: 'triangle',
    shape: 'triangle',
    correct: 'triangle',
    options: ['triangle', 'rectangle', 'circle'],
  },
  {
    id: 'square',
    shape: 'square',
    correct: 'square',
    options: ['square', 'diamond', 'rectangle'],
  },
  {
    id: 'rectangle',
    shape: 'rectangle',
    correct: 'rectangle',
    options: ['rectangle', 'square', 'oval'],
  },
  { id: 'oval', shape: 'oval', correct: 'oval', options: ['oval', 'circle', 'diamond'] },
  {
    id: 'diamond',
    shape: 'diamond',
    correct: 'diamond',
    options: ['diamond', 'square', 'triangle'],
  },
];

export const buildGeometryShapeDefinitions = (
  translate: LessonTranslate
): ShapeDefinition[] =>
  SHAPE_META.map((shape) => ({
    ...shape,
    label: translate(`shapes.${shape.id}.label`),
    clue: translate(`shapes.${shape.id}.clue`),
  }));

export const ShapeIcon = ({
  shape,
  color,
  className,
}: {
  shape: ShapeId;
  color: string;
  className?: string;
}): React.JSX.Element => {
  const baseId = useId().replace(/:/g, '');
  const stroke = '#0f172a';
  const testIdPrefix = `geometry-shape-icon-${shape}`;
  const clipId = `${testIdPrefix}-${baseId}-clip`;
  const panelGradientId = `${testIdPrefix}-${baseId}-panel`;
  const frameGradientId = `${testIdPrefix}-${baseId}-frame`;
  const shapeGradientId = `${testIdPrefix}-${baseId}-shape`;

  return (
    <svg
      aria-hidden='true'
      className={className ?? 'h-20 w-20'}
      data-testid={`${testIdPrefix}-animation`}
      fill='none'
      viewBox='0 0 120 120'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <clipPath id={clipId}>
          <rect height='120' rx='32' width='120' x='0' y='0' />
        </clipPath>
        <linearGradient id={panelGradientId} x1='14' x2='110' y1='10' y2='112'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.95)' />
          <stop offset='100%' stopColor='rgba(255,255,255,0.72)' />
        </linearGradient>
        <linearGradient id={frameGradientId} x1='18' x2='102' y1='14' y2='106'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.88)' />
          <stop offset='100%' stopColor='rgba(226,232,240,0.45)' />
        </linearGradient>
        <linearGradient id={shapeGradientId} x1='26' x2='96' y1='28' y2='94'>
          <stop offset='0%' stopColor={color} stopOpacity='0.96' />
          <stop offset='100%' stopColor={color} stopOpacity='0.72' />
        </linearGradient>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect fill={`url(#${panelGradientId})`} height='120' rx='32' width='120' />
        <rect
          fill='rgba(255,255,255,0.38)'
          height='90'
          rx='24'
          stroke='rgba(255,255,255,0.54)'
          strokeWidth='1.5'
          width='90'
          x='15'
          y='16'
        />
        <rect
          fill={`url(#${frameGradientId})`}
          height='96'
          rx='28'
          stroke='rgba(148,163,184,0.32)'
          strokeWidth='1.5'
          width='96'
          x='12'
          y='12'
        />
        <circle cx='26' cy='24' fill='rgba(255,255,255,0.55)' r='9' />
        <circle cx='96' cy='96' fill='rgba(255,255,255,0.26)' r='12' />
        <circle cx='34' cy='92' fill='rgba(255,255,255,0.2)' r='7' />
        {shape === 'circle' ? (
          <circle
            cx='60'
            cy='60'
            fill={`url(#${shapeGradientId})`}
            r='27'
            stroke={stroke}
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth='3.5'
          />
        ) : null}
        {shape === 'square' ? (
          <rect
            fill={`url(#${shapeGradientId})`}
            height='50'
            rx='12'
            stroke={stroke}
            strokeLinejoin='round'
            strokeWidth='3.5'
            width='50'
            x='35'
            y='35'
          />
        ) : null}
        {shape === 'triangle' ? (
          <path
            d='M60 28L90 86H30L60 28Z'
            fill={`url(#${shapeGradientId})`}
            stroke={stroke}
            strokeLinejoin='round'
            strokeWidth='3.5'
          />
        ) : null}
        {shape === 'rectangle' ? (
          <rect
            fill={`url(#${shapeGradientId})`}
            height='40'
            rx='12'
            stroke={stroke}
            strokeLinejoin='round'
            strokeWidth='3.5'
            width='64'
            x='28'
            y='40'
          />
        ) : null}
        {shape === 'oval' ? (
          <ellipse
            cx='60'
            cy='60'
            fill={`url(#${shapeGradientId})`}
            rx='32'
            ry='24'
            stroke={stroke}
            strokeLinejoin='round'
            strokeWidth='3.5'
          />
        ) : null}
        {shape === 'diamond' ? (
          <path
            d='M60 24L90 60L60 96L30 60L60 24Z'
            fill={`url(#${shapeGradientId})`}
            stroke={stroke}
            strokeLinejoin='round'
            strokeWidth='3.5'
          />
        ) : null}
      </g>
    </svg>
  );
};
