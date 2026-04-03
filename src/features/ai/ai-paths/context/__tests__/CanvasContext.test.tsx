// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CanvasProvider, useCanvasActions, useCanvasRefs, useCanvasState } from '../CanvasContext';

describe('CanvasContext', () => {
  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useCanvasState())).toThrow(
      'useCanvasState must be used within a CanvasProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useCanvasActions())).toThrow(
      'useCanvasActions must be used within a CanvasProvider'
    );
  });

  it('throws when refs hook is used outside the provider', () => {
    expect(() => renderHook(() => useCanvasRefs())).toThrow(
      'useCanvasRefs must be used within a CanvasProvider'
    );
  });

  it('updates view, connection, and refs state inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
      <CanvasProvider initialView={{ x: 10, y: 20, scale: 1.25 }}>{children}</CanvasProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useCanvasActions(),
        refs: useCanvasRefs(),
        state: useCanvasState(),
      }),
      { wrapper }
    );

    expect(result.current.state.view).toEqual({ x: 10, y: 20, scale: 1.25 });
    expect(result.current.refs.viewportRef.current).toBeNull();
    expect(result.current.refs.canvasRef.current).toBeNull();

    act(() => {
      result.current.actions.zoomTo(99);
      result.current.actions.startConnection('node-a', 'output', { x: 4, y: 8 });
      result.current.actions.setIsPanning(true);
    });

    expect(result.current.state.view.scale).toBeLessThanOrEqual(4);
    expect(result.current.state.connecting).toEqual({
      fromNodeId: 'node-a',
      fromPort: 'output',
      start: { x: 4, y: 8 },
    });
    expect(result.current.state.connectingPos).toEqual({ x: 4, y: 8 });
    expect(result.current.state.isPanning).toBe(true);

    act(() => {
      result.current.actions.endConnection();
      result.current.actions.resetView();
    });

    expect(result.current.state.connecting).toBeNull();
    expect(result.current.state.connectingPos).toBeNull();
    expect(result.current.state.view).toEqual({ x: -600, y: -320, scale: 1 });
  });
});
