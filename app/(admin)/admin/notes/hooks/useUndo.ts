import { useState, useCallback, useRef } from "react";

interface UseUndoResult<T> {
  state: T;
  setState: (newState: T, skipHistory?: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetHistory: (initialState: T) => void;
}

export function useUndo<T>(initialState: T, limit: number = 50): UseUndoResult<T> {
  const [state, setInnerState] = useState<T>(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  // We use a ref to track if we should merge rapid updates (optional, usually good for typing)
  // For now, straightforward implementation.

  const setState = useCallback(
    (newState: T, skipHistory = false) => {
      setInnerState(newState);

      if (skipHistory) return;

      setHistory((prev) => {
        const currentHistory = prev.slice(0, index + 1);
        const nextHistory = [...currentHistory, newState];
        if (nextHistory.length > limit) {
          nextHistory.shift();
          setIndex((i) => i); // Index stays same relative to end, but since we shifted... wait.
          // If we shift, index should arguably decrease? No, we are appending.
          // If length 51, limit 50. Remove 0. Index was 49 (end). New item at 50.
          // Slice 1..51. New index 49.
          return nextHistory;
        }
        return nextHistory;
      });
      setIndex((prev) => {
        const next = prev + 1;
        return next >= limit ? limit - 1 : next;
      });
    },
    [index, limit]
  );

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex((prev) => prev - 1);
      setInnerState(history[index - 1]);
    }
  }, [history, index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex((prev) => prev + 1);
      setInnerState(history[index + 1]);
    }
  }, [history, index]);

  const resetHistory = useCallback((newState: T) => {
    setInnerState(newState);
    setHistory([newState]);
    setIndex(0);
  }, []);

  return {
    state,
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
    resetHistory,
  };
}
