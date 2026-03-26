'use client';

import { useCallback } from 'react';

import {
  downloadKangurDataUrl,
  useKangurDrawingDownloadAction,
  type KangurDrawingExportOptions,
} from '@/features/kangur/ui/components/drawing-engine/canvas-export';
import { useKangurDrawingHistoryKeyDown } from '@/features/kangur/ui/components/drawing-engine/keyboard-shortcuts';

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

type UseKangurManagedDrawingActionsOptions<
  TElement extends HTMLElement | SVGElement = HTMLCanvasElement,
> = {
  canExport: boolean;
  canRedo: boolean;
  canUndo: boolean;
  clearDraftSnapshot?: () => void;
  clearStrokes: () => void;
  downloadDataUrl?: typeof downloadKangurDataUrl;
  exportDataUrl: (options?: KangurDrawingExportOptions) => string | null;
  exportFilename: string;
  onAfterClear?: () => void;
  onAfterRedo?: () => void;
  onAfterUndo?: () => void;
  onUnhandledKeyDown?: (event: ReactKeyboardEvent<TElement>) => void;
  redoLastStroke: () => void;
  undoLastStroke: () => void;
};

export const useKangurManagedDrawingActions = <
  TElement extends HTMLElement | SVGElement = HTMLCanvasElement,
>({
  canExport,
  canRedo,
  canUndo,
  clearDraftSnapshot,
  clearStrokes,
  downloadDataUrl = downloadKangurDataUrl,
  exportDataUrl,
  exportFilename,
  onAfterClear,
  onAfterRedo,
  onAfterUndo,
  onUnhandledKeyDown,
  redoLastStroke,
  undoLastStroke,
}: UseKangurManagedDrawingActionsOptions<TElement>) => {
  const clearDrawing = useCallback((): void => {
    clearDraftSnapshot?.();
    clearStrokes();
    onAfterClear?.();
  }, [clearDraftSnapshot, clearStrokes, onAfterClear]);

  const undoDrawing = useCallback((): void => {
    undoLastStroke();
    onAfterUndo?.();
  }, [onAfterUndo, undoLastStroke]);

  const redoDrawing = useCallback((): void => {
    redoLastStroke();
    onAfterRedo?.();
  }, [onAfterRedo, redoLastStroke]);

  const exportDrawing = useKangurDrawingDownloadAction({
    canExport,
    downloadDataUrl,
    exportDataUrl,
    filename: exportFilename,
  });

  const handleCanvasKeyDown = useKangurDrawingHistoryKeyDown<TElement>({
    canRedo,
    canUndo,
    onRedo: redoDrawing,
    onUndo: undoDrawing,
    onUnhandledKeyDown,
  });

  return {
    clearDrawing,
    exportDrawing,
    handleCanvasKeyDown,
    redoDrawing,
    undoDrawing,
  };
};
