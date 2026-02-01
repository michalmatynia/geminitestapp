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

export function useUndo<T>(
  initialState: T,
  limit: number = 50,
): UseUndoResult<T> {
  const [state, setInnerState] = useState<T>(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);
  const limitRef = useRef(limit);

  // We use a ref to track if we should merge rapid updates (optional, usually good for typing)
  // For now, straightforward implementation.

  const setState = useCallback(
    (newState: T, skipHistory: boolean = false): void => {
      setInnerState(newState);

      if (skipHistory) return;

      setHistory((prev: T[]) => {
        const currentHistory = prev.slice(0, index + 1);
        const nextHistory = [...currentHistory, newState];
        if (nextHistory.length > limitRef.current) {
          nextHistory.shift();
          return nextHistory;
        }
        return nextHistory;
      });
      setIndex((prev: number) => {
        const next = prev + 1;
        return next >= limitRef.current ? limitRef.current - 1 : next;
      });
    },
    [index],
  );

  const undo = useCallback((): void => {
    if (index > 0) {
      setIndex((prev: number) => prev - 1);
      setInnerState(history[index - 1]!);
    }
  }, [history, index]);

  const redo = useCallback((): void => {
    if (index < history.length - 1) {
      setIndex((prev: number) => prev + 1);
      setInnerState(history[index + 1]!);
    }
  }, [history, index]);

  const resetHistory = useCallback((newState: T): void => {
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
