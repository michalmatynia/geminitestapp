import { Eraser, PencilRuler } from 'lucide-react';
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
  evaluateGeometryDrawing,
  type GeometryShapeId,
} from '@/features/kangur/ui/services/geometry-drawing';
import type { Point2d } from '@/shared/contracts/geometry';
import {
  addXp,
  createTrainingReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

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
    accent: 'kangur-gradient-accent-teal',
  },
  triangle: {
    id: 'triangle',
    label: 'Trójkąt',
    emoji: '🔺',
    hint: 'Postaraj się zrobić 3 wyraźne rogi.',
    accent: 'kangur-gradient-accent-amber',
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

const flattenPoints = (strokes: Point2d[][]): Point2d[] =>
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
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [strokes, setStrokes] = useState<Point2d[][]>([]);
  const [keyboardCursor, setKeyboardCursor] = useState<Point2d>(KEYBOARD_CURSOR_START);
  const [keyboardDrawing, setKeyboardDrawing] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState(
    'Plansza gotowa do rysowania klawiaturą.'
  );
  const sessionStartedAtRef = useRef(Date.now());
  const handleFinishSession = (): void => {
    onFinish();
  };

  const rounds =
    SHAPE_ROUNDS_BY_DIFFICULTY[difficulty]?.length > 0
      ? SHAPE_ROUNDS_BY_DIFFICULTY[difficulty]
      : LEGACY_SHAPE_ROUNDS;
  const currentRound = rounds[roundIndex];
  const totalRounds = rounds.length;
  const points = useMemo(() => flattenPoints(strokes), [strokes]);

  const redrawCanvas = useCallback((nextStrokes: Point2d[][]): void => {
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
    setKeyboardDrawing(false);
    setKeyboardStatus('Wyczyszczono planszę.');
  }, [redrawCanvas]);

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

  const finishGame = useCallback(
    (finalScore: number): void => {
      const progress = loadProgress();
      const reward = createTrainingReward(progress, {
        activityKey: `training:geometry:${difficulty}`,
        lessonKey: 'geometry_shapes',
        correctAnswers: finalScore,
        totalQuestions: totalRounds,
        difficulty,
        strongThresholdPercent: 65,
        perfectCounterKey: 'geometryPerfect',
      });
      addXp(reward.xp, reward.progressUpdates);
      void persistKangurSessionScore({
        operation: 'geometry',
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
    [difficulty, totalRounds]
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
    setKeyboardStatus('Rozpoczęto nową rundę figur.');
    sessionStartedAtRef.current = Date.now();
    clearDrawing();
  }, [clearDrawing]);

  const handleDifficultyChange = (nextDifficulty: GeometryDifficultyId): void => {
    if (nextDifficulty === difficulty) return;
    setDifficulty(nextDifficulty);
    setKeyboardCursor(KEYBOARD_CURSOR_START);
    setKeyboardDrawing(false);
    setKeyboardStatus(`Zmieniono poziom na ${DIFFICULTY_LABELS[nextDifficulty]}.`);
    resetRun();
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

  const boardAccent =
    feedback?.kind === 'success'
      ? 'emerald'
      : feedback?.kind === 'error'
        ? 'rose'
        : feedback?.kind === 'info'
          ? 'amber'
          : 'teal';

  return (
    <section
      aria-labelledby='geometry-drawing-heading'
      className='flex flex-col items-center gap-4 w-full max-w-sm'
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
              Wynik: {score}/{totalRounds}
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
            ariaLabel='Dokładność w treningu figur'
            ariaValueText={`${Math.round((score / totalRounds) * 100)}% poprawnych figur`}
            dataTestId='geometry-drawing-summary-progress-bar'
            percent={Math.round((score / totalRounds) * 100)}
          />
          <KangurPracticeGameSummaryMessage>
            {score === totalRounds
              ? 'Perfekcyjnie! Twoje figury są wzorowe.'
              : score >= Math.ceil(totalRounds / 2)
                ? 'Świetna robota! Rysujesz coraz dokładniej.'
                : 'Ćwicz dalej. Każda kolejna figura będzie lepsza.'}
          </KangurPracticeGameSummaryMessage>
          <KangurPracticeGameSummaryActions
            className='flex-col sm:flex-row'
            finishButtonClassName='w-full sm:flex-1'
            finishLabel='Wróć'
            onFinish={handleFinishSession}
            onRestart={handleRestart}
            restartButtonClassName='w-full sm:flex-1'
          />
        </KangurPracticeGameSummary>
      ) : (
        <>
          <div aria-live='polite' aria-atomic='true' className='sr-only'>
            Runda {roundIndex + 1} z {totalRounds}. Narysuj figurę {currentRound?.label}. Poziom{' '}
            {DIFFICULTY_LABELS[difficulty]}.
          </div>
          <div
            aria-live='polite'
            aria-atomic='true'
            className='sr-only'
            data-testid='geometry-drawing-keyboard-status'
          >
            {keyboardStatus}
          </div>
          <KangurGlassPanel
            className='w-full rounded-[26px] !p-3'
            data-testid='geometry-difficulty-shell'
            surface='solid'
            variant='soft'
          >
            <div className='mb-3 flex justify-center'>
              <KangurStatusChip accent='teal' size='sm'>
                Poziom figur
              </KangurStatusChip>
            </div>
            <div
              aria-label='Poziom trudności figur'
              className='grid grid-cols-1 gap-2 min-[360px]:grid-cols-2'
              role='group'
            >
              {(['starter', 'pro'] as const).map((mode) => (
                <KangurButton
                  key={mode}
                  aria-pressed={difficulty === mode}
                  data-testid={`geometry-difficulty-${mode}`}
                  type='button'
                  onClick={() => handleDifficultyChange(mode)}
                  disabled={feedback !== null}
                  className='min-h-10 px-4 text-xs'
                  size='sm'
                  variant={difficulty === mode ? 'surface' : 'secondary'}
                >
                  {DIFFICULTY_LABELS[mode]}
                </KangurButton>
              ))}
            </div>
          </KangurGlassPanel>

          <div className='w-full flex items-center gap-3'>
            <KangurProgressBar
              accent='emerald'
              aria-label='Postęp treningu figur'
              aria-valuetext={`Runda ${roundIndex + 1} z ${totalRounds}`}
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
              className='flex flex-col items-center gap-3'
              data-testid='geometry-drawing-round-shell'
              padding='lg'
              surface='solid'
              variant='soft'
            >
              <KangurInfoCard
                accent='teal'
                className='flex w-full flex-col items-center gap-3 rounded-[24px] text-center'
                data-testid='geometry-drawing-prompt-card'
                padding='md'
                tone='accent'
              >
                <KangurStatusChip accent='teal' size='sm'>
                  Figury • {DIFFICULTY_LABELS[difficulty]}
                </KangurStatusChip>
                <KangurDisplayEmoji size='md'>{currentRound?.emoji}</KangurDisplayEmoji>
                <KangurHeadline accent='violet' as='h3' id='geometry-drawing-heading' size='sm'>
                  Narysuj: {currentRound?.label}
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
                  !feedback && KANGUR_ACCENT_STYLES.teal.hoverCard
                )}
                data-testid='geometry-drawing-board'
                padding='sm'
                tone={feedback ? 'accent' : 'neutral'}
              >
                <canvas
                  aria-describedby='geometry-drawing-hint geometry-drawing-input-help'
                aria-label={`Plansza do rysowania figury ${currentRound?.label}. Użyj myszy lub dotyku, aby narysować figurę.`}
                  aria-keyshortcuts='Enter Space ArrowUp ArrowDown ArrowLeft ArrowRight Escape'
                  data-testid='geometry-drawing-canvas'
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
                id='geometry-drawing-input-help'
                className='text-xs text-center [color:var(--kangur-page-muted-text)]'
              >
                Pole rysowania obsługuje mysz, dotyk lub klawiaturę. Enter albo spacja zaczyna i
                kończy kreskę, strzałki przesuwają kursor, Escape czyści planszę.
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
                  data-testid='geometry-drawing-feedback'
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
        </>
      )}
    </section>
  );
}
