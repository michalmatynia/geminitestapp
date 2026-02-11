'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { VectorDrawingProvider, type VectorDrawingContextValue } from '../context/VectorDrawingContext';
import { smoothShape, simplifyShape } from '../geometry';
import { useShapeHistory } from '../useShapeHistory';
import { vectorShapesToPath } from '../utils';
import { VectorDrawingCanvas } from './VectorDrawingCanvas';
import { VectorDrawingToolbar, type VectorDrawingToolbarVariant } from './VectorDrawingToolbar';

import type { VectorShape, VectorToolMode } from '../types';

export type VectorDrawingOutput = {
  shapes: VectorShape[];
  path: string;
  points: Array<{ shapeId: string; points: VectorShape['points'] }>;
};

export type VectorDrawingProps = {
  value?: VectorShape[];
  defaultValue?: VectorShape[];
  onChange?: (next: VectorShape[]) => void;
  onOutput?: (output: VectorDrawingOutput) => void;
  tool?: VectorToolMode;
  defaultTool?: VectorToolMode;
  onToolChange?: (tool: VectorToolMode) => void;
  toolbarVariant?: VectorDrawingToolbarVariant;
  toolbarClassName?: string;
  className?: string;
  canvasClassName?: string;
  allowWithoutImage?: boolean;
  showEmptyState?: boolean;
  emptyStateLabel?: string;
  imageSrc?: string | null;
  brushRadius?: number;
  activeShapeId?: string | null;
  selectedPointIndex?: number | null;
  onSelectShape?: (id: string | null) => void;
  onSelectPoint?: (index: number | null) => void;
};

const buildOutput = (shapes: VectorShape[]): VectorDrawingOutput => ({
  shapes,
  path: vectorShapesToPath(shapes),
  points: shapes.map((shape: VectorShape) => ({ shapeId: shape.id, points: shape.points })),
});

export function VectorDrawing({
  value,
  defaultValue,
  onChange,
  onOutput,
  tool,
  defaultTool = 'select',
  onToolChange,
  toolbarVariant = 'full',
  toolbarClassName,
  className,
  canvasClassName,
  allowWithoutImage,
  showEmptyState,
  emptyStateLabel,
  imageSrc,
  brushRadius,
  activeShapeId,
  selectedPointIndex,
  onSelectShape,
  onSelectPoint,
}: VectorDrawingProps): React.JSX.Element {
  const [internalShapes, setInternalShapes] = useState<VectorShape[]>(defaultValue ?? []);
  const [internalTool, setInternalTool] = useState<VectorToolMode>(defaultTool);

  const shapes = value ?? internalShapes;
  const currentTool = tool ?? internalTool;

  // --------------- Undo / Redo ---------------
  const history = useShapeHistory(50);
  const isHistoryAction = useRef(false);

  // Seed the history with the initial shapes (once).
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      history.reset(shapes);
    }
  }, []);  

  const handleChange = useCallback(
    (nextShapes: VectorShape[]) => {
      if (!value) setInternalShapes(nextShapes);
      onChange?.(nextShapes);
      onOutput?.(buildOutput(nextShapes));

      // Push to history unless this change originated from undo/redo itself.
      if (!isHistoryAction.current) {
        history.pushSnapshot(nextShapes);
      }
    },
    [onChange, onOutput, value, history]
  );

  const handleUndo = useCallback((): void => {
    const prev = history.undo();
    if (prev) {
      isHistoryAction.current = true;
      handleChange(prev);
      isHistoryAction.current = false;
    }
  }, [history, handleChange]);

  const handleRedo = useCallback((): void => {
    const next = history.redo();
    if (next) {
      isHistoryAction.current = true;
      handleChange(next);
      isHistoryAction.current = false;
    }
  }, [history, handleChange]);

  const handleToolChange = useCallback(
    (nextTool: VectorToolMode) => {
      if (!tool) setInternalTool(nextTool);
      onToolChange?.(nextTool);
    },
    [onToolChange, tool]
  );

  const output = useMemo(() => buildOutput(shapes), [shapes]);

  const handleSmooth = useCallback((): void => {
    handleChange(shapes.map((shape: VectorShape) => smoothShape(shape, 1)));
  }, [handleChange, shapes]);

  const handleSimplify = useCallback((): void => {
    handleChange(shapes.map((shape: VectorShape) => simplifyShape(shape, 0.0025)));
  }, [handleChange, shapes]);

  const [internalActiveShapeId, setInternalActiveShapeId] = useState<string | null>(null);
  const [internalSelectedPointIndex, setInternalSelectedPointIndex] = useState<number | null>(null);

  const resolvedActiveShapeId = activeShapeId ?? internalActiveShapeId;
  const resolvedSelectedPointIndex = selectedPointIndex ?? internalSelectedPointIndex;

  const handleSelectShape = useCallback((id: string | null) => {
    setInternalActiveShapeId(id);
    onSelectShape?.(id);
  }, [onSelectShape]);

  const handleSelectPoint = useCallback((index: number | null) => {
    setInternalSelectedPointIndex(index);
    onSelectPoint?.(index);
  }, [onSelectPoint]);

  // --------------- Keyboard Shortcuts ---------------
  const handleUndoRef = useRef(handleUndo);
  handleUndoRef.current = handleUndo;
  const handleRedoRef = useRef(handleRedo);
  handleRedoRef.current = handleRedo;
  const handleToolChangeRef = useRef(handleToolChange);
  handleToolChangeRef.current = handleToolChange;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      // Skip if user is typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      // Undo: Ctrl+Z / Cmd+Z
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleUndoRef.current();
        return;
      }
      // Redo: Ctrl+Shift+Z / Cmd+Shift+Z or Ctrl+Y / Cmd+Y
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') {
        e.preventDefault();
        handleRedoRef.current();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedoRef.current();
        return;
      }

      // Tool shortcuts (only when no modifier keys)
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const toolMap: Record<string, VectorToolMode> = {
        v: 'select', '1': 'select',
        p: 'polygon', '2': 'polygon',
        l: 'lasso', '3': 'lasso',
        r: 'rect', '4': 'rect',
        e: 'ellipse', '5': 'ellipse',
        b: 'brush', '6': 'brush',
      };
      const mappedTool = toolMap[e.key.toLowerCase()];
      if (mappedTool) {
        e.preventDefault();
        handleToolChangeRef.current(mappedTool);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return (): void => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const contextValue = useMemo<VectorDrawingContextValue>(() => ({
    shapes,
    tool: currentTool,
    activeShapeId: resolvedActiveShapeId,
    selectedPointIndex: resolvedSelectedPointIndex,
    brushRadius: brushRadius ?? 6,
    imageSrc: imageSrc ?? null,
    allowWithoutImage: allowWithoutImage ?? false,
    showEmptyState: showEmptyState ?? true,
    emptyStateLabel: emptyStateLabel ?? 'Select an image slot to preview.',
    setShapes: handleChange,
    setTool: handleToolChange,
    setActiveShapeId: handleSelectShape,
    setSelectedPointIndex: handleSelectPoint,
    onSmooth: handleSmooth,
    onSimplify: handleSimplify,
    onUndo: handleUndo,
    onRedo: handleRedo,
    disableUndo: !history.canUndo(),
    disableRedo: !history.canRedo(),
  }), [
    shapes,
    currentTool,
    resolvedActiveShapeId,
    resolvedSelectedPointIndex,
    brushRadius,
    imageSrc,
    allowWithoutImage,
    showEmptyState,
    emptyStateLabel,
    handleChange,
    handleToolChange,
    handleSelectShape,
    handleSelectPoint,
    handleSmooth,
    handleSimplify,
    handleUndo,
    handleRedo,
    history,
  ]);

  return (
    <VectorDrawingProvider value={contextValue}>
      <div className={className}>
        <VectorDrawingCanvas
          {...(canvasClassName ? { className: canvasClassName } : {})}
        />
        <VectorDrawingToolbar
          {...(toolbarClassName ? { className: toolbarClassName } : {})}
          variant={toolbarVariant}
        />
        {onOutput ? null : <span className='sr-only'>{output.path}</span>}
      </div>
    </VectorDrawingProvider>
  );
}