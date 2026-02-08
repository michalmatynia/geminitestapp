'use client';

import { X } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import {
  VectorDrawingCanvas,
  VectorDrawingToolbar,
  VectorDrawingProvider,
  vectorShapesToPath,
  smoothShape,
  simplifyShape,
  DEFAULT_VECTOR_VIEWBOX,
  type VectorShape,
  type VectorToolMode,
} from '@/features/vector-drawing';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import type { VectorOverlayRequest } from '../../hooks/usePageBuilderContext';

interface VectorOverlayProps {
  request: VectorOverlayRequest;
  onClose: () => void;
  className?: string;
}

export function VectorOverlay({ request, onClose, className }: VectorOverlayProps): React.JSX.Element {
  const [tool, setTool] = useState<VectorToolMode>('select');
  const [shapes, setShapes] = useState<VectorShape[]>(request.initialShapes ?? []);
  const [activeShapeId, setActiveShapeId] = useState<string | null>(request.initialShapes?.[0]?.id ?? null);
  const [selectedPointIndex, setSelectedPointIndex] = useState<number | null>(null);
  const [brushRadius] = useState<number>(8);

  const [lastRequest, setLastRequest] = useState(request);
  if (request !== lastRequest) {
    setLastRequest(request);
    setShapes(request.initialShapes ?? []);
    setActiveShapeId(request.initialShapes?.[0]?.id ?? null);
    setSelectedPointIndex(null);
    setTool('select');
  }

  const pathPreview = useMemo(() => vectorShapesToPath(shapes), [shapes]);
  const hasPath = pathPreview.length > 0;

  const handleCancel = useCallback((): void => {
    request.onCancel?.();
    onClose();
  }, [onClose, request]);

  const handleApply = useCallback((): void => {
    const path = vectorShapesToPath(shapes);
    request.onApply({
      shapes,
      path,
      points: shapes.map((shape: VectorShape) => ({ shapeId: shape.id, points: shape.points })),
    });
    onClose();
  }, [onClose, request, shapes]);

  const handleUndo = useCallback((): void => {
    if (!activeShapeId) return;
    setShapes((prev: VectorShape[]) =>
      prev.map((shape: VectorShape) =>
        shape.id === activeShapeId ? { ...shape, points: shape.points.slice(0, -1), closed: false } : shape
      )
    );
  }, [activeShapeId]);

  const handleCloseShape = useCallback((): void => {
    if (!activeShapeId) return;
    setShapes((prev: VectorShape[]) =>
      prev.map((shape: VectorShape) =>
        shape.id === activeShapeId ? { ...shape, closed: shape.points.length >= 3 } : shape
      )
    );
  }, [activeShapeId]);

  const handleDetach = useCallback((): void => {
    if (!activeShapeId) return;
    setShapes((prev: VectorShape[]) =>
      prev.map((shape: VectorShape) => {
        if (shape.id !== activeShapeId) return shape;
        if (!shape.closed) return shape;
        if (shape.points.length < 3) return { ...shape, closed: false };
        if (selectedPointIndex === null) return { ...shape, closed: false };
        const pts = shape.points;
        const rotated = [...pts.slice(selectedPointIndex), ...pts.slice(0, selectedPointIndex)];
        return { ...shape, points: rotated, closed: false };
      })
    );
  }, [activeShapeId, selectedPointIndex]);

  const handleClear = useCallback((): void => {
    setShapes([]);
    setActiveShapeId(null);
    setSelectedPointIndex(null);
  }, []);

  const handleSmooth = useCallback((): void => {
    setShapes((prev: VectorShape[]) =>
      prev.map((shape: VectorShape) => {
        if (activeShapeId && shape.id !== activeShapeId) return shape;
        return smoothShape(shape, 1);
      })
    );
  }, [activeShapeId]);

  const handleSimplify = useCallback((): void => {
    setShapes((prev: VectorShape[]) =>
      prev.map((shape: VectorShape) => {
        if (activeShapeId && shape.id !== activeShapeId) return shape;
        return simplifyShape(shape, 0.0025);
      })
    );
  }, [activeShapeId]);

  const contextValue = useMemo(() => ({
    shapes,
    tool,
    activeShapeId,
    selectedPointIndex,
    brushRadius,
    imageSrc: null,
    allowWithoutImage: true,
    showEmptyState: false,
    emptyStateLabel: '',
    setShapes,
    setTool,
    setActiveShapeId,
    setSelectedPointIndex,
    onSmooth: handleSmooth,
    onSimplify: handleSimplify,
    onUndo: handleUndo,
    onClear: handleClear,
    onCloseShape: handleCloseShape,
    onDetach: handleDetach,
    disableUndo: !activeShapeId,
    disableClose: !activeShapeId,
    disableDetach: !activeShapeId,
    disableClear: shapes.length === 0,
    disableSmooth: !activeShapeId,
    disableSimplify: !activeShapeId,
  }), [
    shapes,
    tool,
    activeShapeId,
    selectedPointIndex,
    brushRadius,
    handleSmooth,
    handleSimplify,
    handleUndo,
    handleClear,
    handleCloseShape,
    handleDetach,
  ]);

  return (
    <VectorDrawingProvider value={contextValue}>
      <div
        className={cn(
          'absolute inset-0 z-40 overflow-hidden rounded-xl border border-border/40 bg-black/40 backdrop-blur-sm',
          className
        )}
      >
        <VectorDrawingCanvas
          className='absolute inset-0 border-0 bg-transparent'
        />

        <div className='absolute left-4 top-4 z-10 flex max-w-[70%] flex-col gap-1 rounded-xl border border-border/60 bg-slate-950/80 px-3 py-2 text-xs text-gray-200 shadow-lg'>
          <div className='flex items-center gap-2'>
            <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-200'>
              {request.title}
            </div>
            <div className='rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200'>
              ViewBox {DEFAULT_VECTOR_VIEWBOX}
            </div>
          </div>
          {request.description ? (
            <div className='text-[11px] text-gray-400'>{request.description}</div>
          ) : null}
          <div className='text-[11px] text-gray-500'>
            Shift + click to add points, Delete to remove, drag points to refine.
          </div>
        </div>

        <div className='absolute right-4 top-4 z-10 flex items-center gap-2'>
          <Button type='button' size='sm' variant='outline' onClick={handleCancel}>
            Cancel
          </Button>
          <Button type='button' size='sm' onClick={handleApply} disabled={!hasPath}>
            Apply Path
          </Button>
          <Button type='button' size='icon' variant='ghost' onClick={handleCancel} aria-label='Close'>
            <X className='size-4' />
          </Button>
        </div>

        <div className='absolute right-4 bottom-4 z-10 max-w-[40%] rounded-xl border border-border/60 bg-slate-950/80 px-3 py-2 text-[10px] text-gray-300 shadow-lg'>
          <div className='text-[10px] uppercase tracking-[0.2em] text-gray-500'>Path Preview</div>
          <div className='mt-1 truncate' title={hasPath ? pathPreview : 'Draw a path to generate SVG data.'}>
            {hasPath ? pathPreview : 'Draw a path to generate SVG data.'}
          </div>
        </div>

        <VectorDrawingToolbar
          className='absolute bottom-4 left-1/2 z-10 -translate-x-1/2'
          variant='min'
        />
      </div>
    </VectorDrawingProvider>
  );
}
