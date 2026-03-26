/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useMemo, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurPointCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurPointCanvasDrawing';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function CanvasDrawingHarness(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const {
    canRedo,
    canUndo,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    redoLastStroke,
    strokes,
    undoLastStroke,
  } = useKangurPointCanvasDrawing({
    backgroundFill: '#ffffff',
    canvasRef,
    logicalHeight: 220,
    logicalWidth: 320,
    minPointDistance: 8,
    resolveStyle: () => ({
      lineWidth: 4,
      strokeStyle: '#0f172a',
    }),
    touchLockEnabled: true,
  });

  const pointCount = useMemo(() => strokes.flatMap((stroke) => stroke).length, [strokes]);

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label='Shared canvas drawing surface'
        data-can-redo={canRedo ? 'true' : 'false'}
        data-can-undo={canUndo ? 'true' : 'false'}
        data-drawing-active={isPointerDrawing ? 'true' : 'false'}
        data-point-count={String(pointCount)}
        data-stroke-count={String(strokes.length)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
      <button type='button' onClick={undoLastStroke}>
        Undo
      </button>
      <button type='button' onClick={redoLastStroke}>
        Redo
      </button>
    </>
  );
}

describe('useKangurPointCanvasDrawing', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('tracks strokes on a canvas surface and filters near-duplicate points', () => {
    render(<CanvasDrawingHarness />);

    const canvas = screen.getByLabelText('Shared canvas drawing surface');
    expect(canvas.style.touchAction).toBe('none');

    fireEvent.pointerDown(canvas, {
      pointerId: 3,
      clientX: 40,
      clientY: 60,
    });
    expect(canvas).toHaveAttribute('data-drawing-active', 'true');

    fireEvent.pointerMove(canvas, {
      pointerId: 3,
      clientX: 44,
      clientY: 64,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 3,
      clientX: 90,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 3,
      clientX: 90,
      clientY: 120,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'false');
    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas).toHaveAttribute('data-point-count', '2');
    expect(canvas).toHaveAttribute('data-can-undo', 'true');
    expect(canvas).toHaveAttribute('data-can-redo', 'false');
  });

  it('exposes redo history for point-canvas surfaces', () => {
    render(<CanvasDrawingHarness />);

    const canvas = screen.getByLabelText('Shared canvas drawing surface');

    fireEvent.pointerDown(canvas, {
      pointerId: 11,
      clientX: 36,
      clientY: 48,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 11,
      clientX: 92,
      clientY: 108,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 11,
      clientX: 92,
      clientY: 108,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '0');
    expect(canvas).toHaveAttribute('data-can-redo', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas).toHaveAttribute('data-can-redo', 'false');
  });
});
