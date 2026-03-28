'use client';

import React, { type CSSProperties } from 'react';
import { cn } from '@/features/kangur/shared/utils';
import {
  KANGUR_ACCENT_THEME_VARS,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { RotationGlyph, RotationTempo, RotationTile } from '../ArtShapesRotationGapGame.data';
import { RotationGlyphVisual } from './ArtShapesRotationGapGame.glyphs';

export const ROTATION_TILE_ACCENTS: Record<RotationGlyph, KangurAccent> = {
  circle: 'sky',
  ball: 'sky',
  square: 'amber',
  window: 'amber',
  triangle: 'rose',
  pizza: 'rose',
  rectangle: 'emerald',
  book: 'emerald',
};

export const TEMPO_MARKS: Record<RotationTempo, number> = {
  slow: 1,
  medium: 2,
  fast: 3,
};

export const TEMPO_SECONDS: Record<RotationTempo, number> = {
  slow: 7.2,
  medium: 5.1,
  fast: 3.4,
};

export const getTileAccentStyle = (
  tile: RotationTile | undefined,
  placeholder: boolean | undefined
): CSSProperties => {
  const accent = tile ? ROTATION_TILE_ACCENTS[tile.glyph] : 'amber';
  const themeVars = KANGUR_ACCENT_THEME_VARS[accent];

  return {
    '--art-shapes-accent-start': themeVars.start,
    '--art-shapes-accent-end': themeVars.end,
    '--art-shapes-rest-angle': tile ? `${tile.restAngle}deg` : '0deg',
    ...(tile ? { '--art-shapes-rotation-duration': `${TEMPO_SECONDS[tile.tempo]}s` } : null),
    opacity: placeholder ? 0.92 : 1,
  } as CSSProperties;
};

export type RotationTilePreviewProps = {
  animated?: boolean;
  tile?: RotationTile;
  label: string;
  placeholder?: boolean;
  testId?: string;
  className?: string;
};

export const RotationTilePreview = ({
  animated = true,
  tile,
  label,
  placeholder = false,
  testId,
  className,
}: RotationTilePreviewProps): React.JSX.Element => {
  const tileStyle = getTileAccentStyle(tile, placeholder);

  if (placeholder || !tile) {
    return (
      <div
        aria-label={label}
        className={cn(
          'art-shapes-rotation-tile art-shapes-rotation-tile--placeholder text-[clamp(1.4rem,4.4vw,2rem)] font-black',
          className
        )}
        data-testid={testId}
        style={tileStyle}
      >
        ?
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      className={cn('art-shapes-rotation-tile', className)}
      data-testid={testId}
      style={tileStyle}
    >
      <svg className='art-shapes-rotation-tile__svg' role='img' viewBox='0 0 120 120'>
        <circle className='art-shapes-rotation-tile__orbit' cx='60' cy='60' r='34' />
        <circle className='art-shapes-rotation-tile__core' cx='60' cy='60' r='30' />
        <g
          className={cn(
            'art-shapes-rotation-spinner',
            animated ? null : 'art-shapes-rotation-spinner--static'
          )}
          style={{
            animationDirection: tile.direction === 'ccw' ? 'reverse' : 'normal',
            ...(animated ? { animationDuration: `${TEMPO_SECONDS[tile.tempo]}s` } : null),
          }}
        >
          <RotationGlyphVisual glyph={tile.glyph} />
        </g>
      </svg>
      <div className='art-shapes-rotation-tile__tempo'>
        {Array.from({ length: TEMPO_MARKS[tile.tempo] }).map((_, index) => (
          <span
            key={`${tile.id}-tempo-${index}`}
            aria-hidden='true'
            className='art-shapes-rotation-tile__tempo-dot'
          />
        ))}
      </div>
    </div>
  );
};
