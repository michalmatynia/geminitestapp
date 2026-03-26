/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useMemo, useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createKangurPointDrawingSnapshot,
  serializeKangurPointDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/point-snapshots';
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

function CanvasDrawingHarness({
  initialSerializedSnapshot = null,
  onSerializedSnapshotChange,
}: {
  initialSerializedSnapshot?: string | null;
  onSerializedSnapshotChange?: (raw: string | null) => void;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exportedDataUrl, setExportedDataUrl] = useState('');
  const [savedSerializedSnapshot, setSavedSerializedSnapshot] = useState('');
  const {
    canRedo,
    canUndo,
    exportDataUrl,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isPointerDrawing,
    redoLastStroke,
    restoreSerializedSnapshot,
    serializeSnapshot,
    strokes,
    undoLastStroke,
  } = useKangurPointCanvasDrawing({
    backgroundFill: '#ffffff',
    canvasRef,
    initialSerializedSnapshot,
    logicalHeight: 220,
    logicalWidth: 320,
    minPointDistance: 8,
    onSerializedSnapshotChange,
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
        data-has-drawable-content={hasDrawableContent ? 'true' : 'false'}
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
      <button type='button' onClick={() => setSavedSerializedSnapshot(serializeSnapshot())}>
        Save
      </button>
      <button
        type='button'
        onClick={() => {
          setExportedDataUrl(exportDataUrl() ?? '');
        }}
      >
        Export
      </button>
      <button
        type='button'
        onClick={() => {
          restoreSerializedSnapshot(savedSerializedSnapshot);
        }}
      >
        Restore
      </button>
      <div data-testid='exported-data-url'>{exportedDataUrl}</div>
      <div data-testid='serialized-snapshot'>{savedSerializedSnapshot}</div>
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
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,POINT'
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
    expect(canvas).toHaveAttribute('data-has-drawable-content', 'true');
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

  it('serializes and restores shared point snapshots through the engine api', () => {
    render(<CanvasDrawingHarness />);

    const canvas = screen.getByLabelText('Shared canvas drawing surface');

    fireEvent.pointerDown(canvas, {
      pointerId: 15,
      clientX: 32,
      clientY: 52,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 15,
      clientX: 96,
      clientY: 116,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 15,
      clientX: 96,
      clientY: 116,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const serialized = screen.getByTestId('serialized-snapshot').textContent ?? '';
    expect(serialized).toContain('"version":1');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '0');

    fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas).toHaveAttribute('data-has-drawable-content', 'true');
  });

  it('exports raster snapshots through the shared point engine api', () => {
    render(<CanvasDrawingHarness />);

    const canvas = screen.getByLabelText('Shared canvas drawing surface');

    fireEvent.pointerDown(canvas, {
      pointerId: 18,
      clientX: 28,
      clientY: 42,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 18,
      clientX: 84,
      clientY: 118,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 18,
      clientX: 84,
      clientY: 118,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(screen.getByTestId('exported-data-url')).toHaveTextContent(
      'data:image/png;base64,POINT'
    );
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('restores initial serialized point snapshots and emits snapshot updates', async () => {
    const onSerializedSnapshotChange = vi.fn();
    const initialSerializedSnapshot = serializeKangurPointDrawingSnapshot(
      createKangurPointDrawingSnapshot({
        logicalHeight: 220,
        logicalWidth: 320,
        strokes: [
          [
            { x: 18, y: 24 },
            { x: 72, y: 120 },
          ],
        ],
      })
    );

    render(
      <CanvasDrawingHarness
        initialSerializedSnapshot={initialSerializedSnapshot}
        onSerializedSnapshotChange={onSerializedSnapshotChange}
      />
    );

    const canvas = screen.getByLabelText('Shared canvas drawing surface');

    expect(canvas).toHaveAttribute('data-stroke-count', '1');

    fireEvent.pointerDown(canvas, {
      pointerId: 22,
      clientX: 128,
      clientY: 80,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 22,
      clientX: 172,
      clientY: 132,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 22,
      clientX: 172,
      clientY: 132,
    });

    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith(
        expect.stringContaining('"version":1')
      );
    });
  });
});
