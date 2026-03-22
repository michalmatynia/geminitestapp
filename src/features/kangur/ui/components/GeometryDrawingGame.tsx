'use client';

import { Eraser, PencilRuler } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';

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
  KANGUR_STACK_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { getGeometryDrawingMiniGameFallbackCopy } from '@/features/kangur/ui/components/geometry-mini-game-fallbacks';
import {
  evaluateGeometryDrawing,
  type GeometryShapeId,
} from '@/features/kangur/ui/services/geometry-drawing';
import {
  resolveKangurCanvasPoint,
  syncKangurCanvasContext,
} from '@/features/kangur/ui/services/drawing-canvas';
import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { loosenMinInt } from '@/features/kangur/ui/services/drawing-leniency';
import type { Point2d } from '@/shared/contracts/geometry';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import { useKangurCanvasRedraw } from '@/features/kangur/ui/hooks/useKangurCanvasRedraw';
import type {
  KangurMiniGameInformationalFeedback,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type GeometryDrawingGameProps = {
  activityKey?: string;
  difficultyLabelOverride?: string;
  finishLabel?: string;
  lessonKey?: string;
  onFinish: () => void;
  operation?: string;
  shapeIds?: GeometryShapeId[];
  showDifficultySelector?: boolean;
};

type ShapeRound = {
  id: GeometryShapeId;
  label: string;
  emoji: string;
  hint: string;
  accent: string;
};

type GeometryDifficultyId = 'starter' | 'pro';

const SHAPE_ROUND_LIBRARY: Record<GeometryShapeId, ShapeRound> = {
  circle: {
    id: 'circle',
    label: 'Koło',
    emoji: '⚪',
    hint: 'Narysuj jedną płynną, zamkniętą linię.',
    accent: 'kangur-gradient-accent-teal',
  },
  oval: {
    id: 'oval',
    label: 'Owal',
    emoji: '🥚',
    hint: 'Narysuj kształt bez rogów, ale trochę wydłużony.',
    accent: 'kangur-gradient-accent-sky',
  },
  triangle: {
    id: 'triangle',
    label: 'Trójkąt',
    emoji: '🔺',
    hint: 'Postaraj się zrobić 3 wyraźne rogi.',
    accent: 'kangur-gradient-accent-amber',
  },
  diamond: {
    id: 'diamond',
    label: 'Romb',
    emoji: '💠',
    hint: '4 rogi, boki wyglądają na ukośne.',
    accent: 'kangur-gradient-accent-amber-reverse',
  },
  square: {
    id: 'square',
    label: 'Kwadrat',
    emoji: '🟦',
    hint: '4 boki, podobna długość każdego boku.',
    accent: 'kangur-gradient-accent-indigo-reverse',
  },
  rectangle: {
    id: 'rectangle',
    label: 'Prostokąt',
    emoji: '▭',
    hint: '4 rogi, dwa boki wyraźnie dłuższe.',
    accent: 'kangur-gradient-accent-emerald',
  },
  pentagon: {
    id: 'pentagon',
    label: 'Pięciokąt',
    emoji: '⬟',
    hint: '5 rogów, zamknięta figura.',
    accent: 'kangur-gradient-accent-rose-reverse',
  },
  hexagon: {
    id: 'hexagon',
    label: 'Sześciokąt',
    emoji: '⬢',
    hint: '6 rogów i zamknięta linia.',
    accent: 'kangur-gradient-accent-violet',
  },
};

const STARTER_ROUNDS: ShapeRound[] = [
  SHAPE_ROUND_LIBRARY.circle,
  SHAPE_ROUND_LIBRARY.triangle,
  SHAPE_ROUND_LIBRARY.square,
  SHAPE_ROUND_LIBRARY.rectangle,
].filter((round): round is ShapeRound => Boolean(round));

const PRO_ROUNDS: ShapeRound[] = [
  SHAPE_ROUND_LIBRARY.circle,
  SHAPE_ROUND_LIBRARY.oval,
  SHAPE_ROUND_LIBRARY.triangle,
  SHAPE_ROUND_LIBRARY.diamond,
  SHAPE_ROUND_LIBRARY.square,
  SHAPE_ROUND_LIBRARY.rectangle,
  SHAPE_ROUND_LIBRARY.pentagon,
  SHAPE_ROUND_LIBRARY.hexagon,
].filter((round): round is ShapeRound => Boolean(round));

const DIFFICULTY_LABELS: Record<GeometryDifficultyId, string> = {
  starter: 'Starter',
  pro: 'Pro',
};

const SHAPE_ROUNDS_BY_DIFFICULTY: Record<GeometryDifficultyId, ShapeRound[]> = {
  starter: STARTER_ROUNDS,
  pro: PRO_ROUNDS,
};

const INITIAL_DIFFICULTY: GeometryDifficultyId = 'starter';

const LEGACY_SHAPE_ROUNDS: ShapeRound[] = [
  {
    id: 'circle',
    label: 'Koło',
    emoji: '⚪',
    hint: 'Narysuj jedną płynną, zamkniętą linię.',
    accent: 'kangur-gradient-accent-teal',
  },
  {
    id: 'triangle',
    label: 'Trójkąt',
    emoji: '🔺',
    hint: 'Postaraj się zrobić 3 wyraźne rogi.',
    accent: 'kangur-gradient-accent-amber',
  },
  {
    id: 'square',
    label: 'Kwadrat',
    emoji: '🟦',
    hint: '4 boki, podobna długość każdego boku.',
    accent: 'kangur-gradient-accent-indigo-reverse',
  },
  {
    id: 'rectangle',
    label: 'Prostokąt',
    emoji: '▭',
    hint: '4 rogi, dwa boki wyraźnie dłuższe.',
    accent: 'kangur-gradient-accent-emerald',
  },
  {
    id: 'pentagon',
    label: 'Pięciokąt',
    emoji: '⬟',
    hint: '5 rogów, zamknięta figura.',
    accent: 'kangur-gradient-accent-rose-reverse',
  },
];

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const KEYBOARD_DRAW_STEP = 14;
const KEYBOARD_CURSOR_START = {
  x: Math.round(CANVAS_WIDTH / 2),
  y: Math.round(CANVAS_HEIGHT / 2),
} as const;
const BASE_MIN_DRAWING_POINTS = loosenMinInt(14);

const distance = (a: Point2d, b: Point2d): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const flattenPoints = (strokes: Point2d[][]): Point2d[] =>
  strokes.flatMap((stroke) => stroke);

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

export default function GeometryDrawingGame({
  activityKey,
  difficultyLabelOverride,
  finishLabel = 'Wróć',
  lessonKey = 'geometry_shapes',
  onFinish,
  operation = 'geometry',
  shapeIds,
  showDifficultySelector,
}: GeometryDrawingGameProps): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurMiniGames');
  const fallbackCopy = useMemo(() => getGeometryDrawingMiniGameFallbackCopy(locale), [locale]);
  const translateWithFallback = useCallback(
    (key: string, fallback: string, values?: Record<string, string | number>): string =>
      translateKangurMiniGameWithFallback(translations, key, fallback, values),
    [translations]
  );
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

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

  const [difficulty, setDifficulty] = useState<GeometryDifficultyId>(INITIAL_DIFFICULTY);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<KangurMiniGameInformationalFeedback | null>(null);
  const [strokes, setStrokes] = useState<Point2d[][]>([]);
  const [isPointerDrawing, setIsPointerDrawing] = useState(false);
  const [keyboardCursor, setKeyboardCursor] = useState<Point2d>(KEYBOARD_CURSOR_START);
  const [keyboardDrawing, setKeyboardDrawing] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState(() =>
    translateWithFallback(
      'geometryDrawing.inRound.keyboard.ready',
      fallbackCopy.keyboard.ready
    )
  );
  const isCoarsePointer = useKangurCoarsePointer();
  const sessionStartedAtRef = useRef(Date.now());
  const handleFinishSession = (): void => {
    onFinish();
  };

  const customRounds = useMemo(
    () =>
      shapeIds && shapeIds.length > 0
        ? shapeIds
            .map((shapeId) => localizedShapeLibrary[shapeId])
            .filter((round): round is ShapeRound => Boolean(round))
        : [],
    [localizedShapeLibrary, shapeIds]
  );
  const rounds =
    customRounds.length > 0
      ? customRounds
      : SHAPE_ROUNDS_BY_DIFFICULTY[difficulty]?.length > 0
        ? SHAPE_ROUNDS_BY_DIFFICULTY[difficulty].map((round) =>
            localizeShapeRound(translations, round, {
              ...round,
              ...fallbackCopy.shapes[round.id],
            })
          )
        : LEGACY_SHAPE_ROUNDS.map((round) =>
            localizeShapeRound(translations, round, {
              ...round,
              ...fallbackCopy.shapes[round.id],
            })
          );
  const currentRound = rounds[roundIndex];
  const totalRounds = rounds.length;
  const resolvedActivityKey = activityKey ?? `training:${operation}:${difficulty}`;
  const shouldShowDifficultySelector =
    showDifficultySelector ?? (customRounds.length === 0);
  const resolvedDifficultyLabel = shouldShowDifficultySelector
    ? difficultyLabels[difficulty]
    : difficultyLabelOverride ??
      translateWithFallback(
        'geometryDrawing.inRound.difficulty.default',
        fallbackCopy.difficultyDefault
      );
  const points = useMemo(() => flattenPoints(strokes), [strokes]);
  const minPointDistance = isCoarsePointer ? 5 : 2;
  const minDrawingPoints = isCoarsePointer
    ? Math.max(8, Math.round(BASE_MIN_DRAWING_POINTS * 0.7))
    : BASE_MIN_DRAWING_POINTS;
  const strokeWidth = isCoarsePointer ? 7 : 5;

  const redrawCanvas = useCallback((nextStrokes: Point2d[][]): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = syncKangurCanvasContext(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

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
  }, [strokeWidth]);

  useKangurCanvasRedraw({
    canvasRef,
    redraw: () => redrawCanvas(strokes),
  });
  useKangurCanvasTouchLock(canvasRef, { enabled: isCoarsePointer });

  const updateStrokes = useCallback(
    (updater: (current: Point2d[][]) => Point2d[][]): void => {
      setStrokes((current) => {
        const next = updater(current);
        redrawCanvas(next);
        return next;
      });
    },
    [redrawCanvas]
  );

  const clearDrawing = useCallback((): void => {
    setStrokes(() => {
      redrawCanvas([]);
      return [];
    });
    setFeedback(null);
    setKeyboardDrawing(false);
    setKeyboardStatus(
      translateWithFallback(
        'geometryDrawing.inRound.keyboard.boardCleared',
        fallbackCopy.keyboard.boardCleared
      )
    );
  }, [fallbackCopy.keyboard.boardCleared, redrawCanvas, translateWithFallback]);

  const resolvePoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): Point2d => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      return resolveKangurCanvasPoint(event, canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    },
    []
  );

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (done || feedback?.kind === 'success' || feedback?.kind === 'error') return;
    event.preventDefault();
    if (feedback?.kind === 'info') {
      setFeedback(null);
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const point = resolvePoint(event);
    isDrawingRef.current = true;
    setIsPointerDrawing(true);
    canvas.setPointerCapture(event.pointerId);
    updateStrokes((current) => [...current, [point]]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (
      !isDrawingRef.current ||
      done ||
      feedback?.kind === 'success' ||
      feedback?.kind === 'error'
    ) {
      return;
    }
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

  const finishGame = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress();
      const reward = createTrainingReward(progress, {
        activityKey: resolvedActivityKey,
        lessonKey,
        correctAnswers: finalScore,
        totalQuestions: totalRounds,
        difficulty,
        strongThresholdPercent: 65,
        perfectCounterKey: 'geometryPerfect',
      });
      addXp(reward.xp, reward.progressUpdates);
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
    },
    [difficulty, lessonKey, operation, resolvedActivityKey, totalRounds]
  );

  const resetRun = useCallback((): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setFeedback(null);
    setKeyboardCursor(KEYBOARD_CURSOR_START);
    setKeyboardDrawing(false);
    clearDrawing();
    setKeyboardStatus(
      translateWithFallback(
        'geometryDrawing.inRound.keyboard.restarted',
        fallbackCopy.keyboard.restarted
      )
    );
    sessionStartedAtRef.current = Date.now();
  }, [clearDrawing, fallbackCopy.keyboard.restarted, translateWithFallback]);

  const handleDifficultyChange = (nextDifficulty: GeometryDifficultyId): void => {
    if (nextDifficulty === difficulty) return;
    setDifficulty(nextDifficulty);
    setKeyboardCursor(KEYBOARD_CURSOR_START);
    setKeyboardDrawing(false);
    resetRun();
    setKeyboardStatus(
      translateWithFallback(
        'geometryDrawing.inRound.keyboard.difficultyChanged',
        fallbackCopy.keyboard.difficultyChanged,
        { difficulty: difficultyLabels[nextDifficulty] }
      )
    );
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
        'geometryDrawing.inRound.keyboard.started',
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
        'geometryDrawing.inRound.keyboard.finished',
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
    if (done || feedback?.kind === 'success' || feedback?.kind === 'error') return;

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

    if (feedback?.kind === 'info') {
      setFeedback(null);
    }

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
          'geometryDrawing.inRound.keyboard.cleared',
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

  const handleCheck = (): void => {
    if (done || feedback || !currentRound) return;
    if (points.length < minDrawingPoints) {
      setFeedback({
        kind: 'info',
        text: translateWithFallback(
          'geometryDrawing.inRound.tooShort',
          fallbackCopy.tooShort
        ),
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
  };

  const handleRestart = (): void => {
    resetRun();
  };

  const boardAccent =
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
      className={`flex flex-col items-center w-full max-w-sm ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      {done ? (
        <KangurPracticeGameSummary dataTestId='geometry-drawing-summary-shell'>
          <KangurPracticeGameSummaryEmoji
            ariaHidden
            dataTestId='geometry-drawing-summary-emoji'
            emoji={score === totalRounds ? '🏆' : score >= 3 ? '🌟' : '💪'}
          />
          <KangurPracticeGameSummaryTitle unwrapped>
            <KangurHeadline
              accent='violet'
              as='h3'
              data-testid='geometry-drawing-summary-title'
              id='geometry-drawing-heading'
            >
              {getKangurMiniGameScoreLabel(translations, score, totalRounds)}
            </KangurHeadline>
          </KangurPracticeGameSummaryTitle>
          <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
          <KangurPracticeGameSummaryBreakdown
            breakdown={xpBreakdown}
            dataTestId='geometry-drawing-summary-breakdown'
            itemDataTestIdPrefix='geometry-drawing-summary-breakdown'
          />
          <KangurPracticeGameSummaryProgress
            accent='emerald'
            ariaLabel={translations('geometryDrawing.progressAriaLabel')}
            ariaValueText={`${Math.round((score / totalRounds) * 100)}% ${translations('shared.correctAnswersSuffix')}`}
            dataTestId='geometry-drawing-summary-progress-bar'
            percent={Math.round((score / totalRounds) * 100)}
          />
          <KangurPracticeGameSummaryMessage>
            {score === totalRounds
              ? translations('geometryDrawing.summary.perfect')
              : score >= Math.ceil(totalRounds / 2)
                ? translations('geometryDrawing.summary.good')
                : translations('geometryDrawing.summary.retry')}
          </KangurPracticeGameSummaryMessage>
          <KangurPracticeGameSummaryActions
            className={KANGUR_STACK_ROW_CLASSNAME}
            finishButtonClassName='w-full sm:flex-1'
            finishLabel={
              finishLabel === 'Wróć'
                ? getKangurMiniGameFinishLabel(translations, 'back')
                : finishLabel
            }
            onFinish={handleFinishSession}
            restartLabel={translations('shared.restart')}
            onRestart={handleRestart}
            restartButtonClassName='w-full sm:flex-1'
          />
        </KangurPracticeGameSummary>
      ) : (
        <>
          <div aria-live='polite' aria-atomic='true' className='sr-only'>
            {translateWithFallback(
              'geometryDrawing.inRound.liveRegion',
              fallbackCopy.liveRegion,
              {
                current: roundIndex + 1,
                total: totalRounds,
                shape: currentRound?.label ?? '',
                difficulty: resolvedDifficultyLabel,
              }
            )}
          </div>
          <div
            aria-live='polite'
            aria-atomic='true'
            className='sr-only'
            data-testid='geometry-drawing-keyboard-status'
          >
            {keyboardStatus}
          </div>
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
                  <KangurButton
                    key={mode}
                    aria-pressed={difficulty === mode}
                    data-testid={`geometry-difficulty-${mode}`}
                    type='button'
                    onClick={() => handleDifficultyChange(mode)}
                    disabled={isResultLocked}
                    className='min-h-11 px-4 text-xs'
                    size='sm'
                    variant={difficulty === mode ? 'surface' : 'secondary'}
                  >
                    {difficultyLabels[mode]}
                  </KangurButton>
                ))}
              </div>
            </KangurGlassPanel>
          ) : null}

          <div className='w-full flex items-center kangur-panel-gap'>
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
              <KangurInfoCard
                accent='teal'
                className='flex w-full flex-col items-center kangur-panel-gap rounded-[24px] text-center'
                data-testid='geometry-drawing-prompt-card'
                padding='md'
                tone='accent'
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
                  id='geometry-drawing-hint'
                  className='text-sm text-center [color:var(--kangur-page-muted-text)]'
                >
                  {currentRound?.hint}
                </p>
              </KangurInfoCard>

              <KangurInfoCard
                accent={boardAccent}
                className={cn(
                  'relative w-full overflow-hidden rounded-[26px] p-0',
                  !feedback && KANGUR_ACCENT_STYLES.teal.hoverCard,
                  isCoarsePointer && 'shadow-[0_18px_38px_-30px_rgba(14,165,233,0.35)]',
                  isPointerDrawing && 'ring-2 ring-sky-300/70 ring-offset-2 ring-offset-white'
                )}
                data-testid='geometry-drawing-board'
                padding='sm'
                tone={feedback ? 'accent' : 'neutral'}
              >
                <canvas
                  aria-describedby='geometry-drawing-hint geometry-drawing-input-help'
                  aria-label={translateWithFallback(
                    'geometryDrawing.inRound.canvasAria',
                    fallbackCopy.canvasAria,
                    { shape: currentRound?.label ?? '' }
                  )}
                  aria-keyshortcuts='Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape'
                  data-testid='geometry-drawing-canvas'
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
                    'pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-400/80 bg-emerald-100/70 shadow-[0_0_0_3px_rgba(16,185,129,0.12)] transition-transform duration-75',
                    isCoarsePointer ? 'h-5 w-5' : 'h-4 w-4',
                    keyboardDrawing ? 'scale-110' : 'scale-100'
                  )}
                  style={{
                    left: `${(keyboardCursor.x / CANVAS_WIDTH) * 100}%`,
                    top: `${(keyboardCursor.y / CANVAS_HEIGHT) * 100}%`,
                  }}
                />
                {points.length === 0 && (
                  <div className='pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold [color:var(--kangur-page-muted-text)]'>
                    <PencilRuler aria-hidden='true' className='w-4 h-4 mr-2' />
                    {translateWithFallback(
                      'geometryDrawing.inRound.drawHere',
                      fallbackCopy.drawHere
                    )}
                  </div>
                )}
              </KangurInfoCard>
              <p
                id='geometry-drawing-input-help'
                className={cn(
                  'text-xs text-center [color:var(--kangur-page-muted-text)]',
                  isCoarsePointer ? 'block' : 'hidden sm:block'
                )}
                data-testid='geometry-drawing-input-help'
              >
                {translateWithFallback(
                  'geometryDrawing.inRound.inputHelp',
                  fallbackCopy.inputHelp
                )}
              </p>

              <KangurPanelRow className='w-full'>
                <KangurButton
                  className='w-full sm:flex-1'
                  disabled={isResultLocked || points.length === 0}
                  onClick={clearDrawing}
                  type='button'
                  size='lg'
                  variant='surface'
                >
                  <Eraser aria-hidden='true' className='w-4 h-4' />
                  {translateWithFallback('geometryDrawing.inRound.clear', fallbackCopy.clear)}
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
                  disabled={isResultLocked}
                  onClick={handleCheck}
                  type='button'
                  size='lg'
                  variant='primary'
                >
                  {translateWithFallback('geometryDrawing.inRound.check', fallbackCopy.check)}
                </KangurButton>
              </KangurPanelRow>

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
                  data-testid='geometry-drawing-feedback'
                  role='status'
                >
                  {feedback.text}
                </p>
              )}
            </KangurGlassPanel>
          </div>
        </>
      )}
    </section>
  );
}
