/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  vectorDrawingProviderMock,
  vectorDrawingCanvasMock,
  vectorDrawingToolbarMock,
  useVectorDrawingShortcutsMock,
  useVectorDrawingStateMock,
} = vi.hoisted(() => ({
  vectorDrawingProviderMock: vi.fn(
    ({
      value,
      children,
    }: {
      value: Record<string, unknown>;
      children: React.ReactNode;
    }) => <div data-context={JSON.stringify(value)}>{children}</div>
  ),
  vectorDrawingCanvasMock: vi.fn(
    (props: Record<string, unknown>) => <div data-testid='vector-drawing-canvas'>{JSON.stringify(props)}</div>
  ),
  vectorDrawingToolbarMock: vi.fn(
    (props: Record<string, unknown>) => <div data-testid='vector-drawing-toolbar'>{JSON.stringify(props)}</div>
  ),
  useVectorDrawingShortcutsMock: vi.fn(),
  useVectorDrawingStateMock: vi.fn(),
}));

vi.mock('../context/VectorDrawingContext', () => ({
  VectorDrawingProvider: ({
    value,
    children,
  }: {
    value: Record<string, unknown>;
    children: React.ReactNode;
  }) => vectorDrawingProviderMock({ value, children }),
}));

vi.mock('./VectorDrawingCanvas', () => ({
  VectorDrawingCanvas: (props: Record<string, unknown>) => vectorDrawingCanvasMock(props),
}));

vi.mock('./VectorDrawingToolbar', () => ({
  VectorDrawingToolbar: (props: Record<string, unknown>) => vectorDrawingToolbarMock(props),
}));

vi.mock('../hooks/useVectorDrawingShortcuts', () => ({
  useVectorDrawingShortcuts: (config: Record<string, unknown>) =>
    useVectorDrawingShortcutsMock(config),
}));

vi.mock('../hooks/useVectorDrawingState', () => ({
  useVectorDrawingState: (props: Record<string, unknown>) => useVectorDrawingStateMock(props),
}));

import { VectorDrawing } from './VectorDrawing';

describe('VectorDrawing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useVectorDrawingStateMock.mockReturnValue({
      shapes: [{ id: 'shape-1' }],
      currentTool: 'polygon',
      resolvedActiveShapeId: 'shape-1',
      resolvedSelectedPointIndex: 2,
      handleChange: vi.fn(),
      handleToolChange: vi.fn(),
      handleSelectShape: vi.fn(),
      handleSelectPoint: vi.fn(),
      handleSmooth: vi.fn(),
      handleSimplify: vi.fn(),
      handleUndo: vi.fn(),
      handleRedo: vi.fn(),
      output: { path: 'M0 0 L1 1' },
      canUndo: true,
      canRedo: false,
    });
  });

  it('builds provider context, registers shortcuts, and renders the canvas and toolbar', () => {
    render(
      <VectorDrawing
        className='vector-shell'
        canvasClassName='canvas-shell'
        toolbarClassName='toolbar-shell'
        toolbarVariant='min'
        imageSrc='/image.png'
        brushRadius={14}
      />
    );

    expect(useVectorDrawingShortcutsMock).toHaveBeenCalledWith({
      onUndo: expect.any(Function),
      onRedo: expect.any(Function),
      onToolChange: expect.any(Function),
    });
    expect(vectorDrawingProviderMock).toHaveBeenCalledTimes(1);
    expect(vectorDrawingProviderMock.mock.calls[0]?.[0]?.value).toMatchObject({
      shapes: [{ id: 'shape-1' }],
      tool: 'polygon',
      activeShapeId: 'shape-1',
      selectedPointIndex: 2,
      brushRadius: 14,
      imageSrc: '/image.png',
      allowWithoutImage: false,
      showEmptyState: true,
      emptyStateLabel: 'Select an image slot to preview.',
      disableUndo: false,
      disableRedo: true,
    });
    expect(screen.getByTestId('vector-drawing-canvas')).toHaveTextContent(
      JSON.stringify({ className: 'canvas-shell' })
    );
    expect(screen.getByTestId('vector-drawing-toolbar')).toHaveTextContent(
      JSON.stringify({ className: 'toolbar-shell', variant: 'min' })
    );
    expect(screen.getByText('M0 0 L1 1')).toHaveClass('sr-only');
  });

  it('hides the output path helper when onOutput is provided', () => {
    render(<VectorDrawing onOutput={vi.fn()} />);

    expect(screen.queryByText('M0 0 L1 1')).not.toBeInTheDocument();
  });
});
