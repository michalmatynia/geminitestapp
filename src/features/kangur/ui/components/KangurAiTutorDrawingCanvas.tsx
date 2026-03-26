'use client';

import { X } from 'lucide-react';
import { useCallback, useRef } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { KangurDrawingCanvasSurface } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingCanvasSurface';
import { KangurDrawingFreeformToolbar } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar';
import { redrawKangurCanvasStrokes } from '@/features/kangur/ui/components/drawing-engine/render';
import { useKangurFreeformDrawingTools } from '@/features/kangur/ui/components/drawing-engine/useKangurFreeformDrawingTools';
import {
  useKangurDrawingEngine,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingEngine';
import type { KangurFreeformDrawingStrokeMeta } from '@/features/kangur/ui/components/drawing-engine/types';
import { cn } from '@/features/kangur/shared/utils';

import type { JSX } from 'react';

type Props = {
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
};

type TutorDrawingContent = {
  title?: string;
  penLabel?: string;
  eraserLabel?: string;
  undoLabel?: string;
  redoLabel?: string;
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
  const isCoarsePointer = useKangurCoarsePointer();
  const drawingTools = useKangurFreeformDrawingTools({
    colors: COLORS,
    isCoarsePointer,
    strokeWidths: STROKE_WIDTHS,
  });
  const minPointDistance = isCoarsePointer ? 4 : 2;
  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    canRedo,
    canUndo,
    strokes,
    redoLastStroke: handleRedo,
    undoLastStroke: handleUndo,
    clearStrokes: handleClear,
  } = useKangurDrawingEngine<KangurFreeformDrawingStrokeMeta>({
    canvasRef,
    createStroke: ({ point }) => ({
      meta: drawingTools.strokeMeta,
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
          canvasStyle={{
            cursor: drawingTools.isEraser ? 'cell' : 'crosshair',
            width: '100%',
            height: 'auto',
          }}
          height={CANVAS_HEIGHT}
          isPointerDrawing={isPointerDrawing}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          width={CANVAS_WIDTH}
        />
      </div>

      <KangurDrawingFreeformToolbar
        canRedo={canRedo}
        canUndo={canUndo}
        clearDisabled={strokes.length === 0}
        clearLabel={drawingContent?.clearLabel ?? 'Wyczyść'}
        eraserLabel={drawingContent?.eraserLabel ?? 'Gumka'}
        isCoarsePointer={isCoarsePointer}
        onClear={handleClear}
        onRedo={handleRedo}
        onUndo={handleUndo}
        penLabel={drawingContent?.penLabel ?? 'Pióro'}
        redoLabel={drawingContent?.redoLabel ?? 'Ponów'}
        toolActions={drawingTools}
        toolState={drawingTools}
        undoLabel={drawingContent?.undoLabel ?? 'Cofnij'}
      />

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
