'use client';

import { fireEvent, render, screen } from '@testing-library/react';
import { useRef, useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createKangurFreeformDrawingSnapshot,
  serializeKangurFreeformDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/freeform-snapshots';
import {
  KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS,
  loadKangurDrawingDraftSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import { useKangurStoredFreeformCanvasDrawing } from '@/features/kangur/ui/components/drawing-engine/useKangurStoredFreeformCanvasDrawing';

const createRect = (input: { left: number; top: number; width: number; height: number }): DOMRect =>
  ({
    ...input,
    right: input.left + input.width,
    bottom: input.top + input.height,
    x: input.left,
    y: input.top,
    toJSON: () => ({}),
  }) as DOMRect;

function StoredFreeformCanvasHarness({
  externalDraft = false,
  initialExternalSnapshot = null,
  storageKey = null,
}: {
  externalDraft?: boolean;
  initialExternalSnapshot?: string | null;
  storageKey?: string | null;
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [draftSnapshot, setDraftSnapshot] = useState<string | null>(
    initialExternalSnapshot
  );
  const drawing = useKangurStoredFreeformCanvasDrawing({
    backgroundFill: '#ffffff',
    canvasRef,
    config: {
      colors: ['#111827', '#2563eb'],
      eraserWidthMultiplier: 4,
      preferredWidthIndex: 1,
      strokeWidths: [2, 4],
    },
    draftStorage: externalDraft
      ? {
          clearDraftSnapshot: () => setDraftSnapshot(null),
          draftSnapshot,
          setDraftSnapshot,
        }
      : undefined,
    logicalHeight: 220,
    logicalWidth: 320,
    shouldCommitStroke: (stroke) => stroke.points.length >= 2,
    storageKey,
    touchLockEnabled: true,
  });

  return (
    <>
      <canvas
        ref={canvasRef}
        aria-label='Stored freeform canvas'
        data-draft-snapshot={drawing.draftSnapshot ?? ''}
        data-stroke-count={String(drawing.strokes.length)}
        onPointerCancel={drawing.handlePointerUp}
        onPointerDown={drawing.handlePointerDown}
        onPointerLeave={drawing.handlePointerUp}
        onPointerMove={drawing.handlePointerMove}
        onPointerUp={drawing.handlePointerUp}
      />
      <button type='button' onClick={drawing.clearDraftSnapshot}>
        Clear draft
      </button>
    </>
  );
}

describe('useKangurStoredFreeformCanvasDrawing', () => {
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
    vi.useRealTimers();
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('hydrates and persists freeform drafts through the shared storage key path', () => {
    window.sessionStorage.setItem(
      'kangur-drawing-draft-v1:kangur-ai-tutor-drawing',
      serializeKangurFreeformDrawingSnapshot(
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
                { x: 24, y: 40 },
                { x: 96, y: 124 },
              ],
            },
          ],
        })
      )
    );

    render(<StoredFreeformCanvasHarness storageKey='kangur-ai-tutor-drawing' />);

    const canvas = screen.getByLabelText('Stored freeform canvas');
    expect(canvas).toHaveAttribute('data-stroke-count', '1');

    fireEvent.pointerDown(canvas, {
      pointerId: 5,
      clientX: 32,
      clientY: 48,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 5,
      clientX: 112,
      clientY: 136,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 5,
      clientX: 112,
      clientY: 136,
    });

    vi.advanceTimersByTime(KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS);

    expect(loadKangurDrawingDraftSnapshot('kangur-ai-tutor-drawing')).toContain(
      '"version":1'
    );
  });

  it('supports injected external draft controllers for shared freeform consumers', () => {
    render(
      <StoredFreeformCanvasHarness
        externalDraft
        initialExternalSnapshot={serializeKangurFreeformDrawingSnapshot(
          createKangurFreeformDrawingSnapshot({
            logicalHeight: 220,
            logicalWidth: 320,
            strokes: [
              {
                meta: {
                  color: '#111827',
                  isEraser: false,
                  width: 4,
                },
                points: [
                  { x: 20, y: 24 },
                  { x: 60, y: 84 },
                ],
              },
            ],
          })
        )}
      />
    );

    const canvas = screen.getByLabelText('Stored freeform canvas');
    expect(canvas).toHaveAttribute('data-stroke-count', '1');
    expect(canvas.getAttribute('data-draft-snapshot')).toContain('"version":1');

    fireEvent.click(screen.getByRole('button', { name: 'Clear draft' }));

    expect(canvas).toHaveAttribute('data-draft-snapshot', '');
  });
});
