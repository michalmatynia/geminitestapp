'use client';

import React from 'react';
import type { RotationGlyph } from './ArtShapesRotationGapGame.data';

export function RotationGlyphVisual({
  glyph,
}: {
  glyph: RotationGlyph;
}): React.JSX.Element {
  return (
    <>
      {glyph === 'circle' ? (
        <circle
          cx='60'
          cy='60'
          r='26'
          fill='var(--art-shapes-accent-start)'
          stroke='var(--kangur-page-text)'
          strokeWidth='4'
        />
      ) : null}
      {glyph === 'ball' ? (
        <>
          <circle
            cx='60'
            cy='60'
            r='26'
            fill='var(--art-shapes-accent-start)'
            stroke='var(--kangur-page-text)'
            strokeWidth='4'
          />
          <path
            d='M34 60 C46 48, 74 48, 86 60'
            fill='none'
            stroke='var(--kangur-page-text)'
            strokeLinecap='round'
            strokeWidth='3'
          />
          <path
            d='M60 34 C48 46, 48 74, 60 86'
            fill='none'
            stroke='var(--kangur-page-text)'
            strokeLinecap='round'
            strokeWidth='3'
          />
        </>
      ) : null}
      {glyph === 'square' ? (
        <rect
          x='34'
          y='34'
          width='52'
          height='52'
          rx='10'
          fill='var(--art-shapes-accent-start)'
          stroke='var(--kangur-page-text)'
          strokeWidth='4'
        />
      ) : null}
      {glyph === 'window' ? (
        <>
          <rect
            x='32'
            y='32'
            width='56'
            height='56'
            rx='10'
            fill='var(--art-shapes-accent-start)'
            stroke='var(--kangur-page-text)'
            strokeWidth='4'
          />
          <line x1='60' x2='60' y1='38' y2='82' stroke='var(--kangur-page-text)' strokeWidth='3' />
          <line x1='38' x2='82' y1='60' y2='60' stroke='var(--kangur-page-text)' strokeWidth='3' />
        </>
      ) : null}
      {glyph === 'triangle' ? (
        <polygon
          points='60,28 90,88 30,88'
          fill='var(--art-shapes-accent-start)'
          stroke='var(--kangur-page-text)'
          strokeWidth='4'
        />
      ) : null}
      {glyph === 'pizza' ? (
        <>
          <polygon
            points='60,28 92,88 28,88'
            fill='var(--art-shapes-accent-start)'
            stroke='var(--kangur-page-text)'
            strokeWidth='4'
          />
          <path
            d='M37 76 Q60 88 83 76'
            fill='none'
            stroke='color-mix(in srgb, var(--art-shapes-accent-end) 62%, var(--kangur-accent-amber-end))'
            strokeLinecap='round'
            strokeWidth='6'
          />
          <circle cx='52' cy='58' r='4' fill='var(--kangur-page-text)' />
          <circle cx='66' cy='67' r='4' fill='var(--kangur-page-text)' />
        </>
      ) : null}
      {glyph === 'rectangle' ? (
        <rect
          x='24'
          y='40'
          width='72'
          height='40'
          rx='10'
          fill='var(--art-shapes-accent-start)'
          stroke='var(--kangur-page-text)'
          strokeWidth='4'
        />
      ) : null}
      {glyph === 'book' ? (
        <>
          <rect
            x='25'
            y='38'
            width='30'
            height='44'
            rx='7'
            fill='var(--art-shapes-accent-start)'
            stroke='var(--kangur-page-text)'
            strokeWidth='4'
          />
          <rect
            x='65'
            y='38'
            width='30'
            height='44'
            rx='7'
            fill='var(--art-shapes-accent-end)'
            stroke='var(--kangur-page-text)'
            strokeWidth='4'
          />
          <line
            x1='60'
            x2='60'
            y1='36'
            y2='84'
            stroke='var(--kangur-page-text)'
            strokeLinecap='round'
            strokeWidth='3'
          />
        </>
      ) : null}
    </>
  );
}
