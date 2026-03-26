'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { PencilRuler } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import { KangurDrawingActionRow } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingActionRow';
import {
  KangurDrawingEmptyStateOverlay,
  KangurDrawingKeyboardCursorOverlay,
} from '@/features/kangur/ui/components/drawing-engine/KangurDrawingOverlays';
import { KangurDrawingPracticeBoard } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingPracticeBoard';
import { KangurDrawingStatusRegions } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingStatusRegions';
import { flattenKangurStrokePoints } from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';
import { useKangurKeyboardPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurKeyboardPointDrawing';
import { useKangurPointCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurPointCanvasDrawing';
import {
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  evaluateGeometryDrawing,
  type GeometryShapeId,
} from '@/features/kangur/ui/services/geometry-drawing';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { loosenMax, loosenMin, loosenMinInt } from '@/features/kangur/ui/services/drawing-leniency';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameAccuracyText,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { Point2d } from '@/shared/contracts/geometry';
import type {
  KangurMiniGameFinishProps,
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type PerimeterRound = {
  id: string;
  shape: 'square' | 'rectangle';
  a: number;
  b?: number;
  emoji: string;
};

const ROUNDS: PerimeterRound[] = [
  {
    id: 'square-3',
    shape: 'square',
    a: 3,
    emoji: '🟥',
  },
  {
    id: 'rect-6-4',
    shape: 'rectangle',
    a: 6,
    b: 4,
    emoji: '▭',
  },
  {
    id: 'rect-5-2',
    shape: 'rectangle',
    a: 5,
    b: 2,
    emoji: '▭',
  },
  {
    id: 'square-4',
    shape: 'square',
    a: 4,
    emoji: '🟥',
  },
  {
    id: 'rect-7-3',
    shape: 'rectangle',
    a: 7,
    b: 3,
    emoji: '▭',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const GRID_STEP = 40;
const KEYBOARD_DRAW_STEP = 14;
const KEYBOARD_CURSOR_START = {
  x: Math.round(CANVAS_WIDTH / 2),
  y: Math.round(CANVAS_HEIGHT / 2),
} as const;

const buildChoices = (correct: number, roundIndex: number): number[] => {
  const options = new Set<number>([correct]);
  const deltas = [2, 4, 6, 8];
  for (const delta of deltas) {
    options.add(correct + delta);
    if (correct - delta > 0) options.add(correct - delta);
    if (options.size >= 4) break;
  }
  const list = Array.from(options).slice(0, 4);
  const seed = (roundIndex + 1) * 17;
  return list.sort((a, b) => ((a * seed) % 97) - ((b * seed) % 97));
};

const computeBoundingBox = (points: Point2d[]): {
  width: number;
  height: number;
} => {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return {
    width: Math.max(0, maxX - minX),
    height: Math.max(0, maxY - minY),
  };
};

const toGridUnits = (value: number): number =>
  Math.max(1, Math.round(value / GRID_STEP));

const withinTolerance = (value: number, target: number, tolerance = 0): boolean =>
  Math.abs(value - target) <= tolerance;

const BASE_MIN_DRAWING_POINTS = loosenMinInt(14);
const BASE_MIN_GRID_UNITS = loosenMin(2);
const BASE_GRID_SNAP_TOLERANCE = loosenMax(6);
const BASE_MIN_GRID_ALIGNMENT_RATIO = loosenMin(0.8);

const distanceToNearestGridLine = (value: number): number => {
  const snapped = Math.round(value / GRID_STEP) * GRID_STEP;
  return Math.abs(value - snapped);
};

const gridAlignmentRatio = (points: Point2d[], tolerance: number): number => {
  if (points.length === 0) return 0;
  let aligned = 0;
  for (const point of points) {
    const xDist = distanceToNearestGridLine(point.x);
    const yDist = distanceToNearestGridLine(point.y);
    if (Math.min(xDist, yDist) <= tolerance) {
      aligned += 1;
    }
  }
  return aligned / points.length;
};

export default function GeometryPerimeterDrawingGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const locale = useLocale();
  const translations = useTranslations('KangurMiniGames');
  const summaryFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'lesson');
  const handleFinish = onFinish;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<KangurMiniGameInformationalFeedback | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [drawingValidated, setDrawingValidated] = useState(false);
  const isCoarsePointer = useKangurCoarsePointer();
  const sessionStartedAtRef = useRef(Date.now());

  const currentRound = ROUNDS[roundIndex] ?? null;
  const perimeter = currentRound
    ? currentRound.shape === 'square'
      ? currentRound.a * 4
      : (currentRound.a + (currentRound.b ?? 0)) * 2
    : 0;
  const choices = useMemo(
    () => buildChoices(perimeter, roundIndex),
    [perimeter, roundIndex]
  );
  const minPointDistance = isCoarsePointer ? 5 : 2;
  const minDrawingPoints = isCoarsePointer
    ? Math.max(8, Math.round(BASE_MIN_DRAWING_POINTS * 0.7))
    : BASE_MIN_DRAWING_POINTS;
  const gridSnapTolerance = isCoarsePointer
    ? BASE_GRID_SNAP_TOLERANCE + 2
    : BASE_GRID_SNAP_TOLERANCE;
  const minGridAlignmentRatio = isCoarsePointer
    ? Math.max(0.65, BASE_MIN_GRID_ALIGNMENT_RATIO - 0.1)
    : BASE_MIN_GRID_ALIGNMENT_RATIO;
  const strokeWidth = isCoarsePointer ? 7 : 5;
  const isLocked = feedback?.kind === 'success' || feedback?.kind === 'error';
  const revealAnswers = feedback?.kind === 'success' || feedback?.kind === 'error';
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
    enabled: !done && !isLocked && !drawingValidated,
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
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      for (let x = GRID_STEP; x < CANVAS_WIDTH; x += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, CANVAS_HEIGHT);
        ctx.stroke();
      }
      for (let y = GRID_STEP; y < CANVAS_HEIGHT; y += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(CANVAS_WIDTH, y);
        ctx.stroke();
      }
    },
    resolveStyle: () => ({
      lineWidth: strokeWidth,
      strokeStyle: '#0f172a',
    }),
    touchLockEnabled: isCoarsePointer,
  });
  const points = useMemo(() => flattenKangurStrokePoints(strokes), [strokes]);
  const isDrawingReady = points.length >= minDrawingPoints;

  useEffect(
    () => () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    },
    []
  );
  const keyboardReadyStatus = translations('geometryPerimeter.inRound.keyboard.ready');
  const keyboardStartedStatus = translations('geometryPerimeter.inRound.keyboard.started');
  const keyboardFinishedStatus = translations('geometryPerimeter.inRound.keyboard.finished');
  const keyboardClearedStatus = translations('geometryPerimeter.inRound.keyboard.cleared');
  const keyboardBoardClearedStatus = translations('geometryPerimeter.inRound.keyboard.boardCleared');
  const keyboardRestartedStatus = translations('geometryPerimeter.inRound.keyboard.restarted');

  const clearBoardState = useCallback((): void => {
    clearStrokes();
    setSelected(null);
    setDrawingValidated(false);
  }, [clearStrokes]);

  const {
    handleCanvasKeyDown,
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    resetKeyboard,
  } = useKangurKeyboardPointDrawing({
    clearedStatus: keyboardClearedStatus,
    disabled: done || isLocked || drawingValidated,
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

  const finishGame = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(
        progress,
        'geometry_perimeter',
        finalScore,
        TOTAL_ROUNDS
      );
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'geometry_perimeter',
        score: finalScore,
        totalQuestions: TOTAL_ROUNDS,
        correctAnswers: finalScore,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
    },
    [ownerKey]
  );

  const moveToNextRound = useCallback(
    (wasCorrect: boolean): void => {
      const nextScore = wasCorrect ? score + 1 : score;
      if (wasCorrect) {
        setScore(nextScore);
      }

      const isLastRound = roundIndex + 1 >= TOTAL_ROUNDS;
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
      advanceTimeoutRef.current = scheduleKangurRoundFeedback(() => {
        advanceTimeoutRef.current = null;
        setFeedback(null);
        clearDrawing();
        setSelected(null);
        setDrawingValidated(false);
        if (isLastRound) {
          finishGame(nextScore);
          return;
        }
        setRoundIndex((current) => current + 1);
      });
    },
    [clearDrawing, finishGame, roundIndex, score]
  );

  const handleSelect = (value: number): void => {
    if (isLocked) return;
    if (feedback?.kind === 'info') {
      setFeedback(null);
    }
    setSelected(value);
  };

  const evaluateDrawing = (): { accepted: boolean; message: string; retryable?: boolean } => {
    if (!currentRound) {
      return { accepted: false, message: translations('geometryPerimeter.inRound.errors.noTask') };
    }
    if (points.length < minDrawingPoints) {
      return {
        accepted: false,
        message: translations('geometryPerimeter.inRound.errors.tooShort'),
        retryable: true,
      };
    }
    const shapeId: GeometryShapeId =
      currentRound.shape === 'square' ? 'square' : 'rectangle';
    const result = evaluateGeometryDrawing(shapeId, points, { locale });
    if (!result.accepted) {
      return { accepted: false, message: result.message };
    }

    const { width, height } = computeBoundingBox(points);
    const widthUnits = toGridUnits(width);
    const heightUnits = toGridUnits(height);
    const minUnits = Math.min(widthUnits, heightUnits);
    if (minUnits < BASE_MIN_GRID_UNITS) {
      return { accepted: false, message: translations('geometryPerimeter.inRound.errors.tooSmall') };
    }

    const alignmentRatio = gridAlignmentRatio(points, gridSnapTolerance);
    if (alignmentRatio < minGridAlignmentRatio) {
      return {
        accepted: false,
        message: translations('geometryPerimeter.inRound.errors.alignToGrid'),
      };
    }

    if (currentRound.shape === 'square') {
      const matches =
        withinTolerance(widthUnits, currentRound.a) &&
        withinTolerance(heightUnits, currentRound.a);
      const pixelMatch =
        Math.abs(width - currentRound.a * GRID_STEP) <= gridSnapTolerance &&
        Math.abs(height - currentRound.a * GRID_STEP) <= gridSnapTolerance;
      if (!matches) {
        return {
          accepted: false,
          message: translations('geometryPerimeter.inRound.errors.squareSize', {
            size: currentRound.a,
          }),
        };
      }
      if (!pixelMatch) {
        return {
          accepted: false,
          message: translations('geometryPerimeter.inRound.errors.adjustEdges'),
        };
      }
    } else {
      const a = currentRound.a;
      const b = currentRound.b ?? 0;
      const matches =
        (withinTolerance(widthUnits, a) && withinTolerance(heightUnits, b)) ||
        (withinTolerance(widthUnits, b) && withinTolerance(heightUnits, a));
      const pixelMatch =
        (Math.abs(width - a * GRID_STEP) <= gridSnapTolerance &&
          Math.abs(height - b * GRID_STEP) <= gridSnapTolerance) ||
        (Math.abs(width - b * GRID_STEP) <= gridSnapTolerance &&
          Math.abs(height - a * GRID_STEP) <= gridSnapTolerance);
      if (!matches) {
        return {
          accepted: false,
          message: translations('geometryPerimeter.inRound.errors.rectangleSize', {
            a,
            b,
          }),
        };
      }
      if (!pixelMatch) {
        return {
          accepted: false,
          message: translations('geometryPerimeter.inRound.errors.adjustEdges'),
        };
      }
    }

    return {
      accepted: true,
      message: translations('geometryPerimeter.inRound.feedback.shapeAccepted'),
    };
  };

  const handleCheck = (): void => {
    if (done || isLocked || !currentRound) return;
    if (!drawingValidated) {
      const drawingResult = evaluateDrawing();
      if (!drawingResult.accepted) {
        setFeedback({
          kind: drawingResult.retryable ? 'info' : 'error',
          text: drawingResult.message,
        });
        if (!drawingResult.retryable) {
          moveToNextRound(false);
        }
        return;
      }
      setDrawingValidated(true);
      setFeedback({
        kind: 'info',
        text: translations('geometryPerimeter.inRound.feedback.selectPerimeter'),
      });
      return;
    }
    if (selected === null) {
      setFeedback({ kind: 'info', text: translations('geometryPerimeter.inRound.feedback.pickAnswer') });
      return;
    }

    const correct = selected === perimeter;
    if (correct) {
      setFeedback({
        kind: 'success',
        text: translations('geometryPerimeter.inRound.feedback.correctPerimeter', {
          perimeter,
        }),
      });
    } else {
      setFeedback({
        kind: 'error',
        text: translations('geometryPerimeter.inRound.feedback.incorrectPerimeter', {
          perimeter,
        }),
      });
    }
    moveToNextRound(correct);
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setFeedback(null);
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
          : 'amber';

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='geometry-perimeter-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          ariaHidden
          dataTestId='geometry-perimeter-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='amber'
          dataTestId='geometry-perimeter-summary-title'
          title={getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
        />
        <KangurPracticeGameSummaryXP accent='amber' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='geometry-perimeter-summary-breakdown'
          itemDataTestIdPrefix='geometry-perimeter-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent='amber'
          ariaLabel={translations('geometryPerimeter.progressAriaLabel')}
          ariaValueText={getKangurMiniGameAccuracyText(translations, percent)}
          dataTestId='geometry-perimeter-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('geometryPerimeter.summary.perfect')
            : percent >= 70
              ? translations('geometryPerimeter.summary.good')
              : translations('geometryPerimeter.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          className={KANGUR_STACK_ROW_CLASSNAME}
          finishButtonClassName='w-full sm:flex-1'
          finishLabel={summaryFinishLabel}
          onFinish={handleFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
          restartButtonClassName='w-full sm:flex-1'
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurPracticeGameStage>
      <KangurDrawingStatusRegions
        keyboardStatus={keyboardStatus}
        keyboardStatusTestId='geometry-perimeter-keyboard-status'
        liveMessage={translations('geometryPerimeter.inRound.liveRegion', {
          current: roundIndex + 1,
          total: TOTAL_ROUNDS,
          shape: currentRound
            ? translations(`geometryPerimeter.inRound.rounds.${currentRound.id}.shapeName`)
            : '',
        })}
      />

      <KangurPracticeGameProgress
        accent='amber'
        currentRound={roundIndex}
        dataTestId='geometry-perimeter-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />

      <KangurGlassPanel
        className={cn('flex flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
        data-testid='geometry-perimeter-round-shell'
        padding='lg'
        surface='solid'
        variant='soft'
      >
        <KangurInfoCard
          accent='amber'
          className='flex w-full flex-col items-center gap-2 rounded-[22px] text-center'
          data-testid='geometry-perimeter-prompt-card'
          padding='md'
          tone='accent'
        >
          <KangurStatusChip accent='amber' size='sm'>
            {translations('geometryPerimeter.inRound.modeLabel')}
          </KangurStatusChip>
          <KangurDisplayEmoji size='md'>{currentRound?.emoji}</KangurDisplayEmoji>
          <KangurHeadline accent='amber' as='h3' size='sm'>
            {translations(`geometryPerimeter.inRound.rounds.${currentRound?.id}.title`)}
          </KangurHeadline>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>
            {currentRound ? translations(`geometryPerimeter.inRound.rounds.${currentRound.id}.hint`) : null}
          </p>
          <p className='text-xs font-semibold text-amber-700'>
            {translations('geometryPerimeter.inRound.gridScale')}
          </p>
        </KangurInfoCard>

        <KangurDrawingPracticeBoard
          accent={boardAccent}
          actionRow={
            <KangurDrawingActionRow
              clearDisabled={feedback !== null || points.length === 0}
              clearLabel={translations('geometryPerimeter.inRound.clear')}
              feedback={feedback}
              onClear={clearDrawing}
              onPrimary={handleCheck}
              primaryDisabled={
                isLocked ||
                (!drawingValidated && !isDrawingReady) ||
                (drawingValidated && selected === null)
              }
              primaryLabel={
                drawingValidated
                  ? translations('geometryPerimeter.inRound.checkPerimeter')
                  : translations('geometryPerimeter.inRound.checkDrawing')
              }
            />
          }
          afterCanvas={
            <>
              <KangurDrawingKeyboardCursorOverlay
                accentClassName='border-amber-400/80 bg-amber-100/70 shadow-[0_0_0_3px_rgba(251,191,36,0.15)]'
                cursor={keyboardCursor}
                height={CANVAS_HEIGHT}
                isCoarsePointer={isCoarsePointer}
                isDrawing={keyboardDrawing}
                width={CANVAS_WIDTH}
              />
              {points.length === 0 ? (
                <KangurDrawingEmptyStateOverlay>
                  <PencilRuler aria-hidden='true' className='mr-2 h-4 w-4' />
                  {translations('geometryPerimeter.inRound.drawOnGrid')}
                </KangurDrawingEmptyStateOverlay>
              ) : null}
            </>
          }
          ariaDescribedBy='geometry-perimeter-input-help'
          ariaKeyShortcuts='Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape'
          ariaLabel={
            currentRound
              ? translations('geometryPerimeter.inRound.canvasAria', {
                  shape: translations(`geometryPerimeter.inRound.rounds.${currentRound.id}.shapeName`),
                })
              : translations('geometryPerimeter.inRound.canvasAriaFallback')
          }
          boardClassName={cn(
            'relative w-full overflow-hidden rounded-[26px] p-0',
            !feedback && KANGUR_ACCENT_STYLES.amber.hoverCard,
            isCoarsePointer && 'shadow-[0_18px_38px_-30px_rgba(251,191,36,0.35)]',
            isPointerDrawing && 'ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white'
          )}
          boardDataTestId='geometry-perimeter-board'
          canvasDataTestId='geometry-perimeter-canvas'
          canvasRef={canvasRef}
          canvasStyle={{ background: 'var(--kangur-soft-card-background)' }}
          feedback={feedback}
          height={CANVAS_HEIGHT}
          helpId='geometry-perimeter-input-help'
          helpTestId='geometry-perimeter-input-help'
          helpText={translations('geometryPerimeter.inRound.inputHelp')}
          isCoarsePointer={isCoarsePointer}
          isPointerDrawing={isPointerDrawing}
          middleContent={
            drawingValidated ? (
              <div className='grid w-full grid-cols-1 gap-2 min-[420px]:grid-cols-2'>
                {choices.map((choice, index) => {
                  let accent: KangurAccent = 'amber';
                  let emphasis: 'neutral' | 'accent' = 'neutral';
                  let state: 'default' | 'muted' = 'default';
                  let className = '[color:var(--kangur-page-text)]';
                  if (revealAnswers) {
                    if (choice === perimeter) {
                      accent = 'emerald';
                      emphasis = 'accent';
                      className = KANGUR_ACCENT_STYLES.emerald.activeText;
                    } else if (choice === selected) {
                      accent = 'rose';
                      emphasis = 'accent';
                      className = KANGUR_ACCENT_STYLES.rose.activeText;
                    } else {
                      accent = 'slate';
                      state = 'muted';
                      className = '';
                    }
                  } else if (choice === selected) {
                    accent = 'amber';
                    emphasis = 'accent';
                    className = KANGUR_ACCENT_STYLES.amber.activeText;
                  }

                  return (
                    <KangurAnswerChoiceCard
                      key={`${currentRound?.id}-${choice}`}
                      accent={accent}
                      buttonClassName={cn(
                        'flex items-center justify-center px-4 py-3 text-center text-lg font-extrabold',
                        className,
                        feedback ? 'cursor-default' : 'cursor-pointer'
                      )}
                      data-testid={`geometry-perimeter-choice-${index}`}
                      emphasis={emphasis}
                      interactive={!isLocked}
                      onClick={() => handleSelect(choice)}
                      state={state}
                      tapScale={0.96}
                      type='button'
                    >
                      {choice} cm
                    </KangurAnswerChoiceCard>
                  );
                })}
              </div>
            ) : null
          }
          onKeyDown={handleCanvasKeyDown}
          onPointerCancel={handlePointerUp}
          onPointerDown={handlePointerDown}
          onPointerLeave={handlePointerUp}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          width={CANVAS_WIDTH}
        />
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
