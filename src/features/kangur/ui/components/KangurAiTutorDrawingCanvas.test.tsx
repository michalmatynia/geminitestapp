/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createKangurFreeformDrawingSnapshot,
  serializeKangurFreeformDrawingSnapshot,
} from '@/features/kangur/ui/components/drawing-engine/freeform-snapshots';
import type { KangurDrawingDraftStorageController } from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import { DEFAULT_KANGUR_AI_TUTOR_CONTENT } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
const { downloadKangurDataUrl } = vi.hoisted(() => ({
  downloadKangurDataUrl: vi.fn(),
}));
vi.mock('@/features/kangur/ui/components/drawing-engine/canvas-export', async () => {
  const actual = await vi.importActual<
    typeof import('@/features/kangur/ui/components/drawing-engine/canvas-export')
  >('@/features/kangur/ui/components/drawing-engine/canvas-export');

  return {
    ...actual,
    downloadKangurDataUrl,
  };
});
import { KangurAiTutorDrawingCanvas } from './KangurAiTutorDrawingCanvas';

const canvasContextStub = {
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

const createDraftStorage = (
  initialDraftSnapshot: string | null = null
): KangurDrawingDraftStorageController => {
  let draftSnapshot = initialDraftSnapshot;

  return {
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
};

const defaultTutorContentSnapshot = structuredClone(DEFAULT_KANGUR_AI_TUTOR_CONTENT);

describe('KangurAiTutorDrawingCanvas', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;
  const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;

  beforeEach(() => {
    downloadKangurDataUrl.mockReset();
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.locale = defaultTutorContentSnapshot.locale;
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.common.closeAria =
      defaultTutorContentSnapshot.common.closeAria;
    if (DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing && defaultTutorContentSnapshot.drawing) {
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.title =
        defaultTutorContentSnapshot.drawing.title;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.penLabel =
        defaultTutorContentSnapshot.drawing.penLabel;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.eraserLabel =
        defaultTutorContentSnapshot.drawing.eraserLabel;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.undoLabel =
        defaultTutorContentSnapshot.drawing.undoLabel;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.redoLabel =
        defaultTutorContentSnapshot.drawing.redoLabel;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.exportLabel =
        defaultTutorContentSnapshot.drawing.exportLabel;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.clearLabel =
        defaultTutorContentSnapshot.drawing.clearLabel;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.cancelLabel =
        defaultTutorContentSnapshot.drawing.cancelLabel;
      DEFAULT_KANGUR_AI_TUTOR_CONTENT.drawing.doneLabel =
        defaultTutorContentSnapshot.drawing.doneLabel;
    }
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContextStub);
    HTMLCanvasElement.prototype.toDataURL = vi
      .fn(() => 'data:image/png;base64,AAA') as typeof HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 320,
      height: 240,
      top: 0,
      left: 0,
      bottom: 240,
      right: 320,
      x: 0,
      y: 0,
      toJSON: () => {},
    })) as unknown as typeof HTMLCanvasElement.prototype.getBoundingClientRect;
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
    HTMLCanvasElement.prototype.toDataURL = originalToDataURL;
  });

  it('renders the drawing shell with storefront surface tokens', () => {
    render(
      <KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />
    );

    expect(screen.getByTestId('kangur-ai-tutor-drawing-canvas')).toHaveClass(
      'kangur-chat-card',
      'kangur-chat-surface-warm',
      'kangur-chat-surface-warm-shadow'
    );
    expect(screen.getByText('Rysowanie')).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Zamknij' })).toHaveClass(
      'focus-visible:ring-amber-200/70',
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
      'hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
    expect(screen.getByRole('button', { name: 'Kolor #2563eb' })).toHaveClass(
      '[border-color:var(--kangur-soft-card-border)]'
    );
    expect(screen.getByRole('button', { name: 'Grubość 2px' })).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Pióro' })).toHaveClass(
      '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))]',
      '[color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );
    expect(screen.getByRole('button', { name: 'Gumka' })).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Cofnij' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ponów' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Eksportuj PNG' })).toBeDisabled();
  });

  it('falls back to English drawing controls when tutor content still uses Polish defaults', () => {
    DEFAULT_KANGUR_AI_TUTOR_CONTENT.locale = 'en';

    render(<KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByText('Drawing')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(screen.getByLabelText('Drawing board')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pen' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Eraser' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export PNG' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('keeps cancel wired while the themed shell is open', () => {
    const onCancel = vi.fn();

    render(<KangurAiTutorDrawingCanvas onCancel={onCancel} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps redo history available after undoing a tutor stroke', () => {
    render(<KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />);

    const canvas = screen.getByLabelText('Plansza do rysowania');
    const undoButton = screen.getByRole('button', { name: 'Cofnij' });
    const redoButton = screen.getByRole('button', { name: 'Ponów' });

    fireEvent.pointerDown(canvas, {
      pointerId: 4,
      clientX: 40,
      clientY: 48,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 4,
      clientX: 100,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 4,
      clientX: 100,
      clientY: 120,
    });

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(undoButton);
    expect(redoButton).toBeEnabled();

    fireEvent.click(redoButton);
    expect(redoButton).toBeDisabled();
  });

  it('supports shared undo and redo keyboard shortcuts on the tutor canvas', () => {
    render(<KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />);

    const canvas = screen.getByLabelText('Plansza do rysowania');
    const doneButton = screen.getByRole('button', { name: 'Gotowe' });

    fireEvent.pointerDown(canvas, {
      pointerId: 8,
      clientX: 40,
      clientY: 48,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 8,
      clientX: 100,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 8,
      clientX: 100,
      clientY: 120,
    });

    expect(doneButton).toBeEnabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'z' });
    expect(doneButton).toBeDisabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'Z', shiftKey: true });
    expect(doneButton).toBeEnabled();
  });

  it('exports the completed drawing through the shared freeform engine api', () => {
    const onComplete = vi.fn();

    render(<KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={onComplete} />);

    const canvas = screen.getByLabelText('Plansza do rysowania');

    fireEvent.pointerDown(canvas, {
      pointerId: 10,
      clientX: 48,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 10,
      clientX: 120,
      clientY: 132,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 10,
      clientX: 120,
      clientY: 132,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Gotowe' }));

    expect(onComplete).toHaveBeenCalledWith('data:image/png;base64,AAA');
    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png');
  });

  it('exports the current tutor sketch through the shared snapshot action', () => {
    render(<KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />);

    const canvas = screen.getByLabelText('Plansza do rysowania');
    const exportButton = screen.getByRole('button', { name: 'Eksportuj PNG' });

    expect(exportButton).toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 12,
      clientX: 48,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 12,
      clientX: 120,
      clientY: 132,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 12,
      clientX: 120,
      clientY: 132,
    });

    expect(exportButton).toBeEnabled();

    fireEvent.click(exportButton);

    expect(downloadKangurDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,AAA',
      'kangur-ai-tutor-drawing.png'
    );
  });

  it('clears the external tutor draft snapshot through the managed stored freeform hook', () => {
    const draftStorage = createDraftStorage();
    const setDraftSnapshot = vi.spyOn(draftStorage, 'setDraftSnapshot');

    render(
      <KangurAiTutorDrawingCanvas
        draftStorage={draftStorage}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    const canvas = screen.getByLabelText('Plansza do rysowania');

    fireEvent.pointerDown(canvas, {
      pointerId: 13,
      clientX: 48,
      clientY: 56,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 13,
      clientX: 120,
      clientY: 132,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 13,
      clientX: 120,
      clientY: 132,
    });

    expect(setDraftSnapshot).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść' }));

    expect(setDraftSnapshot).toHaveBeenLastCalledWith(null);
  });

  it('restores an incoming draft snapshot and enables completing it after remount', async () => {
    const draftStorage = createDraftStorage(
      serializeKangurFreeformDrawingSnapshot(
        createKangurFreeformDrawingSnapshot({
          logicalHeight: 240,
          logicalWidth: 320,
          strokes: [
            {
              meta: {
                color: '#2563eb',
                isEraser: false,
                width: 4,
              },
              points: [
                { x: 30, y: 40 },
                { x: 100, y: 132 },
              ],
            },
          ],
        })
      )
    );

    render(
      <KangurAiTutorDrawingCanvas
        draftStorage={draftStorage}
        onCancel={vi.fn()}
        onComplete={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Gotowe' })).toBeEnabled();
    });
  });
});
