import React, { memo } from 'react';
import { cn } from '@/features/kangur/shared/utils';
import type { RotationTile } from '../ArtShapesRotationGapGame.data';
import { RotationGlyphVisual } from './ArtShapesRotationGapGame.glyphs';
import { getTileAccentStyle, TEMPO_SECONDS } from './ArtShapesRotationGapGame.tile';

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

const getTempoDotOffsets = (tempo: 'slow' | 'medium' | 'fast'): number[] => {
  if (tempo === 'slow') return [0];
  if (tempo === 'medium') return [-6, 6];
  return [-12, 0, 12];
};

export type RotationBoardSlotView = {
  id: string;
  label: string;
  tile?: RotationTile;
  isMissing: boolean;
};

export const RotationBoard = memo(({
  animated = true,
  slots,
}: {
  animated?: boolean;
  slots: readonly RotationBoardSlotView[];
}): React.JSX.Element => {
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
          if (!layout) return null;

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
