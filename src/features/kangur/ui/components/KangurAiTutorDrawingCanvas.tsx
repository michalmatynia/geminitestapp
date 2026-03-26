'use client';

import { X } from 'lucide-react';
import { useCallback, useRef } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { KangurDrawingCanvasSurface } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingCanvasSurface';
import { KangurDrawingFreeformToolbar } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar';
import type { KangurFreeformDrawingToolConfig } from '@/features/kangur/ui/components/drawing-engine/freeform-config';
import { useKangurFreeformCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurFreeformCanvasDrawing';
import { cn } from '@/features/kangur/shared/utils';

import type { JSX } from 'react';

type Props = {
  initialSnapshot?: string | null;
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
  onSnapshotChange?: (snapshot: string | null) => void;
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
const CANVAS_BG = '#ffffff';
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;
const KANGUR_AI_TUTOR_DRAWING_TOOL_CONFIG: KangurFreeformDrawingToolConfig = {
  colors: ['#1e293b', '#2563eb', '#dc2626', '#16a34a', '#f59e0b'],
  eraserWidthMultiplier: 3,
  preferredWidthIndex: 1,
  strokeWidths: [2, 4, 8],
};

export function KangurAiTutorDrawingCanvas({
  initialSnapshot = null,
  onComplete,
  onCancel,
  onSnapshotChange,
}: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    tools: drawingTools,
    exportDataUrl,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isPointerDrawing,
    canRedo,
    canUndo,
    redoLastStroke: handleRedo,
    undoLastStroke: handleUndo,
    clearStrokes: handleClear,
  } = useKangurFreeformCanvasDrawing({
    backgroundFill: CANVAS_BG,
    canvasRef,
    config: KANGUR_AI_TUTOR_DRAWING_TOOL_CONFIG,
    initialSerializedSnapshot: initialSnapshot,
    isCoarsePointer,
    logicalHeight: 240,
    logicalWidth: 320,
    onSerializedSnapshotChange: onSnapshotChange,
    shouldCommitStroke: (stroke) => stroke.points.length >= 2,
    touchLockEnabled: isCoarsePointer,
  });

  const handleDone = useCallback((): void => {
    if (!hasDrawableContent) return;
    const dataUrl = exportDataUrl();
    if (!dataUrl) return;
    onComplete(dataUrl);
  }, [exportDataUrl, hasDrawableContent, onComplete]);

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
        clearDisabled={!hasDrawableContent}
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
          disabled={!hasDrawableContent}
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
