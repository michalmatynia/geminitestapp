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
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      canvasContextStub as unknown as CanvasRenderingContext2D
    );
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
});
