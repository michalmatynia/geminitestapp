/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next-intl', async () => await vi.importActual<typeof import('next-intl')>('next-intl'));
vi.mock('use-intl', async () => await vi.importActual<typeof import('use-intl')>('use-intl'));
vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import GeometrySymmetryGame from '@/features/kangur/ui/components/GeometrySymmetryGame';
import enMessages from '@/i18n/messages/en.json';

const canvasContextStub = {
  arc: vi.fn(),
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  closePath: vi.fn(),
  fill: vi.fn(),
  fillRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  resetTransform: vi.fn(),
  restore: vi.fn(),
  save: vi.fn(),
  scale: vi.fn(),
  setLineDash: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  fillStyle: '#ffffff',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
};

describe('GeometrySymmetryGame touch interactions', () => {
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

  it('shows mobile help and active board feedback on coarse pointers', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('geometry-symmetry-input-help')).toHaveTextContent(
      'The drawing area supports mouse, touch, or keyboard.'
    );

    const board = screen.getByTestId('geometry-symmetry-board');
    const canvas = screen.getByTestId('geometry-symmetry-canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 2,
      clientX: 96,
      clientY: 80,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(board).toHaveClass('ring-2');
  });

  it('allows drawing immediately after the too-short warning', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const board = screen.getByTestId('geometry-symmetry-board');
    const canvas = screen.getByTestId('geometry-symmetry-canvas');
    const checkButton = screen.getByRole('button', { name: 'Check' });

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-symmetry-feedback')).toHaveTextContent(
      'Make a few strokes so there is a line to check.'
    );

    fireEvent.pointerDown(canvas, {
      pointerId: 4,
      clientX: 112,
      clientY: 84,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(board).toHaveClass('ring-2');
    expect(screen.queryByTestId('geometry-symmetry-feedback')).not.toBeInTheDocument();
  });

  it('clears the too-short warning when the board is cleared', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const canvas = screen.getByTestId('geometry-symmetry-canvas');
    const clearButton = screen.getByRole('button', { name: 'Clear' });
    const checkButton = screen.getByRole('button', { name: 'Check' });

    fireEvent.pointerDown(canvas, {
      pointerId: 6,
      clientX: 108,
      clientY: 84,
    });
    fireEvent.pointerUp(canvas, { pointerId: 6 });

    expect(clearButton).not.toBeDisabled();

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-symmetry-feedback')).toHaveTextContent(
      'Make a few strokes so there is a line to check.'
    );

    fireEvent.click(clearButton);

    expect(screen.queryByTestId('geometry-symmetry-feedback')).not.toBeInTheDocument();
  });
});
