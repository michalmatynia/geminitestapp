'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { KangurDrawingActionRow } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow';
import { KangurDrawingKeyboardCursorOverlay } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingOverlays';
import { KangurDrawingPracticeBoard } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard';
import { KangurDrawingStatusRegions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingStatusRegions';
import { flattenKangurStrokePoints } from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';
import { useKangurKeyboardPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurKeyboardPointDrawing';
import { useKangurPointCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurPointCanvasDrawing';
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { getGeometrySymmetryMiniGameFallbackCopy } from '@/features/kangur/ui/components/geometry-mini-game-fallbacks';
import {
  evaluateAxisDrawing,
  evaluateMirrorDrawing,
} from '@/features/kangur/ui/services/geometry-symmetry';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFinishActionProps,
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';
import {
  BASE_MIN_DRAWING_POINTS,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  KEYBOARD_CURSOR_START,
  KEYBOARD_DRAW_STEP,
  ROUNDS,
  flattenPaths,
} from './GeometrySymmetryGame.data';
import {
  computeShapeBounds,
  drawAxis,
  drawAxisCorridor,
  drawGhostShape,
  drawGrid,
  drawShape,
  drawTargetZone,
} from './GeometrySymmetryGame.canvas';
import type { SymmetryRound } from './GeometrySymmetryGame.types';

const localizeSymmetryRound = (
  translate: KangurMiniGameTranslate,
  round: SymmetryRound,
  fallbackRound: Pick<SymmetryRound, 'hint' | 'prompt' | 'title'>
): SymmetryRound => ({
  ...round,
  title: translateKangurMiniGameWithFallback(
    translate,
    `geometrySymmetry.inRound.rounds.${round.id}.title`,
    fallbackRound.title
  ),
  prompt: translateKangurMiniGameWithFallback(
    translate,
    `geometrySymmetry.inRound.rounds.${round.id}.prompt`,
    fallbackRound.prompt
  ),
  hint: translateKangurMiniGameWithFallback(
    translate,
    `geometrySymmetry.inRound.rounds.${round.id}.hint`,
    fallbackRound.hint
  ),
});

export default function GeometrySymmetryGame({
  onFinish,
}: KangurMiniGameFinishActionProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const locale = useLocale();
  const translations = useTranslations('KangurMiniGames');
  const fallbackCopy = useMemo(() => getGeometrySymmetryMiniGameFallbackCopy(locale), [locale]);
  const translateWithFallback = useCallback(
    (key: string, fallback: string, values?: Record<string, string | number>): string =>
      translateKangurMiniGameWithFallback(translations, key, fallback, values),
    [translations]
  );
  const handleFinish = onFinish;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const nextRoundTimeoutRef = useRef<number | null>(null);
  const resolvedRounds = useMemo(
    () =>
      ROUNDS.map((round) =>
        localizeSymmetryRound(translations, round, fallbackCopy.rounds[round.id] ?? round)
      ),
    [fallbackCopy.rounds, translations]
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<KangurMiniGameInformationalFeedback | null>(null);
  const [showMirrorHint, setShowMirrorHint] = useState(false);
  const isCoarsePointer = useKangurCoarsePointer();

  const totalRounds = resolvedRounds.length;
  const currentRound = resolvedRounds[roundIndex];
  const minPointDistance = isCoarsePointer ? 5 : 2;
  const minDrawingPoints = isCoarsePointer
    ? Math.max(6, Math.round(BASE_MIN_DRAWING_POINTS * 0.7))
    : BASE_MIN_DRAWING_POINTS;
  const strokeWidth = isCoarsePointer ? 7 : 5;
  const {
    clearStrokes,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    setStrokes,
    strokes,
  } = useKangurPointCanvasDrawing({
    canvasRef,
    enabled: !done && feedback?.kind !== 'success' && feedback?.kind !== 'error',
    logicalHeight: CANVAS_HEIGHT,
    logicalWidth: CANVAS_WIDTH,
    minPointDistance,
    onPointerStart: () => {
      if (feedback?.kind === 'info') {
        setFeedback(null);
      }
    },
    backgroundFill: '#ffffff',
    beforeStrokes: (ctx) => {
      drawGrid(ctx);

      if (currentRound) {
        if (currentRound.type === 'mirror' && currentRound.expectedSide) {
          drawTargetZone(ctx, currentRound.axis, currentRound.expectedSide, {
            shadeOpposite: true,
          });
          if (showMirrorHint) {
            drawGhostShape(ctx, currentRound.template, currentRound.axis);
          }
          drawAxis(ctx, currentRound.axis);
          drawShape(ctx, currentRound.template, '#6ee7b7', 4);
        } else {
          drawAxisCorridor(
            ctx,
            currentRound.axis,
            computeShapeBounds(currentRound.template)
          );
          drawShape(ctx, currentRound.template, '#a7f3d0', 4);
        }
      }
    },
    resolveStyle: () => ({
      lineWidth: strokeWidth,
      strokeStyle: '#0f172a',
    }),
    touchLockEnabled: isCoarsePointer,
  });
  const points = useMemo(() => flattenKangurStrokePoints(strokes), [strokes]);

  useEffect(() => {
    return () => {
      if (nextRoundTimeoutRef.current !== null) {
        window.clearTimeout(nextRoundTimeoutRef.current);
      }
    };
  }, []);
  const keyboardReadyStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.ready',
    fallbackCopy.keyboard.ready
  );
  const keyboardStartedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.started',
    fallbackCopy.keyboard.started
  );
  const keyboardFinishedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.finished',
    fallbackCopy.keyboard.finished
  );
  const keyboardClearedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.cleared',
    fallbackCopy.keyboard.cleared
  );
  const keyboardBoardClearedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.boardCleared',
    fallbackCopy.keyboard.boardCleared
  );
  const keyboardRestartedStatus = translateWithFallback(
    'geometrySymmetry.inRound.keyboard.restarted',
    fallbackCopy.keyboard.restarted
  );

  const clearBoardState = useCallback((): void => {
    clearStrokes();
    setFeedback(null);
  }, [clearStrokes]);

  const {
    handleCanvasKeyDown,
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    resetKeyboard,
  } = useKangurKeyboardPointDrawing({
    clearedStatus: keyboardClearedStatus,
    disabled: done || feedback?.kind === 'success' || feedback?.kind === 'error',
    finishedStatus: keyboardFinishedStatus,
    height: CANVAS_HEIGHT,
    initialCursor: KEYBOARD_CURSOR_START,
    onBeforeKeyboardAction: () => {
      if (feedback?.kind === 'info') {
        setFeedback(null);
      }
    },
    onEscape: clearBoardState,
    readyStatus: keyboardReadyStatus,
    setStrokes,
    startedStatus: keyboardStartedStatus,
    step: KEYBOARD_DRAW_STEP,
    width: CANVAS_WIDTH,
  });

  const clearDrawing = useCallback((): void => {
    clearBoardState();
    resetKeyboard(keyboardBoardClearedStatus);
  }, [clearBoardState, keyboardBoardClearedStatus, resetKeyboard]);

  const moveToNextRound = useCallback(
    (wasCorrect: boolean): void => {
      const nextScore = wasCorrect ? score + 1 : score;
      if (wasCorrect) {
        setScore(nextScore);
      }

      const isLastRound = roundIndex + 1 >= totalRounds;
      if (nextRoundTimeoutRef.current !== null) {
        window.clearTimeout(nextRoundTimeoutRef.current);
      }
      nextRoundTimeoutRef.current = window.setTimeout((): void => {
        nextRoundTimeoutRef.current = null;
        setFeedback(null);
        clearDrawing();
        setShowMirrorHint(false);
        if (isLastRound) {
          const progress = loadProgress({ ownerKey });
          const reward = createTrainingReward(progress, {
            activityKey: 'training:geometry_symmetry',
            lessonKey: 'geometry_symmetry',
            correctAnswers: nextScore,
            totalQuestions: totalRounds,
            strongThresholdPercent: 65,
            perfectCounterKey: 'geometryPerfect',
          });
          addXp(reward.xp, reward.progressUpdates, { ownerKey });
          void persistKangurSessionScore({
            operation: 'geometry_symmetry',
            score: nextScore,
            totalQuestions: totalRounds,
            correctAnswers: nextScore,
            timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
            xpEarned: reward.xp,
          });
          setXpEarned(reward.xp);
          setXpBreakdown(reward.breakdown ?? []);
          setDone(true);
          return;
        }
        setRoundIndex((current) => current + 1);
      }, 1200);
    },
    [clearDrawing, roundIndex, score, totalRounds]
  );

  const handleCheck = (): void => {
    if (done || feedback || !currentRound) return;
    if (points.length < minDrawingPoints) {
      setFeedback({
        kind: 'info',
        text: translateWithFallback(
          'geometrySymmetry.inRound.tooShort',
          fallbackCopy.tooShort
        ),
      });
      return;
    }

    if (currentRound.type === 'axis') {
      const result = evaluateAxisDrawing(points, currentRound.axis, {
        locale,
        translate: translations,
      });
      setFeedback({
        kind: result.kind,
        text: result.message,
      });
      moveToNextRound(result.accepted);
      return;
    }

    const templatePoints = flattenPaths(currentRound.template);
    const result = evaluateMirrorDrawing({
      points,
      template: templatePoints,
      axis: currentRound.axis,
      expectedSide: currentRound.expectedSide ?? 'right',
      locale,
      translate: translations,
    });
    setFeedback({
      kind: result.kind,
      text: result.message,
    });
    moveToNextRound(result.accepted);
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setFeedback(null);
    setShowMirrorHint(false);
    clearBoardState();
    resetKeyboard(keyboardRestartedStatus);
    sessionStartedAtRef.current = Date.now();
  };

  const boardAccent =
    feedback?.kind === 'success'
      ? 'emerald'
      : feedback?.kind === 'error'
        ? 'rose'
        : feedback?.kind === 'info'
          ? 'amber'
          : 'emerald';
  const isResultLocked = feedback?.kind === 'success' || feedback?.kind === 'error';

  if (done) {
    const percent = Math.round((score / totalRounds) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='geometry-symmetry-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          ariaHidden
          dataTestId='geometry-symmetry-summary-emoji'
          emoji={score === totalRounds ? '🏆' : score >= Math.ceil(totalRounds / 2) ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle unwrapped>
          <KangurHeadline accent='emerald' as='h3' data-testid='geometry-symmetry-summary-title'>
            {getKangurMiniGameScoreLabel(translations, score, totalRounds)}
          </KangurHeadline>
        </KangurPracticeGameSummaryTitle>
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='geometry-symmetry-summary-breakdown'
          itemDataTestIdPrefix='geometry-symmetry-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent='emerald'
          ariaLabel={translations('geometrySymmetry.progressAriaLabel')}
          ariaValueText={`${percent}% ${translations('shared.correctAnswersSuffix')}`}
          dataTestId='geometry-symmetry-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage className='max-w-xs text-center'>
          {score === totalRounds
            ? translations('geometrySymmetry.summary.perfect')
            : score >= Math.ceil(totalRounds / 2)
              ? translations('geometrySymmetry.summary.good')
              : translations('geometrySymmetry.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={getKangurMiniGameFinishLabel(translations, 'back')}
          onFinish={handleFinish}
          restartLabel={translations('shared.restart')}
          onRestart={handleRestart}
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <section
      aria-labelledby='geometry-symmetry-heading'
      className={`flex flex-col items-center w-full max-w-sm mx-auto ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <KangurDrawingStatusRegions
        keyboardStatus={keyboardStatus}
        keyboardStatusTestId='geometry-symmetry-keyboard-status'
        liveMessage={translateWithFallback(
          'geometrySymmetry.inRound.liveRegion',
          fallbackCopy.liveRegion,
          { current: roundIndex + 1, total: totalRounds, prompt: currentRound?.prompt ?? '' }
        )}
      />

      <div className='w-full flex items-center kangur-panel-gap'>
        <KangurProgressBar
          accent='emerald'
          aria-label={translateWithFallback(
            'geometrySymmetry.progressAriaLabel',
            fallbackCopy.progressAriaLabel
          )}
          aria-valuetext={translateWithFallback(
            'geometrySymmetry.inRound.progressValueText',
            fallbackCopy.progressValueText,
            { current: roundIndex + 1, total: totalRounds }
          )}
          className='flex-1'
          data-testid='geometry-symmetry-progress-bar'
          size='sm'
          value={(roundIndex / totalRounds) * 100}
        />
        <KangurStatusChip
          accent='emerald'
          className='shrink-0'
          data-testid='geometry-symmetry-progress-label'
          size='sm'
        >
          {roundIndex + 1}/{totalRounds}
        </KangurStatusChip>
      </div>

      <div className='w-full'>
        <KangurGlassPanel
          className='flex flex-col items-center kangur-panel-gap'
          data-testid='geometry-symmetry-round-shell'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <KangurInfoCard
            accent='emerald'
            className='flex w-full flex-col items-center kangur-panel-gap rounded-[24px] text-center'
            data-testid='geometry-symmetry-prompt-card'
            padding='md'
            tone='accent'
          >
            <KangurStatusChip accent='emerald' size='sm'>
              {translateWithFallback(
                'geometrySymmetry.inRound.modeLabel',
                fallbackCopy.modeLabel,
                {
                  mode:
                    currentRound?.type === 'axis'
                      ? translateWithFallback(
                          'geometrySymmetry.inRound.mode.axis',
                          fallbackCopy.mode.axis
                        )
                      : translateWithFallback(
                          'geometrySymmetry.inRound.mode.mirror',
                          fallbackCopy.mode.mirror
                        ),
                }
              )}
            </KangurStatusChip>
            <KangurDisplayEmoji size='md'>{currentRound?.emoji}</KangurDisplayEmoji>
            <KangurHeadline accent='emerald' as='h3' id='geometry-symmetry-heading' size='sm'>
              {currentRound?.title}
            </KangurHeadline>
            <p className='text-sm text-center [color:var(--kangur-page-muted-text)]'>
              {currentRound?.prompt}
            </p>
            <p className='text-xs text-center text-emerald-700'>{currentRound?.hint}</p>
            {currentRound?.type === 'mirror' ? (
              <p className='text-[11px] text-center text-emerald-700/80'>
                {translateWithFallback(
                  'geometrySymmetry.inRound.mirror.zoneHint',
                  fallbackCopy.mirror.zoneHint
                )}
              </p>
            ) : null}
            {currentRound?.type === 'mirror' ? (
              <div className='mt-1 flex flex-wrap items-center justify-center gap-2'>
                <KangurButton
                  size='sm'
                  type='button'
                  variant='surface'
                  disabled={isResultLocked}
                  onClick={() => setShowMirrorHint((current) => !current)}
                >
                  {showMirrorHint
                    ? translateWithFallback(
                        'geometrySymmetry.inRound.mirror.hideHint',
                        fallbackCopy.mirror.hideHint
                      )
                    : translateWithFallback(
                        'geometrySymmetry.inRound.mirror.showHint',
                        fallbackCopy.mirror.showHint
                      )}
                </KangurButton>
                {showMirrorHint ? (
                  <span className='text-[11px] font-semibold text-emerald-700'>
                    {translateWithFallback(
                      'geometrySymmetry.inRound.mirror.ghostHint',
                      fallbackCopy.mirror.ghostHint
                    )}
                  </span>
                ) : null}
              </div>
            ) : null}
          </KangurInfoCard>

          <KangurDrawingPracticeBoard
            accent={boardAccent}
            actionRow={
              <KangurDrawingActionRow
                clearDisabled={isResultLocked || (points.length === 0 && feedback === null)}
                clearLabel={translateWithFallback(
                  'geometrySymmetry.inRound.clear',
                  fallbackCopy.clear
                )}
                feedback={feedback}
                isCoarsePointer={isCoarsePointer}
                onClear={clearDrawing}
                onPrimary={handleCheck}
                primaryDisabled={isResultLocked}
                primaryLabel={translateWithFallback(
                  'geometrySymmetry.inRound.check',
                  fallbackCopy.check
                )}
              />
            }
            afterCanvas={
              <KangurDrawingKeyboardCursorOverlay
                accentClassName='border-emerald-400/80 bg-emerald-100/70 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]'
                cursor={keyboardCursor}
                height={CANVAS_HEIGHT}
                isCoarsePointer={isCoarsePointer}
                isDrawing={keyboardDrawing}
                width={CANVAS_WIDTH}
              />
            }
            ariaDescribedBy='geometry-symmetry-input-help'
            ariaKeyShortcuts='Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape'
            ariaLabel={translateWithFallback(
              'geometrySymmetry.inRound.canvasAria',
              fallbackCopy.canvasAria
            )}
            boardClassName={cn(
              'relative w-full overflow-hidden rounded-[26px] p-0',
              !feedback && KANGUR_ACCENT_STYLES.emerald.hoverCard,
              isCoarsePointer && 'shadow-[0_18px_38px_-30px_rgba(16,185,129,0.35)]',
              isPointerDrawing && 'ring-2 ring-emerald-300/70 ring-offset-2 ring-offset-white'
            )}
            boardDataTestId='geometry-symmetry-board'
            canvasDataTestId='geometry-symmetry-canvas'
            canvasRef={canvasRef}
            canvasStyle={{ background: 'var(--kangur-soft-card-background)' }}
            feedback={feedback}
            feedbackBeforeActions
            feedbackTestId='geometry-symmetry-feedback'
            height={CANVAS_HEIGHT}
            helpId='geometry-symmetry-input-help'
            helpTestId='geometry-symmetry-input-help'
            helpText={translateWithFallback(
              'geometrySymmetry.inRound.inputHelp',
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
