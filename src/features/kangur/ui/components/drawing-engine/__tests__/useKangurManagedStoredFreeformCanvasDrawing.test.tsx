'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurManagedStoredFreeformCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurManagedStoredFreeformCanvasDrawing';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function ManagedStoredFreeformHarness(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<string | null>(null);
  const {
    canRedo,
    canUndo,
    clearDrawing,
    exportDrawing,
    handleCanvasKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    redoDrawing,
    strokes,
    undoDrawing,
  } = useKangurManagedStoredFreeformCanvasDrawing({
    actions: {
      exportFilename: 'managed-stored-freeform.png',
    },
    drawing: {
      backgroundFill: '#ffffff',
      canvasRef,
      config: {
        colors: ['#111827', '#2563eb'],
        eraserWidthMultiplier: 4,
        preferredWidthIndex: 1,
        strokeWidths: [2, 4],
      },
      draftStorage: {
        clearDraftSnapshot: () => setDraftSnapshot(null),
        draftSnapshot,
        setDraftSnapshot,
      },
      logicalHeight: 220,
      logicalWidth: 320,
      shouldCommitStroke: (stroke) => stroke.points.length >= 2,
      touchLockEnabled: true,
    },
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label='Managed stored freeform canvas'
        data-can-redo={canRedo ? 'true' : 'false'}
        data-can-undo={canUndo ? 'true' : 'false'}
        data-draft-snapshot={draftSnapshot ?? ''}
        data-has-drawable-content={hasDrawableContent ? 'true' : 'false'}
        data-stroke-count={String(strokes.length)}
        onKeyDown={handleCanvasKeyDown}
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
      <button type='button' onClick={() => exportDrawing()}>
        Export
      </button>
    </>
  );
}

describe('useKangurManagedStoredFreeformCanvasDrawing', () => {
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('keeps managed redo history while storing the freeform draft', () => {
    render(<ManagedStoredFreeformHarness />);

    const canvas = screen.getByLabelText('Managed stored freeform canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 7,
      clientX: 40,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 7,
      clientX: 104,
      clientY: 132,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 7,
      clientX: 104,
      clientY: 132,
    });

    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas.getAttribute('data-draft-snapshot')).toContain('"version":1');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '0');
    expect(canvas).toHaveAttribute('data-can-redo', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '1');
  });

  it('clears the external draft snapshot through managed clear actions', () => {
    render(<ManagedStoredFreeformHarness />);

    const canvas = screen.getByLabelText('Managed stored freeform canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 8,
      clientX: 40,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 8,
      clientX: 104,
      clientY: 132,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 8,
      clientX: 104,
      clientY: 132,
    });

    expect(canvas).toHaveAttribute('data-has-drawable-content', 'true');
    expect(canvas.getAttribute('data-draft-snapshot')).toContain('"version":1');

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(canvas).toHaveAttribute('data-stroke-count', '0');
    expect(canvas).toHaveAttribute('data-draft-snapshot', '');
  });
});
