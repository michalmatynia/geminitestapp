import { render, screen } from '@testing-library/react';

import { KangurTracingBoard } from '@/features/kangur/ui/components/drawing-engine/KangurTracingBoard';

describe('KangurTracingBoard', () => {
  it('renders the shared tracing shell, touch hint, footer labels, and guide layers', () => {
    const canvasRef = { current: null };

    render(
      <KangurTracingBoard
        boardOverlay={<div aria-hidden='true'>Guide overlay</div>}
        canvasAriaLabel='Trace the letter A'
        canvasRef={canvasRef}
        footerHint='Trace on the bold line'
        footerPointsLabel='12 points'
        guideSurface={<div aria-hidden='true'>Guide surface</div>}
        height={240}
        isCoarsePointer
        isPointerDrawing
        onPointerCancel={() => {}}
        onPointerDown={() => {}}
        onPointerLeave={() => {}}
        onPointerMove={() => {}}
        onPointerUp={() => {}}
        shellDataTestId='tracing-shell'
        shellStyle={{ aspectRatio: '3 / 2' }}
        touchHint='Trace with your finger'
        touchHintTestId='tracing-touch-hint'
        width={360}
      />
    );

    expect(screen.getByTestId('tracing-touch-hint')).toHaveTextContent('Trace with your finger');
    expect(screen.getByTestId('tracing-shell')).toHaveClass('ring-2');
    expect(screen.getByText('Guide surface')).toBeVisible();
    expect(screen.getByText('Guide overlay')).toBeVisible();
    expect(screen.getByText('Trace on the bold line')).toBeVisible();
    expect(screen.getByText('12 points')).toBeVisible();
    expect(screen.getByLabelText('Trace the letter A')).toHaveAttribute('data-drawing-active', 'true');
  });

  it('skips the touch hint card for non-coarse pointers', () => {
    const canvasRef = { current: null };

    render(
      <KangurTracingBoard
        canvasAriaLabel='Trace the letter B'
        canvasRef={canvasRef}
        footerHint='Trace here'
        footerPointsLabel='0 points'
        guideSurface={<div aria-hidden='true'>Guide surface</div>}
        height={240}
        isCoarsePointer={false}
        isPointerDrawing={false}
        onPointerDown={() => {}}
        onPointerMove={() => {}}
        onPointerUp={() => {}}
        shellDataTestId='tracing-shell'
        shellStyle={{ aspectRatio: '3 / 2' }}
        touchHint='Trace with your finger'
        touchHintTestId='tracing-touch-hint'
        width={360}
      />
    );

    expect(screen.queryByTestId('tracing-touch-hint')).not.toBeInTheDocument();
    expect(screen.getByTestId('tracing-shell')).not.toHaveClass('ring-2');
  });
});
