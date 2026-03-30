'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurManagedStoredPointDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurManagedStoredPointDrawing';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function ManagedStoredCanvasHarness({
  locked = false,
}: {
  locked?: boolean;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exportResult, setExportResult] = useState('idle');
  const [feedbackClears, setFeedbackClears] = useState(0);
  const {
    canRedo,
    canUndo,
    clearDrawing,
    exportDrawing,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    redoDrawing,
    strokes,
    undoDrawing,
  } = useKangurManagedStoredPointDrawing({
    actions: {
      clearFeedback: () => {
        setFeedbackClears((current) => current + 1);
      },
      exportFilename: 'managed-point.png',
      resolveCanExport: () => !locked,
      resolveCanRedo: (drawing) => !locked && drawing.canRedo,
      resolveCanUndo: (drawing) => !locked && drawing.canUndo,
    },
    drawing: {
      canvasRef,
      logicalHeight: 220,
      logicalWidth: 320,
      minPointDistance: 8,
      resolveStyle: () => ({
        lineWidth: 4,
        strokeStyle: '#0f172a',
      }),
      storageKey: 'managed-point:test',
      touchLockEnabled: true,
    },
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label='Managed stored point canvas'
        data-can-redo={canRedo ? 'true' : 'false'}
        data-can-undo={canUndo ? 'true' : 'false'}
        data-export-result={exportResult}
        data-feedback-clears={String(feedbackClears)}
        data-stroke-count={String(strokes.length)}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <button type='button' onClick={undoDrawing}>
        Undo
      </button>
      <button type='button' onClick={redoDrawing}>
        Redo
      </button>
      <button type='button' onClick={clearDrawing}>
        Clear
      </button>
      <button
        type='button'
        onClick={() => {
          setExportResult(exportDrawing() ? 'success' : 'blocked');
        }}
      >
        Export
      </button>
    </>
  );
}

describe('useKangurManagedStoredPointDrawing', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    const ctx = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      resetTransform: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '#ffffff',
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 1,
      shadowBlur: 0,
      shadowColor: '',
      strokeStyle: '#000000',
    } as unknown as CanvasRenderingContext2D;

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,MANAGED'
    );
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() =>
      createRect({ left: 0, top: 0, width: 320, height: 220 })
    ) as typeof HTMLCanvasElement.prototype.getBoundingClientRect;
    Object.defineProperty(HTMLCanvasElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('pairs stored point drawing with shared managed actions', () => {
    render(<ManagedStoredCanvasHarness />);

    const canvas = screen.getByLabelText('Managed stored point canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 7,
      clientX: 40,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 7,
      clientX: 96,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 7,
      clientX: 96,
      clientY: 120,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(canvas).toHaveAttribute('data-feedback-clears', '3');
    expect(canvas).toHaveAttribute('data-stroke-count', '0');
  });

  it('supports managed capability overrides for export', () => {
    render(<ManagedStoredCanvasHarness locked />);

    const canvas = screen.getByLabelText('Managed stored point canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 8,
      clientX: 40,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 8,
      clientX: 96,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 8,
      clientX: 96,
      clientY: 120,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(canvas).toHaveAttribute('data-export-result', 'blocked');
  });
});
