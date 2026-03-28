'use client';

import React from 'react';

import { KangurLessonCaption } from '@/features/kangur/ui/design/lesson-primitives';
import { KangurOptionCardButton } from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';

import type {
  RotationGlyph,
  RotationTile,
} from './ArtShapesRotationGapGame.data';

import { ART_SHAPES_ROTATION_GAME_STYLES } from './art-shapes-rotation-visuals/ArtShapesRotationGapGame.styles';
import { RotationTilePreview, ROTATION_TILE_ACCENTS } from './art-shapes-rotation-visuals/ArtShapesRotationGapGame.tile';

export { ART_SHAPES_ROTATION_GAME_STYLES } from './art-shapes-rotation-visuals/ArtShapesRotationGapGame.styles';
export { RotationBoard } from './art-shapes-rotation-visuals/ArtShapesRotationGapGame.board';
export type { RotationBoardSlotView } from './art-shapes-rotation-visuals/ArtShapesRotationGapGame.board';

export const ART_SHAPES_ROTATION_GAME_STYLES_EXPORT = ART_SHAPES_ROTATION_GAME_STYLES;

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
          <RotationTilePreview
            animated={animated}
            className='art-shapes-rotation-option-preview'
            tile={tile}
            label={tileLabel}
          />
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
