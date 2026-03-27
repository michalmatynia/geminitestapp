/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useVectorDrawingShortcuts } from './useVectorDrawingShortcuts';

describe('useVectorDrawingShortcuts', () => {
  it('handles undo, redo, and tool keyboard shortcuts', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onToolChange = vi.fn();

    renderHook(() =>
      useVectorDrawingShortcuts({
        onUndo,
        onRedo,
        onToolChange,
      })
    );

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'z',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', metaKey: true, bubbles: true, cancelable: true })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: '2', bubbles: true, cancelable: true })
    );

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onRedo).toHaveBeenCalledTimes(2);
    expect(onToolChange).toHaveBeenNthCalledWith(1, 'brush');
    expect(onToolChange).toHaveBeenNthCalledWith(2, 'polygon');
  });

  it('ignores shortcuts while typing or when modifiers disallow a tool switch', () => {
    const onUndo = vi.fn();
    const onRedo = vi.fn();
    const onToolChange = vi.fn();

    renderHook(() =>
      useVectorDrawingShortcuts({
        onUndo,
        onRedo,
        onToolChange,
      })
    );

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    );

    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    Object.defineProperty(editable, 'isContentEditable', {
      configurable: true,
      value: true,
    });
    document.body.appendChild(editable);
    editable.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', bubbles: true, cancelable: true })
    );

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true, cancelable: true })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'b', altKey: true, bubbles: true, cancelable: true })
    );

    expect(onUndo).not.toHaveBeenCalled();
    expect(onRedo).not.toHaveBeenCalled();
    expect(onToolChange).not.toHaveBeenCalled();
  });

  it('uses the latest callback refs after rerender', () => {
    const initialUndo = vi.fn();
    const initialRedo = vi.fn();
    const initialToolChange = vi.fn();

    const { rerender } = renderHook(
      ({
        onUndo,
        onRedo,
        onToolChange,
      }: {
        onUndo: () => void;
        onRedo: () => void;
        onToolChange: (tool: Parameters<typeof initialToolChange>[0]) => void;
      }) =>
        useVectorDrawingShortcuts({
          onUndo,
          onRedo,
          onToolChange,
        }),
      {
        initialProps: {
          onUndo: initialUndo,
          onRedo: initialRedo,
          onToolChange: initialToolChange,
        },
      }
    );

    const nextUndo = vi.fn();
    const nextRedo = vi.fn();
    const nextToolChange = vi.fn();

    rerender({
      onUndo: nextUndo,
      onRedo: nextRedo,
      onToolChange: nextToolChange,
    });

    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true })
    );
    window.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'v', bubbles: true, cancelable: true })
    );

    expect(initialUndo).not.toHaveBeenCalled();
    expect(initialRedo).not.toHaveBeenCalled();
    expect(initialToolChange).not.toHaveBeenCalled();
    expect(nextUndo).toHaveBeenCalledTimes(1);
    expect(nextRedo).toHaveBeenCalledTimes(1);
    expect(nextToolChange).toHaveBeenCalledWith('select');
  });
});
