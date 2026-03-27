'use client';

import { Fragment, startTransition, useCallback, useEffect, useMemo, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import type { ArtShapesBasicLessonTranslate } from '@/features/kangur/ui/components/ArtShapesBasicLesson.data';
import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

import {
  ROTATION_ROUNDS,
  type RotationGlyph,
  type RotationTempo,
  type RotationTile,
} from './ArtShapesRotationGapGame.data';
import {
  ART_SHAPES_ROTATION_GAME_STYLES,
  RotationBoard,
  getRotationTileAccent,
  renderRotationOptionCard,
} from './ArtShapesRotationGapGame.visuals';

const ROUND_ADVANCE_DELAY_MS = 900;

const GLYPH_KEYS: Record<RotationGlyph, string> = {
  circle: 'circle',
  ball: 'ball',
  square: 'square',
  window: 'window',
  triangle: 'triangle',
  pizza: 'pizza',
  rectangle: 'rectangle',
  book: 'book',
};

const TEMPO_KEYS: Record<RotationTempo, string> = {
  slow: 'slow',
  medium: 'medium',
  fast: 'fast',
};

const getGlyphLabel = (
  glyph: RotationGlyph,
  translate: ArtShapesBasicLessonTranslate
): string => translate(`game.glyphs.${GLYPH_KEYS[glyph]}`);

const getTempoLabel = (
  tempo: RotationTempo,
  translate: ArtShapesBasicLessonTranslate
): string => translate(`game.tempos.${TEMPO_KEYS[tempo]}`);

const describeTile = (tile: RotationTile, translate: ArtShapesBasicLessonTranslate): string =>
  translate('game.tileLabel', {
    glyph: getGlyphLabel(tile.glyph, translate),
    tempo: getTempoLabel(tile.tempo, translate),
  });

const getRoundAnnouncement = (
  selectedOptionId: string | null,
  correctOptionId: string,
  translate: ArtShapesBasicLessonTranslate
): string => {
  if (!selectedOptionId) {
    return '';
  }

  if (selectedOptionId === correctOptionId) {
    return translate('game.optionFeedback.correct');
  }

  return `${translate('game.optionFeedback.incorrect')}. ${translate('game.optionFeedback.answer')}.`;
};

type RotationOptionResultStatus =
  | 'idle'
  | 'correct-selected'
  | 'wrong-selected'
  | 'correct-answer';

export function ArtShapesRotationGapGame({
  onFinish,
}: {
  onFinish: () => void;
}): React.JSX.Element {
  const translations = useTranslations('KangurStaticLessons.artShapesBasic');
  const translate = useMemo<ArtShapesBasicLessonTranslate>(
    () => (key, values) => translations(key as never, values as never),
    [translations]
  );
  const isCoarsePointer = useKangurCoarsePointer();
  const prefersReducedMotion = useReducedMotion();
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const round = ROTATION_ROUNDS[Math.min(roundIndex, ROTATION_ROUNDS.length - 1)] ?? null;
  const isFinished = roundIndex >= ROTATION_ROUNDS.length;
  const shouldAnimateTiles = !selectedOptionId && !prefersReducedMotion;
  const roundAnnouncement = round
    ? getRoundAnnouncement(selectedOptionId, round.correctOptionId, translate)
    : '';
  const boardSlots = useMemo(
    () =>
      round?.slots.map((slot, index) => {
        const isMissing = index === round.missingIndex;

        return {
          id: slot.id,
          isMissing,
          label: isMissing ? translate('game.missingTileLabel') : describeTile(slot, translate),
          tile: isMissing ? undefined : slot,
        };
      }) ?? [],
    [round, translate]
  );
  const optionDisplays = useMemo(
    () =>
      round?.options.map((option) => ({
        accent: getRotationTileAccent(option.glyph),
        ariaLabel: translate('game.chooseOption', {
          tile: describeTile(option, translate),
        }),
        glyphLabel: getGlyphLabel(option.glyph, translate),
        option,
        tempoLabel: getTempoLabel(option.tempo, translate),
        tileLabel: describeTile(option, translate),
      })) ?? [],
    [round, translate]
  );

  const advanceRound = useCallback((): void => {
    startTransition(() => {
      setSelectedOptionId(null);
      setRoundIndex((previous) => previous + 1);
    });
  }, []);

  const handleSelect = useCallback(
    (optionId: string): void => {
      if (!round || selectedOptionId) {
        return;
      }

      setSelectedOptionId(optionId);
      if (optionId === round.correctOptionId) {
        setScore((previous) => previous + 1);
      }
    },
    [round, selectedOptionId]
  );

  const handleRestart = useCallback((): void => {
    startTransition(() => {
      setRoundIndex(0);
      setSelectedOptionId(null);
      setScore(0);
    });
  }, []);

  useEffect(() => {
    if (!selectedOptionId || !round) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      advanceRound();
    }, ROUND_ADVANCE_DELAY_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [advanceRound, round, selectedOptionId]);

  if (isFinished || !round) {
    return (
      <KangurGlassPanel
        className='art-shapes-rotation-game w-full text-center'
        padding='lg'
        surface='playField'
      >
        <style>{ART_SHAPES_ROTATION_GAME_STYLES}</style>
        <KangurStatusChip accent='emerald' size='sm'>
          {translate('game.finished.status')}
        </KangurStatusChip>
        <div className='mt-4 text-xl font-semibold'>
          {translate('game.finished.title', { score, total: ROTATION_ROUNDS.length })}
        </div>
        <div className='mt-2 text-sm [color:var(--kangur-page-muted-text)]'>
          {translate('game.finished.subtitle')}
        </div>
        <div className='mt-5 flex flex-col gap-3 sm:flex-row sm:justify-center'>
          <KangurButton
            variant='primary'
            onClick={onFinish}
            className={
              isCoarsePointer
                ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                : undefined
            }
          >
            {translate('game.finished.backToLesson')}
          </KangurButton>
          <KangurButton
            variant='surface'
            onClick={handleRestart}
            className={
              isCoarsePointer
                ? 'touch-manipulation select-none min-h-11 active:scale-[0.98]'
                : undefined
            }
          >
            {translate('game.finished.playAgain')}
          </KangurButton>
        </div>
      </KangurGlassPanel>
    );
  }

  return (
    <KangurGlassPanel className='art-shapes-rotation-game w-full' padding='lg' surface='playField'>
      <style>{ART_SHAPES_ROTATION_GAME_STYLES}</style>
      <div aria-atomic='true' aria-live='polite' className='sr-only'>
        {roundAnnouncement}
      </div>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <KangurStatusChip accent='amber' size='sm'>
          {translate('game.progress.round', {
            current: roundIndex + 1,
            total: ROTATION_ROUNDS.length,
          })}
        </KangurStatusChip>
        <KangurStatusChip accent='sky' size='sm'>
          {translate('game.progress.score', { score })}
        </KangurStatusChip>
      </div>

      <div
        className='mt-5 flex flex-col gap-5'
        data-testid='art-shapes-rotation-layout'
      >
        <div className='min-w-0'>
          <RotationBoard animated={shouldAnimateTiles} slots={boardSlots} />
        </div>

        <div className='art-shapes-rotation-choice-tray' data-testid='art-shapes-rotation-choice-tray'>
          <div aria-hidden='true' className='art-shapes-rotation-choice-tray__header'>
            <span className='art-shapes-rotation-choice-tray__line' />
            <span className='art-shapes-rotation-choice-tray__badge'>?</span>
            <span className='art-shapes-rotation-choice-tray__line' />
          </div>
          <div
            aria-disabled={selectedOptionId ? 'true' : undefined}
            className='art-shapes-rotation-options-grid grid auto-cols-[minmax(7.25rem,1fr)] grid-flow-col gap-2 overflow-x-auto pb-1 min-[420px]:grid-flow-row min-[420px]:auto-cols-auto min-[420px]:grid-cols-3 sm:gap-3'
            data-selection-locked={selectedOptionId ? 'true' : 'false'}
            data-testid='art-shapes-rotation-gap-options'
          >
            {optionDisplays.map(
              ({ accent, ariaLabel, glyphLabel, option, tempoLabel, tileLabel }, optionIndex) => {
                const isSelected = selectedOptionId === option.id;
                const isSelectionLocked = Boolean(selectedOptionId);
                const isCorrectOption = option.id === round.correctOptionId;
                const resultStatus: RotationOptionResultStatus = !isSelectionLocked
                  ? 'idle'
                  : isSelected
                    ? isCorrectOption
                      ? 'correct-selected'
                      : 'wrong-selected'
                    : isCorrectOption
                      ? 'correct-answer'
                      : 'idle';
                const emphasis = resultStatus !== 'idle' ? 'accent' : 'neutral';
                const state =
                  isSelectionLocked && resultStatus === 'idle'
                    ? 'muted'
                    : 'default';
                const resultLabel =
                  resultStatus === 'correct-selected'
                    ? translate('game.optionFeedback.correct')
                    : resultStatus === 'wrong-selected'
                      ? translate('game.optionFeedback.incorrect')
                      : resultStatus === 'correct-answer'
                        ? translate('game.optionFeedback.answer')
                        : null;

                return (
                  <Fragment key={option.id}>
                    {renderRotationOptionCard({
                      accent,
                      ariaLabel,
                      animated: shouldAnimateTiles,
                      choiceLabel: String.fromCharCode(65 + optionIndex),
                      emphasis,
                      glyphLabel,
                      locked: isSelectionLocked,
                      onSelectOption: handleSelect,
                      optionId: option.id,
                      resultLabel,
                      resultStatus,
                      state,
                      tempoLabel,
                      tile: option,
                      tileLabel,
                    })}
                  </Fragment>
                );
              }
            )}
          </div>
        </div>
      </div>
    </KangurGlassPanel>
  );
}
