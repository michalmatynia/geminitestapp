/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurAiTutorDrawingCanvas } from './KangurAiTutorDrawingCanvas';

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
  globalCompositeOperation: 'source-over',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
} as unknown as CanvasRenderingContext2D;

describe('KangurAiTutorDrawingCanvas', () => {
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
    Object.defineProperty(HTMLCanvasElement.prototype, 'releasePointerCapture', {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
  });

  it('renders the drawing shell with storefront surface tokens', () => {
    render(
      <KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />
    );

    expect(screen.getByTestId('kangur-ai-tutor-drawing-canvas')).toHaveClass(
      'kangur-chat-card',
      'kangur-chat-surface-warm',
      'kangur-chat-surface-warm-shadow'
    );
    expect(screen.getByText('Rysowanie')).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Zamknij' })).toHaveClass(
      'focus-visible:ring-amber-200/70',
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
      'hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
    expect(screen.getByRole('button', { name: 'Kolor #2563eb' })).toHaveClass(
      '[border-color:var(--kangur-soft-card-border)]'
    );
    expect(screen.getByRole('button', { name: 'Grubość 2px' })).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Pióro' })).toHaveClass(
      '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))]',
      '[color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );
    expect(screen.getByRole('button', { name: 'Gumka' })).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Cofnij' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ponów' })).toBeDisabled();
  });

  it('keeps cancel wired while the themed shell is open', () => {
    const onCancel = vi.fn();

    render(<KangurAiTutorDrawingCanvas onCancel={onCancel} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps redo history available after undoing a tutor stroke', () => {
    render(<KangurAiTutorDrawingCanvas onCancel={vi.fn()} onComplete={vi.fn()} />);

    const canvas = screen.getByLabelText('Plansza do rysowania');
    const undoButton = screen.getByRole('button', { name: 'Cofnij' });
    const redoButton = screen.getByRole('button', { name: 'Ponów' });

    fireEvent.pointerDown(canvas, {
      pointerId: 4,
      clientX: 40,
      clientY: 48,
    });
    fireEvent.pointerMove(canvas, {
      pointerId: 4,
      clientX: 100,
      clientY: 120,
    });
    fireEvent.pointerUp(canvas, {
      pointerId: 4,
      clientX: 100,
      clientY: 120,
    });

    expect(undoButton).toBeEnabled();
    expect(redoButton).toBeDisabled();

    fireEvent.click(undoButton);
    expect(redoButton).toBeEnabled();

    fireEvent.click(redoButton);
    expect(redoButton).toBeDisabled();
  });
});
