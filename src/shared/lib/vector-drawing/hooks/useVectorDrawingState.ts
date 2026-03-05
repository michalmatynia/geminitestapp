'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useShapeHistory } from '../useShapeHistory';
import { smoothShape, simplifyShape } from '../geometry';
import { vectorShapesToPath } from '@/shared/ui';
import type { VectorShape, VectorToolMode } from '@/shared/contracts/vector';

export type VectorDrawingOutput = {
  shapes: VectorShape[];
  path: string;
  points: Array<{ shapeId: string; points: VectorShape['points'] }>;
};

const buildOutput = (shapes: VectorShape[]): VectorDrawingOutput => ({
  shapes,
  path: vectorShapesToPath(shapes),
  points: shapes.map((shape: VectorShape) => ({ shapeId: shape.id, points: shape.points })),
});

export type UseVectorDrawingStateProps = {
  value?: VectorShape[];
  defaultValue?: VectorShape[];
  onChange?: (next: VectorShape[]) => void;
  onOutput?: (output: VectorDrawingOutput) => void;
  tool?: VectorToolMode;
  defaultTool?: VectorToolMode;
  onToolChange?: (tool: VectorToolMode) => void;
  onSelectShape?: (id: string | null) => void;
  onSelectPoint?: (index: number | null) => void;
  activeShapeId?: string | null;
  selectedPointIndex?: number | null;
};

export function useVectorDrawingState({
  value,
  defaultValue,
  onChange,
  onOutput,
  tool,
  defaultTool = 'select',
  onToolChange,
  onSelectShape,
  onSelectPoint,
  activeShapeId,
  selectedPointIndex,
}: UseVectorDrawingStateProps) {
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

  const handleSelectShape = useCallback(
    (id: string | null) => {
      setInternalActiveShapeId(id);
      onSelectShape?.(id);
    },
    [onSelectShape]
  );

  const handleSelectPoint = useCallback(
    (index: number | null) => {
      setInternalSelectedPointIndex(index);
      onSelectPoint?.(index);
    },
    [onSelectPoint]
  );

  return {
    shapes,
    currentTool,
    resolvedActiveShapeId,
    resolvedSelectedPointIndex,
    handleChange,
    handleToolChange,
    handleSelectShape,
    handleSelectPoint,
    handleSmooth,
    handleSimplify,
    handleUndo,
    handleRedo,
    output,
    canUndo: history.canUndo(),
    canRedo: history.canRedo(),
  };
}
