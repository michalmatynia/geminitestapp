/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKangurManagedDrawingActions } from './useKangurManagedDrawingActions';

describe('useKangurManagedDrawingActions', () => {
  it('clears drafts and strokes through one shared action callback', () => {
    const clearDraftSnapshot = vi.fn();
    const clearStrokes = vi.fn();
    const onAfterClear = vi.fn();

    const { result } = renderHook(() =>
      useKangurManagedDrawingActions({
        canExport: false,
        canRedo: false,
        canUndo: false,
        clearDraftSnapshot,
        clearStrokes,
        exportDataUrl: () => null,
        exportFilename: 'drawing.png',
        onAfterClear,
        redoLastStroke: vi.fn(),
        undoLastStroke: vi.fn(),
      })
    );

    result.current.clearDrawing();

    expect(clearDraftSnapshot).toHaveBeenCalledTimes(1);
    expect(clearStrokes).toHaveBeenCalledTimes(1);
    expect(onAfterClear).toHaveBeenCalledTimes(1);
  });

  it('uses shared undo/redo callbacks for click and keyboard paths', () => {
    const onAfterUndo = vi.fn();
    const onAfterRedo = vi.fn();
    const redoLastStroke = vi.fn();
    const undoLastStroke = vi.fn();

    const { result } = renderHook(() =>
      useKangurManagedDrawingActions<HTMLCanvasElement>({
        canExport: false,
        canRedo: true,
        canUndo: true,
        clearStrokes: vi.fn(),
        exportDataUrl: () => null,
        exportFilename: 'drawing.png',
        onAfterRedo,
        onAfterUndo,
        redoLastStroke,
        undoLastStroke,
      })
    );

    result.current.undoDrawing();
    result.current.redoDrawing();

    expect(undoLastStroke).toHaveBeenCalledTimes(1);
    expect(onAfterUndo).toHaveBeenCalledTimes(1);
    expect(redoLastStroke).toHaveBeenCalledTimes(1);
    expect(onAfterRedo).toHaveBeenCalledTimes(1);

    const preventDefault = vi.fn();
    result.current.handleCanvasKeyDown({
      altKey: false,
      ctrlKey: true,
      key: 'z',
      metaKey: false,
      preventDefault,
      shiftKey: false,
    } as never);
    result.current.handleCanvasKeyDown({
      altKey: false,
      ctrlKey: true,
      key: 'Z',
      metaKey: false,
      preventDefault,
      shiftKey: true,
    } as never);

    expect(preventDefault).toHaveBeenCalledTimes(2);
    expect(undoLastStroke).toHaveBeenCalledTimes(2);
    expect(redoLastStroke).toHaveBeenCalledTimes(2);
  });

  it('routes export and unhandled keyboard input through the shared hook contract', () => {
    const downloadDataUrl = vi.fn(() => true);
    const onUnhandledKeyDown = vi.fn();

    const { result } = renderHook(() =>
      useKangurManagedDrawingActions<HTMLCanvasElement>({
        canExport: true,
        canRedo: false,
        canUndo: false,
        clearStrokes: vi.fn(),
        downloadDataUrl,
        exportDataUrl: () => 'data:image/png;base64,AAA',
        exportFilename: 'drawing.png',
        onUnhandledKeyDown,
        redoLastStroke: vi.fn(),
        undoLastStroke: vi.fn(),
      })
    );

    expect(result.current.exportDrawing()).toBe(true);
    expect(downloadDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,AAA',
      'drawing.png'
    );

    const unhandledEvent = {
      altKey: false,
      ctrlKey: false,
      key: 'ArrowLeft',
      metaKey: false,
      preventDefault: vi.fn(),
      shiftKey: false,
    } as never;

    result.current.handleCanvasKeyDown(unhandledEvent);
    expect(onUnhandledKeyDown).toHaveBeenCalledWith(unhandledEvent);
  });
});
