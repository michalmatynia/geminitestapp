/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKangurFeedbackManagedDrawingActions } from './useKangurFeedbackManagedDrawingActions';

describe('useKangurFeedbackManagedDrawingActions', () => {
  it('clears feedback on clear, undo, and redo', () => {
    const clearFeedback = vi.fn();
    const clearStrokes = vi.fn();
    const redoLastStroke = vi.fn();
    const undoLastStroke = vi.fn();

    const { result } = renderHook(() =>
      useKangurFeedbackManagedDrawingActions({
        canExport: false,
        canRedo: true,
        canUndo: true,
        clearFeedback,
        clearStrokes,
        exportDataUrl: () => null,
        exportFilename: 'drawing.png',
        redoLastStroke,
        undoLastStroke,
      })
    );

    result.current.clearDrawing();
    result.current.undoDrawing();
    result.current.redoDrawing();

    expect(clearFeedback).toHaveBeenCalledTimes(3);
    expect(clearStrokes).toHaveBeenCalledTimes(1);
    expect(undoLastStroke).toHaveBeenCalledTimes(1);
    expect(redoLastStroke).toHaveBeenCalledTimes(1);
  });

  it('runs extra callbacks after the feedback reset', () => {
    const order: string[] = [];

    const { result } = renderHook(() =>
      useKangurFeedbackManagedDrawingActions({
        canExport: false,
        canRedo: true,
        canUndo: true,
        clearFeedback: () => {
          order.push('feedback');
        },
        clearStrokes: vi.fn(),
        exportDataUrl: () => null,
        exportFilename: 'drawing.png',
        onAfterClearExtra: () => {
          order.push('clear');
        },
        onAfterRedoExtra: () => {
          order.push('redo');
        },
        onAfterUndoExtra: () => {
          order.push('undo');
        },
        redoLastStroke: vi.fn(),
        undoLastStroke: vi.fn(),
      })
    );

    result.current.clearDrawing();
    result.current.undoDrawing();
    result.current.redoDrawing();

    expect(order).toEqual([
      'feedback',
      'clear',
      'feedback',
      'undo',
      'feedback',
      'redo',
    ]);
  });
});
