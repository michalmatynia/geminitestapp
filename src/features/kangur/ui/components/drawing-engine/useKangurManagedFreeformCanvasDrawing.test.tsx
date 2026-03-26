/**
 * @vitest-environment jsdom
 */

'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useKangurManagedFreeformCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurManagedFreeformCanvasDrawing';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function ManagedFreeformCanvasHarness({
  locked = false,
}: {
  locked?: boolean;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [exportResult, setExportResult] = useState('idle');
  const {
    canRedo,
    canUndo,
    exportDrawing,
    handleCanvasKeyDown,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    hasDrawableContent,
    redoDrawing,
    strokes,
    tools,
    undoDrawing,
  } = useKangurManagedFreeformCanvasDrawing({
    actions: {
      exportFilename: 'managed-freeform.png',
      resolveCanExport: () => !locked,
      resolveCanRedo: (drawing) => !locked && drawing.canRedo,
      resolveCanUndo: (drawing) => !locked && drawing.canUndo,
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
        aria-label='Managed freeform canvas'
        data-can-redo={canRedo ? 'true' : 'false'}
        data-can-undo={canUndo ? 'true' : 'false'}
        data-export-result={exportResult}
        data-has-drawable-content={hasDrawableContent ? 'true' : 'false'}
        data-stroke-count={String(strokes.length)}
        onKeyDown={handleCanvasKeyDown}
        onPointerCancel={handlePointerUp}
        onPointerDown={handlePointerDown}
        onPointerLeave={handlePointerUp}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <button type='button' onClick={() => tools.selectColor('#2563eb')}>
        Blue
      </button>
      <button type='button' onClick={undoDrawing}>
        Undo
      </button>
      <button type='button' onClick={redoDrawing}>
        Redo
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

describe('useKangurManagedFreeformCanvasDrawing', () => {
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
      'data:image/png;base64,FREEFORM'
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

  it('pairs freeform drawing with managed history actions', () => {
    render(<ManagedFreeformCanvasHarness />);

    const canvas = screen.getByLabelText('Managed freeform canvas');

    fireEvent.click(screen.getByRole('button', { name: 'Blue' }));
    fireEvent.pointerDown(canvas, {
      pointerId: 3,
      clientX: 40,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 3,
      clientX: 96,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 3,
      clientX: 96,
      clientY: 120,
    });

    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas).toHaveAttribute('data-can-undo', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '0');
    expect(canvas).toHaveAttribute('data-can-redo', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(canvas).toHaveAttribute('data-stroke-count', '1');
  });

  it('supports managed capability overrides for export', () => {
    render(<ManagedFreeformCanvasHarness locked />);

    const canvas = screen.getByLabelText('Managed freeform canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 4,
      clientX: 40,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 4,
      clientX: 96,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 4,
      clientX: 96,
      clientY: 120,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(canvas).toHaveAttribute('data-export-result', 'blocked');
  });
});
