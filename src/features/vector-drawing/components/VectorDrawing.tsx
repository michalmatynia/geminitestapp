"use client";

import React, { useCallback, useMemo, useState } from "react";
import { VectorDrawingCanvas } from "./VectorDrawingCanvas";
import { VectorDrawingToolbar, type VectorDrawingToolbarVariant } from "./VectorDrawingToolbar";
import { smoothShape, simplifyShape } from "../geometry";
import { vectorShapesToPath } from "../utils";
import type { VectorShape, VectorToolMode } from "../types";

export type VectorDrawingOutput = {
  shapes: VectorShape[];
  path: string;
  points: Array<{ shapeId: string; points: VectorShape["points"] }>;
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
  defaultTool = "select",
  onToolChange,
  toolbarVariant = "full",
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

  const handleChange = useCallback(
    (nextShapes: VectorShape[]) => {
      if (!value) setInternalShapes(nextShapes);
      onChange?.(nextShapes);
      onOutput?.(buildOutput(nextShapes));
    },
    [onChange, onOutput, value]
  );

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

  const resolvedBrushRadius = brushRadius ?? 6;
  const resolvedImageSrc = imageSrc ?? null;
  const resolvedActiveShapeId = activeShapeId ?? null;
  const resolvedSelectedPointIndex = selectedPointIndex ?? null;
  const handleSelectShape = onSelectShape ?? ((): void => {});

  return (
    <div className={className}>
      <VectorDrawingCanvas
        {...(allowWithoutImage !== undefined ? { allowWithoutImage } : {})}
        {...(showEmptyState !== undefined ? { showEmptyState } : {})}
        {...(emptyStateLabel !== undefined ? { emptyStateLabel } : {})}
        src={resolvedImageSrc}
        tool={currentTool}
        shapes={shapes}
        onChange={handleChange}
        brushRadius={resolvedBrushRadius}
        activeShapeId={resolvedActiveShapeId}
        selectedPointIndex={resolvedSelectedPointIndex}
        onSelectShape={handleSelectShape}
        {...(onSelectPoint ? { onSelectPoint } : {})}
        {...(canvasClassName ? { className: canvasClassName } : {})}
      />
      <VectorDrawingToolbar
        {...(toolbarClassName ? { className: toolbarClassName } : {})}
        tool={currentTool}
        onSelectTool={handleToolChange}
        onSmooth={handleSmooth}
        onSimplify={handleSimplify}
        variant={toolbarVariant}
      />
      {onOutput ? null : <span className="sr-only">{output.path}</span>}
    </div>
  );
}
