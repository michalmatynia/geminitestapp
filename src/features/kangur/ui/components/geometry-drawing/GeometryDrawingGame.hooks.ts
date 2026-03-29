'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { getGeometryDrawingMiniGameFallbackCopy } from '@/features/kangur/ui/components/geometry-mini-game-fallbacks';
import {
  evaluateGeometryDrawing,
  type GeometryShapeId,
} from '@/features/kangur/ui/services/geometry-drawing';
import { loosenMinInt } from '@/features/kangur/ui/services/drawing-leniency';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import {
  createKangurDrawingDraftStorageKey,
  createKangurDrawingExportFilename,
} from '@/features/kangur/ui/components/drawing-engine/drawing-identifiers';
import { flattenKangurStrokePoints } from '@/features/kangur/ui/components/drawing-engine/stroke-metrics';
import { useKangurManagedStoredPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurManagedStoredPointDrawing';
import { useKangurKeyboardPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurKeyboardPointDrawing';
import type { KangurMiniGameInformationalFeedback, KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import type { GeometryDrawingGameProps, ShapeRound, GeometryDifficultyId } from './GeometryDrawingGame.types';
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

const localizeShapeRound = (
  translate: any,
  round: ShapeRound,
  fallbackRound: any
): ShapeRound => ({
  ...round,
  label: translate(`geometryDrawing.inRound.shapes.${round.id}.label`, fallbackRound.label),
  hint: translate(`geometryDrawing.inRound.shapes.${round.id}.hint`, fallbackRound.hint),
});

export function useGeometryDrawingGameState(props: GeometryDrawingGameProps) {
  const {
    activityKey,
    operation = 'geometry',
    shapeIds,
    lessonKey = 'geometry_shapes',
  } = props;

  const ownerKey = useKangurProgressOwnerKey();
  const locale = useLocale();
  const translations = useTranslations('KangurMiniGames');
  const fallbackCopy = useMemo(() => getGeometryDrawingMiniGameFallbackCopy(locale), [locale]);
  
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

  const localizedShapeLibrary = useMemo(() => 
    Object.fromEntries(
      Object.entries(SHAPE_ROUND_LIBRARY).map(([shapeId, round]) => [
        shapeId,
        localizeShapeRound(translations, round, fallbackCopy.shapes[shapeId as GeometryShapeId]),
      ])
    ) as Record<GeometryShapeId, ShapeRound>,
    [fallbackCopy.shapes, translations]
  );

  const customRounds = useMemo(() => 
    shapeIds?.map((id) => localizedShapeLibrary[id]) ?? [],
    [localizedShapeLibrary, shapeIds]
  );

  const rounds = useMemo(() => {
    if (customRounds.length > 0) return customRounds;
    const baseRounds = difficulty === 'starter' ? STARTER_ROUNDS : PRO_ROUNDS;
    return baseRounds.map(r => localizeShapeRound(translations, r, fallbackCopy.shapes[r.id]));
  }, [customRounds, difficulty, fallbackCopy.shapes, translations]);

  const currentRound = rounds[roundIndex];
  const totalRounds = rounds.length;
  const resolvedActivityKey = activityKey ?? `training:${operation}:${difficulty}`;

  const {
    clearStrokes,
    setStrokes,
    strokes,
    clearDrawing,
    undoDrawing,
    redoDrawing,
    exportDrawing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    canUndo,
    canRedo,
    isPointerDrawing,
  } = useKangurManagedStoredPointDrawing({
    actions: {
      clearFeedback: () => setFeedback(null),
      exportFilename: createKangurDrawingExportFilename(resolvedActivityKey.toLowerCase(), currentRound?.id ?? 'drawing'),
    },
    drawing: {
      canvasRef,
      backgroundFill: '#ffffff',
      logicalHeight: CANVAS_HEIGHT,
      logicalWidth: CANVAS_WIDTH,
      minPointDistance: isCoarsePointer ? 5 : 2,
      resolveStyle: () => ({ lineWidth: isCoarsePointer ? 7 : 5, strokeStyle: '#0f172a' }),
      storageKey: createKangurDrawingDraftStorageKey('geometry-drawing', currentRound ? resolvedActivityKey : null, currentRound?.id),
      touchLockEnabled: isCoarsePointer,
    },
  });

  const points = useMemo(() => flattenKangurStrokePoints(strokes), [strokes]);

  const resetKeyboardRef = useRef<((status: string) => void) | null>(null);
  const { resetKeyboard, keyboardCursor, keyboardDrawing, keyboardStatus, handleCanvasKeyDown } = useKangurKeyboardPointDrawing({
    clearedStatus: translations('geometryDrawing.inRound.keyboard.cleared'),
    disabled: done || feedback?.kind === 'success' || feedback?.kind === 'error',
    finishedStatus: translations('geometryDrawing.inRound.keyboard.finished'),
    height: CANVAS_HEIGHT,
    initialCursor: KEYBOARD_CURSOR_START,
    onEscape: () => { clearStrokes(); setFeedback(null); },
    readyStatus: translations('geometryDrawing.inRound.keyboard.ready'),
    setStrokes,
    startedStatus: translations('geometryDrawing.inRound.keyboard.started'),
    step: KEYBOARD_DRAW_STEP,
    width: CANVAS_WIDTH,
  });
  resetKeyboardRef.current = resetKeyboard;

  const finishGame = useCallback((finalScore: number) => {
    const progress = loadProgress({ ownerKey });
    const reward = createTrainingReward(progress, {
      activityKey: resolvedActivityKey,
      lessonKey,
      correctAnswers: finalScore,
      totalQuestions: totalRounds,
      difficulty,
      strongThresholdPercent: 65,
      perfectCounterKey: 'geometryPerfect',
    });
    addXp(reward.xp, reward.progressUpdates, { ownerKey });
    void persistKangurSessionScore({
      operation,
      score: finalScore,
      totalQuestions: totalRounds,
      correctAnswers: finalScore,
      timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
      xpEarned: reward.xp,
    });
    setXpEarned(reward.xp);
    setXpBreakdown(reward.breakdown ?? []);
    setDone(true);
  }, [difficulty, lessonKey, operation, ownerKey, resolvedActivityKey, totalRounds]);

  const handleCheck = useCallback(() => {
    if (done || feedback || !currentRound) return;
    const minDrawingPoints = isCoarsePointer ? Math.max(8, Math.round(BASE_MIN_DRAWING_POINTS * 0.7)) : BASE_MIN_DRAWING_POINTS;
    if (points.length < minDrawingPoints) {
      setFeedback({
        kind: 'info',
        text: translations('geometryDrawing.feedback.empty.description'),
        title: translations('geometryDrawing.feedback.empty.title'),
        description: translations('geometryDrawing.feedback.empty.description'),
      });
      return;
    }
    const result = evaluateGeometryDrawing(currentRound.id, points, {
      locale,
      translate: translations,
    });
    const wasCorrect = result.accepted;
    setFeedback({
      kind: wasCorrect ? 'success' : 'error',
      text: result.message,
      title: wasCorrect ? translations('geometryDrawing.feedback.success.title') : translations('geometryDrawing.feedback.error.title'),
      description: result.message,
    });
    
    const nextScore = wasCorrect ? score + 1 : score;
    if (wasCorrect) setScore(nextScore);
    
    setTimeout(() => {
      setFeedback(null);
      clearDrawing();
      if (roundIndex + 1 >= totalRounds) finishGame(nextScore);
      else setRoundIndex(prev => prev + 1);
    }, 1200);
  }, [clearDrawing, currentRound, done, feedback, finishGame, isCoarsePointer, locale, points, roundIndex, score, totalRounds, translations]);

  const resetRun = useCallback(() => {
    setRoundIndex(0); setScore(0); setDone(false); setXpEarned(0); setXpBreakdown([]); setFeedback(null);
    clearStrokes(); resetKeyboard(translations('geometryDrawing.inRound.keyboard.restarted'));
    sessionStartedAtRef.current = Date.now();
  }, [clearStrokes, resetKeyboard, translations]);

  return {
    translations, fallbackCopy, difficulty, setDifficulty, roundIndex, score, done, xpEarned, xpBreakdown, feedback, setFeedback, isCoarsePointer,
    currentRound, totalRounds, resolvedActivityKey, canvasRef,
    clearStrokes, setStrokes, strokes, clearDrawing, undoDrawing, redoDrawing, exportDrawing, handlePointerDown, handlePointerMove, handlePointerUp,
    hasDrawableContent, canUndo, canRedo,
    isPointerDrawing, keyboardCursor, keyboardDrawing, keyboardStatus, handleCanvasKeyDown,
    handleCheck, resetRun, finishGame,
  };
}
