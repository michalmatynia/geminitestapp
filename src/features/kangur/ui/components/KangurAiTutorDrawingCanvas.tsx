'use client';

import { Eraser, Pen, RotateCcw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurCanvasTouchLock } from '@/features/kangur/ui/hooks/useKangurCanvasTouchLock';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';

import type { JSX, PointerEvent as ReactPointerEvent } from 'react';

type DrawingStroke = {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  isEraser: boolean;
};

type Props = {
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
};

type TutorDrawingContent = {
  title?: string;
  penLabel?: string;
  eraserLabel?: string;
  undoLabel?: string;
  clearLabel?: string;
  cancelLabel?: string;
  doneLabel?: string;
  canvasLabel?: string;
};
const COLORS = ['#1e293b', '#2563eb', '#dc2626', '#16a34a', '#f59e0b'] as const;
const STROKE_WIDTHS = [2, 4, 8] as const;
const CANVAS_BG = '#ffffff';

function getPointerPosition(
  event: ReactPointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement
): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

const distance = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  width: number,
  height: number
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = CANVAS_BG;
  ctx.fillRect(0, 0, width, height);

  for (const stroke of strokes) {
    const [firstPoint, ...remainingPoints] = stroke.points;
    if (!firstPoint || remainingPoints.length === 0) {
      continue;
    }

    ctx.beginPath();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = stroke.width;

    if (stroke.isEraser) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.strokeStyle = 'rgba(0,0,0,1)';
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = stroke.color;
    }

    ctx.moveTo(firstPoint.x, firstPoint.y);
    for (const point of remainingPoints) {
      ctx.lineTo(point.x, point.y);
    }
    ctx.stroke();
  }

  ctx.globalCompositeOperation = 'source-over';
}

export function KangurAiTutorDrawingCanvas({ onComplete, onCancel }: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [activeStroke, setActiveStroke] = useState<DrawingStroke | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const isCoarsePointer = useKangurCoarsePointer();
  const strokeWidths = useMemo(
    () => (isCoarsePointer ? STROKE_WIDTHS.map((width) => width + 2) : [...STROKE_WIDTHS]),
    [isCoarsePointer]
  );
  const [selectedWidth, setSelectedWidth] = useState<number>(strokeWidths[1]);
  const [isEraser, setIsEraser] = useState(false);
  const isDrawingRef = useRef(false);
  const minPointDistance = isCoarsePointer ? 4 : 2;

  const redraw = useCallback(
    (extraStroke?: DrawingStroke | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const allStrokes = extraStroke ? [...strokes, extraStroke] : strokes;
      renderStrokes(ctx, allStrokes, canvas.width, canvas.height);
    },
    [strokes]
  );

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    setSelectedWidth((current) =>
      strokeWidths.includes(current) ? current : strokeWidths[1]
    );
  }, [strokeWidths]);
  useKangurCanvasTouchLock(canvasRef);

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      event.preventDefault();
      canvas.setPointerCapture(event.pointerId);
      isDrawingRef.current = true;

      const pos = getPointerPosition(event, canvas);
      const stroke: DrawingStroke = {
        points: [pos],
        color: selectedColor,
        width: isEraser ? selectedWidth * 3 : selectedWidth,
        isEraser,
      };
      setActiveStroke(stroke);
    },
    [isEraser, selectedColor, selectedWidth]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLCanvasElement>): void => {
      if (!isDrawingRef.current || !activeStroke) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      event.preventDefault();
      const pos = getPointerPosition(event, canvas);
      const lastPoint = activeStroke.points[activeStroke.points.length - 1];
      if (lastPoint && distance(lastPoint, pos) < minPointDistance) {
        return;
      }
      const updated: DrawingStroke = {
        ...activeStroke,
        points: [...activeStroke.points, pos],
      };
      setActiveStroke(updated);
      redraw(updated);
    },
    [activeStroke, minPointDistance, redraw]
  );

  const handlePointerUp = useCallback((): void => {
    if (!isDrawingRef.current || !activeStroke) return;
    isDrawingRef.current = false;

    if (activeStroke.points.length >= 2) {
      setStrokes((prev) => [...prev, activeStroke]);
    }
    setActiveStroke(null);
  }, [activeStroke]);

  const handleUndo = useCallback((): void => {
    setStrokes((prev) => prev.slice(0, -1));
  }, []);

  const handleClear = useCallback((): void => {
    setStrokes([]);
  }, []);

  const handleDone = useCallback((): void => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;
    const dataUrl = canvas.toDataURL('image/png');
    onComplete(dataUrl);
  }, [onComplete, strokes.length]);

  return (
    <div
      data-testid='kangur-ai-tutor-drawing-canvas'
      className='flex flex-col kangur-chat-card border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
    >
      <div className='flex items-center justify-between border-b kangur-chat-divider kangur-chat-padding-sm'>
        <span className='text-xs font-semibold [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
          {drawingContent?.title ?? 'Rysowanie'}
        </span>
        <button
          type='button'
          onClick={onCancel}
          className='cursor-pointer rounded-full p-1 [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
          aria-label={tutorContent.common.closeAria}
          title={tutorContent.common.closeAria}>
          <X className='h-3.5 w-3.5' />
        </button>
      </div>

      <div className='relative'>
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          aria-label={drawingContent?.canvasLabel ?? 'Plansza do rysowania'}
          className='kangur-drawing-canvas touch-none rounded-none'
          style={{ cursor: isEraser ? 'cell' : 'crosshair', width: '100%', height: 'auto' }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      <div className='flex flex-wrap items-center gap-2 border-t kangur-chat-divider kangur-chat-padding-sm'>
        <div className='flex items-center gap-1'>
          {COLORS.map((color) => (
            <button
              key={color}
              type='button'
              aria-label={`Kolor ${color}`}
              aria-pressed={selectedColor === color && !isEraser}
              className={`h-5 w-5 cursor-pointer rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
                selectedColor === color && !isEraser
                  ? 'scale-110 kangur-chat-accent-border'
                  : '[border-color:var(--kangur-soft-card-border)] hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => {
                setSelectedColor(color);
                setIsEraser(false);
              }}
            />
          ))}
        </div>

        <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

        <div className='flex items-center gap-1'>
          {strokeWidths.map((w) => (
            <button
              key={w}
              type='button'
              aria-label={`Grubość ${w}px`}
              aria-pressed={selectedWidth === w && !isEraser}
              className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
                selectedWidth === w && !isEraser
                  ? '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
                  : '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
              }`}
              onClick={() => {
                setSelectedWidth(w);
                setIsEraser(false);
              }}
            >
              <span
                className='rounded-full bg-current'
                style={{ width: w + 2, height: w + 2 }}
              />
            </button>
          ))}
        </div>

        <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

        <button
          type='button'
          aria-label={drawingContent?.penLabel ?? 'Pióro'}
          aria-pressed={!isEraser}
          className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
            !isEraser
              ? '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
              : '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
          }`}
          onClick={() => setIsEraser(false)}
          title={drawingContent?.penLabel ?? 'Pióro'}>
          <Pen className='h-3 w-3' />
        </button>
        <button
          type='button'
          aria-label={drawingContent?.eraserLabel ?? 'Gumka'}
          aria-pressed={isEraser}
          className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
            isEraser
              ? '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
              : '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
          }`}
          onClick={() => setIsEraser(true)}
          title={drawingContent?.eraserLabel ?? 'Gumka'}>
          <Eraser className='h-3 w-3' />
        </button>

        <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

        <button
          type='button'
          aria-label={drawingContent?.undoLabel ?? 'Cofnij'}
          className='flex h-6 w-6 cursor-pointer items-center justify-center rounded-full [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))] disabled:opacity-30'
          disabled={strokes.length === 0}
          onClick={handleUndo}
          title={drawingContent?.undoLabel ?? 'Cofnij'}>
          <RotateCcw className='h-3 w-3' />
        </button>
        <button
          type='button'
          aria-label={drawingContent?.clearLabel ?? 'Wyczyść'}
          className='flex h-6 w-6 cursor-pointer items-center justify-center rounded-full [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white hover:[background:var(--kangur-chat-danger-background,#fff1f2)] hover:[color:var(--kangur-chat-danger-text,#ef4444)] disabled:opacity-30'
          disabled={strokes.length === 0}
          onClick={handleClear}
          title={drawingContent?.clearLabel ?? 'Wyczyść'}>
          <Trash2 className='h-3 w-3' />
        </button>
      </div>

      <div className='flex justify-end kangur-panel-gap border-t kangur-chat-divider kangur-chat-padding-sm text-xs'>
        <button
          type='button'
          onClick={onCancel}
          aria-label={drawingContent?.cancelLabel ?? 'Anuluj'}
          className='cursor-pointer font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:scale-[1.02] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
        >
          {drawingContent?.cancelLabel ?? 'Anuluj'}
        </button>
        <button
          type='button'
          disabled={strokes.length === 0}
          onClick={handleDone}
          aria-label={drawingContent?.doneLabel ?? 'Gotowe'}
          className='cursor-pointer font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-panel-text,var(--kangur-page-text))] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40'
        >
          {drawingContent?.doneLabel ?? 'Gotowe'}
        </button>
      </div>
    </div>
  );
}
