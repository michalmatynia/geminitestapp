/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { VectorShape } from '@/shared/contracts/vector';

const { smoothShapeMock, simplifyShapeMock, vectorShapesToPathMock } = vi.hoisted(() => ({
  smoothShapeMock: vi.fn((shape: VectorShape) => ({ ...shape, id: `smooth-${shape.id}` })),
  simplifyShapeMock: vi.fn((shape: VectorShape) => ({ ...shape, id: `simplify-${shape.id}` })),
  vectorShapesToPathMock: vi.fn((shapes: VectorShape[]) => `path:${shapes.map((shape) => shape.id).join(',')}`),
}));

vi.mock('@/shared/ui', () => ({
  vectorShapesToPath: (shapes: VectorShape[]) => vectorShapesToPathMock(shapes),
}));

vi.mock('../geometry', () => ({
  smoothShape: (shape: VectorShape, strength: number) => smoothShapeMock(shape, strength),
  simplifyShape: (shape: VectorShape, tolerance: number) => simplifyShapeMock(shape, tolerance),
}));

import { useVectorDrawingState } from './useVectorDrawingState';

const createShape = (id: string, x: number): VectorShape => ({
  id,
  type: 'polygon',
  role: 'custom',
  points: [
    { x, y: 0 },
    { x: x + 1, y: 1 },
    { x: x + 2, y: 0 },
  ],
  style: {},
});

describe('useVectorDrawingState', () => {
  it('manages uncontrolled shape, tool, selection, and undo/redo state', () => {
    const onChange = vi.fn();
    const onOutput = vi.fn();
    const initialShapes = [createShape('shape-1', 0)];
    const nextShapes = [createShape('shape-2', 10)];

    const { result } = renderHook(() =>
      useVectorDrawingState({
        defaultValue: initialShapes,
        defaultTool: 'select',
        onChange,
        onOutput,
      })
    );

    expect(result.current.shapes).toEqual(initialShapes);
    expect(result.current.currentTool).toBe('select');
    expect(result.current.canUndo).toBe(false);
    expect(result.current.output.path).toBe('path:shape-1');

    act(() => {
      result.current.handleToolChange('brush');
      result.current.handleSelectShape('shape-1');
      result.current.handleSelectPoint(2);
    });

    expect(result.current.currentTool).toBe('brush');
    expect(result.current.resolvedActiveShapeId).toBe('shape-1');
    expect(result.current.resolvedSelectedPointIndex).toBe(2);

    act(() => {
      result.current.handleChange(nextShapes);
    });

    expect(result.current.shapes).toEqual(nextShapes);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.output.path).toBe('path:shape-2');
    expect(onChange).toHaveBeenLastCalledWith(nextShapes);
    expect(onOutput).toHaveBeenLastCalledWith({
      shapes: nextShapes,
      path: 'path:shape-2',
      points: [{ shapeId: 'shape-2', points: nextShapes[0]!.points }],
    });

    act(() => {
      result.current.handleUndo();
    });

    expect(result.current.shapes).toEqual(initialShapes);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.handleRedo();
    });

    expect(result.current.shapes).toEqual(nextShapes);
  });

  it('respects controlled shapes, tool, and selection props', () => {
    const onChange = vi.fn();
    const onToolChange = vi.fn();
    const onSelectShape = vi.fn();
    const onSelectPoint = vi.fn();
    const controlledShapes = [createShape('controlled-shape', 0)];

    const { result } = renderHook(() =>
      useVectorDrawingState({
        value: controlledShapes,
        tool: 'polygon',
        activeShapeId: 'controlled-shape',
        selectedPointIndex: 7,
        onChange,
        onToolChange,
        onSelectShape,
        onSelectPoint,
      })
    );

    act(() => {
      result.current.handleChange([createShape('next-shape', 10)]);
      result.current.handleToolChange('brush');
      result.current.handleSelectShape('local-shape');
      result.current.handleSelectPoint(1);
    });

    expect(onChange).toHaveBeenCalledWith([createShape('next-shape', 10)]);
    expect(result.current.shapes).toEqual(controlledShapes);
    expect(onToolChange).toHaveBeenCalledWith('brush');
    expect(result.current.currentTool).toBe('polygon');
    expect(onSelectShape).toHaveBeenCalledWith('local-shape');
    expect(onSelectPoint).toHaveBeenCalledWith(1);
    expect(result.current.resolvedActiveShapeId).toBe('controlled-shape');
    expect(result.current.resolvedSelectedPointIndex).toBe(7);
  });

  it('applies smoothing and simplification helpers through handleChange', () => {
    const onChange = vi.fn();
    const initialShapes = [createShape('shape-1', 0)];

    const { result } = renderHook(() =>
      useVectorDrawingState({
        defaultValue: initialShapes,
        onChange,
      })
    );

    act(() => {
      result.current.handleSmooth();
    });

    expect(smoothShapeMock).toHaveBeenCalledWith(initialShapes[0], 1);
    expect(result.current.shapes[0]?.id).toBe('smooth-shape-1');
    expect(onChange).toHaveBeenLastCalledWith([{ ...initialShapes[0], id: 'smooth-shape-1' }]);

    act(() => {
      result.current.handleSimplify();
    });

    expect(simplifyShapeMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'smooth-shape-1' }),
      0.0025
    );
    expect(result.current.shapes[0]?.id).toBe('simplify-smooth-shape-1');
  });
});
