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

import GeometryPerimeterDrawingGame from '@/features/kangur/ui/components/GeometryPerimeterDrawingGame';
import enMessages from '@/i18n/messages/en.json';

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

describe('GeometryPerimeterDrawingGame touch interactions', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    window.sessionStorage.clear();
    downloadKangurDataUrl.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue(
      'data:image/png;base64,PERIMETER'
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
        <GeometryPerimeterDrawingGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('geometry-perimeter-input-help')).toHaveTextContent(
      'The drawing area supports mouse, touch, or keyboard.'
    );

    const board = screen.getByTestId('geometry-perimeter-board');
    const canvas = screen.getByTestId('geometry-perimeter-canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 3,
      clientX: 84,
      clientY: 88,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(board).toHaveClass('ring-2');
  });

  it('exports the current perimeter drawing through the shared snapshot action', () => {
    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometryPerimeterDrawingGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const exportButton = screen.getByRole('button', { name: /export png/i });
    const canvas = screen.getByTestId('geometry-perimeter-canvas');

    expect(exportButton).toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 9,
      clientX: 84,
      clientY: 88,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 9,
      clientX: 132,
      clientY: 136,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 9,
      clientX: 132,
      clientY: 136,
    });

    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);

    expect(downloadKangurDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,PERIMETER',
      'geometry-perimeter-square-3.png'
    );
  });

  it('restores the saved drawing draft when the perimeter board remounts on the same round', () => {
    const { unmount } = render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometryPerimeterDrawingGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    const canvas = screen.getByTestId('geometry-perimeter-canvas');

    fireEvent.pointerDown(canvas, {
      pointerId: 6,
      clientX: 84,
      clientY: 88,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 6,
      clientX: 132,
      clientY: 136,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 6,
      clientX: 132,
      clientY: 136,
    });

    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled();

    unmount();

    render(
      <NextIntlClientProvider locale='en' messages={enMessages}>
        <GeometryPerimeterDrawingGame onFinish={() => undefined} />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled();
  });
});
