import { Eraser, PencilRuler } from 'lucide-react';
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
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';
import {
  evaluateAxisDrawing,
  evaluateMirrorDrawing,
  mirrorPoints,
  type SymmetryAxis,
  type SymmetryExpectedSide,
} from '@/features/kangur/ui/services/geometry-symmetry';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import type { Point2d } from '@/shared/contracts/geometry';
import { cn } from '@/shared/utils';

type GeometrySymmetryGameProps = {
  onFinish: () => void;
};

type FeedbackState = {
  kind: 'success' | 'error' | 'info';
  text: string;
} | null;

type TemplatePath = {
  points: Point2d[];
  closed?: boolean;
};

type TemplateShape = {
  paths: TemplatePath[];
};

type SymmetryRoundType = 'axis' | 'mirror';

type SymmetryRound = {
  id: string;
  type: SymmetryRoundType;
  title: string;
  prompt: string;
  hint: string;
  emoji: string;
  axis: SymmetryAxis;
  template: TemplateShape;
  expectedSide?: SymmetryExpectedSide;
};

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;
const GRID_STEP = 40;
const KEYBOARD_DRAW_STEP = 14;
const KEYBOARD_CURSOR_START = {
  x: Math.round(CANVAS_WIDTH / 2),
  y: Math.round(CANVAS_HEIGHT / 2),
} as const;

const VERTICAL_AXIS: SymmetryAxis = { orientation: 'vertical', position: CANVAS_WIDTH / 2 };
const HORIZONTAL_AXIS: SymmetryAxis = { orientation: 'horizontal', position: CANVAS_HEIGHT / 2 };

const toPoints = (pairs: Array<[number, number]>): Point2d[] =>
  pairs.map(([x, y]) => ({ x, y }));

const createEllipsePath = (
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  steps = 36
): Point2d[] =>
  Array.from({ length: steps }, (_, index): Point2d => {
    const angle = (Math.PI * 2 * index) / Math.max(1, steps);
    return { x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });

const combineShapes = (...shapes: TemplateShape[]): TemplateShape => ({
  paths: shapes.flatMap((shape) => shape.paths),
});

const mirrorShape = (shape: TemplateShape, axis: SymmetryAxis): TemplateShape => ({
  paths: shape.paths.map((path) => ({
    ...path,
    points: mirrorPoints(path.points, axis),
  })),
});

const flattenPaths = (shape: TemplateShape): Point2d[] =>
  shape.paths.flatMap((path) => path.points);

const BUTTERFLY_LEFT: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [160, 60],
        [140, 40],
        [110, 50],
        [85, 70],
        [95, 100],
        [75, 125],
        [105, 145],
        [135, 135],
        [155, 110],
        [160, 85],
      ]),
    },
  ],
};

const HEART_LEFT: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [160, 70],
        [145, 45],
        [120, 45],
        [100, 70],
        [110, 105],
        [135, 125],
        [160, 150],
      ]),
    },
  ],
};

const LEAF_TOP: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [80, 110],
        [95, 85],
        [125, 70],
        [160, 65],
        [195, 70],
        [225, 85],
        [240, 110],
      ]),
    },
  ],
};

const EYE_FULL: TemplateShape = {
  paths: [
    {
      points: createEllipsePath(160, 110, 90, 45, 44),
      closed: true,
    },
  ],
};

const SQUARE_FULL: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [110, 50],
        [210, 50],
        [210, 170],
        [110, 170],
      ]),
      closed: true,
    },
  ],
};

const ZIGZAG_LEFT: TemplateShape = {
  paths: [
    {
      points: toPoints([
        [145, 55],
        [110, 75],
        [140, 100],
        [100, 125],
        [135, 150],
        [115, 175],
      ]),
    },
  ],
};

const BUTTERFLY_FULL = combineShapes(
  BUTTERFLY_LEFT,
  mirrorShape(BUTTERFLY_LEFT, VERTICAL_AXIS)
);

const ROUNDS: SymmetryRound[] = [
  {
    id: 'axis-butterfly',
    type: 'axis',
    title: 'Oś motyla',
    prompt: 'Narysuj oś symetrii motyla.',
    hint: 'To pionowa linia przechodząca przez środek.',
    emoji: '🦋',
    axis: VERTICAL_AXIS,
    template: BUTTERFLY_FULL,
  },
  {
    id: 'mirror-heart',
    type: 'mirror',
    title: 'Serce w lustrze',
    prompt: 'Dorysuj brakującą połowę serca.',
    hint: 'Odbij kształt po osi.',
    emoji: '❤️',
    axis: VERTICAL_AXIS,
    template: HEART_LEFT,
    expectedSide: 'right',
  },
  {
    id: 'axis-square',
    type: 'axis',
    title: 'Oś kwadratu',
    prompt: 'Narysuj oś symetrii kwadratu.',
    hint: 'To pionowa linia pośrodku kwadratu.',
    emoji: '🟦',
    axis: VERTICAL_AXIS,
    template: SQUARE_FULL,
  },
  {
    id: 'mirror-leaf',
    type: 'mirror',
    title: 'Listek',
    prompt: 'Dorysuj dolną połowę listka.',
    hint: 'Symetria względem osi poziomej.',
    emoji: '🍃',
    axis: HORIZONTAL_AXIS,
    template: LEAF_TOP,
    expectedSide: 'bottom',
  },
  {
    id: 'mirror-zigzag',
    type: 'mirror',
    title: 'Zygzak w lustrze',
    prompt: 'Dorysuj odbicie zygzaka.',
    hint: 'Uważaj, aby rysować po prawej stronie osi.',
    emoji: '⚡',
    axis: VERTICAL_AXIS,
    template: ZIGZAG_LEFT,
    expectedSide: 'right',
  },
  {
    id: 'axis-eye',
    type: 'axis',
    title: 'Oś oka',
    prompt: 'Narysuj oś symetrii oka.',
    hint: 'To pozioma linia pośrodku.',
    emoji: '👁️',
    axis: HORIZONTAL_AXIS,
    template: EYE_FULL,
  },
];

const flattenPoints = (strokes: Point2d[][]): Point2d[] =>
  strokes.flatMap((stroke) => stroke);

const drawGrid = (ctx: CanvasRenderingContext2D): void => {
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
};

const drawShape = (
  ctx: CanvasRenderingContext2D,
  shape: TemplateShape,
  strokeStyle: string,
  lineWidth = 4,
  dashed = false
): void => {
  ctx.save();
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  if (dashed) {
    ctx.setLineDash([6, 6]);
  }
  for (const path of shape.paths) {
    if (path.points.length === 0) continue;
    ctx.beginPath();
    const [first] = path.points;
    if (!first) continue;
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < path.points.length; i += 1) {
      const point = path.points[i];
      if (!point) continue;
      ctx.lineTo(point.x, point.y);
    }
    if (path.closed) {
      ctx.closePath();
    }
    ctx.stroke();
  }
  ctx.restore();
};

const drawAxis = (ctx: CanvasRenderingContext2D, axis: SymmetryAxis): void => {
  ctx.save();
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 3;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  if (axis.orientation === 'vertical') {
    ctx.moveTo(axis.position, 16);
    ctx.lineTo(axis.position, CANVAS_HEIGHT - 16);
  } else {
    ctx.moveTo(16, axis.position);
    ctx.lineTo(CANVAS_WIDTH - 16, axis.position);
  }
  ctx.stroke();
  ctx.restore();
};

const drawTargetZone = (
  ctx: CanvasRenderingContext2D,
  axis: SymmetryAxis,
  expectedSide: SymmetryExpectedSide
): void => {
  ctx.save();
  ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
  if (axis.orientation === 'vertical') {
    if (expectedSide === 'right') {
      ctx.fillRect(axis.position, 0, CANVAS_WIDTH - axis.position, CANVAS_HEIGHT);
    } else {
      ctx.fillRect(0, 0, axis.position, CANVAS_HEIGHT);
    }
  } else {
    if (expectedSide === 'bottom') {
      ctx.fillRect(0, axis.position, CANVAS_WIDTH, CANVAS_HEIGHT - axis.position);
    } else {
      ctx.fillRect(0, 0, CANVAS_WIDTH, axis.position);
    }
  }
  ctx.restore();
};

export default function GeometrySymmetryGame({
  onFinish,
}: GeometrySymmetryGameProps): React.JSX.Element {
  const handleFinish = onFinish;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);
  const sessionStartedAtRef = useRef(Date.now());

  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [strokes, setStrokes] = useState<Point2d[][]>([]);
  const [keyboardCursor, setKeyboardCursor] = useState<Point2d>(KEYBOARD_CURSOR_START);
  const [keyboardDrawing, setKeyboardDrawing] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState('Plansza gotowa do rysowania.');

  const totalRounds = ROUNDS.length;
  const currentRound = ROUNDS[roundIndex];
  const points = useMemo(() => flattenPoints(strokes), [strokes]);

  const redrawCanvas = useCallback(
    (nextStrokes: Point2d[][], round: SymmetryRound | undefined): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawGrid(ctx);

      if (round) {
        if (round.type === 'mirror' && round.expectedSide) {
          drawTargetZone(ctx, round.axis, round.expectedSide);
          drawAxis(ctx, round.axis);
          drawShape(ctx, round.template, '#6ee7b7', 4);
        } else {
          drawShape(ctx, round.template, '#a7f3d0', 4);
        }
      }

      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 5;
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
    []
  );

  useEffect(() => {
    redrawCanvas(strokes, currentRound);
  }, [currentRound, redrawCanvas, strokes]);

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
    setKeyboardStatus('Wyczyszczono planszę.');
  }, [currentRound, redrawCanvas]);

  const resolvePoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): Point2d => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
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
      next[next.length - 1] = [...lastStroke, point];
      return next;
    });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
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
    if (points.length < 10) {
      setFeedback({
        kind: 'info',
        text: 'Zrób kilka ruchów, żeby powstała linia do sprawdzenia.',
      });
      return;
    }

    if (currentRound.type === 'axis') {
      const result = evaluateAxisDrawing(points, currentRound.axis);
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
    setKeyboardCursor(KEYBOARD_CURSOR_START);
    setKeyboardDrawing(false);
    setKeyboardStatus('Rozpoczęto nową rundę symetrii.');
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
            Wynik: {score}/{totalRounds}
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
          ariaLabel='Dokładność w grze o symetrii'
          ariaValueText={`${percent}% poprawnych odpowiedzi`}
          dataTestId='geometry-symmetry-summary-progress-bar'
          percent={percent}
        />
        <KangurPracticeGameSummaryMessage className='max-w-xs text-center'>
          {score === totalRounds
            ? 'Idealnie! Twoje odbicia są perfekcyjne.'
            : score >= Math.ceil(totalRounds / 2)
              ? 'Świetna robota! Symetria idzie Ci coraz lepiej.'
              : 'Próbuj dalej — każda kolejna próba będzie dokładniejsza.'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel='Wróć'
          onFinish={handleFinish}
          onRestart={handleRestart}
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <section
      aria-labelledby='geometry-symmetry-heading'
      className='flex flex-col items-center gap-4 w-full max-w-sm mx-auto'
    >
      <div aria-live='polite' aria-atomic='true' className='sr-only'>
        Runda {roundIndex + 1} z {totalRounds}. {currentRound?.prompt}
      </div>
      <div
        aria-live='polite'
        aria-atomic='true'
        className='sr-only'
        data-testid='geometry-symmetry-keyboard-status'
      >
        {keyboardStatus}
      </div>

      <div className='w-full flex items-center gap-3'>
        <KangurProgressBar
          accent='emerald'
          aria-label='Postęp gry o symetrii'
          aria-valuetext={`Runda ${roundIndex + 1} z ${totalRounds}`}
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
          className='flex flex-col items-center gap-3'
          data-testid='geometry-symmetry-round-shell'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <KangurInfoCard
            accent='emerald'
            className='flex w-full flex-col items-center gap-3 rounded-[24px] text-center'
            data-testid='geometry-symmetry-prompt-card'
            padding='md'
            tone='accent'
          >
            <KangurStatusChip accent='emerald' size='sm'>
              Symetria • {currentRound?.type === 'axis' ? 'Oś' : 'Odbicie'}
            </KangurStatusChip>
            <KangurDisplayEmoji size='md'>{currentRound?.emoji}</KangurDisplayEmoji>
            <KangurHeadline accent='emerald' as='h3' id='geometry-symmetry-heading' size='sm'>
              {currentRound?.title}
            </KangurHeadline>
            <p className='text-sm text-center [color:var(--kangur-page-muted-text)]'>
              {currentRound?.prompt}
            </p>
            <p className='text-xs text-center text-emerald-700'>{currentRound?.hint}</p>
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
              aria-label='Plansza do rysowania osi i odbić symetrii.'
              aria-keyshortcuts='Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape'
              data-testid='geometry-symmetry-canvas'
              role='img'
              ref={canvasRef}
              tabIndex={0}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className='w-full rounded-[20px] touch-none'
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
              style={{ left: `${keyboardCursor.x}px`, top: `${keyboardCursor.y}px` }}
            />
            {points.length === 0 && (
              <div className='pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-semibold [color:var(--kangur-page-muted-text)]'>
                <PencilRuler className='w-4 h-4 mr-2' />
                Rysuj tutaj
              </div>
            )}
          </KangurInfoCard>
          <p
            id='geometry-symmetry-input-help'
            className='text-xs text-center [color:var(--kangur-page-muted-text)]'
          >
            Pole rysowania obsługuje mysz, dotyk lub klawiaturę. Enter albo spacja zaczyna i kończy
            kreskę, strzałki przesuwają kursor, Escape czyści planszę.
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

          <div className='flex w-full flex-col gap-3 sm:flex-row'>
            <KangurButton
              className='w-full sm:flex-1'
              disabled={feedback !== null || points.length === 0}
              onClick={clearDrawing}
              type='button'
              size='lg'
              variant='surface'
            >
              <Eraser className='w-4 h-4' />
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
              disabled={feedback !== null}
              onClick={handleCheck}
              type='button'
              size='lg'
              variant='primary'
            >
              Sprawdź
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </div>
    </section>
  );
}
