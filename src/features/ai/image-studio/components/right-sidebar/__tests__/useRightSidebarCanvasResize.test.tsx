import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useRightSidebarCanvasResize } from '../useRightSidebarCanvasResize';

const mocks = vi.hoisted(() => ({
  applyCanvasResizeLocalTransform: vi.fn(),
  handleResizeProjectCanvas: vi.fn(),
  setCanvasImageOffset: vi.fn(),
  setMaskShapes: vi.fn(),
  runtime: {
    canvasHeightPx: 1536,
    canvasImageOffset: { x: 8, y: 12 },
    canvasWidthPx: 2048,
    previewFrame: {
      slotId: 'slot-123',
      frame: { x: 10, y: 14, width: 640, height: 480 },
    },
    projectId: 'project-alpha',
    resizePending: false,
    workingSlotHeight: 512,
    workingSlotWidth: 768,
  },
}));

vi.mock('@/features/ai/image-studio/context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: mocks.runtime.projectId,
    projectsQuery: {
      data: mocks.runtime.projectId
        ? [
          {
            id: mocks.runtime.projectId,
            canvasWidthPx: mocks.runtime.canvasWidthPx,
            canvasHeightPx: mocks.runtime.canvasHeightPx,
          },
        ]
        : [],
    },
  }),
  useProjectsActions: () => ({
    handleResizeProjectCanvas: mocks.handleResizeProjectCanvas,
    resizeProjectCanvasMutation: {
      isPending: mocks.runtime.resizePending,
    },
  }),
}));

vi.mock('@/features/ai/image-studio/context/SlotsContext', () => ({
  useSlotsState: () => ({
    workingSlot: {
      imageFile: {
        width: mocks.runtime.workingSlotWidth,
        height: mocks.runtime.workingSlotHeight,
      },
    },
  }),
}));

vi.mock('@/features/ai/image-studio/context/MaskingContext', () => ({
  useMaskingState: () => ({
    maskShapes: [{ id: 'shape-1' }],
  }),
  useMaskingActions: () => ({
    setMaskShapes: mocks.setMaskShapes,
  }),
}));

vi.mock('@/features/ai/image-studio/context/UiContext', () => ({
  useUiState: () => ({
    canvasImageOffset: mocks.runtime.canvasImageOffset,
  }),
  useUiActions: () => ({
    setCanvasImageOffset: mocks.setCanvasImageOffset,
    getPreviewCanvasImageFrame: () => mocks.runtime.previewFrame,
  }),
}));

vi.mock('@/features/ai/image-studio/utils/canvas-resize', () => ({
  applyCanvasResizeLocalTransform: mocks.applyCanvasResizeLocalTransform,
}));

describe('useRightSidebarCanvasResize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.runtime.projectId = 'project-alpha';
    mocks.runtime.canvasWidthPx = 2048;
    mocks.runtime.canvasHeightPx = 1536;
    mocks.runtime.resizePending = false;
    mocks.runtime.workingSlotWidth = 768;
    mocks.runtime.workingSlotHeight = 512;
    mocks.runtime.canvasImageOffset = { x: 8, y: 12 };
    mocks.runtime.previewFrame = {
      slotId: 'slot-123',
      frame: { x: 10, y: 14, width: 640, height: 480 },
    };
    mocks.applyCanvasResizeLocalTransform.mockReturnValue({
      imageOffset: { x: 16, y: 24 },
      shapes: [{ id: 'shape-resized' }],
    });
    mocks.handleResizeProjectCanvas.mockResolvedValue({
      canvasHeightPx: 1024,
      canvasWidthPx: 1536,
      projectId: 'project-alpha',
    });
  });

  it('applies a canvas preset through the shared resize path', async () => {
    const { result } = renderHook(() => useRightSidebarCanvasResize());

    await act(async () => {
      await expect(
        result.current.applyCanvasSizePreset({ presetValue: '1536x1024' })
      ).resolves.toBe(true);
    });

    expect(mocks.applyCanvasResizeLocalTransform).toHaveBeenCalledWith({
      currentImageFrame: { x: 10, y: 14, width: 640, height: 480 },
      currentImageOffset: { x: 8, y: 12 },
      direction: 'down-right',
      newCanvasHeight: 1024,
      newCanvasWidth: 1536,
      oldCanvasHeight: 1536,
      oldCanvasWidth: 2048,
      shapes: [{ id: 'shape-1' }],
      sourceAspectRatio: 1.5,
    });
    expect(mocks.handleResizeProjectCanvas).toHaveBeenCalledWith({
      canvasHeightPx: 1024,
      canvasWidthPx: 1536,
      projectId: 'project-alpha',
    });
    expect(mocks.setMaskShapes).toHaveBeenCalledWith([{ id: 'shape-resized' }]);
    expect(mocks.setCanvasImageOffset).toHaveBeenCalledWith({ x: 16, y: 24 });
  });

  it('skips invalid preset values without mutating project state', async () => {
    const { result } = renderHook(() => useRightSidebarCanvasResize());

    await act(async () => {
      await expect(
        result.current.applyCanvasSizePreset({ presetValue: 'not-a-size' })
      ).resolves.toBe(false);
    });

    expect(mocks.applyCanvasResizeLocalTransform).not.toHaveBeenCalled();
    expect(mocks.handleResizeProjectCanvas).not.toHaveBeenCalled();
    expect(mocks.setMaskShapes).not.toHaveBeenCalled();
    expect(mocks.setCanvasImageOffset).not.toHaveBeenCalled();
  });
});
