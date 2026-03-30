'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createKangurPointDrawingSnapshot,
  serializeKangurPointDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/point-snapshots';
import type { KangurDrawingDraftStorageController } from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import {
  KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS,
  loadKangurDrawingDraftSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import { useKangurStoredPointCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurStoredPointCanvasDrawing';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function StoredCanvasHarness({
  draftStorage,
  storageKey,
}: {
  draftStorage?: KangurDrawingDraftStorageController;
  storageKey: string | null;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { handlePointerDown, handlePointerMove, handlePointerUp, strokes } =
    useKangurStoredPointCanvasDrawing({
      canvasRef,
      draftStorage,
      logicalHeight: 220,
      logicalWidth: 320,
      minPointDistance: 8,
      resolveStyle: () => ({
        lineWidth: 4,
        strokeStyle: '#0f172a',
      }),
      storageKey,
      touchLockEnabled: true,
    });

  return (
    <canvas
      ref={canvasRef}
      aria-label='Stored point canvas'
      data-stroke-count={String(strokes.length)}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerLeave={handlePointerUp}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

describe('useKangurStoredPointCanvasDrawing', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();

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
    vi.useRealTimers();
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('hydrates stored point drawings from the shared draft storage key', () => {
    window.sessionStorage.setItem(
      'kangur-drawing-draft-v1:alphabet-basics:A',
      serializeKangurPointDrawingSnapshot(
        createKangurPointDrawingSnapshot({
          logicalHeight: 220,
          logicalWidth: 320,
          strokes: [[{ x: 24, y: 48 }, { x: 92, y: 116 }]],
        })
      )
    );

    render(<StoredCanvasHarness storageKey='alphabet-basics:A' />);

    expect(screen.getByLabelText('Stored point canvas')).toHaveAttribute(
      'data-stroke-count',
      '1'
    );
  });

  it('persists pointer drawing updates through the shared draft storage hook', () => {
    render(<StoredCanvasHarness storageKey='geometry-drawing:triangle' />);

    const canvas = screen.getByLabelText('Stored point canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 5,
      clientX: 32,
      clientY: 48,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 5,
      clientX: 96,
      clientY: 128,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 5,
      clientX: 96,
      clientY: 128,
    });

    vi.advanceTimersByTime(KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS);

    expect(loadKangurDrawingDraftSnapshot('geometry-drawing:triangle')).toContain(
      '"version":1'
    );
  });

  it('supports injected external draft controllers for stored point drawings', () => {
    let draftSnapshot = serializeKangurPointDrawingSnapshot(
      createKangurPointDrawingSnapshot({
        logicalHeight: 220,
        logicalWidth: 320,
        strokes: [[{ x: 24, y: 48 }, { x: 92, y: 116 }]],
      })
    );

    const draftStorage: KangurDrawingDraftStorageController = {
      clearDraftSnapshot: () => {
        draftSnapshot = null;
      },
      get draftSnapshot() {
        return draftSnapshot;
      },
      setDraftSnapshot: (nextSnapshot) => {
        draftSnapshot =
          typeof nextSnapshot === 'function'
            ? nextSnapshot(draftSnapshot)
            : nextSnapshot;
      },
    };

    render(<StoredCanvasHarness draftStorage={draftStorage} storageKey={null} />);

    const canvas = screen.getByLabelText('Stored point canvas');
    expect(canvas).toHaveAttribute('data-stroke-count', '1');

    fireEvent.pointerDown(canvas, {
      pointerId: 9,
      clientX: 32,
      clientY: 48,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 9,
      clientX: 96,
      clientY: 128,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 9,
      clientX: 96,
      clientY: 128,
    });

    expect(draftSnapshot).toContain('"version":1');

    draftStorage.clearDraftSnapshot();
    expect(draftSnapshot).toBeNull();
  });
});
