/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import GeometryDrawingGame from '@/features/kangur/ui/components/GeometryDrawingGame';

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

    expect(screen.getByText('1/4')).toBeInTheDocument();
    expect(starterButton).toHaveClass('kangur-cta-pill', 'surface-cta');
    expect(proButton).toHaveClass('kangur-cta-pill', 'soft-cta');

    fireEvent.click(proButton);

    expect(screen.getByText('1/6')).toBeInTheDocument();
    expect(starterButton).toHaveClass('kangur-cta-pill', 'soft-cta');
    expect(proButton).toHaveClass('kangur-cta-pill', 'surface-cta');
  });
});
