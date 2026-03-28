'use client';

import { Sparkles, RefreshCw } from 'lucide-react';
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
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';

import type { GeometryDrawingGameProps } from './geometry-drawing/GeometryDrawingGame.types';
import { CANVAS_HEIGHT, CANVAS_WIDTH } from './geometry-drawing/GeometryDrawingGame.constants';
import { useGeometryDrawingGameState } from './geometry-drawing/GeometryDrawingGame.hooks';

export default function GeometryDrawingGame(props: GeometryDrawingGameProps): React.JSX.Element {
  const state = useGeometryDrawingGameState(props);
  const {
    translations, roundIndex, score, done, xpEarned, xpBreakdown, feedback,
    currentRound, totalRounds, canvasRef,
    clearStrokes, undoDrawing, redoDrawing, handlePointerDown, handlePointerMove, handlePointerUp,
    hasDrawableContent, canUndo, canRedo,
    keyboardCursor, keyboardDrawing, keyboardStatus, handleCanvasKeyDown,
    handleCheck, resetRun,
  } = state;

  const { onFinish, finishLabel = 'Wróć' } = props;

  if (done) {
    const accuracy = Math.round((score / Math.max(1, totalRounds)) * 100);
    return (
      <KangurPracticeGameSummary>
        <KangurPracticeGameSummaryEmoji emoji='📐' />
        <KangurPracticeGameSummaryTitle>{getKangurMiniGameScoreLabel(translations, score, totalRounds)}</KangurPracticeGameSummaryTitle>
        <KangurPracticeGameSummaryMessage>{accuracy >= 80 ? translations('geometryDrawing.summary.strong') : translations('geometryDrawing.summary.retry')}</KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryXP xp={xpEarned} />
        <KangurPracticeGameSummaryBreakdown breakdown={xpBreakdown} />
        <KangurPracticeGameSummaryProgress accuracy={accuracy} totalQuestions={totalRounds} />
        <KangurPracticeGameSummaryActions>
          <KangurButton onClick={resetRun} variant='primary' size='lg'><RefreshCw className='h-4 w-4' />{translations('shared.retry')}</KangurButton>
          <KangurButton onClick={onFinish} variant='surface' size='lg'>{getKangurMiniGameFinishLabel(translations, finishLabel)}</KangurButton>
        </KangurPracticeGameSummaryActions>
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

          <div className='relative mx-auto flex flex-col items-center'>
            <KangurDrawingPracticeBoard
              ref={canvasRef}
              height={CANVAS_HEIGHT}
              width={CANVAS_WIDTH}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onKeyDown={handleCanvasKeyDown}
              tabIndex={0}
            />
            {keyboardDrawing && <KangurDrawingKeyboardCursorOverlay cursor={keyboardCursor} height={CANVAS_HEIGHT} width={CANVAS_WIDTH} />}
            {!hasDrawableContent && !feedback && <KangurDrawingEmptyStateOverlay message={currentRound?.hint || ''} />}
          </div>

          <div className='flex items-center justify-between'>
            <KangurDrawingActionRow canRedo={canRedo} canUndo={canUndo} onClear={clearStrokes} onRedo={redoDrawing} onUndo={undoDrawing} />
            <KangurButton onClick={handleCheck} disabled={!hasDrawableContent || !!feedback} variant='primary' size='md'><Sparkles className='h-4 w-4' />{translations('shared.check')}</KangurButton>
          </div>
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
