'use client';

import React, { useCallback } from 'react';

import {
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import { KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS } from '@/features/kangur/ui/components/drawing-engine/keyboard-shortcuts';
import { KangurManagedDrawingUtilityActions } from '@/features/kangur/ui/components/drawing-engine/KangurManagedDrawingUtilityActions';
import { KangurDrawingActionRow } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow';
import {
  KangurDrawingEmptyStateOverlay,
  KangurDrawingKeyboardCursorOverlay,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingOverlays';
import { KangurDrawingPracticeBoard } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard';
import { KangurDrawingStatusRegions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingStatusRegions';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
  translateKangurMiniGameWithFallback,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import type { GeometryDrawingGameProps } from './geometry-drawing/GeometryDrawingGame.types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './geometry-drawing/GeometryDrawingGame.constants';
import { useGeometryDrawingGameState } from './geometry-drawing/GeometryDrawingGame.hooks';

const FINISH_LABEL_VARIANTS = [
  'play',
  'end',
  'menu',
  'done',
  'lesson',
  'back',
  'topics',
] as const;

type FinishLabelVariant = (typeof FINISH_LABEL_VARIANTS)[number];

const isFinishLabelVariant = (value: string | undefined): value is FinishLabelVariant =>
  value !== undefined &&
  FINISH_LABEL_VARIANTS.some((variant) => variant === value);

export default function GeometryDrawingGame(props: GeometryDrawingGameProps): React.JSX.Element {
  const state = useGeometryDrawingGameState(props);
  const {
    canvasRef,
    canRedo,
    canUndo,
    clearDrawing,
    currentRound,
    difficulty,
    difficultyLabels,
    done,
    exportDrawing,
    fallbackCopy,
    feedback,
    handleCanvasKeyDown,
    handleCheck,
    handleDifficultyChange,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isCoarsePointer,
    isPointerDrawing,
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    points,
    redoDrawing,
    resetRun,
    resolvedDifficultyLabel,
    roundIndex,
    score,
    shouldShowDifficultySelector,
    totalRounds,
    translations,
    undoDrawing,
    xpBreakdown,
    xpEarned,
  } = state;

  const translateWithFallback = useCallback(
    (key: string, fallback: string, values?: Record<string, string | number>): string =>
      translateKangurMiniGameWithFallback(translations, key, fallback, values),
    [translations]
  );

  const { finishLabel, onFinish } = props;
  const summaryAccent: KangurAccent = difficulty === 'pro' ? 'violet' : 'teal';
  const resolvedFinishLabel = isFinishLabelVariant(finishLabel)
    ? getKangurMiniGameFinishLabel(translations, finishLabel)
    : finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');

  if (done) {
    const percent = Math.round((score / Math.max(1, totalRounds)) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='geometry-drawing-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='geometry-drawing-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '📐' : '✏️'}
        />
        <KangurPracticeGameSummaryTitle
          accent={summaryAccent}
          dataTestId='geometry-drawing-summary-title'
          title={getKangurMiniGameScoreLabel(translations, score, totalRounds)}
        />
        <KangurPracticeGameSummaryXP accent={summaryAccent} xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='geometry-drawing-summary-breakdown'
          itemDataTestIdPrefix='geometry-drawing-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent={summaryAccent}
          ariaLabel={translateWithFallback(
            'geometryDrawing.progressAriaLabel',
            fallbackCopy.progressAriaLabel
          )}
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('geometryDrawing.summary.perfect')
            : percent >= 70
              ? translations('geometryDrawing.summary.good')
              : translations('geometryDrawing.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={resolvedFinishLabel}
          onFinish={onFinish}
          onRestart={resetRun}
          restartLabel={translations('shared.retry')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const boardAccent: KangurAccent =
    feedback?.kind === 'success'
      ? 'emerald'
      : feedback?.kind === 'error'
        ? 'rose'
        : feedback?.kind === 'info'
          ? 'amber'
          : 'teal';
  const isResultLocked = feedback?.kind === 'success' || feedback?.kind === 'error';

  return (
    <section
      aria-labelledby='geometry-drawing-heading'
      className={`flex w-full max-w-sm flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <KangurDrawingStatusRegions
        keyboardStatus={keyboardStatus}
        keyboardStatusTestId='geometry-drawing-keyboard-status'
        liveMessage={translateWithFallback(
          'geometryDrawing.inRound.liveRegion',
          fallbackCopy.liveRegion,
          {
            current: roundIndex + 1,
            difficulty: resolvedDifficultyLabel,
            shape: currentRound?.label ?? '',
            total: totalRounds,
          }
        )}
      />

      {shouldShowDifficultySelector ? (
        <KangurGlassPanel
          className='w-full rounded-[26px] !p-3'
          data-testid='geometry-difficulty-shell'
          surface='solid'
          variant='soft'
        >
          <div className='mb-3 flex justify-center'>
            <KangurStatusChip accent='teal' size='sm'>
              {translateWithFallback(
                'geometryDrawing.inRound.difficultyChip',
                fallbackCopy.difficultyChip
              )}
            </KangurStatusChip>
          </div>
          <div
            aria-label={translateWithFallback(
              'geometryDrawing.inRound.difficultyGroupAria',
              fallbackCopy.difficultyGroupAria
            )}
            className='grid grid-cols-1 gap-2 min-[420px]:grid-cols-2'
            role='group'
          >
            {(['starter', 'pro'] as const).map((mode) => (
              <button
                key={mode}
                aria-pressed={difficulty === mode}
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-full px-4 text-xs font-bold tracking-tight transition-all duration-200',
                  'kangur-button-shell kangur-cta-pill border border-transparent',
                  difficulty === mode ? 'surface-cta' : 'soft-cta'
                )}
                data-testid={`geometry-difficulty-${mode}`}
                disabled={isResultLocked}
                onClick={() => handleDifficultyChange(mode)}
                type='button'
              >
                {difficultyLabels[mode]}
              </button>
            ))}
          </div>
        </KangurGlassPanel>
      ) : null}

      <div className='flex w-full items-center kangur-panel-gap'>
        <KangurProgressBar
          accent='emerald'
          aria-label={translateWithFallback(
            'geometryDrawing.progressAriaLabel',
            fallbackCopy.progressAriaLabel
          )}
          aria-valuetext={translateWithFallback(
            'geometryDrawing.inRound.progressValueText',
            fallbackCopy.progressValueText,
            { current: roundIndex + 1, total: totalRounds }
          )}
          className='flex-1'
          data-testid='geometry-drawing-progress-bar'
          size='sm'
          value={(roundIndex / totalRounds) * 100}
        />
        <KangurStatusChip
          accent='teal'
          className='shrink-0'
          data-testid='geometry-drawing-progress-label'
          size='sm'
        >
          {roundIndex + 1}/{totalRounds}
        </KangurStatusChip>
      </div>

      <div className='w-full'>
        <KangurGlassPanel
          className='flex flex-col items-center kangur-panel-gap'
          data-testid='geometry-drawing-round-shell'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <div
            className='flex w-full flex-col items-center kangur-panel-gap rounded-[24px] border border-teal-200/70 bg-teal-50/80 p-4 text-center'
            data-testid='geometry-drawing-prompt-card'
          >
            <KangurStatusChip accent='teal' size='sm'>
              {translateWithFallback(
                'geometryDrawing.inRound.modeLabel',
                fallbackCopy.modeLabel,
                { difficulty: resolvedDifficultyLabel }
              )}
            </KangurStatusChip>
            <KangurDisplayEmoji size='md'>{currentRound?.emoji}</KangurDisplayEmoji>
            <KangurHeadline accent='violet' as='h3' id='geometry-drawing-heading' size='sm'>
              {translateWithFallback(
                'geometryDrawing.inRound.prompt',
                fallbackCopy.prompt,
                { shape: currentRound?.label ?? '' }
              )}
            </KangurHeadline>
            <p
              className='text-sm text-center [color:var(--kangur-page-muted-text)]'
              id='geometry-drawing-hint'
            >
              {currentRound?.hint ?? ''}
            </p>
          </div>

          <KangurDrawingPracticeBoard
            accent={boardAccent}
            actionRow={
              <KangurDrawingActionRow
                clearDisabled={Boolean(isResultLocked || (points.length === 0 && feedback === null))}
                clearLabel={translateWithFallback(
                  'geometryDrawing.inRound.clear',
                  fallbackCopy.clear
                )}
                feedback={feedback}
                isCoarsePointer={isCoarsePointer}
                onClear={clearDrawing}
                onPrimary={handleCheck}
                primaryDisabled={Boolean(isResultLocked)}
                primaryLabel={translateWithFallback(
                  'geometryDrawing.inRound.check',
                  fallbackCopy.check
                )}
                utilityActions={
                  <KangurManagedDrawingUtilityActions
                    canExport={hasDrawableContent}
                    canRedo={canRedo}
                    canUndo={canUndo}
                    exportLabel={translateWithFallback(
                      'geometryDrawing.inRound.export',
                      'Export PNG'
                    )}
                    exportTestId='geometry-drawing-export'
                    historyLocked={Boolean(isResultLocked)}
                    isCoarsePointer={isCoarsePointer}
                    layoutPreset='practice-board'
                    onExport={exportDrawing}
                    onRedo={redoDrawing}
                    onUndo={undoDrawing}
                    redoLabel={translateWithFallback('geometryDrawing.inRound.redo', 'Ponow')}
                    redoTestId='geometry-drawing-redo'
                    undoLabel={translateWithFallback('geometryDrawing.inRound.undo', 'Cofnij')}
                    undoTestId='geometry-drawing-undo'
                  />
                }
              />
            }
            afterCanvas={
              <>
                <KangurDrawingKeyboardCursorOverlay
                  accentClassName='border-emerald-400/80 bg-emerald-100/70 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]'
                  cursor={keyboardCursor}
                  height={CANVAS_HEIGHT}
                  isCoarsePointer={isCoarsePointer}
                  isDrawing={keyboardDrawing}
                  width={CANVAS_WIDTH}
                />
                {points.length === 0 ? (
                  <KangurDrawingEmptyStateOverlay>
                    {translateWithFallback(
                      'geometryDrawing.inRound.drawHere',
                      fallbackCopy.drawHere
                    )}
                  </KangurDrawingEmptyStateOverlay>
                ) : null}
              </>
            }
            ariaDescribedBy='geometry-drawing-hint geometry-drawing-input-help'
            ariaKeyShortcuts={`Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape ${KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS}`}
            ariaLabel={translateWithFallback(
              'geometryDrawing.inRound.canvasAria',
              fallbackCopy.canvasAria,
              { shape: currentRound?.label ?? '' }
            )}
            boardClassName={cn(
              'relative w-full overflow-hidden rounded-[26px] p-0',
              !feedback && KANGUR_ACCENT_STYLES.teal.hoverCard,
              isCoarsePointer && 'shadow-[0_18px_38px_-30px_rgba(14,165,233,0.35)]',
              isPointerDrawing && 'ring-2 ring-sky-300/70 ring-offset-2 ring-offset-white'
            )}
            boardDataTestId='geometry-drawing-board'
            canvasDataTestId='geometry-drawing-canvas'
            canvasRef={canvasRef}
            canvasStyle={{ background: 'var(--kangur-soft-card-background)' }}
            feedback={feedback}
            feedbackTestId='geometry-drawing-feedback'
            height={CANVAS_HEIGHT}
            helpId='geometry-drawing-input-help'
            helpTestId='geometry-drawing-input-help'
            helpText={translateWithFallback(
              'geometryDrawing.inRound.inputHelp',
              fallbackCopy.inputHelp
            )}
            isCoarsePointer={isCoarsePointer}
            isPointerDrawing={isPointerDrawing}
            onKeyDown={handleCanvasKeyDown}
            onPointerCancel={handlePointerUp}
            onPointerDown={handlePointerDown}
            onPointerLeave={handlePointerUp}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            width={CANVAS_WIDTH}
          />
        </KangurGlassPanel>
      </div>
    </section>
  );
}
