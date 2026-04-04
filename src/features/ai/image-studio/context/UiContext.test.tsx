// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  UiProvider,
  useUiActions,
  useUiCanvasState,
  useUiLayoutState,
  useUiState,
  useUiToolsState,
} from './UiContext';

describe('UiContext', () => {
  it('throws outside the provider for all strict hooks', () => {
    expect(() => renderHook(() => useUiLayoutState())).toThrow(
      'useUiLayoutState must be used within a UiProvider'
    );
    expect(() => renderHook(() => useUiCanvasState())).toThrow(
      'useUiCanvasState must be used within a UiProvider'
    );
    expect(() => renderHook(() => useUiToolsState())).toThrow(
      'useUiToolsState must be used within a UiProvider'
    );
    expect(() => renderHook(() => useUiState())).toThrow(
      'useUiState must be used within a UiProvider'
    );
    expect(() => renderHook(() => useUiActions())).toThrow(
      'useUiActions must be used within a UiProvider'
    );
  });

  it('updates layout, canvas, tools, and resolver state through provider actions', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UiProvider>{children}</UiProvider>
    );

    const { result } = renderHook(
      () => ({
        layout: useUiLayoutState(),
        canvas: useUiCanvasState(),
        tools: useUiToolsState(),
        state: useUiState(),
        actions: useUiActions(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.actions.toggleFocusMode();
      result.current.actions.setFormatterEnabled(true);
      result.current.actions.setValidatorEnabled(false);
      result.current.actions.setCanvasImageOffset({ x: Number.NaN, y: 12 });
      result.current.actions.setCanvasBackgroundColor('  #ABCDEF  ');
      result.current.actions.setPendingSequenceThumbnail({
        runId: 'run-1',
        sourceSlotId: 'slot-1',
        status: 'syncing',
        startedAt: '2026-04-03T00:00:00.000Z',
      });
      result.current.actions.registerPreviewCanvasViewportCropResolver(() => ({
        slotId: 'slot-1',
        cropRect: { x: 1, y: 2, width: 3, height: 4 },
      }));
      result.current.actions.registerPreviewCanvasImageFrameResolver(() => ({
        slotId: 'slot-1',
        frame: { x: 5, y: 6, width: 7, height: 8 },
      }));
    });

    expect(result.current.layout.isFocusMode).toBe(true);
    expect(result.current.state.isFocusMode).toBe(true);
    expect(result.current.tools.validatorEnabled).toBe(false);
    expect(result.current.tools.formatterEnabled).toBe(false);
    expect(result.current.canvas.canvasImageOffset).toEqual({ x: 0, y: 12 });
    expect(result.current.canvas.canvasBackgroundColor).toBe('#abcdef');
    expect(result.current.state.pendingSequenceThumbnail).toEqual({
      runId: 'run-1',
      sourceSlotId: 'slot-1',
      status: 'syncing',
      startedAt: '2026-04-03T00:00:00.000Z',
    });
    expect(result.current.actions.getPreviewCanvasViewportCrop()).toEqual({
      slotId: 'slot-1',
      cropRect: { x: 1, y: 2, width: 3, height: 4 },
    });
    expect(result.current.actions.getPreviewCanvasImageFrame()).toEqual({
      slotId: 'slot-1',
      frame: { x: 5, y: 6, width: 7, height: 8 },
    });
  });
});
