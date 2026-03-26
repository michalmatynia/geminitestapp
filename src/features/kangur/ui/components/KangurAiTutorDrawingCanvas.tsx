'use client';

import { X } from 'lucide-react';
import { useCallback, useRef } from 'react';

import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { KangurDrawingCanvasSurface } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingCanvasSurface';
import { KangurDrawingFreeformToolbar } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingFreeformToolbar';
import type { KangurFreeformDrawingToolConfig } from '@/features/kangur/ui/components/drawing-engine/freeform-config';
import { createKangurDrawingExportFilename } from '@/features/kangur/ui/components/drawing-engine/drawing-identifiers';
import { KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS } from '@/features/kangur/ui/components/drawing-engine/keyboard-shortcuts';
import type { KangurDrawingDraftStorageController } from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import { useKangurManagedStoredFreeformCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurManagedStoredFreeformCanvasDrawing';
import { cn } from '@/features/kangur/shared/utils';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import type { JSX } from 'react';

type Props = {
  draftStorage?: KangurDrawingDraftStorageController;
  onComplete: (dataUrl: string) => void;
  onCancel: () => void;
};

type TutorDrawingContent = {
  canvasLabel?: string;
  cancelLabel?: string;
  clearLabel?: string;
  doneLabel?: string;
  eraserLabel?: string;
  exportLabel?: string;
  penLabel?: string;
  redoLabel?: string;
  title?: string;
  undoLabel?: string;
};

type TutorDrawingFallbackCopy = {
  cancelLabel: string;
  canvasLabel: string;
  clearLabel: string;
  closeAria: string;
  doneLabel: string;
  eraserLabel?: string;
  exportLabel?: string;
  penLabel?: string;
  redoLabel?: string;
  title: string;
  undoLabel?: string;
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

const getTutorDrawingFallbackCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): TutorDrawingFallbackCopy => {
  if (locale === 'uk') {
    return {
      cancelLabel: 'Скасувати',
      canvasLabel: 'Полотно для малювання',
      clearLabel: 'Очистити',
      closeAria: 'Закрити',
      doneLabel: 'Готово',
      eraserLabel: 'Гумка',
      exportLabel: 'Експортувати PNG',
      penLabel: 'Перо',
      redoLabel: 'Повторити',
      title: 'Малювання',
      undoLabel: 'Скасувати дію',
    };
  }

  if (locale === 'de') {
    return {
      cancelLabel: 'Abbrechen',
      canvasLabel: 'Zeichenflache',
      clearLabel: 'Loschen',
      closeAria: 'Schliessen',
      doneLabel: 'Fertig',
      eraserLabel: 'Radierer',
      exportLabel: 'PNG exportieren',
      penLabel: 'Stift',
      redoLabel: 'Wiederholen',
      title: 'Zeichnen',
      undoLabel: 'Ruckgangig',
    };
  }

  if (locale === 'en') {
    return {
      cancelLabel: 'Cancel',
      canvasLabel: 'Drawing board',
      clearLabel: 'Clear',
      closeAria: 'Close',
      doneLabel: 'Done',
      eraserLabel: 'Eraser',
      exportLabel: 'Export PNG',
      penLabel: 'Pen',
      redoLabel: 'Redo',
      title: 'Drawing',
      undoLabel: 'Undo',
    };
  }

  return {
    cancelLabel: 'Anuluj',
    canvasLabel: 'Plansza do rysowania',
    clearLabel: 'Wyczyść',
    closeAria: 'Zamknij',
    doneLabel: 'Gotowe',
    eraserLabel: 'Gumka',
    exportLabel: 'Eksportuj PNG',
    penLabel: 'Pióro',
    redoLabel: 'Ponów',
    title: 'Rysowanie',
    undoLabel: 'Cofnij',
  };
};

const resolveTutorDrawingFallback = (
  locale: ReturnType<typeof normalizeSiteLocale>,
  value: string | null | undefined,
  polishDefault: string | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  if (locale !== 'pl' && typeof polishDefault === 'string' && value === polishDefault) {
    return fallback;
  }

  return value;
};

export function KangurAiTutorDrawingCanvas({
  draftStorage,
  onComplete,
  onCancel,
}: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const locale = normalizeSiteLocale(tutorContent.locale);
  const fallbackCopy = getTutorDrawingFallbackCopy(locale);
  const closeAria = resolveTutorDrawingFallback(
    locale,
    tutorContent.common.closeAria,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.closeAria,
    fallbackCopy.closeAria
  );
  const drawingTitle = resolveTutorDrawingFallback(
    locale,
    drawingContent?.title,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.title,
    fallbackCopy.title
  );
  const canvasLabel =
    typeof drawingContent?.canvasLabel === 'string' && drawingContent.canvasLabel.trim().length > 0
      ? drawingContent.canvasLabel
      : fallbackCopy.canvasLabel;
  const clearLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.clearLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.clearLabel,
    fallbackCopy.clearLabel
  );
  const eraserLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.eraserLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.eraserLabel,
    fallbackCopy.eraserLabel ?? 'Gumka'
  );
  const exportLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.exportLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.exportLabel,
    fallbackCopy.exportLabel ?? 'Eksportuj PNG'
  );
  const penLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.penLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.penLabel,
    fallbackCopy.penLabel ?? 'Pióro'
  );
  const redoLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.redoLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.redoLabel,
    fallbackCopy.redoLabel ?? 'Ponów'
  );
  const undoLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.undoLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.undoLabel,
    fallbackCopy.undoLabel ?? 'Cofnij'
  );
  const cancelLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.cancelLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.cancelLabel,
    fallbackCopy.cancelLabel
  );
  const doneLabel = resolveTutorDrawingFallback(
    locale,
    drawingContent?.doneLabel,
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing?.doneLabel,
    fallbackCopy.doneLabel
  );
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
    clearDrawing,
    exportDrawing: handleExport,
    handleCanvasKeyDown,
    redoDrawing: handleRedo,
    undoDrawing: handleUndo,
  } = useKangurManagedStoredFreeformCanvasDrawing({
    actions: {
      exportFilename: createKangurDrawingExportFilename('kangur-ai-tutor-drawing'),
    },
    drawing: {
      backgroundFill: CANVAS_BG,
      canvasRef,
      config: KANGUR_AI_TUTOR_DRAWING_TOOL_CONFIG,
      draftStorage,
      isCoarsePointer,
      logicalHeight: 240,
      logicalWidth: 320,
      shouldCommitStroke: (stroke) => stroke.points.length >= 2,
      touchLockEnabled: isCoarsePointer,
    },
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
          {drawingTitle}
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
          aria-label={closeAria}
          title={closeAria}>
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
          ariaKeyShortcuts={KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS}
          ariaLabel={canvasLabel}
          canvasClassName='rounded-none'
          canvasRef={canvasRef}
          canvasStyle={{
            cursor: drawingTools.isEraser ? 'cell' : 'crosshair',
            width: '100%',
            height: 'auto',
          }}
          height={CANVAS_HEIGHT}
          isPointerDrawing={isPointerDrawing}
          onKeyDown={handleCanvasKeyDown}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          tabIndex={0}
          width={CANVAS_WIDTH}
        />
      </div>

      <KangurDrawingFreeformToolbar
        canExport={hasDrawableContent}
        canRedo={canRedo}
        canUndo={canUndo}
        clearDisabled={!hasDrawableContent}
        clearLabel={clearLabel}
        eraserLabel={eraserLabel}
        exportLabel={exportLabel}
        isCoarsePointer={isCoarsePointer}
        onClear={clearDrawing}
        onExport={handleExport}
        onRedo={handleRedo}
        onUndo={handleUndo}
        penLabel={penLabel}
        redoLabel={redoLabel}
        toolActions={drawingTools}
        toolState={drawingTools}
        undoLabel={undoLabel}
      />

      <div className='flex justify-end kangur-panel-gap border-t kangur-chat-divider kangur-chat-padding-sm text-xs'>
        <button
          type='button'
          onClick={onCancel}
          aria-label={cancelLabel}
          className={`${isCoarsePointer ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]' : ''} cursor-pointer font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:scale-[1.02] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]`}
        >
          {cancelLabel}
        </button>
        <button
          type='button'
          disabled={!hasDrawableContent}
          onClick={handleDone}
          aria-label={doneLabel}
          className={`${isCoarsePointer ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]' : ''} cursor-pointer font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-panel-text,var(--kangur-page-text))] hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
