/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurAiTutorDrawingCanvas } from './KangurAiTutorDrawingCanvas';

const canvasContextStub = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '#ffffff',
  globalCompositeOperation: 'source-over',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
} as unknown as CanvasRenderingContext2D;

describe('KangurAiTutorDrawingCanvas touch interactions', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContextStub);
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
  });

  afterEach(() => {
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('enlarges touch controls and shows active board feedback on coarse pointers', () => {
    render(<KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Kolor #2563eb' })).toHaveClass('h-8', 'w-8');
    expect(screen.getByRole('button', { name: 'Pióro' })).toHaveClass('h-9', 'w-9');

    const board = screen.getByTestId('kangur-ai-tutor-drawing-board');
    const canvas = screen.getByLabelText('Plansza do rysowania');

    fireEvent.pointerDown(canvas, {
      pointerId: 6,
      clientX: 100,
      clientY: 100,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(board).toHaveClass('ring-2');
  });
});
