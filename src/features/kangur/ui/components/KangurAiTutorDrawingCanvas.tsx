'use client';

import { Eraser, Pen, RotateCcw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { KANGUR_WRAP_CENTER_ROW_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { KangurDrawingCanvasSurface } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingCanvasSurface';
import { redrawKangurCanvasStrokes } from '@/features/kangur/ui/components/drawing-engine/render';
import {
  useKangurDrawingEngine,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingEngine';
import { cn } from '@/features/kangur/shared/utils';

import type { JSX } from 'react';

type DrawingStrokeMeta = {
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
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;

export function KangurAiTutorDrawingCanvas({ onComplete, onCancel }: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>(COLORS[0]);
  const isCoarsePointer = useKangurCoarsePointer();
  const strokeWidths = useMemo(
    () => (isCoarsePointer ? STROKE_WIDTHS.map((width) => width + 2) : [...STROKE_WIDTHS]),
    [isCoarsePointer]
  );
  const [selectedWidth, setSelectedWidth] = useState<number>(strokeWidths[1] ?? 8);
  const [isEraser, setIsEraser] = useState(false);
  const minPointDistance = isCoarsePointer ? 4 : 2;

  useEffect(() => {
    setSelectedWidth((current) =>
      strokeWidths.includes(current) ? current : (strokeWidths[1] ?? 8)
    );
  }, [strokeWidths]);
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    strokes,
    undoLastStroke: handleUndo,
    clearStrokes: handleClear,
  } = useKangurDrawingEngine<DrawingStrokeMeta>({
    canvasRef,
    createStroke: ({ point }) => ({
      meta: {
        color: selectedColor,
        isEraser,
        width: isEraser ? selectedWidth * 3 : selectedWidth,
      },
      points: [point],
    }),
    logicalHeight: 240,
    logicalWidth: 320,
    minPointDistance,
    redraw: ({ activeStroke, strokes }) => {
      redrawKangurCanvasStrokes({
        backgroundFill: CANVAS_BG,
        canvas: canvasRef.current,
        logicalHeight: CANVAS_HEIGHT,
        logicalWidth: CANVAS_WIDTH,
        resolveStyle: ({ meta }) => ({
          compositeOperation: meta.isEraser ? 'destination-out' : 'source-over',
          lineWidth: meta.width,
          strokeStyle: meta.isEraser ? 'rgba(0,0,0,1)' : meta.color,
        }),
        strokes: activeStroke ? [...strokes, activeStroke] : strokes,
      });
    },
    shouldCommitStroke: (stroke) => stroke.points.length >= 2,
    touchLockEnabled: isCoarsePointer,
  });

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
          className={cn(
            'cursor-pointer rounded-full [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
            isCoarsePointer
              ? 'h-11 w-11 touch-manipulation select-none active:scale-[0.97]'
              : 'p-1'
          )}
          aria-label={tutorContent.common.closeAria}
          title={tutorContent.common.closeAria}>
          <X aria-hidden='true' className={isCoarsePointer ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        </button>
      </div>

      <div
        className={cn(
          'relative transition-shadow',
          isCoarsePointer && 'shadow-[inset_0_0_0_1px_var(--kangur-soft-card-border)]',
          isPointerDrawing && 'ring-2 ring-amber-300/70 ring-offset-2 ring-offset-white'
        )}
        data-testid='kangur-ai-tutor-drawing-board'
      >
        <KangurDrawingCanvasSurface
          ariaLabel={drawingContent?.canvasLabel ?? 'Plansza do rysowania'}
          canvasClassName='rounded-none'
          canvasRef={canvasRef}
          canvasStyle={{ cursor: isEraser ? 'cell' : 'crosshair', width: '100%', height: 'auto' }}
          height={CANVAS_HEIGHT}
          isPointerDrawing={isPointerDrawing}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          width={CANVAS_WIDTH}
        />
      </div>

      <div className={`${KANGUR_WRAP_CENTER_ROW_CLASSNAME} border-t kangur-chat-divider kangur-chat-padding-sm`}>
        <div className='flex items-center gap-1'>
          {COLORS.map((color) => (
            <button
              key={color}
              type='button'
              aria-label={`Kolor ${color}`}
              aria-pressed={selectedColor === color && !isEraser}
              className={`${isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-5 w-5'} cursor-pointer rounded-full border-2 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
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
              className={`flex ${isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-6 w-6'} cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
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
          className={`flex ${isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-6 w-6'} cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
            !isEraser
              ? '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
              : '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
          }`}
          onClick={() => setIsEraser(false)}
          title={drawingContent?.penLabel ?? 'Pióro'}>
          <Pen aria-hidden='true' className='h-3 w-3' />
        </button>
        <button
          type='button'
          aria-label={drawingContent?.eraserLabel ?? 'Gumka'}
          aria-pressed={isEraser}
          className={`flex ${isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-6 w-6'} cursor-pointer items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
            isEraser
              ? '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))] [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
              : '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))]'
          }`}
          onClick={() => setIsEraser(true)}
          title={drawingContent?.eraserLabel ?? 'Gumka'}>
          <Eraser aria-hidden='true' className='h-3 w-3' />
        </button>

        <div className='mx-1 h-4 w-px [background:var(--kangur-soft-card-border)]' />

        <button
          type='button'
          aria-label={drawingContent?.undoLabel ?? 'Cofnij'}
          className={`flex ${isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-6 w-6'} cursor-pointer items-center justify-center rounded-full [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white hover:[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-page-background))] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))] disabled:opacity-30`}
          disabled={strokes.length === 0}
          onClick={handleUndo}
          title={drawingContent?.undoLabel ?? 'Cofnij'}>
          <RotateCcw aria-hidden='true' className='h-3 w-3' />
        </button>
        <button
          type='button'
          aria-label={drawingContent?.clearLabel ?? 'Wyczyść'}
          className={`flex ${isCoarsePointer ? 'h-11 w-11 touch-manipulation active:scale-95' : 'h-6 w-6'} cursor-pointer items-center justify-center rounded-full [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white hover:[background:var(--kangur-chat-danger-background,#fff1f2)] hover:[color:var(--kangur-chat-danger-text,#ef4444)] disabled:opacity-30`}
          disabled={strokes.length === 0}
          onClick={handleClear}
          title={drawingContent?.clearLabel ?? 'Wyczyść'}>
          <Trash2 aria-hidden='true' className='h-3 w-3' />
        </button>
      </div>

      <div className='flex justify-end kangur-panel-gap border-t kangur-chat-divider kangur-chat-padding-sm text-xs'>
        <button
          type='button'
          onClick={onCancel}
          aria-label={drawingContent?.cancelLabel ?? 'Anuluj'}
          className={`${isCoarsePointer ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]' : ''} cursor-pointer font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:scale-[1.02] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]`}
        >
          {drawingContent?.cancelLabel ?? 'Anuluj'}
        </button>
        <button
          type='button'
          disabled={strokes.length === 0}
          onClick={handleDone}
          aria-label={drawingContent?.doneLabel ?? 'Gotowe'}
          className={`${isCoarsePointer ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]' : ''} cursor-pointer font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-panel-text,var(--kangur-page-text))] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {drawingContent?.doneLabel ?? 'Gotowe'}
        </button>
      </div>
    </div>
  );
}
