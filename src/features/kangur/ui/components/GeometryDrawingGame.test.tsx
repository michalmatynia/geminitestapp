/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';
import * as geometryDrawingService from '@/features/kangur/ui/services/geometry-drawing';

const canvasContextStub = {
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
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
};

describe('GeometryDrawingGame', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 320,
      height: 220,
      top: 0,
      left: 0,
      bottom: 220,
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
  });

  it('renders the difficulty switch with shared Kangur button variants', () => {
    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const starterButton = screen.getByTestId('geometry-difficulty-starter');
    const proButton = screen.getByTestId('geometry-difficulty-pro');
    const board = screen.getByTestId('geometry-drawing-board');
    const difficultyShell = screen.getByTestId('geometry-difficulty-shell');

    expect(screen.getByRole('group', { name: 'Poziom trudności figur' })).toBeInTheDocument();
    expect(screen.getByTestId('geometry-drawing-progress-label')).toHaveTextContent('1/4');
    expect(screen.getByTestId('geometry-drawing-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('geometry-drawing-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      'Runda 1 z 4'
    );
    expect(difficultyShell).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(screen.getByTestId('geometry-drawing-round-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(starterButton).toHaveClass('kangur-cta-pill', 'surface-cta', 'min-h-11', 'px-4');
    expect(proButton).toHaveClass('kangur-cta-pill', 'soft-cta', 'min-h-11', 'px-4');
    expect(starterButton).toHaveAttribute('aria-pressed', 'true');
    expect(proButton).toHaveAttribute('aria-pressed', 'false');
    expect(board).toHaveClass('soft-card', 'border');
    expect(
      screen.getByRole('img', { name: /Plansza do rysowania figury Koło/i })
    ).toBeInTheDocument();

    fireEvent.click(proButton);

    expect(screen.getByTestId('geometry-drawing-progress-label')).toHaveTextContent('1/8');
    expect(starterButton).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(proButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(starterButton).toHaveAttribute('aria-pressed', 'false');
    expect(proButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('supports keyboard-only drawing input on the geometry board', () => {
    const evaluateSpy = vi.spyOn(geometryDrawingService, 'evaluateGeometryDrawing').mockReturnValue({
      accepted: false,
      score: 0.12,
      corners: 2,
      closureRatio: 0.33,
      aspectRatio: 1,
      lengthRatio: 0.4,
      message: 'Niepoprawna figura.',
    });

    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const canvas = screen.getByTestId('geometry-drawing-canvas');
    const clearButton = screen.getByRole('button', { name: /wyczyść/i });
    const checkButton = screen.getByRole('button', { name: /sprawdź/i });

    expect(clearButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(clearButton).toBeDisabled();
    expect(screen.getByText(/klawiaturę/i)).toBeInTheDocument();

    canvas.focus();
    fireEvent.keyDown(canvas, { key: 'Enter' });
    for (let index = 0; index < 15; index += 1) {
      fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    }
    fireEvent.keyDown(canvas, { key: 'Enter' });

    expect(screen.getByTestId('geometry-drawing-keyboard-status')).toHaveTextContent(
      'Zakończono rysowanie klawiaturą.'
    );
    expect(clearButton).not.toBeDisabled();

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-drawing-feedback')).toHaveTextContent(
      'Niepoprawna figura.'
    );
    expect(checkButton).toHaveClass('bg-rose-500');
    expect(evaluateSpy).toHaveBeenCalledTimes(1);
    expect(evaluateSpy).toHaveBeenCalledWith(
      'circle',
      expect.any(Array),
      expect.objectContaining({
        locale: 'pl',
        translate: expect.any(Function),
      })
    );
  });

  it('supports shared undo and redo keyboard shortcuts on the geometry board', () => {
    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const canvas = screen.getByTestId('geometry-drawing-canvas');
    const clearButton = screen.getByRole('button', { name: /wyczyść/i });

    canvas.focus();
    fireEvent.keyDown(canvas, { key: 'Enter' });
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'Enter' });

    expect(clearButton).toBeEnabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'z' });
    expect(clearButton).toBeDisabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'Z', shiftKey: true });
    expect(clearButton).toBeEnabled();
  });

  it('lets the learner start drawing after the too-short warning', () => {
    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const canvas = screen.getByTestId('geometry-drawing-canvas');
    const board = screen.getByTestId('geometry-drawing-board');
    const clearButton = screen.getByRole('button', { name: /wyczyść/i });
    const checkButton = screen.getByRole('button', { name: /sprawdź/i });

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-drawing-feedback')).toHaveTextContent(
      'Narysuj figurę trochę dłużej, żeby można było ją ocenić.'
    );
    expect(clearButton).not.toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 3,
      clientX: 96,
      clientY: 80,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(board).toHaveClass('ring-2');
    expect(screen.queryByTestId('geometry-drawing-feedback')).not.toBeInTheDocument();
  });

  it('allows clearing the empty-check warning without drawing', () => {
    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const clearButton = screen.getByRole('button', { name: /wyczyść/i });
    const checkButton = screen.getByRole('button', { name: /sprawdź/i });

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-drawing-feedback')).toHaveTextContent(
      'Narysuj figurę trochę dłużej, żeby można było ją ocenić.'
    );
    expect(clearButton).not.toBeDisabled();

    fireEvent.click(clearButton);

    expect(screen.queryByTestId('geometry-drawing-feedback')).not.toBeInTheDocument();
  });

  it('clears the too-short warning when the learner wipes the board', () => {
    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const canvas = screen.getByTestId('geometry-drawing-canvas');
    const clearButton = screen.getByRole('button', { name: /wyczyść/i });
    const checkButton = screen.getByRole('button', { name: /sprawdź/i });

    fireEvent.pointerDown(canvas, {
      pointerId: 4,
      clientX: 90,
      clientY: 76,
    });
    fireEvent.pointerUp(canvas, { pointerId: 4 });

    expect(clearButton).not.toBeDisabled();

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-drawing-feedback')).toHaveTextContent(
      'Narysuj figurę trochę dłużej, żeby można było ją ocenić.'
    );

    fireEvent.click(clearButton);

    expect(screen.queryByTestId('geometry-drawing-feedback')).not.toBeInTheDocument();
  });
});
