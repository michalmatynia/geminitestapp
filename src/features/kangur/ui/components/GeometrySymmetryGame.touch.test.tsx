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
    window.sessionStorage.clear();
    downloadKangurDataUrl.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,SYMMETRY'
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
    window.sessionStorage.clear();
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

  it('exports the current symmetry drawing through the shared snapshot action', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const exportButton = screen.getByRole('button', { name: /export png/i });
    const canvas = screen.getByTestId('geometry-symmetry-canvas');

    expect(exportButton).toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 12,
      clientX: 96,
      clientY: 80,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 12,
      clientX: 148,
      clientY: 126,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 12,
      clientX: 148,
      clientY: 126,
    });

    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);

    expect(downloadKangurDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,SYMMETRY',
      'geometry-symmetry-axis-butterfly.png'
    );
  });

  it('allows drawing immediately after the too-short warning', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const board = screen.getByTestId('geometry-symmetry-board');
    const canvas = screen.getByTestId('geometry-symmetry-canvas');
    const clearButton = screen.getByRole('button', { name: 'Clear' });
    const checkButton = screen.getByRole('button', { name: 'Check' });

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-symmetry-feedback')).toHaveTextContent(
      'Make a few strokes so there is a line to check.'
    );
    expect(clearButton).not.toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 4,
      clientX: 112,
      clientY: 84,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(board).toHaveClass('ring-2');
    expect(screen.queryByTestId('geometry-symmetry-feedback')).not.toBeInTheDocument();
  });

  it('allows clearing the empty-check warning without drawing', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const clearButton = screen.getByRole('button', { name: 'Clear' });
    const checkButton = screen.getByRole('button', { name: 'Check' });

    fireEvent.click(checkButton);

    expect(screen.getByTestId('geometry-symmetry-feedback')).toHaveTextContent(
      'Make a few strokes so there is a line to check.'
    );
    expect(clearButton).not.toBeDisabled();

    fireEvent.click(clearButton);

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

  it('restores the saved drawing draft when the symmetry board remounts on the same round', () => {
    const { unmount } = render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const canvas = screen.getByTestId('geometry-symmetry-canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 10,
      clientX: 96,
      clientY: 80,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 10,
      clientX: 148,
      clientY: 126,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 10,
      clientX: 148,
      clientY: 126,
    });

    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled();

    unmount();

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometrySymmetryGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled();
  });
});
