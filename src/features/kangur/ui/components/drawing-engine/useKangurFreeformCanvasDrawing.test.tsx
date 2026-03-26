/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createKangurFreeformDrawingSnapshot,
  serializeKangurFreeformDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/freeform-snapshots';
import { useKangurFreeformCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurFreeformCanvasDrawing';

const createRect = (input: {
  left: number;
  top: number;
  width: number;
  height: number;
}): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function FreeformCanvasHarness({
  initialSerializedSnapshot = null,
  isCoarsePointer = false,
  onSerializedSnapshotChange,
}: {
  initialSerializedSnapshot?: string | null;
  isCoarsePointer?: boolean;
  onSerializedSnapshotChange?: (raw: string | null) => void;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [serializedSnapshot, setSerializedSnapshot] = useState('');
  const {
    canRedo,
    canUndo,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    isPointerDrawing,
    redoLastStroke,
    restoreSerializedSnapshot,
    serializeSnapshot,
    strokes,
    tools,
    undoLastStroke,
  } = useKangurFreeformCanvasDrawing({
    backgroundFill: '#ffffff',
    canvasRef,
    config: {
      colors: ['#111827', '#2563eb'],
      eraserWidthMultiplier: 4,
      preferredWidthIndex: 1,
      strokeWidths: [2, 4],
    },
    initialSerializedSnapshot,
    isCoarsePointer,
    logicalHeight: 220,
    logicalWidth: 320,
    onSerializedSnapshotChange,
    shouldCommitStroke: (stroke) => stroke.points.length >= 2,
    touchLockEnabled: true,
  });

  const lastStroke = strokes[strokes.length - 1];

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label='Shared freeform canvas surface'
        data-active-tool={tools.activeTool}
        data-can-redo={canRedo ? 'true' : 'false'}
        data-can-undo={canUndo ? 'true' : 'false'}
        data-drawing-active={isPointerDrawing ? 'true' : 'false'}
        data-has-drawable-content={hasDrawableContent ? 'true' : 'false'}
        data-last-color={lastStroke?.meta.color ?? ''}
        data-last-width={lastStroke ? String(lastStroke.meta.width) : ''}
        data-resolved-width={String(tools.strokeMeta.width)}
        data-stroke-count={String(strokes.length)}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <button type='button' onClick={() => tools.selectColor('#2563eb')}>
        Blue
      </button>
      <button type='button' onClick={tools.selectEraser}>
        Eraser
      </button>
      <button type='button' onClick={() => tools.selectWidth(tools.strokeWidths[1] ?? 4)}>
        Thick
      </button>
      <button type='button' onClick={undoLastStroke}>
        Undo
      </button>
      <button type='button' onClick={redoLastStroke}>
        Redo
      </button>
      <button type='button' onClick={() => setSerializedSnapshot(serializeSnapshot())}>
        Save
      </button>
      <button
        type='button'
        onClick={() => {
          restoreSerializedSnapshot(serializedSnapshot);
        }}
      >
        Restore
      </button>
      <div data-testid='serialized-snapshot'>{serializedSnapshot}</div>
    </>
  );
}

describe('useKangurFreeformCanvasDrawing', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    const ctx = {
      beginPath: vi.fn(),
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      lineTo: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      resetTransform: vi.fn(),
      scale: vi.fn(),
      setTransform: vi.fn(),
      stroke: vi.fn(),
      fillStyle: '#ffffff',
      globalCompositeOperation: 'source-over',
      lineCap: 'round',
      lineJoin: 'round',
      lineWidth: 1,
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

  it('tracks freeform canvas strokes and preserves redo history', () => {
    render(<FreeformCanvasHarness />);

    const canvas = screen.getByLabelText('Shared freeform canvas surface');
    expect(canvas.style.touchAction).toBe('none');
    expect(canvas).toHaveAttribute('data-resolved-width', '4');
    expect(canvas).toHaveAttribute('data-has-drawable-content', 'false');

    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
    fireEvent.pointerDown(canvas, {
      pointerId: 2,
      clientX: 40,
      clientY: 60,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 2,
      clientX: 92,
      clientY: 124,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 2,
      clientX: 92,
      clientY: 124,
    });

    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas).toHaveAttribute('data-last-color', '#2563eb');
    expect(canvas).toHaveAttribute('data-last-width', '4');
    expect(canvas).toHaveAttribute('data-can-undo', 'true');
    expect(canvas).toHaveAttribute('data-can-redo', 'false');
    expect(canvas).toHaveAttribute('data-has-drawable-content', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '0');
    expect(canvas).toHaveAttribute('data-can-redo', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas).toHaveAttribute('data-can-redo', 'false');
  });

  it('serializes and restores shared freeform snapshots through the engine api', () => {
    render(<FreeformCanvasHarness />);

    const canvas = screen.getByLabelText('Shared freeform canvas surface');

    fireEvent.pointerDown(canvas, {
      pointerId: 7,
      clientX: 24,
      clientY: 36,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 7,
      clientX: 72,
      clientY: 96,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 7,
      clientX: 72,
      clientY: 96,
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

  it('applies coarse-pointer width boosts and eraser multipliers through the shared config', () => {
    render(<FreeformCanvasHarness isCoarsePointer />);

    const canvas = screen.getByLabelText('Shared freeform canvas surface');
    expect(canvas).toHaveAttribute('data-resolved-width', '6');

    fireEvent.click(screen.getByRole('button', { name: 'Thick' }));
    fireEvent.click(screen.getByRole('button', { name: 'Eraser' }));

    expect(canvas).toHaveAttribute('data-active-tool', 'eraser');
    expect(canvas).toHaveAttribute('data-resolved-width', '24');
  });

  it('restores initial serialized snapshots and emits shared draft updates', async () => {
    const onSerializedSnapshotChange = vi.fn();
    const initialSerializedSnapshot = serializeKangurFreeformDrawingSnapshot(
      createKangurFreeformDrawingSnapshot({
        logicalHeight: 220,
        logicalWidth: 320,
        strokes: [
          {
            meta: {
              color: '#2563eb',
              isEraser: false,
              width: 4,
            },
            points: [
              { x: 32, y: 40 },
              { x: 108, y: 144 },
            ],
          },
        ],
      })
    );

    render(
      <FreeformCanvasHarness
        initialSerializedSnapshot={initialSerializedSnapshot}
        onSerializedSnapshotChange={onSerializedSnapshotChange}
      />
    );

    const canvas = screen.getByLabelText('Shared freeform canvas surface');

    await waitFor(() => {
      expect(canvas).toHaveAttribute('data-stroke-count', '1');
    });
    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith(
        initialSerializedSnapshot
      );
    });

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    await waitFor(() => {
      expect(onSerializedSnapshotChange).toHaveBeenLastCalledWith(null);
    });
  });
});
