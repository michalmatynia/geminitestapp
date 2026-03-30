import { fireEvent, render, screen } from '@testing-library/react';
import { createElement, Fragment, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  handleKangurDrawingHistoryShortcut,
  KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS,
  useKangurDrawingHistoryKeyDown,
} from '@/features/kangur/ui/components/drawing-engine/keyboard-shortcuts';

function DrawingHistoryKeyHarness() {
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [unhandledCount, setUnhandledCount] = useState(0);
  const onKeyDown = useKangurDrawingHistoryKeyDown<HTMLCanvasElement>({
    canRedo: true,
    canUndo: true,
    onRedo: () => {
      setRedoCount((count) => count + 1);
    },
    onUndo: () => {
      setUndoCount((count) => count + 1);
    },
    onUnhandledKeyDown: () => {
      setUnhandledCount((count) => count + 1);
    },
  });

  return createElement(
    Fragment,
    null,
    createElement('canvas', {
      'aria-label': 'drawing history canvas',
      onKeyDown,
      tabIndex: 0,
    }),
    createElement('div', { 'data-testid': 'undo-count' }, String(undoCount)),
    createElement('div', { 'data-testid': 'redo-count' }, String(redoCount)),
    createElement('div', { 'data-testid': 'unhandled-count' }, String(unhandledCount))
  );
}

describe('drawing-engine keyboard shortcuts', () => {
  it('handles shared undo and redo history shortcuts', () => {
    const preventDefault = vi.fn();
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onBeforeAction = vi.fn();

    expect(
      handleKangurDrawingHistoryShortcut({
        canRedo: false,
        canUndo: true,
        event: {
          altKey: false,
          ctrlKey: true,
          key: 'z',
          metaKey: false,
          preventDefault,
          shiftKey: false,
        },
        onBeforeAction,
        onRedo,
        onUndo,
      })
    ).toBe(true);

    expect(preventDefault).toHaveBeenCalledTimes(1);
    expect(onBeforeAction).toHaveBeenCalledTimes(1);
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).not.toHaveBeenCalled();

    expect(
      handleKangurDrawingHistoryShortcut({
        canRedo: true,
        canUndo: true,
        event: {
          altKey: false,
          ctrlKey: false,
          key: 'Z',
          metaKey: true,
          preventDefault,
          shiftKey: true,
        },
        onBeforeAction,
        onRedo,
        onUndo,
      })
    ).toBe(true);

    expect(onRedo).toHaveBeenCalledTimes(1);
  });

  it('ignores unrelated key presses and exposes the shared aria shortcuts list', () => {
    expect(
      handleKangurDrawingHistoryShortcut({
        canRedo: true,
        canUndo: true,
        event: {
          altKey: false,
          ctrlKey: false,
          key: 'Enter',
          metaKey: false,
          preventDefault: vi.fn(),
          shiftKey: false,
        },
        onRedo: vi.fn(),
        onUndo: vi.fn(),
      })
    ).toBe(false);

    expect(KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS).toContain('Control+Z');
    expect(KANGUR_DRAWING_HISTORY_ARIA_SHORTCUTS).toContain('Meta+Y');
  });

  it('provides a shared keydown handler hook for drawing surfaces', () => {
    render(createElement(DrawingHistoryKeyHarness));

    const canvas = screen.getByLabelText('drawing history canvas');

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'z' });
    expect(screen.getByTestId('undo-count')).toHaveTextContent('1');
    expect(screen.getByTestId('redo-count')).toHaveTextContent('0');
    expect(screen.getByTestId('unhandled-count')).toHaveTextContent('0');

    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(screen.getByTestId('unhandled-count')).toHaveTextContent('1');
  });
});
