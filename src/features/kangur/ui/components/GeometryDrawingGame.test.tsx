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
  stroke: vi.fn(),
  fillStyle: '#ffffff',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
};

describe('GeometryDrawingGame', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the difficulty switch with shared Kangur button variants', () => {
    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const starterButton = screen.getByTestId('geometry-difficulty-starter');
    const proButton = screen.getByTestId('geometry-difficulty-pro');
    const board = screen.getByTestId('geometry-drawing-board');
    const difficultyShell = screen.getByTestId('geometry-difficulty-shell');

    expect(screen.getByRole('group', { name: 'Poziom trudnosci figur' })).toBeInTheDocument();
    expect(screen.getByTestId('geometry-drawing-progress-label')).toHaveTextContent('1/4');
    expect(screen.getByTestId('geometry-drawing-progress-bar')).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByTestId('geometry-drawing-progress-bar')).toHaveAttribute(
      'aria-valuetext',
      'Runda 1 z 4'
    );
    expect(difficultyShell).toHaveClass('glass-panel', 'border-white/88', 'bg-white/94');
    expect(screen.getByTestId('geometry-drawing-round-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(starterButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(proButton).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(starterButton).toHaveAttribute('aria-pressed', 'true');
    expect(proButton).toHaveAttribute('aria-pressed', 'false');
    expect(board).toHaveClass('soft-card', 'border');
    expect(
      screen.getByRole('img', { name: /Plansza do rysowania figury Koło/i })
    ).toBeInTheDocument();

    fireEvent.click(proButton);

    expect(screen.getByTestId('geometry-drawing-progress-label')).toHaveTextContent('1/6');
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
      message: 'Niepoprawna figura.',
    });

    render(<GeometryDrawingGame onFinish={() => undefined} />);

    const canvas = screen.getByTestId('geometry-drawing-canvas');
    const clearButton = screen.getByRole('button', { name: /wyczyść/i });
    const checkButton = screen.getByRole('button', { name: /sprawdź/i });

    expect(clearButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(clearButton).toBeDisabled();
    expect(screen.getByText(/klawiature/i)).toBeInTheDocument();

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

    expect(screen.queryByTestId('geometry-drawing-feedback')).not.toBeInTheDocument();
    expect(checkButton).toHaveClass('bg-rose-500');
    expect(evaluateSpy).toHaveBeenCalledTimes(1);
  });
});
