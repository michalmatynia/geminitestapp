import { memo, type CSSProperties } from 'react';

import { cn } from '@/features/kangur/shared/utils';
import { KangurLessonCaption } from '@/features/kangur/ui/design/lesson-primitives';
import { KangurOptionCardButton } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_THEME_VARS,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';

import type {
  RotationGlyph,
  RotationTempo,
  RotationTile,
} from './ArtShapesRotationGapGame.data';

const ROTATION_TILE_ACCENTS: Record<RotationGlyph, KangurAccent> = {
  circle: 'sky',
  ball: 'sky',
  square: 'amber',
  window: 'amber',
  triangle: 'rose',
  pizza: 'rose',
  rectangle: 'emerald',
  book: 'emerald',
};

const TEMPO_MARKS: Record<RotationTempo, number> = {
  slow: 1,
  medium: 2,
  fast: 3,
};

const TEMPO_SECONDS: Record<RotationTempo, number> = {
  slow: 7.2,
  medium: 5.1,
  fast: 3.4,
};

const CONNECTED_BOARD_SLOT_SIZE = 88;
const CONNECTED_BOARD_GLYPH_SCALE = 0.72;
const CONNECTED_BOARD_GLYPH_OFFSET =
  (CONNECTED_BOARD_SLOT_SIZE - 120 * CONNECTED_BOARD_GLYPH_SCALE) / 2;
const CONNECTED_BOARD_SLOT_LAYOUTS = [
  { x: 28, y: 30 },
  { x: 136, y: 30 },
  { x: 244, y: 30 },
  { x: 244, y: 138 },
  { x: 136, y: 138 },
  { x: 28, y: 138 },
] as const;
const CONNECTED_BOARD_TRACK_PATH = CONNECTED_BOARD_SLOT_LAYOUTS.map((layout, index) => {
  const centerX = layout.x + CONNECTED_BOARD_SLOT_SIZE / 2;
  const centerY = layout.y + CONNECTED_BOARD_SLOT_SIZE / 2;

  return `${index === 0 ? 'M' : 'L'} ${centerX} ${centerY}`;
}).join(' ');
const CONNECTED_BOARD_CLOSED_TRACK_PATH = `${CONNECTED_BOARD_TRACK_PATH} Z`;

export const ART_SHAPES_ROTATION_GAME_STYLES = `
  .art-shapes-rotation-game {
    --art-shapes-option-card-min-height: clamp(7.25rem, 28vw, 11.75rem);
    --art-shapes-option-card-padding: clamp(0.5rem, 1.6vw, 0.9rem);
  }

  .art-shapes-rotation-pattern-board {
    width: min(100%, 42rem);
    margin-inline: auto;
    border-radius: clamp(1.25rem, 3vw, 2rem);
    padding: clamp(0.5rem, 1.4vw, 0.9rem);
    border: 1px solid color-mix(in srgb, var(--kangur-soft-card-border) 62%, var(--kangur-page-text));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--kangur-soft-card-background) 94%, rgba(255,255,255,0.96)) 0%,
        color-mix(in srgb, var(--kangur-page-background) 86%, var(--kangur-soft-card-background)) 100%
      );
    box-shadow:
      0 22px 48px -34px color-mix(in srgb, var(--kangur-page-text) 16%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.78);
  }

  .art-shapes-rotation-choice-tray {
    width: min(100%, 42rem);
    margin-inline: auto;
    border-radius: clamp(1rem, 2.4vw, 1.6rem);
    border: 1px solid color-mix(in srgb, var(--kangur-soft-card-border) 64%, var(--kangur-page-text));
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--kangur-soft-card-background) 95%, rgba(255,255,255,0.92)) 0%,
        color-mix(in srgb, var(--kangur-page-background) 88%, var(--kangur-soft-card-background)) 100%
      );
    padding: clamp(0.75rem, 1.8vw, 1rem);
    box-shadow:
      0 18px 34px -32px color-mix(in srgb, var(--kangur-page-text) 18%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.72);
  }

  .art-shapes-rotation-choice-tray__header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: clamp(0.55rem, 1.4vw, 0.8rem);
  }

  .art-shapes-rotation-choice-tray__line {
    flex: 1 1 auto;
    height: 1px;
    background:
      linear-gradient(
        90deg,
        transparent 0%,
        color-mix(in srgb, var(--kangur-soft-card-border) 82%, var(--kangur-page-text)) 18%,
        color-mix(in srgb, var(--kangur-soft-card-border) 82%, var(--kangur-page-text)) 82%,
        transparent 100%
      );
  }

  .art-shapes-rotation-choice-tray__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border-radius: 9999px;
    border: 1px solid color-mix(in srgb, var(--kangur-soft-card-border) 60%, var(--kangur-page-text));
    background:
      radial-gradient(
        circle at 50% 35%,
        rgba(255,255,255,0.96) 0%,
        color-mix(in srgb, var(--kangur-soft-card-background) 88%, var(--kangur-page-background)) 100%
      );
    color: color-mix(in srgb, var(--kangur-page-text) 82%, var(--kangur-accent-amber-end));
    font-size: 0.92rem;
    font-weight: 800;
    line-height: 1;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.78);
  }

  .art-shapes-rotation-pattern-board__svg {
    display: block;
    width: 100%;
    height: auto;
  }

  .art-shapes-rotation-pattern-board__frame {
    fill: color-mix(in srgb, var(--kangur-soft-card-background) 94%, white);
    stroke: color-mix(in srgb, var(--kangur-soft-card-border) 72%, var(--kangur-page-text));
    stroke-width: 2;
  }

  .art-shapes-rotation-pattern-board__track {
    fill: none;
    stroke: color-mix(in srgb, var(--kangur-soft-card-border) 58%, var(--kangur-page-text));
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 18;
  }

  .art-shapes-rotation-pattern-board__track-glow {
    fill: none;
    stroke: rgba(255,255,255,0.58);
    stroke-linecap: round;
    stroke-linejoin: round;
    stroke-width: 6;
  }

  .art-shapes-rotation-pattern-board__window {
    fill: color-mix(in srgb, var(--kangur-page-background) 88%, var(--art-shapes-accent-start));
    stroke: color-mix(in srgb, var(--art-shapes-accent-end) 46%, var(--kangur-soft-card-border));
    stroke-width: 2;
  }

  .art-shapes-rotation-pattern-board__window-inner {
    fill: color-mix(in srgb, rgba(255,255,255,0.96) 78%, var(--art-shapes-accent-start));
  }

  .art-shapes-rotation-pattern-board__window--missing {
    stroke-dasharray: 6 7;
    fill: color-mix(in srgb, var(--kangur-page-background) 92%, var(--art-shapes-accent-end));
  }

  .art-shapes-rotation-pattern-board__window--spotlight {
    filter: drop-shadow(
      0 0 12px color-mix(in srgb, var(--art-shapes-accent-end) 32%, transparent)
    );
    animation: art-shapes-missing-pulse 2.1s ease-in-out infinite;
  }

  .art-shapes-rotation-pattern-board__missing-frame {
    fill: none;
    stroke: color-mix(in srgb, var(--kangur-page-text) 44%, var(--art-shapes-accent-end));
    stroke-dasharray: 4 5;
    stroke-width: 2;
  }

  .art-shapes-rotation-pattern-board__missing-mark {
    fill: color-mix(in srgb, var(--kangur-page-text) 68%, var(--art-shapes-accent-end));
    font-size: 27px;
    font-weight: 800;
    text-anchor: middle;
  }

  .art-shapes-rotation-pattern-board__missing-mark--spotlight {
    animation: art-shapes-missing-pulse 2.1s ease-in-out infinite;
  }

  .art-shapes-rotation-pattern-board__tempo-dot {
    fill: color-mix(in srgb, var(--art-shapes-accent-end) 82%, white);
    filter: drop-shadow(0 2px 4px color-mix(in srgb, var(--art-shapes-accent-end) 28%, transparent));
  }

  .art-shapes-rotation-tile {
    position: relative;
    aspect-ratio: 1 / 1;
    width: 100%;
    overflow: hidden;
    border-radius: clamp(1rem, 3vw, 1.75rem);
    border: 1px solid color-mix(in srgb, var(--kangur-soft-card-border) 56%, var(--art-shapes-accent-end));
    background:
      radial-gradient(
        circle at 50% 18%,
        color-mix(in srgb, var(--art-shapes-accent-start) 20%, rgba(255,255,255,0.98)) 0%,
        rgba(255,255,255,0.98) 34%,
        color-mix(in srgb, var(--kangur-soft-card-background) 88%, var(--art-shapes-accent-start)) 100%
      );
    box-shadow:
      0 18px 42px -30px color-mix(in srgb, var(--art-shapes-accent-end) 34%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.72);
    contain: layout paint style;
  }

  .art-shapes-rotation-tile--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background:
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--kangur-soft-card-background) 92%, var(--art-shapes-accent-start)) 0%,
        color-mix(in srgb, var(--kangur-page-background) 88%, var(--art-shapes-accent-end)) 100%
      );
    border-style: dashed;
    border-width: 2px;
    color: color-mix(in srgb, var(--kangur-page-text) 58%, var(--art-shapes-accent-end));
    text-shadow: 0 1px 0 rgba(255,255,255,0.32);
  }

  .art-shapes-rotation-tile__svg {
    display: block;
    height: 100%;
    width: 100%;
  }

  .art-shapes-rotation-tile__orbit {
    fill: none;
    stroke: color-mix(in srgb, var(--art-shapes-accent-end) 24%, var(--kangur-soft-card-border));
    stroke-width: 3;
    stroke-dasharray: 5 5;
  }

  .art-shapes-rotation-tile__core {
    fill: color-mix(in srgb, rgba(255,255,255,0.94) 78%, var(--art-shapes-accent-start));
  }

  .art-shapes-rotation-spinner {
    animation-name: art-shapes-rotation-spin;
    animation-duration: var(--art-shapes-rotation-duration, 5s);
    animation-timing-function: linear;
    animation-iteration-count: infinite;
    transform-box: fill-box;
    transform-origin: center;
    will-change: transform;
    backface-visibility: hidden;
  }

  .art-shapes-rotation-spinner--static {
    animation: none;
    transform: rotate(var(--art-shapes-rest-angle, 0deg));
    will-change: auto;
  }

  .art-shapes-rotation-tile__tempo {
    position: absolute;
    inset-inline: 0;
    bottom: clamp(0.4rem, 1.2vw, 0.55rem);
    display: flex;
    justify-content: center;
    gap: 0.32rem;
  }

  .art-shapes-rotation-tile__tempo-dot {
    height: 0.45rem;
    width: 0.45rem;
    border-radius: 9999px;
    background: linear-gradient(
      180deg,
      color-mix(in srgb, var(--art-shapes-accent-start) 86%, white),
      color-mix(in srgb, var(--art-shapes-accent-end) 74%, white)
    );
    box-shadow:
      0 1px 0 rgba(255,255,255,0.6),
      0 6px 12px -10px color-mix(in srgb, var(--art-shapes-accent-end) 48%, transparent);
  }

  .art-shapes-rotation-option-card {
    position: relative;
    overflow: hidden;
    min-height: var(--art-shapes-option-card-min-height);
    padding: var(--art-shapes-option-card-padding);
    border-radius: clamp(1rem, 2vw, 1.4rem);
  }

  .art-shapes-rotation-option-card__content {
    position: relative;
    z-index: 1;
    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }

  .art-shapes-rotation-option-card__tile {
    position: relative;
    width: min(100%, 6.2rem);
  }

  .art-shapes-rotation-option-preview.art-shapes-rotation-tile {
    border-radius: clamp(0.9rem, 2vw, 1.15rem);
    box-shadow:
      0 12px 24px -24px color-mix(in srgb, var(--art-shapes-accent-end) 28%, transparent),
      inset 0 1px 0 rgba(255,255,255,0.68);
  }

  .art-shapes-rotation-option-card__label {
    color: var(--kangur-page-text);
    font-size: clamp(0.7rem, 1.4vw, 0.86rem);
    line-height: 1.15;
  }

  .art-shapes-rotation-option-card__tempo {
    font-size: clamp(0.68rem, 1.45vw, 0.8rem);
  }

  .art-shapes-rotation-option-card__result-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: inherit;
    opacity: 0;
    pointer-events: none;
    transform: scale(0.96);
    transition:
      opacity 180ms ease,
      transform 180ms ease;
  }

  .art-shapes-rotation-option-card[data-result-status='correct-selected'] .art-shapes-rotation-option-card__result-overlay,
  .art-shapes-rotation-option-card[data-result-status='correct-answer'] .art-shapes-rotation-option-card__result-overlay,
  .art-shapes-rotation-option-card[data-result-status='wrong-selected'] .art-shapes-rotation-option-card__result-overlay {
    opacity: 1;
    transform: scale(1);
  }

  .art-shapes-rotation-option-card[data-result-status='correct-selected'] .art-shapes-rotation-option-card__content,
  .art-shapes-rotation-option-card[data-result-status='correct-answer'] .art-shapes-rotation-option-card__content,
  .art-shapes-rotation-option-card[data-result-status='wrong-selected'] .art-shapes-rotation-option-card__content {
    opacity: 0.52;
    transform: scale(0.985);
  }

  .art-shapes-rotation-option-card[data-result-status='correct-selected'] .art-shapes-rotation-option-card__result-overlay,
  .art-shapes-rotation-option-card[data-result-status='correct-answer'] .art-shapes-rotation-option-card__result-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(74, 222, 128, 0.22) 0%,
        rgba(34, 197, 94, 0.54) 100%
      );
  }

  .art-shapes-rotation-option-card[data-result-status='wrong-selected'] .art-shapes-rotation-option-card__result-overlay {
    background:
      linear-gradient(
        180deg,
        rgba(251, 113, 133, 0.22) 0%,
        rgba(239, 68, 68, 0.54) 100%
      );
  }

  .art-shapes-rotation-option-card__result-symbol {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: clamp(2.6rem, 7vw, 3.2rem);
    height: clamp(2.6rem, 7vw, 3.2rem);
    border-radius: 9999px;
    border: 2px solid rgba(255,255,255,0.92);
    background: rgba(255,255,255,0.12);
    color: white;
    font-size: clamp(1.4rem, 4vw, 1.9rem);
    font-weight: 900;
    line-height: 1;
    text-shadow: 0 2px 12px rgba(15, 23, 42, 0.22);
    box-shadow:
      inset 0 1px 0 rgba(255,255,255,0.36),
      0 16px 30px -24px rgba(15,23,42,0.4);
  }

  .art-shapes-rotation-option-card__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 1.55rem;
    height: 1.55rem;
    padding-inline: 0.35rem;
    border-radius: 9999px;
    border: 1px solid color-mix(in srgb, var(--kangur-soft-card-border) 58%, var(--art-shapes-accent-end));
    background:
      linear-gradient(
        180deg,
        rgba(255,255,255,0.96),
        color-mix(in srgb, var(--kangur-soft-card-background) 84%, var(--art-shapes-accent-start))
      );
    color: color-mix(in srgb, var(--kangur-page-text) 82%, var(--art-shapes-accent-end));
    font-size: 0.74rem;
    font-weight: 800;
    line-height: 1;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.76);
  }

  .art-shapes-rotation-options-grid[data-selection-locked='true'] {
    pointer-events: none;
  }

  .art-shapes-rotation-options-grid {
    width: 100%;
    align-items: stretch;
    scrollbar-width: thin;
  }

  @keyframes art-shapes-rotation-spin {
    0% { transform: rotate(0deg) translateZ(0); }
    100% { transform: rotate(360deg) translateZ(0); }
  }

  @keyframes art-shapes-missing-pulse {
    0%, 100% {
      opacity: 0.82;
      transform: scale(1);
    }
    50% {
      opacity: 1;
      transform: scale(1.03);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .art-shapes-rotation-spinner {
      animation: none;
      transform: rotate(var(--art-shapes-rest-angle, 0deg));
    }

    .art-shapes-rotation-pattern-board__window--spotlight,
    .art-shapes-rotation-pattern-board__missing-mark--spotlight {
      animation: none;
    }
  }

  @media (max-width: 379px) {
    .art-shapes-rotation-game {
      --art-shapes-option-card-min-height: 7rem;
      --art-shapes-option-card-padding: 0.55rem;
    }

    .art-shapes-rotation-option-card__tile {
      width: min(100%, 5.2rem);
    }
  }

  @media (min-width: 1024px) {
    .art-shapes-rotation-game {
      --art-shapes-option-card-min-height: 8.9rem;
    }

    .art-shapes-rotation-option-card__tile {
      width: min(100%, 7rem);
    }
  }
`;

const getTileAccentStyle = (
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

function RotationGlyphVisual({
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

type RotationTilePreviewProps = {
  animated?: boolean;
  tile?: RotationTile;
  label: string;
  placeholder?: boolean;
  testId?: string;
  className?: string;
};

const renderRotationTilePreview = ({
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

export type RotationBoardSlotView = {
  id: string;
  label: string;
  tile?: RotationTile;
  isMissing: boolean;
};

const getTempoDotOffsets = (tempo: RotationTempo): number[] => {
  if (tempo === 'slow') {
    return [0];
  }

  if (tempo === 'medium') {
    return [-6, 6];
  }

  return [-12, 0, 12];
};

export const RotationBoard = memo(function RotationBoard({
  animated = true,
  slots,
}: {
  animated?: boolean;
  slots: readonly RotationBoardSlotView[];
}): React.JSX.Element {
  return (
    <div className='art-shapes-rotation-pattern-board' data-testid='art-shapes-rotation-pattern-board'>
      <svg
        aria-label={slots.map((slot) => slot.label).join(', ')}
        className='art-shapes-rotation-pattern-board__svg'
        role='img'
        viewBox='0 0 360 256'
      >
        <rect
          className='art-shapes-rotation-pattern-board__frame'
          x='8'
          y='8'
          width='344'
          height='240'
          rx='34'
        />
        <path className='art-shapes-rotation-pattern-board__track' d={CONNECTED_BOARD_CLOSED_TRACK_PATH} />
        <path
          className='art-shapes-rotation-pattern-board__track-glow'
          d={CONNECTED_BOARD_CLOSED_TRACK_PATH}
        />
        {slots.map((slot, index) => {
          const layout = CONNECTED_BOARD_SLOT_LAYOUTS[index];
          if (!layout) {
            return null;
          }

          const tileStyle = getTileAccentStyle(slot.tile, slot.isMissing);
          const centerX = layout.x + CONNECTED_BOARD_SLOT_SIZE / 2;
          const centerY = layout.y + CONNECTED_BOARD_SLOT_SIZE / 2;
          const spotlightMissingWindow = slot.isMissing && animated;

          return (
            <g key={slot.id} style={tileStyle}>
              <rect
                className={cn(
                  'art-shapes-rotation-pattern-board__window',
                  slot.isMissing ? 'art-shapes-rotation-pattern-board__window--missing' : null,
                  spotlightMissingWindow ? 'art-shapes-rotation-pattern-board__window--spotlight' : null
                )}
                data-testid={slot.isMissing ? 'art-shapes-rotation-gap-placeholder' : undefined}
                x={layout.x}
                y={layout.y}
                width={CONNECTED_BOARD_SLOT_SIZE}
                height={CONNECTED_BOARD_SLOT_SIZE}
                rx='22'
              />
              <rect
                className='art-shapes-rotation-pattern-board__window-inner'
                x={layout.x + 7}
                y={layout.y + 7}
                width={CONNECTED_BOARD_SLOT_SIZE - 14}
                height={CONNECTED_BOARD_SLOT_SIZE - 14}
                rx='18'
              />
              {slot.isMissing || !slot.tile ? (
                <>
                  <rect
                    className='art-shapes-rotation-pattern-board__missing-frame'
                    x={layout.x + 15}
                    y={layout.y + 15}
                    width={CONNECTED_BOARD_SLOT_SIZE - 30}
                    height={CONNECTED_BOARD_SLOT_SIZE - 30}
                    rx='16'
                  />
                  <text
                    className={cn(
                      'art-shapes-rotation-pattern-board__missing-mark',
                      spotlightMissingWindow
                        ? 'art-shapes-rotation-pattern-board__missing-mark--spotlight'
                        : null
                    )}
                    dominantBaseline='middle'
                    x={centerX}
                    y={centerY + 2}
                  >
                    ?
                  </text>
                </>
              ) : (
                <>
                  <g
                    transform={`translate(${layout.x + CONNECTED_BOARD_GLYPH_OFFSET} ${layout.y + CONNECTED_BOARD_GLYPH_OFFSET}) scale(${CONNECTED_BOARD_GLYPH_SCALE})`}
                  >
                    <circle className='art-shapes-rotation-tile__orbit' cx='60' cy='60' r='34' />
                    <circle className='art-shapes-rotation-tile__core' cx='60' cy='60' r='30' />
                    <g
                      className={cn(
                        'art-shapes-rotation-spinner',
                        animated ? null : 'art-shapes-rotation-spinner--static'
                      )}
                      style={{
                        animationDirection: slot.tile.direction === 'ccw' ? 'reverse' : 'normal',
                        ...(animated
                          ? { animationDuration: `${TEMPO_SECONDS[slot.tile.tempo]}s` }
                          : null),
                      }}
                    >
                      <RotationGlyphVisual glyph={slot.tile.glyph} />
                    </g>
                  </g>
                  {getTempoDotOffsets(slot.tile.tempo).map((offset, tempoIndex) => (
                    <circle
                      key={`${slot.id}-board-tempo-${tempoIndex}`}
                      aria-hidden='true'
                      className='art-shapes-rotation-pattern-board__tempo-dot'
                      cx={centerX + offset}
                      cy={layout.y + CONNECTED_BOARD_SLOT_SIZE - 11}
                      r='3.6'
                    />
                  ))}
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
});

type RotationOptionCardProps = {
  accent: KangurAccent;
  ariaLabel: string;
  animated?: boolean;
  choiceLabel: string;
  emphasis: 'neutral' | 'accent';
  glyphLabel: string;
  locked: boolean;
  onSelectOption: (optionId: string) => void;
  optionId: string;
  resultLabel: string | null;
  resultStatus: 'idle' | 'correct-selected' | 'wrong-selected' | 'correct-answer';
  state: 'default' | 'muted';
  tempoLabel: string;
  tile: RotationTile;
  tileLabel: string;
};

export function renderRotationOptionCard({
  accent,
  ariaLabel,
  animated = true,
  choiceLabel,
  emphasis,
  glyphLabel,
  locked,
  onSelectOption,
  optionId,
  resultLabel,
  resultStatus,
  state,
  tempoLabel,
  tile,
  tileLabel,
}: RotationOptionCardProps): React.JSX.Element {
  const overlaySymbol = resultStatus === 'wrong-selected' ? 'X' : 'V';
  const resolvedAriaLabel = resultLabel ? `${ariaLabel}. ${resultLabel}` : ariaLabel;

  return (
    <KangurOptionCardButton
      accent={accent}
      aria-disabled={locked ? 'true' : undefined}
      aria-label={resolvedAriaLabel}
      className='art-shapes-rotation-option-card'
      data-result-status={resultStatus}
      data-testid={`art-shapes-rotation-option-${optionId}`}
      emphasis={emphasis}
      onClick={locked ? undefined : () => onSelectOption(optionId)}
      state={state}
      tabIndex={locked ? -1 : undefined}
    >
      <div className='art-shapes-rotation-option-card__content flex h-full w-full flex-col items-center gap-2 text-center'>
        <span aria-hidden='true' className='art-shapes-rotation-option-card__badge'>
          {choiceLabel}
        </span>
        <div className='art-shapes-rotation-option-card__tile'>
          {renderRotationTilePreview({
            animated,
            className: 'art-shapes-rotation-option-preview',
            tile,
            label: tileLabel,
          })}
        </div>
        <div className='min-h-0'>
          <div className='art-shapes-rotation-option-card__label break-words font-semibold'>
            {glyphLabel}
          </div>
          <KangurLessonCaption className='art-shapes-rotation-option-card__tempo'>
            {tempoLabel}
          </KangurLessonCaption>
        </div>
      </div>
      {resultStatus !== 'idle' ? (
        <div
          aria-hidden='true'
          className='art-shapes-rotation-option-card__result-overlay'
          data-testid={`art-shapes-rotation-option-result-${optionId}`}
        >
          <span className='art-shapes-rotation-option-card__result-symbol'>{overlaySymbol}</span>
        </div>
      ) : null}
    </KangurOptionCardButton>
  );
}

export const getRotationTileAccent = (glyph: RotationGlyph): KangurAccent =>
  ROTATION_TILE_ACCENTS[glyph];
