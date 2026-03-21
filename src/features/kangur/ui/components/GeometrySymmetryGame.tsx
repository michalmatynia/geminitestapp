'use client';

import { Eraser } from 'lucide-react';
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
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurPanelRow,
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
import {
  resolveKangurCanvasPoint,
  syncKangurCanvasContext,
} from '@/features/kangur/ui/services/drawing-canvas';
import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import { useKangurCanvasRedraw } from '@/features/kangur/ui/hooks/useKangurCanvasRedraw';
import type {
  KangurMiniGameFinishActionProps,
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import type { Point2d } from '@/shared/contracts/geometry';
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

const distance = (a: Point2d, b: Point2d): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const flattenPoints = (strokes: Point2d[][]): Point2d[] =>
  strokes.flatMap((stroke) => stroke);

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
  const isDrawingRef = useRef(false);
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
  const [strokes, setStrokes] = useState<Point2d[][]>([]);
  const strokesRef = useRef<Point2d[][]>([]);
  const [isPointerDrawing, setIsPointerDrawing] = useState(false);
  const [showMirrorHint, setShowMirrorHint] = useState(false);
  const [keyboardCursor, setKeyboardCursor] = useState<Point2d>(KEYBOARD_CURSOR_START);
  const [keyboardDrawing, setKeyboardDrawing] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState(() =>
    translateWithFallback(
      'geometrySymmetry.inRound.keyboard.ready',
      fallbackCopy.keyboard.ready
    )
  );
  const isCoarsePointer = useKangurCoarsePointer();

  const totalRounds = resolvedRounds.length;
  const currentRound = resolvedRounds[roundIndex];
  const points = useMemo(() => flattenPoints(strokes), [strokes]);
  const minPointDistance = isCoarsePointer ? 5 : 2;
  const minDrawingPoints = isCoarsePointer
    ? Math.max(6, Math.round(BASE_MIN_DRAWING_POINTS * 0.7))
    : BASE_MIN_DRAWING_POINTS;
  const strokeWidth = isCoarsePointer ? 7 : 5;

  const redrawCanvas = useCallback(
    (nextStrokes: Point2d[][], round: SymmetryRound | undefined): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = syncKangurCanvasContext(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawGrid(ctx);

      if (round) {
        if (round.type === 'mirror' && round.expectedSide) {
          drawTargetZone(ctx, round.axis, round.expectedSide, { shadeOpposite: true });
          if (showMirrorHint) {
            drawGhostShape(ctx, round.template, round.axis);
          }
          drawAxis(ctx, round.axis);
          drawShape(ctx, round.template, '#6ee7b7', 4);
        } else {
          drawAxisCorridor(ctx, round.axis, computeShapeBounds(round.template));
          drawShape(ctx, round.template, '#a7f3d0', 4);
        }
      }

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const stroke of nextStrokes) {
        if (stroke.length === 0) continue;
        ctx.beginPath();
        const first = stroke[0];
        if (!first) continue;
        ctx.moveTo(first.x, first.y);
        for (let i = 1; i < stroke.length; i += 1) {
          const point = stroke[i];
          if (!point) continue;
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      }
    },
    [showMirrorHint, strokeWidth]
  );

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    return () => {
      if (nextRoundTimeoutRef.current !== null) {
        window.clearTimeout(nextRoundTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    redrawCanvas(strokesRef.current, currentRound);
  }, [currentRound, redrawCanvas]);

  useKangurCanvasRedraw({
    canvasRef,
    redraw: () => redrawCanvas(strokes, currentRound),
  });
  useKangurCanvasTouchLock(canvasRef);

  const updateStrokes = useCallback(
    (updater: (current: Point2d[][]) => Point2d[][]): void => {
      setStrokes((current) => {
        const next = updater(current);
        redrawCanvas(next, currentRound);
        return next;
      });
    },
    [currentRound, redrawCanvas]
  );

  const clearDrawing = useCallback((): void => {
    setStrokes(() => {
      redrawCanvas([], currentRound);
      return [];
    });
    setKeyboardDrawing(false);
    setKeyboardStatus(
      translateWithFallback(
        'geometrySymmetry.inRound.keyboard.boardCleared',
        fallbackCopy.keyboard.boardCleared
      )
    );
  }, [currentRound, fallbackCopy.keyboard.boardCleared, redrawCanvas, translateWithFallback]);

  const resolvePoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): Point2d => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      return resolveKangurCanvasPoint(event, canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    },
    []
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (done || feedback) return;
    event.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = resolvePoint(event);
    isDrawingRef.current = true;
    setIsPointerDrawing(true);
    canvas.setPointerCapture(event.pointerId);
    updateStrokes((current) => [...current, [point]]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current || done || feedback) return;
    event.preventDefault();
    const point = resolvePoint(event);
    updateStrokes((current) => {
      if (current.length === 0) return current;
      const next = [...current];
      const lastStroke = next[next.length - 1] ?? [];
      const lastPoint = lastStroke[lastStroke.length - 1];
      if (lastPoint && distance(lastPoint, point) < minPointDistance) {
        return current;
      }
      next[next.length - 1] = [...lastStroke, point];
      return next;
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    setIsPointerDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }
  };

  const appendKeyboardPoint = useCallback(
    (point: Point2d): void => {
      updateStrokes((current) => {
        if (current.length === 0) {
          return [[point]];
        }
        const next = [...current];
        const lastStroke = next[next.length - 1] ?? [];
        next[next.length - 1] = [...lastStroke, point];
        return next;
      });
    },
    [updateStrokes]
  );

  const beginKeyboardStroke = useCallback((): void => {
    const point = { ...keyboardCursor };
    updateStrokes((current) => [...current, [point]]);
    setKeyboardDrawing(true);
    setKeyboardStatus(
      translateWithFallback(
        'geometrySymmetry.inRound.keyboard.started',
        fallbackCopy.keyboard.started
      )
    );
  }, [fallbackCopy.keyboard.started, keyboardCursor, translateWithFallback, updateStrokes]);

  const finishKeyboardStroke = useCallback((): void => {
    if (keyboardDrawing) {
      appendKeyboardPoint({ ...keyboardCursor });
    }
    setKeyboardDrawing(false);
    setKeyboardStatus(
      translateWithFallback(
        'geometrySymmetry.inRound.keyboard.finished',
        fallbackCopy.keyboard.finished
      )
    );
  }, [
    appendKeyboardPoint,
    fallbackCopy.keyboard.finished,
    keyboardCursor,
    keyboardDrawing,
    translateWithFallback,
  ]);

  const handleCanvasKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>): void => {
    if (done || feedback) return;

    const key = event.key;
    if (
      key !== 'ArrowUp' &&
      key !== 'ArrowDown' &&
      key !== 'ArrowLeft' &&
      key !== 'ArrowRight' &&
      key !== 'Enter' &&
      key !== ' ' &&
      key !== 'Escape'
    ) {
      return;
    }

    event.preventDefault();

    if (key === 'Enter' || key === ' ') {
      if (keyboardDrawing) {
        finishKeyboardStroke();
      } else {
        beginKeyboardStroke();
      }
      return;
    }

    if (key === 'Escape') {
      clearDrawing();
      setKeyboardCursor(KEYBOARD_CURSOR_START);
      setKeyboardStatus(
        translateWithFallback(
          'geometrySymmetry.inRound.keyboard.cleared',
          fallbackCopy.keyboard.cleared
        )
      );
      return;
    }

    const delta =
      key === 'ArrowUp'
        ? { x: 0, y: -KEYBOARD_DRAW_STEP }
        : key === 'ArrowDown'
          ? { x: 0, y: KEYBOARD_DRAW_STEP }
          : key === 'ArrowLeft'
            ? { x: -KEYBOARD_DRAW_STEP, y: 0 }
            : { x: KEYBOARD_DRAW_STEP, y: 0 };

    const nextPoint = {
      x: Math.max(12, Math.min(CANVAS_WIDTH - 12, keyboardCursor.x + delta.x)),
      y: Math.max(12, Math.min(CANVAS_HEIGHT - 12, keyboardCursor.y + delta.y)),
    };

    setKeyboardCursor(nextPoint);
    if (keyboardDrawing) {
      appendKeyboardPoint(nextPoint);
    }
  };

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
          const progress = loadProgress();
          const reward = createTrainingReward(progress, {
            activityKey: 'training:geometry_symmetry',
            lessonKey: 'geometry_symmetry',
            correctAnswers: nextScore,
            totalQuestions: totalRounds,
            strongThresholdPercent: 65,
            perfectCounterKey: 'geometryPerfect',
          });
          addXp(reward.xp, reward.progressUpdates);
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
    setKeyboardCursor(KEYBOARD_CURSOR_START);
    setKeyboardDrawing(false);
    clearDrawing();
    setKeyboardStatus(
      translateWithFallback(
        'geometrySymmetry.inRound.keyboard.restarted',
        fallbackCopy.keyboard.restarted
      )
    );
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
      <div aria-live='polite' aria-atomic='true' className='sr-only'>
        {translateWithFallback(
          'geometrySymmetry.inRound.liveRegion',
          fallbackCopy.liveRegion,
          { current: roundIndex + 1, total: totalRounds, prompt: currentRound?.prompt ?? '' }
        )}
      </div>
      <div
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'
        data-testid='geometry-symmetry-keyboard-status'
      >
        {keyboardStatus}
      </div>

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
                  disabled={feedback !== null}
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

          <KangurInfoCard
            accent={boardAccent}
            className={cn(
              'relative w-full overflow-hidden rounded-[26px] p-0',
              !feedback && KANGUR_ACCENT_STYLES.emerald.hoverCard
            )}
            data-testid='geometry-symmetry-board'
            padding='sm'
            tone={feedback ? 'accent' : 'neutral'}
          >
            <canvas
              aria-describedby='geometry-symmetry-input-help'
              aria-label={translateWithFallback(
                'geometrySymmetry.inRound.canvasAria',
                fallbackCopy.canvasAria
              )}
              aria-keyshortcuts='Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape'
              data-testid='geometry-symmetry-canvas'
              data-drawing-active={isPointerDrawing ? 'true' : 'false'}
              role='img'
              ref={canvasRef}
              tabIndex={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className='kangur-drawing-canvas w-full rounded-[20px] touch-none'
              style={{ background: 'var(--kangur-soft-card-background)' }}
              onKeyDown={handleCanvasKeyDown}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
            />
            <div
              aria-hidden='true'
              className={cn(
                'pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/80 bg-emerald-100/70 shadow-[0_0_0_3px_rgba(16,185,129,0.12)] transition-transform duration-75',
                keyboardDrawing ? 'scale-110' : 'scale-100'
              )}
              style={{
                left: `${(keyboardCursor.x / CANVAS_WIDTH) * 100}%`,
                top: `${(keyboardCursor.y / CANVAS_HEIGHT) * 100}%`,
              }}
            />
          </KangurInfoCard>
          <p
            id='geometry-symmetry-input-help'
            className='hidden text-xs text-center [color:var(--kangur-page-muted-text)] sm:block'
          >
            {translateWithFallback(
              'geometrySymmetry.inRound.inputHelp',
              fallbackCopy.inputHelp
            )}
          </p>

          {feedback && (
            <p
              aria-live='polite'
              className={cn(
                'text-sm font-semibold text-center',
                feedback.kind === 'success'
                  ? 'text-emerald-600'
                  : feedback.kind === 'error'
                    ? 'text-rose-600'
                    : 'text-amber-600'
              )}
              data-testid='geometry-symmetry-feedback'
              role='status'
            >
              {feedback.text}
            </p>
          )}

          <KangurPanelRow className='w-full'>
            <KangurButton
              className='w-full sm:flex-1'
              disabled={feedback !== null || points.length === 0}
              onClick={clearDrawing}
              type='button'
              size='lg'
              variant='surface'
            >
              <Eraser aria-hidden='true' className='w-4 h-4' />
              {translateWithFallback('geometrySymmetry.inRound.clear', fallbackCopy.clear)}
            </KangurButton>
            <KangurButton
              className={cn(
                'w-full sm:flex-1',
                feedback
                  ? feedback.kind === 'success'
                    ? 'bg-emerald-500 border-emerald-500 text-white'
                    : feedback.kind === 'error'
                      ? 'bg-rose-500 border-rose-500 text-white'
                      : 'bg-amber-500 border-amber-500 text-white'
                  : '[background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]'
              )}
              disabled={feedback !== null}
              onClick={handleCheck}
              type='button'
              size='lg'
              variant='primary'
            >
              {translateWithFallback('geometrySymmetry.inRound.check', fallbackCopy.check)}
            </KangurButton>
          </KangurPanelRow>
        </KangurGlassPanel>
      </div>
    </section>
  );
}
