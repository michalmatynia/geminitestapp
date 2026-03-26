/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useMemo, useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurPointDrawingEngine } from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingEngine';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function SvgDrawingHarness({
  minPointDistance = 2,
  redrawSpy,
  shouldCommitStroke,
}: {
  minPointDistance?: number;
  redrawSpy?: (strokes: Array<Array<{ x: number; y: number }>>) => void;
  shouldCommitStroke?: (stroke: Array<{ x: number; y: number }>) => boolean;
}): React.JSX.Element {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const {
    canRedo,
    canUndo,
    clearStrokes,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isPointerDrawing,
    redoLastStroke,
    setStrokes,
    strokes,
    undoLastStroke,
  } = useKangurPointDrawingEngine<SVGSVGElement>({
    canvasRef: svgRef,
    logicalHeight: 140,
    logicalWidth: 360,
    minPointDistance,
    redraw: (nextStrokes) => {
      redrawSpy?.(nextStrokes);
    },
    shouldCommitStroke,
    touchLockEnabled: true,
  });

  const pointCount = useMemo(
    () => strokes.flatMap((stroke) => stroke).length,
    [strokes]
  );

  return (
    <>
      <svg
        ref={svgRef}
        aria-label='Shared SVG drawing surface'
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
        viewBox='0 0 360 140'
      />
      <button type='button' onClick={undoLastStroke}>
        Undo
      </button>
      <button type='button' onClick={redoLastStroke}>
        Redo
      </button>
      <button
        type='button'
        onClick={() => {
          setStrokes([[{ x: 12, y: 18 }, { x: 44, y: 52 }]]);
        }}
      >
        Seed
      </button>
      <button type='button' onClick={clearStrokes}>
        Clear
      </button>
    </>
  );
}

describe('useKangurDrawingEngine generic surfaces', () => {
  const originalSvgRect = SVGSVGElement.prototype.getBoundingClientRect;
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  let animationFrameId = 0;
  let scheduledFrames = new Map<number, FrameRequestCallback>();

  const flushAnimationFrames = (): void => {
    const queuedFrames = [...scheduledFrames.entries()];
    scheduledFrames.clear();

    for (const [, callback] of queuedFrames) {
      callback(16);
    }
  };

  beforeEach(() => {
    animationFrameId = 0;
    scheduledFrames = new Map<number, FrameRequestCallback>();
    SVGSVGElement.prototype.getBoundingClientRect = vi.fn(() =>
      createRect({ left: 0, top: 0, width: 360, height: 140 })
    ) as typeof SVGSVGElement.prototype.getBoundingClientRect;
    Object.defineProperty(SVGSVGElement.prototype, 'setPointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(SVGSVGElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: vi.fn((callback: FrameRequestCallback): number => {
        const nextId = ++animationFrameId;
        scheduledFrames.set(nextId, callback);
        return nextId;
      }),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn((frameId: number) => {
        scheduledFrames.delete(frameId);
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    SVGSVGElement.prototype.getBoundingClientRect = originalSvgRect;
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: originalCancelAnimationFrame,
    });
  });

  it('tracks strokes on an SVG surface and filters near-duplicate points', () => {
    render(<SvgDrawingHarness minPointDistance={10} />);

    const surface = screen.getByLabelText('Shared SVG drawing surface');
    expect(surface.style.touchAction).toBe('none');

    fireEvent.pointerDown(surface, {
      pointerId: 5,
      clientX: 40,
      clientY: 40,
    });

    expect(surface).toHaveAttribute('data-drawing-active', 'true');

    fireEvent.pointerMove(surface, {
      pointerId: 5,
      clientX: 44,
      clientY: 44,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 5,
      clientX: 80,
      clientY: 60,
    });
    fireEvent.pointerUp(surface, {
      pointerId: 5,
      clientX: 80,
      clientY: 60,
    });

    expect(surface).toHaveAttribute('data-drawing-active', 'false');
    expect(surface).toHaveAttribute('data-stroke-count', '1');
    expect(surface).toHaveAttribute('data-point-count', '2');
    expect(surface).toHaveAttribute('data-can-undo', 'true');
    expect(surface).toHaveAttribute('data-can-redo', 'false');
  });

  it('honors stroke commit guards on shared surfaces', () => {
    render(
      <SvgDrawingHarness shouldCommitStroke={(stroke) => stroke.length >= 2} />
    );

    const surface = screen.getByLabelText('Shared SVG drawing surface');

    fireEvent.pointerDown(surface, {
      pointerId: 7,
      clientX: 24,
      clientY: 32,
    });
    fireEvent.pointerUp(surface, {
      pointerId: 7,
      clientX: 24,
      clientY: 32,
    });

    expect(surface).toHaveAttribute('data-stroke-count', '0');
    expect(surface).toHaveAttribute('data-point-count', '0');
  });

  it('supports undo and redo on shared surfaces', () => {
    render(<SvgDrawingHarness />);

    const surface = screen.getByLabelText('Shared SVG drawing surface');

    fireEvent.pointerDown(surface, {
      pointerId: 9,
      clientX: 40,
      clientY: 32,
    });
    fireEvent.pointerMove(surface, {
      pointerId: 9,
      clientX: 84,
      clientY: 76,
    });
    fireEvent.pointerUp(surface, {
      pointerId: 9,
      clientX: 84,
      clientY: 76,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));

    expect(surface).toHaveAttribute('data-stroke-count', '0');
    expect(surface).toHaveAttribute('data-can-undo', 'false');
    expect(surface).toHaveAttribute('data-can-redo', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));

    expect(surface).toHaveAttribute('data-stroke-count', '1');
    expect(surface).toHaveAttribute('data-can-undo', 'true');
    expect(surface).toHaveAttribute('data-can-redo', 'false');
  });

  it('coalesces rapid redraw requests into a single animation frame on shared surfaces', () => {
    const redrawSpy = vi.fn();
    render(<SvgDrawingHarness redrawSpy={redrawSpy} />);

    flushAnimationFrames();
    redrawSpy.mockClear();
    vi.mocked(window.requestAnimationFrame).mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Seed' }));
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(redrawSpy).not.toHaveBeenCalled();
    expect(window.requestAnimationFrame).toHaveBeenCalledTimes(1);

    flushAnimationFrames();

    expect(redrawSpy).toHaveBeenCalledTimes(1);
    expect(redrawSpy).toHaveBeenCalledWith([]);
  });
});
