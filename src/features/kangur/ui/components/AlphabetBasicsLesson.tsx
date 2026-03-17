'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCanvasRedraw } from '@/features/kangur/ui/hooks/useKangurCanvasRedraw';
import {
  resolveKangurCanvasPoint,
  syncKangurCanvasContext,
} from '@/features/kangur/ui/services/drawing-canvas';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import type { Point2d } from '@/shared/contracts/geometry';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 240;
const BASE_MIN_DRAWING_POINTS = 24;
const BASE_MIN_DRAWING_LENGTH = 180;

type LetterRound = {
  id: string;
  label: string;
  word: string;
  accent: 'amber' | 'rose' | 'sky';
  guideColor: string;
  glowColor: string;
  paths: string[];
};

const LETTER_ROUNDS: LetterRound[] = [
  {
    id: 'A',
    label: 'A',
    word: 'auto',
    accent: 'amber',
    guideColor: '#fdba74',
    glowColor: '#f59e0b',
    paths: ['M100 200 L180 40 L260 200', 'M130 140 L230 140'],
  },
  {
    id: 'B',
    label: 'B',
    word: 'balon',
    accent: 'rose',
    guideColor: '#fda4af',
    glowColor: '#fb7185',
    paths: [
      'M120 40 L120 200',
      'M120 40 Q250 60 200 120 Q250 160 120 180',
    ],
  },
  {
    id: 'C',
    label: 'C',
    word: 'cytryna',
    accent: 'sky',
    guideColor: '#7dd3fc',
    glowColor: '#38bdf8',
    paths: ['M250 60 Q150 20 90 80 Q40 120 90 180 Q150 220 250 180'],
  },
];

type FeedbackState = { kind: 'success' | 'error'; text: string } | null;

const flattenPoints = (strokes: Point2d[][]): Point2d[] =>
  strokes.flatMap((stroke) => stroke);

const distance = (a: Point2d, b: Point2d): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

const computeStrokeLength = (stroke: Point2d[]): number => {
  if (stroke.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < stroke.length; i += 1) {
    total += distance(stroke[i - 1] as Point2d, stroke[i] as Point2d);
  }
  return total;
};

export default function AlphabetBasicsLesson(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isDrawingRef = useRef(false);

  const [roundIndex, setRoundIndex] = useState(0);
  const [strokes, setStrokes] = useState<Point2d[][]>([]);
  const [isPointerDrawing, setIsPointerDrawing] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const isCoarsePointer = useKangurCoarsePointer();

  const currentRound = (LETTER_ROUNDS[roundIndex] ?? LETTER_ROUNDS[0]) as LetterRound;
  const totalRounds = LETTER_ROUNDS.length;
  const points = useMemo(() => flattenPoints(strokes), [strokes]);
  const strokeLength = useMemo(
    () => strokes.reduce((sum, stroke) => sum + computeStrokeLength(stroke), 0),
    [strokes]
  );

  const minPointDistance = isCoarsePointer ? 5 : 2;
  const minDrawingPoints = isCoarsePointer ? 12 : BASE_MIN_DRAWING_POINTS;
  const minDrawingLength = isCoarsePointer ? 120 : BASE_MIN_DRAWING_LENGTH;
  const strokeWidth = isCoarsePointer ? 14 : 10;
  const guideStrokeWidth = isCoarsePointer ? 18 : 14;
  const glowStrokeWidth = isCoarsePointer ? 12 : 8;
  const drawHint = isCoarsePointer ? 'Rysuj palcem po sladzie' : 'Rysuj palcem lub myszka';
  const canvasSurfaceStyle = useMemo<CSSProperties>(
    () =>
      ({
        aspectRatio: '3 / 2',
        '--guide-width': `${guideStrokeWidth}px`,
        '--glow-width': `${glowStrokeWidth}px`,
      }) as CSSProperties,
    [guideStrokeWidth, glowStrokeWidth]
  );

  const redrawCanvas = useCallback((nextStrokes: Point2d[][]): void => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = syncKangurCanvasContext(canvas, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.shadowColor = 'rgba(15, 23, 42, 0.12)';
    ctx.shadowBlur = isCoarsePointer ? 8 : 6;

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
  }, [isCoarsePointer, strokeWidth]);

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
    setFeedback(null);
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
    if (feedback?.kind === 'success') return;
    event.preventDefault();
    if (feedback?.kind === 'error') {
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
    if (!isDrawingRef.current || feedback?.kind === 'success') return;
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
    event.preventDefault();
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.releasePointerCapture(event.pointerId);
    }
    isDrawingRef.current = false;
    setIsPointerDrawing(false);
  };

  const evaluateDrawing = (): FeedbackState => {
    if (points.length < minDrawingPoints) {
      return {
        kind: 'error',
        text: 'Rysuj po sladzie litery i sproboj jeszcze raz.',
      };
    }
    if (strokeLength < minDrawingLength) {
      return {
        kind: 'error',
        text: 'Super start! Dorysuj jeszcze kawalek litery.',
      };
    }
    return {
      kind: 'success',
      text: `Swietnie! Litera ${currentRound.label} gotowa.`,
    };
  };

  const handleCheck = (): void => {
    setFeedback(evaluateDrawing());
  };

  const handleNext = (): void => {
    const nextIndex = roundIndex + 1;
    setRoundIndex(nextIndex >= totalRounds ? 0 : nextIndex);
    clearDrawing();
  };

  return (
    <div className='flex w-full flex-col items-center gap-6'>
      <KangurGlassPanel
        className='w-full max-w-3xl'
        padding='lg'
        surface='playField'
      >
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <KangurHeadline accent='amber' as='h2' size='sm'>
              Alphabet
            </KangurHeadline>
            <p className='mt-2 text-sm text-slate-600'>
              Track: Letter Tracing. Rysuj litery po kolorowym sladzie. To gra dla 6-latkow.
            </p>
          </div>
          <div className='flex flex-col items-end gap-2'>
            <KangurStatusChip accent={currentRound.accent} size='sm'>
              Litera {currentRound.label}
            </KangurStatusChip>
            <span className='text-xs text-slate-500'>
              {roundIndex + 1}/{totalRounds}
            </span>
          </div>
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel
        className='w-full max-w-4xl'
        padding='lg'
        surface='mist'
      >
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                Slad litery
              </div>
              <p className='mt-1 text-sm text-slate-600'>
                Litera {currentRound.label} jak {currentRound.word}.
              </p>
            </div>
            <KangurStatusChip accent='indigo' size='sm'>
              {drawHint}
            </KangurStatusChip>
          </div>

            <div
              className='relative w-full overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 shadow-[0_16px_40px_-32px_rgba(15,23,42,0.45)]'
              style={canvasSurfaceStyle}
            >
            <svg
              viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
              className='absolute inset-0 h-full w-full'
              aria-hidden='true'
            >
              <defs>
                <linearGradient id='alphabetBg' x1='0' x2='1' y1='0' y2='1'>
                  <stop offset='0%' stopColor='#fef3c7' />
                  <stop offset='50%' stopColor='#e0f2fe' />
                  <stop offset='100%' stopColor='#fae8ff' />
                </linearGradient>
              </defs>
              <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill='url(#alphabetBg)' />
              <circle cx='58' cy='60' r='24' fill='#fde68a' opacity='0.6' />
              <circle cx='310' cy='54' r='18' fill='#bae6fd' opacity='0.65' />
              <circle cx='304' cy='190' r='22' fill='#fecaca' opacity='0.55' />
              {currentRound.paths.map((path) => (
                <path
                  key={`guide-${path}`}
                  d={path}
                  className='letter-guide'
                  stroke={currentRound.guideColor}
                />
              ))}
              {currentRound.paths.map((path, index) => (
                <path
                  key={`glow-${index}`}
                  d={path}
                  className='letter-glow motion-reduce:animate-none'
                  stroke={currentRound.glowColor}
                />
              ))}
              <text
                x='24'
                y='220'
                fontSize='26'
                fontWeight='700'
                fill='#0f172a'
                opacity='0.2'
              >
                {currentRound.label}
              </text>
            </svg>

            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              data-drawing-active={isPointerDrawing ? 'true' : 'false'}
              className='kangur-drawing-canvas relative z-10 h-full w-full touch-none'
              aria-label={`Rysuj litere ${currentRound.label}`}
            />
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600'>
            <span>Rysuj po grubych liniach i nie spiesz sie.</span>
            <span>{points.length} punktow</span>
          </div>
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel
        className='w-full max-w-3xl'
        padding='lg'
        surface='playField'
      >
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div className='min-w-0'>
            {feedback ? (
              <p
                className={`text-sm font-semibold ${
                  feedback.kind === 'success' ? 'text-emerald-600' : 'text-rose-600'
                }`}
                role='status'
                aria-live='polite'
              >
                {feedback.text}
              </p>
            ) : (
              <p className='text-sm text-slate-600'>
                Kliknij Sprawdz, gdy skonczysz rysowac.
              </p>
            )}
          </div>
          <div className='flex flex-wrap gap-2'>
            <KangurButton size='sm' type='button' variant='surface' onClick={clearDrawing}>
              Wyczysc
            </KangurButton>
            {feedback?.kind === 'success' ? (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= totalRounds ? 'Zacznij od nowa' : 'Dalej'}
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleCheck}>
                Sprawdz
              </KangurButton>
            )}
          </div>
        </div>
      </KangurGlassPanel>

      <style jsx>{`
        .letter-guide {
          fill: none;
          stroke-width: var(--guide-width, 14px);
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.35;
        }
        .letter-glow {
          fill: none;
          stroke-width: var(--glow-width, 8px);
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 12 18;
          animation: letterDash 3s linear infinite;
        }
        @keyframes letterDash {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.4;
          }
          50% {
            opacity: 0.9;
          }
          100% {
            stroke-dashoffset: -160;
            opacity: 0.4;
          }
        }
      `}</style>
    </div>
  );
}
