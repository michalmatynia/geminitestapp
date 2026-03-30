'use client';

import { useCallback } from 'react';

import type { KeyboardEvent as ReactKeyboardEvent } from 'react';

type KangurDrawingHistoryShortcutEvent = {
  altKey: boolean;
  ctrlKey: boolean;
  key: string;
  metaKey: boolean;
  preventDefault: () => void;
  shiftKey: boolean;
};

type HandleKangurDrawingHistoryShortcutOptions = {
  canRedo: boolean;
  canUndo: boolean;
  event: KangurDrawingHistoryShortcutEvent;
  onBeforeAction?: () => void;
  onRedo: () => void;
  onUndo: () => void;
};

export const KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS =
  'Control+Z Meta+Z Control+Shift+Z Meta+Shift+Z Control+Y Meta+Y';

const isUndoShortcut = (event: KangurDrawingHistoryShortcutEvent): boolean => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return false;
  }

  return event.key.toLowerCase() === 'z' && !event.shiftKey;
};

const isRedoShortcut = (event: KangurDrawingHistoryShortcutEvent): boolean => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) {
    return false;
  }

  const normalizedKey = event.key.toLowerCase();
  return (normalizedKey === 'z' && event.shiftKey) || (normalizedKey === 'y' && !event.shiftKey);
};

export const handleKangurDrawingHistoryShortcut = ({
  canRedo,
  canUndo,
  event,
  onBeforeAction,
  onRedo,
  onUndo,
}: HandleKangurDrawingHistoryShortcutOptions): boolean => {
  if (isUndoShortcut(event)) {
    event.preventDefault();
    onBeforeAction?.();
    if (canUndo) {
      onUndo();
    }
    return true;
  }

  if (isRedoShortcut(event)) {
    event.preventDefault();
    onBeforeAction?.();
    if (canRedo) {
      onRedo();
    }
    return true;
  }

  return false;
};

type UseKangurDrawingHistoryKeyDownOptions<
  TElement extends HTMLElement | SVGElement = HTMLCanvasElement,
> = {
  canRedo: boolean;
  canUndo: boolean;
  onBeforeAction?: () => void;
  onRedo: () => void;
  onUndo: () => void;
  onUnhandledKeyDown?: (event: ReactKeyboardEvent<TElement>) => void;
};

export const useKangurDrawingHistoryKeyDown = <
  TElement extends HTMLElement | SVGElement = HTMLCanvasElement,
>({
  canRedo,
  canUndo,
  onBeforeAction,
  onRedo,
  onUndo,
  onUnhandledKeyDown,
}: UseKangurDrawingHistoryKeyDownOptions<TElement>) =>
  useCallback(
    (event: ReactKeyboardEvent<TElement>): void => {
      if (
        handleKangurDrawingHistoryShortcut({
          canRedo,
          canUndo,
          event,
          onBeforeAction,
          onRedo,
          onUndo,
        })
      ) {
        return;
      }

      onUnhandledKeyDown?.(event);
    },
    [canRedo, canUndo, onBeforeAction, onRedo, onUndo, onUnhandledKeyDown]
  );
