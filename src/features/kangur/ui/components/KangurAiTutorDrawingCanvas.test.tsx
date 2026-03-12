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
  stroke: vi.fn(),
  fillStyle: '#ffffff',
  globalCompositeOperation: 'source-over',
  lineCap: 'round',
  lineJoin: 'round',
  lineWidth: 1,
  strokeStyle: '#000000',
} as unknown as CanvasRenderingContext2D;

describe('KangurAiTutorDrawingCanvas', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(canvasContextStub);
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
      'hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
    expect(screen.getByRole('button', { name: '#2563eb' })).toHaveClass(
      '[border-color:var(--kangur-soft-card-border)]'
    );
    expect(screen.getByRole('button', { name: '2px' })).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Pióro' })).toHaveClass(
      '[background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_82%,#fef3c7))]',
      '[color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))]'
    );
    expect(screen.getByRole('button', { name: 'Gumka' })).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
    );
    expect(screen.getByRole('button', { name: 'Cofnij' })).toHaveClass(
      '[color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
      'hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
    );
  });

  it('keeps cancel wired while the themed shell is open', () => {
    const onCancel = vi.fn();

    render(<KangurAiTutorDrawingCanvas onCancel={onCancel} onComplete={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
