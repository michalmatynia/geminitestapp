// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  VectorCanvasProvider,
  useOptionalVectorCanvasContext,
  useVectorCanvasContext,
} from './VectorCanvasContext';

describe('VectorCanvasContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useVectorCanvasContext())).toThrow(
      'useVectorCanvasContext must be used within VectorCanvasProvider'
    );
  });

  it('returns null from the optional hook outside the provider', () => {
    const { result } = renderHook(() => useOptionalVectorCanvasContext());
    expect(result.current).toBeNull();
  });

  it('returns the canvas value inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <VectorCanvasProvider
        value={{
          activeShapeId: null,
          brushRadius: 12,
          canvasRenderSize: { height: 480, width: 640 },
          handleFitToScreen: vi.fn(),
          handleZoomIn: vi.fn(),
          handleZoomOut: vi.fn(),
          isDraggingEditablePoint: false,
          isDraggingImage: false,
          isHoveringEditablePoint: false,
          isHoveringMovableShape: false,
          isPanning: false,
          onChange: vi.fn(),
          onSelectShape: vi.fn(),
          resolvedImageOffset: { x: 0, y: 0 },
          selectedPointIndex: null,
          shapes: [],
          syncCanvasSize: vi.fn(),
          tool: 'polygon',
          viewTransform: { panX: 0, panY: 0, rotateDeg: 0, scale: 1 },
        }}
      >
        {children}
      </VectorCanvasProvider>
    );

    const { result } = renderHook(
      () => ({
        optional: useOptionalVectorCanvasContext(),
        strict: useVectorCanvasContext(),
      }),
      { wrapper }
    );

    expect(result.current.strict.tool).toBe('polygon');
    expect(result.current.strict.brushRadius).toBe(12);
    expect(result.current.optional).not.toBeNull();
  });
});
