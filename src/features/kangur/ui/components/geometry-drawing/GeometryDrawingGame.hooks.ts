'use client';

import { useCallback, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import {
  createKangurDrawingDraftStorageKey,
  createKangurDrawingExportFilename,
} from '@/features/kangur/ui/components/drawing-engine/drawing-identifiers';
import { flattenKangurStrokePoints } from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';
import { useKangurKeyboardPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurKeyboardPointDrawing';
import { useKangurManagedStoredPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurManagedStoredPointDrawing';
import { getGeometryDrawingMiniGameFallbackCopy } from '@/features/kangur/ui/components/geometry-mini-game-fallbacks';
import {
  translateKangurMiniGameWithFallback,
  type KangurMiniGameTranslate,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { loosenMinInt } from '@/features/kangur/ui/services/drawing-leniency';
import {
  evaluateGeometryDrawing,
  type GeometryShapeId,
} from '@/features/kangur/ui/services/geometry-drawing';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';

import type {
  GeometryDifficultyId,
  GeometryDrawingGameProps,
  ShapeRound,
} from './GeometryDrawingGame.types';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  KEYBOARD_CURSOR_START,
  KEYBOARD_DRAW_STEP,
  PRO_ROUNDS,
  SHAPE_ROUND_LIBRARY,
  STARTER_ROUNDS,
} from './GeometryDrawingGame.constants';

const BASE_MIN_DRAWING_POINTS = loosenMinInt(14);

const DIFFICULTY_LABELS: Record<GeometryDifficultyId, string> = {
  starter: 'Starter',
  pro: 'Pro',
};

const getGeometryDrawingShapeLabel = (
  translate: KangurMiniGameTranslate,
  shapeId: GeometryShapeId,
  fallback: string
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `geometryDrawing.inRound.shapes.${shapeId}.label`,
    fallback
  );

const getGeometryDrawingShapeHint = (
  translate: KangurMiniGameTranslate,
  shapeId: GeometryShapeId,
  fallback: string
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `geometryDrawing.inRound.shapes.${shapeId}.hint`,
    fallback
  );

const localizeShapeRound = (
  translate: KangurMiniGameTranslate,
  round: ShapeRound,
  fallbackRound: ShapeRound
): ShapeRound => ({
  ...round,
  label: getGeometryDrawingShapeLabel(translate, round.id, fallbackRound.label),
  hint: getGeometryDrawingShapeHint(translate, round.id, fallbackRound.hint),
});

const getGeometryDifficultyLabel = (
  translate: KangurMiniGameTranslate,
  difficulty: GeometryDifficultyId
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `geometryDrawing.inRound.difficulty.${difficulty}`,
    DIFFICULTY_LABELS[difficulty]
  );

export function useGeometryDrawingGameState(props: GeometryDrawingGameProps) {
  const {
    activityKey,
    difficultyLabelOverride,
    lessonKey = 'geometry_shapes',
    operation = 'geometry',
    shapeIds,
    showDifficultySelector,
  } = props;

  const ownerKey = useKangurProgressOwnerKey();
  const locale = useLocale();
  const translations = useTranslations('KangurMiniGames');
  const fallbackCopy = useMemo(() => getGeometryDrawingMiniGameFallbackCopy(locale), [locale]);

  const translateWithFallback = useCallback(
    (key: string, fallback: string, values?: Record<string, string | number>): string =>
      translateKangurMiniGameWithFallback(translations, key, fallback, values),
    [translations]
  );

  const [difficulty, setDifficulty] = useState<GeometryDifficultyId>('starter');
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<KangurMiniGameInformationalFeedback | null>(null);

  const isCoarsePointer = useKangurCoarsePointer();
  const sessionStartedAtRef = useRef(Date.now());
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const localizedShapeLibrary = useMemo<Record<GeometryShapeId, ShapeRound>>(
    () =>
      Object.fromEntries(
        Object.entries(SHAPE_ROUND_LIBRARY).map(([shapeId, round]) => [
          shapeId,
          localizeShapeRound(translations, round, {
            ...round,
            ...fallbackCopy.shapes[shapeId as GeometryShapeId],
          }),
        ])
      ) as Record<GeometryShapeId, ShapeRound>,
    [fallbackCopy.shapes, translations]
  );

  const difficultyLabels = useMemo<Record<GeometryDifficultyId, string>>(
    () => ({
      starter: getGeometryDifficultyLabel(translations, 'starter'),
      pro: getGeometryDifficultyLabel(translations, 'pro'),
    }),
    [translations]
  );

  const customRounds = useMemo(
    () =>
      shapeIds && shapeIds.length > 0
        ? shapeIds
            .map((shapeId) => localizedShapeLibrary[shapeId])
            .filter((round): round is ShapeRound => Boolean(round))
        : [],
    [localizedShapeLibrary, shapeIds]
  );

  const rounds = useMemo(() => {
    if (customRounds.length > 0) {
      return customRounds;
    }

    const baseRounds = difficulty === 'starter' ? STARTER_ROUNDS : PRO_ROUNDS;
    return baseRounds.map((round) =>
      localizeShapeRound(translations, round, {
        ...round,
        ...fallbackCopy.shapes[round.id],
      })
    );
  }, [customRounds, difficulty, fallbackCopy.shapes, translations]);

  const currentRound = rounds[roundIndex];
  const totalRounds = rounds.length;
  const resolvedActivityKey = activityKey ?? `training:${operation}:${difficulty}`;
  const shouldShowDifficultySelector = showDifficultySelector ?? customRounds.length === 0;
  const resolvedDifficultyLabel = shouldShowDifficultySelector
    ? difficultyLabels[difficulty]
    : difficultyLabelOverride ??
      translateWithFallback(
        'geometryDrawing.inRound.difficulty.default',
        fallbackCopy.difficultyDefault
      );
  const minPointDistance = isCoarsePointer ? 5 : 2;
  const minDrawingPoints = isCoarsePointer
    ? Math.max(8, Math.round(BASE_MIN_DRAWING_POINTS * 0.7))
    : BASE_MIN_DRAWING_POINTS;
  const strokeWidth = isCoarsePointer ? 7 : 5;
  const exportFileName = useMemo(
    () =>
      createKangurDrawingExportFilename(
        resolvedActivityKey.toLowerCase(),
        currentRound?.id ?? 'drawing'
      ),
    [currentRound?.id, resolvedActivityKey]
  );

  const keyboardReadyStatus = translateWithFallback(
    'geometryDrawing.inRound.keyboard.ready',
    fallbackCopy.keyboard.ready
  );
  const keyboardStartedStatus = translateWithFallback(
    'geometryDrawing.inRound.keyboard.started',
    fallbackCopy.keyboard.started
  );
  const keyboardFinishedStatus = translateWithFallback(
    'geometryDrawing.inRound.keyboard.finished',
    fallbackCopy.keyboard.finished
  );
  const keyboardClearedStatus = translateWithFallback(
    'geometryDrawing.inRound.keyboard.cleared',
    fallbackCopy.keyboard.cleared
  );
  const keyboardBoardClearedStatus = translateWithFallback(
    'geometryDrawing.inRound.keyboard.boardCleared',
    fallbackCopy.keyboard.boardCleared
  );
  const keyboardRestartedStatus = translateWithFallback(
    'geometryDrawing.inRound.keyboard.restarted',
    fallbackCopy.keyboard.restarted
  );

  const keyboardCanvasKeyDownRef = useRef<
    ((event: ReactKeyboardEvent<HTMLCanvasElement>) => void) | null
  >(null);
  const resetKeyboardRef = useRef<((status: string) => void) | null>(null);

  const handleManagedUnhandledKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>): void => {
      keyboardCanvasKeyDownRef.current?.(event);
    },
    []
  );

  const handleManagedAfterClearExtra = useCallback((): void => {
    resetKeyboardRef.current?.(keyboardBoardClearedStatus);
  }, [keyboardBoardClearedStatus]);

  const {
    canRedo,
    canUndo,
    clearDraftSnapshot,
    clearStrokes,
    clearDrawing,
    exportDrawing,
    handleCanvasKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isPointerDrawing,
    redoDrawing,
    setStrokes,
    strokes,
    undoDrawing,
  } = useKangurManagedStoredPointDrawing({
    actions: {
      clearFeedback: () => {
        setFeedback(null);
      },
      exportFilename: exportFileName,
      onAfterClearExtra: handleManagedAfterClearExtra,
      onUnhandledKeyDown: handleManagedUnhandledKeyDown,
    },
    drawing: {
      backgroundFill: '#ffffff',
      baseLayerCacheKey: 'geometry-drawing:grid:v1',
      beforeStrokes: (ctx) => {
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        for (let x = 40; x < CANVAS_WIDTH; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, CANVAS_HEIGHT);
          ctx.stroke();
        }
        for (let y = 40; y < CANVAS_HEIGHT; y += 40) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(CANVAS_WIDTH, y);
          ctx.stroke();
        }
      },
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
      resolveStyle: () => ({
        lineWidth: strokeWidth,
        strokeStyle: '#0f172a',
      }),
      storageKey: createKangurDrawingDraftStorageKey(
        'geometry-drawing',
        currentRound ? resolvedActivityKey : null,
        currentRound?.id
      ),
      touchLockEnabled: isCoarsePointer,
    },
  });

  const points = useMemo(() => flattenKangurStrokePoints(strokes), [strokes]);

  const clearBoardState = useCallback((): void => {
    clearDraftSnapshot();
    clearStrokes();
    setFeedback(null);
  }, [clearDraftSnapshot, clearStrokes]);

  const {
    handleCanvasKeyDown: handleKeyboardCanvasKeyDown,
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

  keyboardCanvasKeyDownRef.current = handleKeyboardCanvasKeyDown;
  resetKeyboardRef.current = resetKeyboard;

  const finishGame = useCallback(
    (finalScore: number) => {
      const progress = loadProgress({ ownerKey });
      const reward = createTrainingReward(progress, {
        activityKey: resolvedActivityKey,
        correctAnswers: finalScore,
        difficulty,
        lessonKey,
        perfectCounterKey: 'geometryPerfect',
        strongThresholdPercent: 65,
        totalQuestions: totalRounds,
      });

      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        correctAnswers: finalScore,
        operation,
        score: finalScore,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        totalQuestions: totalRounds,
        xpEarned: reward.xp,
      });

      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
    },
    [difficulty, lessonKey, operation, ownerKey, resolvedActivityKey, totalRounds]
  );

  const resetRun = useCallback((): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setFeedback(null);
    clearBoardState();
    resetKeyboard(keyboardRestartedStatus);
    sessionStartedAtRef.current = Date.now();
  }, [clearBoardState, keyboardRestartedStatus, resetKeyboard]);

  const handleDifficultyChange = useCallback(
    (nextDifficulty: GeometryDifficultyId): void => {
      if (nextDifficulty === difficulty) {
        return;
      }

      setDifficulty(nextDifficulty);
      resetRun();
      resetKeyboard(
        translateWithFallback(
          'geometryDrawing.inRound.keyboard.difficultyChanged',
          fallbackCopy.keyboard.difficultyChanged,
          { difficulty: difficultyLabels[nextDifficulty] }
        )
      );
    },
    [difficulty, difficultyLabels, fallbackCopy.keyboard.difficultyChanged, resetKeyboard, resetRun, translateWithFallback]
  );

  const moveToNextRound = useCallback(
    (wasCorrect: boolean): void => {
      const nextScore = wasCorrect ? score + 1 : score;
      if (wasCorrect) {
        setScore(nextScore);
      }

      const isLastRound = roundIndex + 1 >= totalRounds;
      window.setTimeout((): void => {
        setFeedback(null);
        clearDrawing();
        if (isLastRound) {
          finishGame(nextScore);
          return;
        }
        setRoundIndex((current) => current + 1);
      }, 1200);
    },
    [clearDrawing, finishGame, roundIndex, score, totalRounds]
  );

  const handleCheck = useCallback((): void => {
    if (done || feedback || !currentRound) {
      return;
    }

    if (points.length < minDrawingPoints) {
      setFeedback({
        kind: 'info',
        text: translateWithFallback('geometryDrawing.inRound.tooShort', fallbackCopy.tooShort),
      });
      return;
    }

    const result = evaluateGeometryDrawing(currentRound.id, points, {
      locale,
      translate: translations,
    });

    setFeedback({
      kind: result.accepted ? 'success' : 'error',
      text: result.message,
    });
    moveToNextRound(result.accepted);
  }, [currentRound, done, fallbackCopy.tooShort, feedback, locale, minDrawingPoints, moveToNextRound, points, translations, translateWithFallback]);

  return {
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
  };
}
