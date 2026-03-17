'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_ROOMY_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCanvasRedraw } from '@/features/kangur/ui/hooks/useKangurCanvasRedraw';
import {
  resolveKangurCanvasPoint,
  syncKangurCanvasContext,
} from '@/features/kangur/ui/services/drawing-canvas';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import type { Point2d } from '@/shared/contracts/geometry';

const CANVAS_WIDTH = 360;
const CANVAS_HEIGHT = 260;
const COPY_ZONE_TOP = 120;
const COPY_ZONE_BOTTOM = 230;
const GUIDE_LINE_START_X = 28;
const GUIDE_LINE_END_X = CANVAS_WIDTH - 28;
const MIDLINE_Y = 170;
const BASELINE_Y = 210;
const BASE_MIN_DRAWING_POINTS = 20;
const BASE_MIN_DRAWING_LENGTH = 160;

type LetterRound = {
  id: string;
  label: string;
  word: string;
  accent: 'amber' | 'rose' | 'sky';
  guideColor: string;
  inkColor: string;
};

const LETTER_ROUNDS: LetterRound[] = [
  {
    id: 'L',
    label: 'L',
    word: 'lew',
    accent: 'amber',
    guideColor: '#fde68a',
    inkColor: '#f59e0b',
  },
  {
    id: 'O',
    label: 'O',
    word: 'oko',
    accent: 'rose',
    guideColor: '#fecdd3',
    inkColor: '#fb7185',
  },
  {
    id: 'M',
    label: 'M',
    word: 'mis',
    accent: 'sky',
    guideColor: '#bae6fd',
    inkColor: '#38bdf8',
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

const isPointInCopyZone = (point: Point2d): boolean => point.y >= COPY_ZONE_TOP;

export default function AlphabetCopyLesson(): React.JSX.Element {
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
  const drawHint = isCoarsePointer
    ? 'Przepisuj litere palcem na dolnych liniach'
    : 'Przepisuj litere na dolnych liniach';

  const canvasSurfaceStyle = useMemo<CSSProperties>(
    () =>
      ({
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        '--copy-zone-top': `${COPY_ZONE_TOP}px`,
        '--copy-zone-bottom': `${COPY_ZONE_BOTTOM}px`,
        '--baseline-y': `${BASELINE_Y}px`,
        '--midline-y': `${MIDLINE_Y}px`,
        '--guide-color': currentRound.inkColor,
      }) as CSSProperties,
    [currentRound.inkColor]
  );

  const redrawCanvas = useCallback(
    (nextStrokes: Point2d[][]): void => {
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
    },
    [isCoarsePointer, strokeWidth]
  );

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
    if (!isPointInCopyZone(point)) {
      setFeedback({
        kind: 'error',
        text: 'Rysuj pod litera, na dolnych liniach.',
      });
      return;
    }
    isDrawingRef.current = true;
    setIsPointerDrawing(true);
    canvas.setPointerCapture(event.pointerId);
    updateStrokes((current) => [...current, [point]]);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>): void => {
    if (!isDrawingRef.current || feedback?.kind === 'success') return;
    event.preventDefault();
    const point = resolvePoint(event);
    if (!isPointInCopyZone(point)) return;
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
        text: 'Przepisz litere na dole i sprobuj jeszcze raz.',
      };
    }
    if (strokeLength < minDrawingLength) {
      return {
        kind: 'error',
        text: 'Super start! Dorysuj jeszcze kawałek litery.',
      };
    }
    return {
      kind: 'success',
      text: `Brawo! Litera ${currentRound.label} gotowa.`,
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
    <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} w-full items-center`}>
      <KangurGlassPanel className='w-full max-w-3xl' padding='lg' surface='playField'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div className='min-w-0'>
            <KangurHeadline accent='amber' as='h2' size='sm'>
              Alphabet
            </KangurHeadline>
            <p className='mt-2 text-sm text-slate-600'>
              Track: Przepisz litery. Ćwicz płynność pisania pod wzorem. To gra dla 6-latków.
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

      <KangurGlassPanel className='w-full max-w-4xl' padding='lg' surface='mist'>
        <div className='space-y-4'>
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div>
              <div className='text-xs font-semibold uppercase tracking-[0.2em] text-slate-500'>
                Wzór litery
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
                <linearGradient id='copyBg' x1='0' x2='1' y1='0' y2='1'>
                  <stop offset='0%' stopColor='#fef3c7' />
                  <stop offset='55%' stopColor='#e0f2fe' />
                  <stop offset='100%' stopColor='#fae8ff' />
                </linearGradient>
              </defs>
              <rect width={CANVAS_WIDTH} height={CANVAS_HEIGHT} fill='url(#copyBg)' />
              <rect
                y={COPY_ZONE_TOP}
                width={CANVAS_WIDTH}
                height={COPY_ZONE_BOTTOM - COPY_ZONE_TOP}
                fill='#ffffff'
                opacity='0.72'
              />
              <line
                x1={GUIDE_LINE_START_X}
                x2={GUIDE_LINE_END_X}
                y1={COPY_ZONE_TOP}
                y2={COPY_ZONE_TOP}
                className='copy-divider'
              />
              <line
                x1={GUIDE_LINE_START_X}
                x2={GUIDE_LINE_END_X}
                y1={MIDLINE_Y}
                y2={MIDLINE_Y}
                className='copy-midline'
                stroke={currentRound.guideColor}
              />
              <line
                x1={GUIDE_LINE_START_X}
                x2={GUIDE_LINE_END_X}
                y1={BASELINE_Y}
                y2={BASELINE_Y}
                className='copy-baseline'
                stroke={currentRound.inkColor}
              />
              <text
                x={CANVAS_WIDTH / 2}
                y={88}
                textAnchor='middle'
                className='target-letter'
                fill={currentRound.inkColor}
                fontSize='96'
                fontWeight='800'
              >
                {currentRound.label}
              </text>
              <text
                x={CANVAS_WIDTH / 2}
                y={110}
                textAnchor='middle'
                className='target-word'
                fill='#0f172a'
                fontSize='16'
                fontWeight='600'
                opacity='0.6'
              >
                {currentRound.word}
              </text>
              <text
                x={CANVAS_WIDTH / 2}
                y={COPY_ZONE_TOP + 20}
                textAnchor='middle'
                fill='#0f172a'
                fontSize='12'
                fontWeight='600'
                opacity='0.35'
              >
                Napisz tutaj
              </text>
            </svg>

            <div className='copy-guide pointer-events-none' aria-hidden='true' />

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
              aria-label={`Przepisz litere ${currentRound.label} pod wzorem`}
            />
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600'>
            <span>Trzymaj sie linii i nie spiesz sie.</span>
            <span>{points.length} punktow</span>
          </div>
        </div>
      </KangurGlassPanel>

      <KangurGlassPanel className='w-full max-w-3xl' padding='lg' surface='playField'>
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
                Kliknij Sprawdz, gdy skonczysz przepisywac.
              </p>
            )}
          </div>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
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
        .target-letter {
          transform-box: fill-box;
          transform-origin: center;
          animation: letterFloat 3.2s ease-in-out infinite;
        }
        .copy-divider {
          stroke: #94a3b8;
          stroke-width: 2px;
          stroke-dasharray: 6 10;
          opacity: 0.35;
        }
        .copy-midline {
          stroke-width: 3px;
          stroke-dasharray: 8 12;
          opacity: 0.4;
        }
        .copy-baseline {
          stroke-width: 6px;
          stroke-linecap: round;
          stroke-dasharray: 14 16;
          animation: baselineGlow 2.8s ease-in-out infinite;
        }
        .copy-guide {
          position: absolute;
          left: 20px;
          top: calc(var(--baseline-y, 210px) - 18px);
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          background: var(--guide-color, #38bdf8);
          box-shadow:
            0 0 0 6px rgba(255, 255, 255, 0.85),
            0 10px 20px -12px rgba(15, 23, 42, 0.45);
          opacity: 0.85;
          animation: guideSlide 3.6s ease-in-out infinite;
        }
        .copy-guide::after {
          content: '';
          position: absolute;
          right: -7px;
          top: 50%;
          width: 10px;
          height: 3px;
          border-radius: 9999px;
          background: rgba(15, 23, 42, 0.7);
          transform: translateY(-50%);
        }
        @keyframes letterFloat {
          0% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-4px) scale(1.01);
          }
          100% {
            transform: translateY(0px) scale(1);
          }
        }
        @keyframes baselineGlow {
          0% {
            stroke-dashoffset: 0;
            opacity: 0.5;
          }
          50% {
            opacity: 0.95;
          }
          100% {
            stroke-dashoffset: -120;
            opacity: 0.5;
          }
        }
        @keyframes guideSlide {
          0% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(220px);
          }
          100% {
            transform: translateX(0);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .target-letter,
          .copy-baseline,
          .copy-guide {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
