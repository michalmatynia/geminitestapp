/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

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
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
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
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('shows touch guidance, larger buttons, and active board feedback on coarse pointers', () => {
    render(<AgenticDiagramFillGame gameId='operating_loop_arrow' />);

    expect(screen.getByTestId('agentic-diagram-touch-hint')).toHaveTextContent(
      'Rysuj palcem po brakującym fragmencie schematu.'
    );
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
});
