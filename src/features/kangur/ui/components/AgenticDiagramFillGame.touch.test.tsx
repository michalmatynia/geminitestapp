/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));
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

import AgenticDiagramFillGame from '@/features/kangur/ui/components/AgenticDiagramFillGame';

const canvasContextStub = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  resetTransform: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
};

describe('AgenticDiagramFillGame touch interactions', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    window.sessionStorage.clear();
    downloadKangurDataUrl.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,DIAGRAM'
    );
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 360,
      height: 200,
      top: 0,
      left: 0,
      bottom: 200,
      right: 360,
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
    window.sessionStorage.clear();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('shows touch guidance, larger buttons, and active board feedback on coarse pointers', () => {
    render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    expect(screen.getByTestId('agentic-diagram-touch-hint')).toHaveTextContent(
      'Rysuj palcem po brakującym fragmencie schematu.'
    );
    expect(screen.getByRole('button', { name: 'Cofnij' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Ponów' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Wyczyść' })).toHaveClass('min-h-11');
    expect(screen.getByRole('button', { name: 'Sprawdź' })).toHaveClass('min-h-11');

    const board = screen.getByTestId('agentic-diagram-board');
    const canvas = screen.getByTestId('agentic-diagram-canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 5,
      clientX: 40,
      clientY: 90,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(board).toHaveClass('ring-2');
    expect(screen.getByTestId('agentic-diagram-touch-hint')).toHaveTextContent(
      'Kontynuuj jednym płynnym ruchem'
    );
  });

  it('uses the shared undo and redo drawing controls for diagram boards', () => {
    render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    const checkButton = screen.getByRole('button', { name: 'Sprawdź' });
    const undoButton = screen.getByRole('button', { name: 'Cofnij' });
    const redoButton = screen.getByRole('button', { name: 'Ponów' });
    const canvas = screen.getByTestId('agentic-diagram-canvas');

    expect(checkButton).toBeDisabled();
    expect(undoButton).toBeDisabled();
    expect(redoButton).toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 6,
      clientX: 168,
      clientY: 52,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 6,
      clientX: 240,
      clientY: 96,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 6,
      clientX: 286,
      clientY: 136,
    });

    expect(checkButton).not.toBeDisabled();
    expect(undoButton).not.toBeDisabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(undoButton);

    expect(checkButton).toBeDisabled();
    expect(undoButton).toBeDisabled();
    expect(redoButton).not.toBeDisabled();

    fireEvent.click(redoButton);

    expect(checkButton).not.toBeDisabled();
    expect(undoButton).not.toBeDisabled();
    expect(redoButton).toBeDisabled();
  });

  it('supports shared undo and redo keyboard shortcuts on the diagram board', () => {
    render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    const checkButton = screen.getByRole('button', { name: 'Sprawdź' });
    const canvas = screen.getByTestId('agentic-diagram-canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 16,
      clientX: 168,
      clientY: 52,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 16,
      clientX: 240,
      clientY: 96,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 16,
      clientX: 286,
      clientY: 136,
    });

    expect(checkButton).toBeEnabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'z' });
    expect(checkButton).toBeDisabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'Z', shiftKey: true });
    expect(checkButton).toBeEnabled();
  });

  it('exports the current diagram drawing through the shared snapshot action', () => {
    render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    const exportButton = screen.getByRole('button', { name: 'Eksportuj PNG' });
    const canvas = screen.getByTestId('agentic-diagram-canvas');

    expect(exportButton).toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 7,
      clientX: 168,
      clientY: 52,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 7,
      clientX: 240,
      clientY: 96,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 7,
      clientX: 286,
      clientY: 136,
    });

    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);

    expect(downloadKangurDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,DIAGRAM',
      'operating_loop_arrow-diagram.png'
    );
  });

  it('restores the saved diagram draft on remount and clears it when the board is reset', () => {
    const firstRender = render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    const drawButton = screen.getByRole('button', { name: 'Sprawdź' });
    const canvas = screen.getByTestId('agentic-diagram-canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 8,
      clientX: 168,
      clientY: 52,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 8,
      clientX: 240,
      clientY: 96,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 8,
      clientX: 286,
      clientY: 136,
    });

    expect(drawButton).not.toBeDisabled();

    firstRender.unmount();

    const secondRender = render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    expect(screen.getByRole('button', { name: 'Sprawdź' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Wyczyść' }));

    expect(screen.getByRole('button', { name: 'Sprawdź' })).toBeDisabled();

    secondRender.unmount();

    render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    expect(screen.getByRole('button', { name: 'Sprawdź' })).toBeDisabled();
  });
});
