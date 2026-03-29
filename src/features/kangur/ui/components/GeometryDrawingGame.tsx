'use client';

import React from 'react';

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
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { KangurDrawingActionRow } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow';
import {
  KangurDrawingEmptyStateOverlay,
  KangurDrawingKeyboardCursorOverlay,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingOverlays';
import { KangurDrawingPracticeBoard } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard';
import { KangurDrawingStatusRegions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingStatusRegions';
import {
  KangurGlassPanel,
  KangurInfoCard,
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
    translations, difficulty, roundIndex, score, done, xpEarned, xpBreakdown, feedback,
    currentRound, totalRounds, canvasRef,
    clearDrawing, exportDrawing, undoDrawing, redoDrawing, handlePointerDown, handlePointerMove, handlePointerUp,
    hasDrawableContent, canUndo, canRedo, isCoarsePointer, isPointerDrawing,
    keyboardCursor, keyboardDrawing, keyboardStatus, handleCanvasKeyDown,
    handleCheck, resetRun,
  } = state;

  const { onFinish, finishLabel } = props;
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
          ariaLabel={translations('geometryDrawing.progressAriaLabel')}
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

  if (roundIndex === 0 && !hasDrawableContent && !feedback) {
    // This is simplified, original had a more complex intro view
  }

  return (
    <div className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
      <KangurDrawingStatusRegions
        keyboardStatus={keyboardStatus}
        keyboardStatusTestId='geometry-drawing-keyboard-status'
        liveMessage={currentRound?.label}
      />

      <KangurGlassPanel data-testid='geometry-drawing-shell' padding='lg' surface='playField' variant='soft'>
        <div className='flex flex-col kangur-panel-gap'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='text-3xl'>{currentRound?.emoji}</div>
              <div>
                <div className='text-xs font-black uppercase tracking-widest text-slate-400'>{translations('geometryDrawing.inRound.roundLabel', { current: roundIndex + 1, total: totalRounds })}</div>
                <div className='text-sm font-bold text-slate-900'>{currentRound?.label}</div>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              <div className='text-right'><div className='text-[10px] font-black uppercase tracking-widest text-slate-400'>Wynik</div><div className='text-sm font-bold text-slate-900'>{score}/{totalRounds}</div></div>
            </div>
          </div>

          <KangurDrawingPracticeBoard
            accent={summaryAccent}
            actionRow={
              <KangurDrawingActionRow
                clearDisabled={feedback !== null || !hasDrawableContent}
                clearLabel={translations('geometryDrawing.inRound.clear')}
                feedback={feedback}
                isCoarsePointer={isCoarsePointer}
                onClear={clearDrawing}
                onPrimary={handleCheck}
                primaryDisabled={!hasDrawableContent || feedback !== null}
                primaryLabel={translations('geometryDrawing.inRound.check')}
                utilityActions={
                  <KangurManagedDrawingUtilityActions
                    canExport={hasDrawableContent}
                    canRedo={canRedo}
                    canUndo={canUndo}
                    exportLabel={translations('geometryDrawing.inRound.export')}
                    exportTestId='geometry-drawing-export'
                    historyLocked={feedback !== null}
                    isCoarsePointer={isCoarsePointer}
                    layoutPreset='practice-board'
                    onExport={exportDrawing}
                    onRedo={redoDrawing}
                    onUndo={undoDrawing}
                    redoLabel={translations('geometryDrawing.inRound.redo')}
                    redoTestId='geometry-drawing-redo'
                    undoLabel={translations('geometryDrawing.inRound.undo')}
                    undoTestId='geometry-drawing-undo'
                  />
                }
              />
            }
            afterCanvas={
              <>
                <KangurDrawingKeyboardCursorOverlay
                  accentClassName='border-teal-400/80 bg-teal-100/70 shadow-[0_0_0_3px_rgba(45,212,191,0.14)]'
                  cursor={keyboardCursor}
                  height={CANVAS_HEIGHT}
                  isCoarsePointer={isCoarsePointer}
                  isDrawing={keyboardDrawing}
                  width={CANVAS_WIDTH}
                />
                {!hasDrawableContent && !feedback ? (
                  <KangurDrawingEmptyStateOverlay>
                    {currentRound?.hint ?? ''}
                  </KangurDrawingEmptyStateOverlay>
                ) : null}
              </>
            }
            ariaDescribedBy='geometry-drawing-input-help'
            ariaKeyShortcuts={`Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape ${KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS}`}
            ariaLabel={
              currentRound
                ? translations('geometryDrawing.inRound.canvasAria', { shape: currentRound.label })
                : translations('geometryDrawing.inRound.canvasAriaFallback')
            }
            boardClassName={cn(
              'relative w-full overflow-hidden rounded-[26px] p-0',
              !feedback && KANGUR_ACCENT_STYLES[summaryAccent].hoverCard,
              isCoarsePointer && 'shadow-[0_18px_38px_-30px_rgba(45,212,191,0.35)]',
              isPointerDrawing && 'ring-2 ring-teal-300/70 ring-offset-2 ring-offset-white'
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
            helpText={translations('geometryDrawing.inRound.inputHelp')}
            isCoarsePointer={isCoarsePointer}
            isPointerDrawing={isPointerDrawing}
            onKeyDown={handleCanvasKeyDown}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            width={CANVAS_WIDTH}
          />
        </div>
      </KangurGlassPanel>
      
      {feedback && (
        <KangurInfoCard accent={feedback.kind === 'success' ? 'emerald' : feedback.kind === 'error' ? 'rose' : 'amber'} tone='accent' padding='md'>
          <div className='flex items-center gap-3'>
            <div className='text-2xl'>{feedback.kind === 'success' ? '🎉' : feedback.kind === 'error' ? '💡' : 'ℹ️'}</div>
            <div><div className='text-sm font-black text-slate-900'>{feedback.title}</div><div className='text-xs font-semibold text-slate-600'>{feedback.description}</div></div>
          </div>
        </KangurInfoCard>
      )}
    </div>
  );
}
