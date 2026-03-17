'use client';

import { Eraser, PencilRuler } from 'lucide-react';
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
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurPanelRow,
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
import {
  resolveKangurCanvasPoint,
  syncKangurCanvasContext,
} from '@/features/kangur/ui/services/drawing-canvas';
import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { loosenMax, loosenMin, loosenMinInt } from '@/features/kangur/ui/services/drawing-leniency';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import { useKangurCanvasRedraw } from '@/features/kangur/ui/hooks/useKangurCanvasRedraw';
import type { Point2d } from '@/shared/contracts/geometry';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type GeometryPerimeterDrawingGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

type PerimeterRound = {
  id: string;
  shape: 'square' | 'rectangle';
  a: number;
  b?: number;
  label: string;
  emoji: string;
  hint: string;
};

type FeedbackState = {
  kind: 'success' | 'error' | 'info';
  text: string;
} | null;

const ROUNDS: PerimeterRound[] = [
  {
    id: 'square-3',
    shape: 'square',
    a: 3,
    label: 'Kwadrat',
    emoji: '🟥',
    hint: 'Narysuj kwadrat o boku 3 kratki.',
  },
  {
    id: 'rect-6-4',
    shape: 'rectangle',
    a: 6,
    b: 4,
    label: 'Prostokąt',
    emoji: '▭',
    hint: 'Narysuj prostokąt 6 × 4 kratki.',
  },
  {
    id: 'rect-5-2',
    shape: 'rectangle',
    a: 5,
    b: 2,
    label: 'Prostokąt',
    emoji: '▭',
    hint: 'Narysuj prostokąt 5 × 2 kratki.',
  },
  {
    id: 'square-4',
    shape: 'square',
    a: 4,
    label: 'Kwadrat',
    emoji: '🟥',
    hint: 'Narysuj kwadrat o boku 4 kratki.',
  },
  {
    id: 'rect-7-3',
    shape: 'rectangle',
    a: 7,
    b: 3,
    label: 'Prostokąt',
    emoji: '▭',
    hint: 'Narysuj prostokąt 7 × 3 kratki.',
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

const flattenPoints = (strokes: Point2d[][]): Point2d[] =>
  strokes.flatMap((stroke) => stroke);

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

const distance = (a: Point2d, b: Point2d): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

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
  finishLabel = 'Wróć do lekcji',
  onFinish,
}: GeometryPerimeterDrawingGameProps): React.JSX.Element {
  const summaryFinishLabel = finishLabel;
  const handleFinish = onFinish;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const advanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [strokes, setStrokes] = useState<Point2d[][]>([]);
  const strokesRef = useRef<Point2d[][]>([]);
  const [isPointerDrawing, setIsPointerDrawing] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [drawingValidated, setDrawingValidated] = useState(false);
  const [keyboardCursor, setKeyboardCursor] = useState<Point2d>(KEYBOARD_CURSOR_START);
  const [keyboardDrawing, setKeyboardDrawing] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState(
    'Plansza gotowa do rysowania klawiaturą.'
  );
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
  const points = useMemo(() => flattenPoints(strokes), [strokes]);
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
  const isDrawingReady = points.length >= minDrawingPoints;
  const isLocked = feedback?.kind === 'success' || feedback?.kind === 'error';
  const revealAnswers = feedback?.kind === 'success' || feedback?.kind === 'error';

  useEffect(
    () => () => {
      if (advanceTimeoutRef.current) {
        clearTimeout(advanceTimeoutRef.current);
      }
    },
    []
  );

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

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);

  useEffect(() => {
    redrawCanvas(strokesRef.current);
  }, [redrawCanvas]);

  useKangurCanvasRedraw({
    canvasRef,
    redraw: () => redrawCanvas(strokes),
  });
  useKangurCanvasTouchLock(canvasRef);

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
    setSelected(null);
    setDrawingValidated(false);
    setKeyboardDrawing(false);
    setKeyboardStatus('Wyczyszczono planszę.');
  }, [redrawCanvas]);

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
    setKeyboardStatus('Rozpoczęto rysowanie klawiaturą.');
  }, [keyboardCursor, updateStrokes]);

  const finishKeyboardStroke = useCallback((): void => {
    if (keyboardDrawing) {
      appendKeyboardPoint({ ...keyboardCursor });
    }
    setKeyboardDrawing(false);
    setKeyboardStatus('Zakończono rysowanie klawiaturą.');
  }, [appendKeyboardPoint, keyboardCursor, keyboardDrawing]);

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
      setKeyboardStatus('Wyczyszczono planszę i ustawiono kursor na środku.');
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

  const finishGame = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress();
      const reward = createLessonPracticeReward(
        progress,
        'geometry_perimeter',
        finalScore,
        TOTAL_ROUNDS
      );
      addXp(reward.xp, reward.progressUpdates);
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
    []
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

  const evaluateDrawing = (): { accepted: boolean; message: string } => {
    if (!currentRound) {
      return { accepted: false, message: 'Brak zadania do oceny.' };
    }
    if (points.length < minDrawingPoints) {
      return {
        accepted: false,
        message: 'Narysuj figurę trochę dłużej, żeby można było ją ocenić.',
      };
    }
    const shapeId: GeometryShapeId =
      currentRound.shape === 'square' ? 'square' : 'rectangle';
    const result = evaluateGeometryDrawing(shapeId, points);
    if (!result.accepted) {
      return { accepted: false, message: result.message };
    }

    const { width, height } = computeBoundingBox(points);
    const widthUnits = toGridUnits(width);
    const heightUnits = toGridUnits(height);
    const minUnits = Math.min(widthUnits, heightUnits);
    if (minUnits < BASE_MIN_GRID_UNITS) {
      return { accepted: false, message: 'Narysuj większą figurę na kratkach.' };
    }

    const alignmentRatio = gridAlignmentRatio(points, gridSnapTolerance);
    if (alignmentRatio < minGridAlignmentRatio) {
      return {
        accepted: false,
        message: 'Rysuj dokładnie po liniach kratki.',
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
          message: `Spróbuj narysować kwadrat o boku ${currentRound.a} kratek.`,
        };
      }
      if (!pixelMatch) {
        return {
          accepted: false,
          message: 'Dopasuj boki dokładniej do linii kratki.',
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
          message: `Spróbuj narysować prostokąt ${a} × ${b} kratek.`,
        };
      }
      if (!pixelMatch) {
        return {
          accepted: false,
          message: 'Dopasuj boki dokładniej do linii kratki.',
        };
      }
    }

    return { accepted: true, message: 'Świetnie! Figura pasuje do zadania.' };
  };

  const handleCheck = (): void => {
    if (done || isLocked || !currentRound) return;
    if (!drawingValidated) {
      const drawingResult = evaluateDrawing();
      if (!drawingResult.accepted) {
        setFeedback({ kind: 'error', text: drawingResult.message });
        moveToNextRound(false);
        return;
      }
      setDrawingValidated(true);
      setFeedback({ kind: 'info', text: 'Rysunek jest poprawny! Wybierz wynik obwodu.' });
      return;
    }
    if (selected === null) {
      setFeedback({ kind: 'info', text: 'Wybierz wynik obwodu.' });
      return;
    }

    const correct = selected === perimeter;
    if (correct) {
      setFeedback({
        kind: 'success',
        text: `Brawo! Obwód to ${perimeter} cm.`,
      });
    } else {
      setFeedback({
        kind: 'error',
        text: `Sprawdź obwód jeszcze raz. Poprawny wynik to ${perimeter} cm.`,
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
    setSelected(null);
    setDrawingValidated(false);
    setKeyboardCursor(KEYBOARD_CURSOR_START);
    setKeyboardDrawing(false);
    setKeyboardStatus('Rozpoczęto nową rundę obwodów.');
    sessionStartedAtRef.current = Date.now();
    clearDrawing();
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
          title={`Wynik: ${score}/${TOTAL_ROUNDS}`}
        />
        <KangurPracticeGameSummaryXP accent='amber' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='geometry-perimeter-summary-breakdown'
          itemDataTestIdPrefix='geometry-perimeter-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress
          accent='amber'
          ariaLabel='Skuteczność w grze o obwodach'
          ariaValueText={`${percent}% poprawnych odpowiedzi`}
          dataTestId='geometry-perimeter-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? 'Perfekcyjnie! Obwody opanowane.'
            : percent >= 70
              ? 'Świetna robota! Jeszcze trochę i będzie perfekcja.'
              : 'Dobra próba! Spróbuj ponownie.'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          className={KANGUR_STACK_ROW_CLASSNAME}
          finishButtonClassName='w-full sm:flex-1'
          finishLabel={summaryFinishLabel}
          onFinish={handleFinish}
          onRestart={handleRestart}
          restartButtonClassName='w-full sm:flex-1'
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurPracticeGameStage>
      <div aria-live='polite' aria-atomic='true' className='sr-only'>
        Runda {roundIndex + 1} z {TOTAL_ROUNDS}. Narysuj figurę {currentRound?.label}.
      </div>
      <div
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'
        data-testid='geometry-perimeter-keyboard-status'
      >
        {keyboardStatus}
      </div>

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
            Rysowanie obwodu
          </KangurStatusChip>
          <KangurDisplayEmoji size='md'>{currentRound?.emoji}</KangurDisplayEmoji>
          <KangurHeadline accent='amber' as='h3' size='sm'>
            Narysuj: {currentRound?.label}
          </KangurHeadline>
          <p className='text-sm [color:var(--kangur-page-muted-text)]'>{currentRound?.hint}</p>
          <p className='text-xs font-semibold text-amber-700'>
            1 kratka = 1 cm
          </p>
        </KangurInfoCard>

        <KangurInfoCard
          accent={boardAccent}
          className={cn(
            'relative w-full overflow-hidden rounded-[26px] p-0',
            !feedback && KANGUR_ACCENT_STYLES.amber.hoverCard
          )}
          data-testid='geometry-perimeter-board'
          padding='sm'
          tone={feedback ? 'accent' : 'neutral'}
        >
          <canvas
            aria-describedby='geometry-perimeter-input-help'
            aria-label={`Plansza do rysowania figury ${currentRound?.label}. Użyj myszy lub dotyku, aby narysować figurę.`}
            aria-keyshortcuts='Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape'
            data-testid='geometry-perimeter-canvas'
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
              'pointer-events-none absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-400/80 bg-amber-100/70 shadow-[0_0_0_3px_rgba(251,191,36,0.15)] transition-transform duration-75',
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
              Rysuj po kratkach
            </div>
          )}
        </KangurInfoCard>
        <p
          id='geometry-perimeter-input-help'
          className='text-xs text-center [color:var(--kangur-page-muted-text)]'
        >
          Pole rysowania obsługuje mysz, dotyk lub klawiaturę. Enter albo spacja zaczyna i kończy
          kreskę, strzałki przesuwają kursor, Escape czyści planszę.
        </p>

        {drawingValidated ? (
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
                  accent={accent}
                  buttonClassName={cn(
                    'flex items-center justify-center px-4 py-3 text-center text-lg font-extrabold',
                    className,
                    feedback ? 'cursor-default' : 'cursor-pointer'
                  )}
                  data-testid={`geometry-perimeter-choice-${index}`}
                  emphasis={emphasis}
                interactive={!isLocked}
                key={`${currentRound?.id}-${choice}`}
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
        ) : null}

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
            Wyczyść
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
            disabled={
              isLocked ||
              (!drawingValidated && !isDrawingReady) ||
              (drawingValidated && selected === null)
            }
            onClick={handleCheck}
            type='button'
            size='lg'
            variant='primary'
          >
            {drawingValidated ? 'Sprawdź obwód' : 'Sprawdź rysunek'}
          </KangurButton>
        </KangurPanelRow>

        {feedback && (
          <p
            className={cn(
              'text-sm font-semibold text-center',
              feedback.kind === 'success'
                ? 'text-emerald-600'
                : feedback.kind === 'error'
                  ? 'text-rose-600'
                  : 'text-amber-600'
            )}
            role='status'
            aria-live='polite'
            aria-atomic='true'
          >
            {feedback.text}
          </p>
        )}
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
