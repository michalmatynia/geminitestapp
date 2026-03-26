'use client';

import { useCallback, useState } from 'react';

import type { Point2d } from '@/shared/contracts/geometry';

import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  SetStateAction,
} from 'react';

type UseKangurKeyboardPointDrawingOptions = {
  clearedStatus: string;
  disabled?: boolean;
  finishedStatus: string;
  height: number;
  initialCursor: Point2d;
  onBeforeKeyboardAction?: () => void;
  onEscape?: () => void;
  padding?: number;
  readyStatus: string;
  setStrokes: Dispatch<SetStateAction<Point2d[][]>>;
  startedStatus: string;
  step: number;
  width: number;
};

type UseKangurKeyboardPointDrawingResult = {
  handleCanvasKeyDown: (event: ReactKeyboardEvent<HTMLCanvasElement>) => void;
  keyboardCursor: Point2d;
  keyboardDrawing: boolean;
  keyboardStatus: string;
  resetKeyboard: (status: string, nextCursor?: Point2d) => void;
};

const isKeyboardDrawingKey = (key: string): boolean =>
  key === 'ArrowUp' ||
  key === 'ArrowDown' ||
  key === 'ArrowLeft' ||
  key === 'ArrowRight' ||
  key === 'Enter' ||
  key === ' ' ||
  key === 'Escape';

export function useKangurKeyboardPointDrawing({
  clearedStatus,
  disabled = false,
  finishedStatus,
  height,
  initialCursor,
  onBeforeKeyboardAction,
  onEscape,
  padding = 12,
  readyStatus,
  setStrokes,
  startedStatus,
  step,
  width,
}: UseKangurKeyboardPointDrawingOptions): UseKangurKeyboardPointDrawingResult {
  const [keyboardCursor, setKeyboardCursor] = useState<Point2d>(initialCursor);
  const [keyboardDrawing, setKeyboardDrawing] = useState(false);
  const [keyboardStatus, setKeyboardStatus] = useState(readyStatus);

  const resetKeyboard = useCallback(
    (status: string, nextCursor = initialCursor): void => {
      setKeyboardCursor(nextCursor);
      setKeyboardDrawing(false);
      setKeyboardStatus(status);
    },
    [initialCursor]
  );

  const appendKeyboardPoint = useCallback(
    (point: Point2d): void => {
      setStrokes((current) => {
        if (current.length === 0) {
          return [[point]];
        }

        const next = [...current];
        const lastStroke = next[next.length - 1] ?? [];
        next[next.length - 1] = [...lastStroke, point];
        return next;
      });
    },
    [setStrokes]
  );

  const beginKeyboardStroke = useCallback((): void => {
    const point = { ...keyboardCursor };
    setStrokes((current) => [...current, [point]]);
    setKeyboardDrawing(true);
    setKeyboardStatus(startedStatus);
  }, [keyboardCursor, setStrokes, startedStatus]);

  const finishKeyboardStroke = useCallback((): void => {
    if (keyboardDrawing) {
      appendKeyboardPoint({ ...keyboardCursor });
    }
    setKeyboardDrawing(false);
    setKeyboardStatus(finishedStatus);
  }, [appendKeyboardPoint, finishedStatus, keyboardCursor, keyboardDrawing]);

  const handleCanvasKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLCanvasElement>): void => {
      if (disabled || !isKeyboardDrawingKey(event.key)) {
        return;
      }

      event.preventDefault();
      onBeforeKeyboardAction?.();

      if (event.key === 'Enter' || event.key === ' ') {
        if (keyboardDrawing) {
          finishKeyboardStroke();
        } else {
          beginKeyboardStroke();
        }
        return;
      }

      if (event.key === 'Escape') {
        onEscape?.();
        resetKeyboard(clearedStatus);
        return;
      }

      const delta =
        event.key === 'ArrowUp'
          ? { x: 0, y: -step }
          : event.key === 'ArrowDown'
            ? { x: 0, y: step }
            : event.key === 'ArrowLeft'
              ? { x: -step, y: 0 }
              : { x: step, y: 0 };

      const nextPoint = {
        x: Math.max(padding, Math.min(width - padding, keyboardCursor.x + delta.x)),
        y: Math.max(padding, Math.min(height - padding, keyboardCursor.y + delta.y)),
      };

      setKeyboardCursor(nextPoint);
      if (keyboardDrawing) {
        appendKeyboardPoint(nextPoint);
      }
    },
    [
      appendKeyboardPoint,
      beginKeyboardStroke,
      clearedStatus,
      disabled,
      finishKeyboardStroke,
      height,
      keyboardCursor.x,
      keyboardCursor.y,
      keyboardDrawing,
      onBeforeKeyboardAction,
      onEscape,
      padding,
      resetKeyboard,
      step,
      width,
    ]
  );

  return {
    handleCanvasKeyDown,
    keyboardCursor,
    keyboardDrawing,
    keyboardStatus,
    resetKeyboard,
  };
}
