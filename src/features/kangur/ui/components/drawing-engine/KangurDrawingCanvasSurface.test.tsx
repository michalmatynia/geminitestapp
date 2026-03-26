/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { KangurDrawingCanvasSurface } from '@/features/kangur/ui/components/drawing-engine/KangurDrawingCanvasSurface';

describe('KangurDrawingCanvasSurface', () => {
  it('renders the shared drawing shell with overlays and canvas metadata', () => {
    const canvasRef = createRef<HTMLCanvasElement>();

    render(
      <KangurDrawingCanvasSurface
        afterCanvas={<div data-testid='drawing-after'>after</div>}
        ariaDescribedBy='drawing-help'
        ariaKeyShortcuts='Enter Space'
        ariaLabel='Shared drawing board'
        beforeCanvas={<div data-testid='drawing-before'>before</div>}
        canvasClassName='rounded-xl'
        canvasDataTestId='drawing-canvas'
        canvasRef={canvasRef}
        canvasStyle={{ background: 'rgb(255, 255, 255)' }}
        height={220}
        isPointerDrawing
        onPointerDown={vi.fn()}
        onPointerMove={vi.fn()}
        onPointerUp={vi.fn()}
        role='img'
        shellClassName='relative overflow-hidden'
        shellDataTestId='drawing-shell'
        tabIndex={0}
        width={320}
      />
    );

    expect(screen.getByTestId('drawing-shell')).toHaveClass('relative', 'overflow-hidden');
    expect(screen.getByTestId('drawing-before')).toHaveTextContent('before');
    expect(screen.getByTestId('drawing-after')).toHaveTextContent('after');

    const canvas = screen.getByTestId('drawing-canvas');
    expect(canvas).toHaveClass('kangur-drawing-canvas', 'touch-none', 'rounded-xl');
    expect(canvas).toHaveAttribute('aria-label', 'Shared drawing board');
    expect(canvas).toHaveAttribute('aria-describedby', 'drawing-help');
    expect(canvas).toHaveAttribute('aria-keyshortcuts', 'Enter Space');
    expect(canvas).toHaveAttribute('data-drawing-active', 'true');
    expect(canvas).toHaveAttribute('role', 'img');
    expect(canvas).toHaveAttribute('tabindex', '0');
    expect(canvasRef.current).toBe(canvas);
  });

  it('forwards pointer and keyboard handlers to the shared canvas element', () => {
    const onPointerDown = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerUp = vi.fn();
    const onPointerCancel = vi.fn();
    const onPointerLeave = vi.fn();
    const onKeyDown = vi.fn();

    render(
      <KangurDrawingCanvasSurface
        ariaLabel='Interactive drawing board'
        canvasRef={createRef<HTMLCanvasElement>()}
        height={200}
        isPointerDrawing={false}
        onKeyDown={onKeyDown}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerLeave={onPointerLeave}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        width={300}
      />
    );

    const canvas = screen.getByLabelText('Interactive drawing board');

    fireEvent.pointerDown(canvas, { pointerId: 1, clientX: 12, clientY: 18 });
    fireEvent.pointerMove(canvas, { pointerId: 1, clientX: 24, clientY: 30 });
    fireEvent.pointerUp(canvas, { pointerId: 1, clientX: 36, clientY: 42 });
    fireEvent.pointerCancel(canvas, { pointerId: 1 });
    fireEvent.pointerLeave(canvas, { pointerId: 1 });
    fireEvent.keyDown(canvas, { key: 'Enter' });

    expect(onPointerDown).toHaveBeenCalledTimes(1);
    expect(onPointerMove).toHaveBeenCalledTimes(1);
    expect(onPointerUp).toHaveBeenCalledTimes(1);
    expect(onPointerCancel).toHaveBeenCalledTimes(1);
    expect(onPointerLeave).toHaveBeenCalledTimes(1);
    expect(onKeyDown).toHaveBeenCalledTimes(1);
    expect(canvas).toHaveAttribute('data-drawing-active', 'false');
  });
});
