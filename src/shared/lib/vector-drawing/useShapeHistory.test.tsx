/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { VectorShape } from '@/shared/contracts/vector';

import { useShapeHistory } from './useShapeHistory';

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

describe('useShapeHistory', () => {
  it('supports undo, redo, and redo truncation after a new edit', () => {
    const { result } = renderHook(() => useShapeHistory());

    act(() => {
      result.current.reset([createShape('base', 0)]);
      result.current.pushSnapshot([createShape('second', 10)]);
      result.current.pushSnapshot([createShape('third', 20)]);
    });

    expect(result.current.canUndo()).toBe(true);
    expect(result.current.canRedo()).toBe(false);

    let undoResult: VectorShape[] | null = null;
    act(() => {
      undoResult = result.current.undo();
    });
    expect(undoResult?.[0]?.id).toBe('second');
    expect(result.current.canRedo()).toBe(true);

    act(() => {
      result.current.pushSnapshot([createShape('replacement', 30)]);
    });

    expect(result.current.canRedo()).toBe(false);

    let redoResult: VectorShape[] | null = null;
    act(() => {
      redoResult = result.current.redo();
    });
    expect(redoResult).toBeNull();
  });

  it('deep clones snapshots before storing them', () => {
    const { result } = renderHook(() => useShapeHistory());
    const first = [createShape('first', 0)];

    act(() => {
      result.current.pushSnapshot(first);
    });

    first[0]!.points[0]!.x = 999;

    act(() => {
      result.current.pushSnapshot([createShape('second', 10)]);
    });

    let restored: VectorShape[] | null = null;
    act(() => {
      restored = result.current.undo();
    });

    expect(restored?.[0]?.points[0]?.x).toBe(0);
  });

  it('drops the oldest snapshot when the max depth is exceeded', () => {
    const { result } = renderHook(() => useShapeHistory(2));

    act(() => {
      result.current.pushSnapshot([createShape('first', 0)]);
      result.current.pushSnapshot([createShape('second', 10)]);
      result.current.pushSnapshot([createShape('third', 20)]);
    });

    let undoOnce: VectorShape[] | null = null;
    let undoTwice: VectorShape[] | null = null;

    act(() => {
      undoOnce = result.current.undo();
      undoTwice = result.current.undo();
    });

    expect(undoOnce?.[0]?.id).toBe('second');
    expect(undoTwice).toBeNull();
  });
});
