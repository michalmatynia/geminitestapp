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

import AlphabetBasicsLesson from '@/features/kangur/ui/components/AlphabetBasicsLesson';
import AlphabetCopyLesson from '@/features/kangur/ui/components/AlphabetCopyLesson';
import enMessages from '@/i18n/messages/en.json';

const canvasContextStub = {
  beginPath: vi.fn(),
  clearRect: vi.fn(),
  lineTo: vi.fn(),
  moveTo: vi.fn(),
  resetTransform: vi.fn(),
  scale: vi.fn(),
  setTransform: vi.fn(),
  stroke: vi.fn(),
  shadowBlur: 0,
  shadowColor: '',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
};

const renderWithMessages = (ui: React.ReactElement) =>
  render(
    <NextIntlClientProvider locale='en' messages={enMessages}>
      {ui}
    </NextIntlClientProvider>
  );

describe('Alphabet touch lessons', () => {
  const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

  beforeEach(() => {
    window.sessionStorage.clear();
    downloadKangurDataUrl.mockReset();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockImplementation(function () {
      const label = this.getAttribute('aria-label');
      if (label === 'Trace the letter A') {
        return 'data:image/png;base64,BASICS';
      }

      if (label === 'Copy the letter L below the model') {
        return 'data:image/png;base64,COPY';
      }

      return 'data:image/png;base64,ALPHABET';
    });
    HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 360,
      height: 260,
      top: 0,
      left: 0,
      bottom: 260,
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

  it('shows mobile tracing help and active-state feedback in the alphabet basics lesson', () => {
    renderWithMessages(<AlphabetBasicsLesson />);

    expect(screen.getByTestId('alphabet-basics-touch-hint')).toHaveTextContent(
      'Trace with your finger on the guide'
    );

    const canvas = screen.getByLabelText('Trace the letter A');
    const shell = screen.getByTestId('alphabet-basics-canvas-shell');

    fireEvent.pointerDown(canvas, {
      pointerId: 7,
      clientX: 100,
      clientY: 100,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(shell).toHaveClass('ring-2');
    expect(screen.getByTestId('alphabet-basics-touch-hint')).toHaveTextContent(
      'Draw over the thick lines and take your time.'
    );
  });

  it('shows lower-line copying help and active-state feedback in the alphabet copy lesson', () => {
    renderWithMessages(<AlphabetCopyLesson />);

    expect(screen.getByTestId('alphabet-copy-touch-hint')).toHaveTextContent(
      'Copy the letter with your finger on the lower lines'
    );

    const canvas = screen.getByLabelText('Copy the letter L below the model');
    const shell = screen.getByTestId('alphabet-copy-canvas-shell');

    fireEvent.pointerDown(canvas, {
      pointerId: 9,
      clientX: 160,
      clientY: 180,
    });

    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(shell).toHaveClass('ring-2');
    expect(screen.getByTestId('alphabet-copy-touch-hint')).toHaveTextContent(
      'Stay on the lines and do not rush.'
    );
  });

  it('restores saved tracing strokes when the alphabet basics lesson remounts', () => {
    const { unmount } = renderWithMessages(<AlphabetBasicsLesson />);

    const canvas = screen.getByLabelText('Trace the letter A');

    fireEvent.pointerDown(canvas, {
      pointerId: 13,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 13,
      clientX: 180,
      clientY: 150,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 13,
      clientX: 180,
      clientY: 150,
    });

    expect(screen.getByText('2 points')).toBeInTheDocument();

    unmount();

    renderWithMessages(<AlphabetBasicsLesson />);

    expect(screen.getByText('2 points')).toBeInTheDocument();
  });

  it('exports the current tracing attempt from the alphabet basics lesson', () => {
    renderWithMessages(<AlphabetBasicsLesson />);

    const exportButton = screen.getByTestId('alphabet-basics-export');
    const canvas = screen.getByLabelText('Trace the letter A');

    expect(exportButton).toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 15,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 15,
      clientX: 180,
      clientY: 150,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 15,
      clientX: 180,
      clientY: 150,
    });

    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);

    expect(downloadKangurDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,BASICS',
      'alphabet-basics-A.png'
    );
  });

  it('exports the current copying attempt from the alphabet copy lesson', () => {
    renderWithMessages(<AlphabetCopyLesson />);

    const exportButton = screen.getByTestId('alphabet-copy-export');
    const canvas = screen.getByLabelText('Copy the letter L below the model');

    expect(exportButton).toBeDisabled();

    fireEvent.pointerDown(canvas, {
      pointerId: 17,
      clientX: 160,
      clientY: 180,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 17,
      clientX: 220,
      clientY: 196,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 17,
      clientX: 220,
      clientY: 196,
    });

    expect(exportButton).not.toBeDisabled();

    fireEvent.click(exportButton);

    expect(downloadKangurDataUrl).toHaveBeenCalledWith(
      'data:image/png;base64,COPY',
      'alphabet-copy-L.png'
    );
  });

  it('supports shared undo and redo keyboard shortcuts in the alphabet basics lesson', () => {
    renderWithMessages(<AlphabetBasicsLesson />);

    const canvas = screen.getByLabelText('Trace the letter A');
    const exportButton = screen.getByTestId('alphabet-basics-export');

    fireEvent.pointerDown(canvas, {
      pointerId: 19,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 19,
      clientX: 180,
      clientY: 150,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 19,
      clientX: 180,
      clientY: 150,
    });

    expect(screen.getByText('2 points')).toBeInTheDocument();
    expect(exportButton).toBeEnabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'z' });
    expect(screen.queryByText('2 points')).not.toBeInTheDocument();
    expect(exportButton).toBeDisabled();

    fireEvent.keyDown(canvas, { ctrlKey: true, key: 'Z', shiftKey: true });
    expect(screen.getByText('2 points')).toBeInTheDocument();
    expect(exportButton).toBeEnabled();
  });
});
