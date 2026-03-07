import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, Eraser, PencilRuler, RefreshCw, XCircle } from 'lucide-react';

import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import {
  evaluateGeometryDrawing,
  type GeometryDrawPoint,
  type GeometryShapeId,
} from '@/features/kangur/ui/services/geometry-drawing';
import {
  XP_REWARDS,
  addXp,
  buildLessonMasteryUpdate,
  loadProgress,
} from '@/features/kangur/ui/services/progress';

type GeometryDrawingGameProps = {
  onFinish: () => void;
};

type ShapeRound = {
  id: GeometryShapeId;
  label: string;
  emoji: string;
  hint: string;
  accent: string;
};

type GeometryDifficultyId = 'starter' | 'pro';

type FeedbackState = {
  kind: 'success' | 'error' | 'info';
  text: string;
} | null;

const SHAPE_ROUND_LIBRARY: Record<GeometryShapeId, ShapeRound> = {
  circle: {
    id: 'circle',
    label: 'Koło',
    emoji: '⚪',
    hint: 'Narysuj jedną płynną, zamkniętą linię.',
    accent: 'from-blue-500 to-cyan-500',
  },
  triangle: {
    id: 'triangle',
    label: 'Trójkąt',
    emoji: '🔺',
    hint: 'Postaraj się zrobić 3 wyraźne rogi.',
    accent: 'from-orange-500 to-amber-500',
  },
  square: {
    id: 'square',
    label: 'Kwadrat',
    emoji: '🟦',
    hint: '4 boki, podobna długość każdego boku.',
    accent: 'from-indigo-500 to-violet-500',
  },
  rectangle: {
    id: 'rectangle',
    label: 'Prostokąt',
    emoji: '▭',
    hint: '4 rogi, dwa boki wyraźnie dłuższe.',
    accent: 'from-emerald-500 to-teal-500',
  },
  pentagon: {
    id: 'pentagon',
    label: 'Pięciokąt',
    emoji: '⬟',
    hint: '5 rogów, zamknięta figura.',
    accent: 'from-pink-500 to-rose-500',
  },
  hexagon: {
    id: 'hexagon',
    label: 'Sześciokąt',
    emoji: '⬢',
    hint: '6 rogów i zamknięta linia.',
    accent: 'from-violet-500 to-fuchsia-500',
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
  SHAPE_ROUND_LIBRARY.triangle,
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
    accent: 'from-blue-500 to-cyan-500',
  },
  {
    id: 'triangle',
    label: 'Trójkąt',
    emoji: '🔺',
    hint: 'Postaraj się zrobić 3 wyraźne rogi.',
    accent: 'from-orange-500 to-amber-500',
  },
  {
    id: 'square',
    label: 'Kwadrat',
    emoji: '🟦',
    hint: '4 boki, podobna długość każdego boku.',
    accent: 'from-indigo-500 to-violet-500',
  },
  {
    id: 'rectangle',
    label: 'Prostokąt',
    emoji: '▭',
    hint: '4 rogi, dwa boki wyraźnie dłuższe.',
    accent: 'from-emerald-500 to-teal-500',
  },
  {
    id: 'pentagon',
    label: 'Pięciokąt',
    emoji: '⬟',
    hint: '5 rogów, zamknięta figura.',
    accent: 'from-pink-500 to-rose-500',
  },
];

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 220;

const flattenPoints = (strokes: GeometryDrawPoint[][]): GeometryDrawPoint[] =>
  strokes.flatMap((stroke) => stroke);

export default function GeometryDrawingGame({
  onFinish,
}: GeometryDrawingGameProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const [difficulty, setDifficulty] = useState<GeometryDifficultyId>(INITIAL_DIFFICULTY);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [strokes, setStrokes] = useState<GeometryDrawPoint[][]>([]);

  const rounds =
    SHAPE_ROUNDS_BY_DIFFICULTY[difficulty]?.length > 0
      ? SHAPE_ROUNDS_BY_DIFFICULTY[difficulty]
      : LEGACY_SHAPE_ROUNDS;
  const currentRound = rounds[roundIndex];
  const totalRounds = rounds.length;
  const points = useMemo(() => flattenPoints(strokes), [strokes]);

  const redrawCanvas = useCallback((nextStrokes: GeometryDrawPoint[][]): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
  }, []);

  const updateStrokes = useCallback(
    (updater: (current: GeometryDrawPoint[][]) => GeometryDrawPoint[][]): void => {
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
  }, [redrawCanvas]);

  const resolvePoint = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>): GeometryDrawPoint => {
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

  const finishGame = useCallback(
    (finalScore: number): void => {
      const isPerfect = finalScore === totalRounds;
      const isGood = finalScore >= Math.ceil(totalRounds * 0.65);
      const xp = isPerfect
        ? XP_REWARDS.geometry_training_perfect
        : isGood
          ? XP_REWARDS.geometry_training_good
          : 15;
      const progress = loadProgress();
      addXp(xp, {
        lessonsCompleted: progress.lessonsCompleted + 1,
        geometryPerfect: isPerfect ? progress.geometryPerfect + 1 : progress.geometryPerfect,
        lessonMastery: buildLessonMasteryUpdate(
          progress,
          'geometry_shapes',
          (finalScore / totalRounds) * 100
        ),
      });
      setXpEarned(xp);
      setDone(true);
    },
    [totalRounds]
  );

  const resetRun = useCallback((): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setXpEarned(0);
    setFeedback(null);
    clearDrawing();
  }, [clearDrawing]);

  const handleDifficultyChange = (nextDifficulty: GeometryDifficultyId): void => {
    if (nextDifficulty === difficulty) return;
    setDifficulty(nextDifficulty);
    resetRun();
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
    if (points.length < 14) {
      setFeedback({
        kind: 'info',
        text: 'Narysuj figurę trochę dłużej, żeby można było ją ocenić.',
      });
      return;
    }

    const result = evaluateGeometryDrawing(currentRound.id, points);
    setFeedback({
      kind: result.accepted ? 'success' : 'error',
      text: result.message,
    });
    moveToNextRound(result.accepted);
  };

  const handleRestart = (): void => {
    resetRun();
  };

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      {done ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className='w-full'
        >
          <KangurPanel
            className='flex flex-col items-center gap-4 text-center'
            padding='xl'
            variant='elevated'
          >
            <div className='text-6xl'>{score === totalRounds ? '🏆' : score >= 3 ? '🌟' : '💪'}</div>
            <h3 className='text-2xl font-extrabold text-gray-800'>
              Wynik: {score}/{totalRounds}
            </h3>
            <p className='text-gray-500'>Zdobyte XP: +{xpEarned}</p>
            <div className='w-full h-3 rounded-full bg-gray-100 overflow-hidden'>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.round((score / totalRounds) * 100)}%` }}
                transition={{ duration: 0.6 }}
                className='h-full bg-gradient-to-r from-emerald-500 to-cyan-500'
              />
            </div>
            <div className='flex gap-3 w-full'>
              <KangurButton className='flex-1' onClick={handleRestart} size='lg' variant='secondary'>
                <RefreshCw className='w-4 h-4' />
                Jeszcze raz
              </KangurButton>
              <KangurButton className='flex-1' onClick={onFinish} size='lg' variant='primary'>
                Wróć
              </KangurButton>
            </div>
          </KangurPanel>
        </motion.div>
      ) : (
        <>
          <div className='w-full rounded-[26px] border border-white/75 bg-white/86 p-2 shadow-[0_14px_34px_-26px_rgba(20,184,166,0.28)]'>
            <div className='grid grid-cols-2 gap-2'>
              {(['starter', 'pro'] as const).map((mode) => (
                <KangurButton
                  key={mode}
                  data-testid={`geometry-difficulty-${mode}`}
                  type='button'
                  onClick={() => handleDifficultyChange(mode)}
                  disabled={feedback !== null}
                  className='h-10 px-4 text-xs'
                  size='sm'
                  variant={difficulty === mode ? 'surface' : 'secondary'}
                >
                  {DIFFICULTY_LABELS[mode]}
                </KangurButton>
              ))}
            </div>
          </div>

          <div className='w-full flex items-center gap-3'>
            <div className='flex-1 h-2 rounded-full bg-gray-100 overflow-hidden'>
              <div
                className='h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500'
                style={{ width: `${(roundIndex / totalRounds) * 100}%` }}
              />
            </div>
            <span className='text-xs font-bold text-gray-500'>
              {roundIndex + 1}/{totalRounds}
            </span>
          </div>

          <motion.div
            key={currentRound?.id}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className='w-full'
          >
            <KangurPanel className='flex flex-col items-center gap-3' padding='lg' variant='elevated'>
              <div className='text-5xl'>{currentRound?.emoji}</div>
              <h3 className='text-xl font-extrabold text-gray-800'>Narysuj: {currentRound?.label}</h3>
              <p className='text-sm text-gray-500 text-center'>{currentRound?.hint}</p>

              <div className='relative w-full'>
                <canvas
                  ref={canvasRef}
                  width={CANVAS_WIDTH}
                  height={CANVAS_HEIGHT}
                  className='w-full rounded-2xl border-2 border-slate-200 bg-white touch-none'
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                />
                {points.length === 0 && (
                  <div className='pointer-events-none absolute inset-0 flex items-center justify-center text-slate-300 text-sm font-semibold'>
                    <PencilRuler className='w-4 h-4 mr-2' />
                    Rysuj tutaj
                  </div>
                )}
              </div>

              <AnimatePresence>
                {feedback && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.94 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    className={`w-full rounded-2xl px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 ${
                      feedback.kind === 'success'
                        ? 'bg-emerald-50 text-emerald-700'
                        : feedback.kind === 'error'
                          ? 'bg-rose-50 text-rose-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {feedback.kind === 'success' ? (
                      <CheckCircle className='w-4 h-4' />
                    ) : feedback.kind === 'error' ? (
                      <XCircle className='w-4 h-4' />
                    ) : (
                      <PencilRuler className='w-4 h-4' />
                    )}
                    {feedback.text}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className='flex gap-3 w-full'>
                <KangurButton
                  className='flex-1'
                  disabled={feedback !== null || points.length === 0}
                  onClick={clearDrawing}
                  size='lg'
                  variant='secondary'
                >
                  <Eraser className='w-4 h-4' />
                  Wyczyść
                </KangurButton>
                <KangurButton
                  className='flex-1'
                  disabled={feedback !== null}
                  onClick={handleCheck}
                  size='lg'
                  variant='primary'
                >
                  Sprawdź
                </KangurButton>
              </div>
            </KangurPanel>
          </motion.div>
        </>
      )}
    </div>
  );
}
