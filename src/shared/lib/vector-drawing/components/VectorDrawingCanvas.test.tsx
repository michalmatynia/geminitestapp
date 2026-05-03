/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  vectorCanvasMock,
  vectorCanvasProviderMock,
  useOptionalVectorDrawingStateMock,
  useOptionalVectorDrawingActionsMock,
} = vi.hoisted(() => ({
  vectorCanvasMock: vi.fn(() => <div data-testid='vector-canvas' />),
  vectorCanvasProviderMock: vi.fn(
    ({
      value,
      children,
    }: {
      value: Record<string, unknown>;
      children: React.ReactNode;
    }) => <div data-context={JSON.stringify(value)}>{children}</div>
  ),
  useOptionalVectorDrawingStateMock: vi.fn(),
  useOptionalVectorDrawingActionsMock: vi.fn(),
}));

vi.mock('@/shared/ui/data-display.public', () => ({
  VectorCanvas: () => vectorCanvasMock(),
}));

vi.mock('@/shared/ui/vector-canvas/VectorCanvasContext', () => ({
  VectorCanvasProvider: ({
    value,
    children,
  }: {
    value: Record<string, unknown>;
    children: React.ReactNode;
  }) => vectorCanvasProviderMock({ value, children }),
  useOptionalVectorCanvasContext: vi.fn(),
}));

vi.mock('../context/VectorDrawingContext', () => ({
  useOptionalVectorDrawingState: () => useOptionalVectorDrawingStateMock(),
  useOptionalVectorDrawingActions: () => useOptionalVectorDrawingActionsMock(),
}));

import { VectorDrawingCanvas } from './VectorDrawingCanvas';

describe('VectorDrawingCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders an empty placeholder when required drawing state is missing', () => {
    useOptionalVectorDrawingStateMock.mockReturnValue(null);
    useOptionalVectorDrawingActionsMock.mockReturnValue(null);

    const { container } = render(<VectorDrawingCanvas />);

    expect(container.firstChild).toBeInstanceOf(HTMLDivElement);
    expect(screen.queryByTestId('vector-canvas')).not.toBeInTheDocument();
    expect(vectorCanvasProviderMock).not.toHaveBeenCalled();
  });

  it('hydrates the canvas provider from context and prop overrides', () => {
    const onChange = vi.fn();
    const onSelectShape = vi.fn();
    const onSelectPoint = vi.fn();
    const onImageOffsetChange = vi.fn();
    const onViewCropRectChange = vi.fn();
    const onImageContentFrameChange = vi.fn();

    useOptionalVectorDrawingStateMock.mockReturnValue({
      shapes: [{ id: 'shape-1' }],
      tool: 'select',
      activeShapeId: 'shape-1',
      selectedPointIndex: 0,
      brushRadius: 6,
      imageSrc: '/context-image.png',
      allowWithoutImage: false,
      showEmptyState: true,
      emptyStateLabel: 'Context empty state',
    });
    useOptionalVectorDrawingActionsMock.mockReturnValue({
      setShapes: vi.fn(),
      setActiveShapeId: vi.fn(),
      setSelectedPointIndex: vi.fn(),
    });

    render(
      <VectorDrawingCanvas
        className='canvas-shell'
        brushRadius={12}
        src='/override-image.png'
        allowWithoutImage
        showEmptyState={false}
        emptyStateLabel='Override empty state'
        onChange={onChange}
        onSelectShape={onSelectShape}
        onSelectPoint={onSelectPoint}
        maskPreviewEnabled
        maskPreviewShapes={[{ id: 'mask-shape' }]}
        maskPreviewInvert
        maskPreviewOpacity={0.3}
        maskPreviewFeather={12}
        showCenterGuides
        enableTwoFingerRotate
        baseCanvasWidthPx={1200}
        baseCanvasHeightPx={900}
        onViewCropRectChange={onViewCropRectChange}
        onImageContentFrameChange={onImageContentFrameChange}
        showCanvasGrid
        imageMoveEnabled
        selectionEnabled={false}
        imageOffset={{ x: 10, y: 20 }}
        onImageOffsetChange={onImageOffsetChange}
        backgroundLayerEnabled
        backgroundColor='#112233'
      />
    );

    expect(screen.getByTestId('vector-canvas')).toBeInTheDocument();
    expect(vectorCanvasProviderMock).toHaveBeenCalledTimes(1);
    expect(vectorCanvasProviderMock.mock.calls[0]?.[0]?.value).toMatchObject({
      shapes: [{ id: 'shape-1' }],
      tool: 'select',
      activeShapeId: 'shape-1',
      selectedPointIndex: 0,
      onChange,
      onSelectShape,
      onSelectPoint,
      brushRadius: 12,
      src: '/override-image.png',
      allowWithoutImage: true,
      showEmptyState: false,
      emptyStateLabel: 'Override empty state',
      maskPreviewEnabled: true,
      maskPreviewShapes: [{ id: 'mask-shape' }],
      maskPreviewInvert: true,
      maskPreviewOpacity: 0.3,
      maskPreviewFeather: 12,
      showCenterGuides: true,
      enableTwoFingerRotate: true,
      baseCanvasWidthPx: 1200,
      baseCanvasHeightPx: 900,
      onViewCropRectChange,
      onImageContentFrameChange,
      showCanvasGrid: true,
      imageMoveEnabled: true,
      selectionEnabled: false,
      imageOffset: { x: 10, y: 20 },
      onImageOffsetChange,
      backgroundLayerEnabled: true,
      backgroundColor: '#112233',
      className: 'canvas-shell',
    });
  });
});
