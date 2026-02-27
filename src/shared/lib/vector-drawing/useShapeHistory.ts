'use client';

import { useCallback, useRef } from 'react';

import type { VectorShape } from '@/shared/contracts/vector';

export interface ShapeHistoryControls {
  /** Push a snapshot into the history stack. Call on meaningful changes (not intermediate drags). */
  pushSnapshot: (shapes: VectorShape[]) => void;
  /** Undo the last change, returns the previous shapes or null if nothing to undo. */
  undo: () => VectorShape[] | null;
  /** Redo the last undone change, returns the restored shapes or null if nothing to redo. */
  redo: () => VectorShape[] | null;
  /** Whether undo is available. */
  canUndo: () => boolean;
  /** Whether redo is available. */
  canRedo: () => boolean;
  /** Reset history to a single snapshot. */
  reset: (shapes: VectorShape[]) => void;
}

/**
 * Manages an undo/redo history stack for VectorShape arrays.
 *
 * Uses a fixed-depth circular buffer to avoid unbounded memory growth.
 * All state is kept in refs so the hook itself never causes re-renders —
 * the caller is responsible for applying the returned shapes via setState.
 *
 * @param maxDepth Maximum number of snapshots to keep (default 50).
 */
export function useShapeHistory(maxDepth: number = 50): ShapeHistoryControls {
  // Circular buffer stored as a plain array; we overwrite oldest entries once full.
  const bufferRef = useRef<VectorShape[][]>([]);
  // Points to the current position in the buffer.
  const indexRef = useRef<number>(-1);
  // Total number of valid entries (may be < buffer.length during redo-truncation).
  const countRef = useRef<number>(0);

  const pushSnapshot = useCallback(
    (shapes: VectorShape[]): void => {
      const buffer = bufferRef.current;
      const currentIndex = indexRef.current;

      // Deep-clone shapes so mutations to the original array don't corrupt history.
      const snapshot = shapes.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));

      if (currentIndex >= 0 && currentIndex < countRef.current - 1) {
        // We are in the middle of the stack (user undid then made a new edit).
        // Truncate everything after current position.
        const newCount = currentIndex + 1;
        buffer.length = newCount;
        countRef.current = newCount;
      }

      if (buffer.length >= maxDepth) {
        // Drop the oldest entry to stay within budget.
        buffer.shift();
        // Index stays at the end.
      }

      buffer.push(snapshot);
      indexRef.current = buffer.length - 1;
      countRef.current = buffer.length;
    },
    [maxDepth]
  );

  const canUndo = useCallback((): boolean => {
    return indexRef.current > 0;
  }, []);

  const canRedo = useCallback((): boolean => {
    return indexRef.current < countRef.current - 1;
  }, []);

  const undo = useCallback((): VectorShape[] | null => {
    if (!canUndo()) return null;
    indexRef.current -= 1;
    return bufferRef.current[indexRef.current]!;
  }, [canUndo]);

  const redo = useCallback((): VectorShape[] | null => {
    if (!canRedo()) return null;
    indexRef.current += 1;
    return bufferRef.current[indexRef.current]!;
  }, [canRedo]);

  const reset = useCallback(
    (shapes: VectorShape[]): void => {
      const snapshot = shapes.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }));
      bufferRef.current = [snapshot];
      indexRef.current = 0;
      countRef.current = 1;
    },
    []
  );

  return { pushSnapshot, undo, redo, canUndo, canRedo, reset };
}
