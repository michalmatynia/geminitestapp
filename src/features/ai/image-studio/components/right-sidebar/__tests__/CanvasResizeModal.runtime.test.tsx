import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CanvasResizeModal } from '../CanvasResizeModalImpl';
import { renderWithRightSidebarContext } from './rightSidebarContextTestUtils';

const mocks = vi.hoisted(() => ({
  closeResizeCanvasModal: vi.fn(),
  handleResizeProjectCanvas: vi.fn(),
  setMaskShapes: vi.fn(),
  setCanvasImageOffset: vi.fn(),
}));

function getSlotsStateMock() {
  return {
    workingSlot: {
      imageFile: {
        width: 1024,
        height: 1024,
      },
    },
  };
}

vi.mock('@/shared/ui', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    Button: mocks.MockButton,
    FormActions: mocks.MockFormActions,
    Input: mocks.MockInput,
    Label: mocks.MockLabel,
  };
});

vi.mock('@/shared/ui/templates/modals/DetailModal', async () => {
  const mocks = await import('./rightSidebarRuntimeMockComponents');
  return {
    DetailModal: mocks.MockDetailModal,
  };
});

vi.mock('@/features/ai/image-studio/context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-alpha',
    projectsQuery: {
      data: [
        {
          id: 'project-alpha',
          canvasWidthPx: 1024,
          canvasHeightPx: 1024,
        },
      ],
    },
  }),
  useProjectsActions: () => ({
    handleResizeProjectCanvas: mocks.handleResizeProjectCanvas,
    resizeProjectCanvasMutation: {
      isPending: false,
    },
  }),
}));

vi.mock('@/features/ai/image-studio/context/SlotsContext', () => ({
  useSlotsState: getSlotsStateMock,
}));

vi.mock('@/features/ai/image-studio/context/UiContext', () => ({
  useUiState: () => ({
    canvasImageOffset: { x: 0, y: 0 },
  }),
  useUiActions: () => ({
    setCanvasImageOffset: mocks.setCanvasImageOffset,
    getPreviewCanvasImageFrame: () => null,
  }),
}));

vi.mock('@/features/ai/image-studio/context/MaskingContext', () => ({
  useMaskingState: () => ({
    maskShapes: [],
  }),
  useMaskingActions: () => ({
    setMaskShapes: mocks.setMaskShapes,
  }),
}));

const renderModal = ({
  canvasSizePresetValue = '1536x1024',
  resizeCanvasOpen = true,
}: {
  canvasSizePresetValue?: string;
  resizeCanvasOpen?: boolean;
} = {}): void => {
  renderWithRightSidebarContext(<CanvasResizeModal />, {
    canvasSizePresetValue,
    closeResizeCanvasModal: mocks.closeResizeCanvasModal,
    resizeCanvasOpen,
  });
};

describe('CanvasResizeModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads modal state and draft dimensions from RightSidebarContext', () => {
    renderModal();

    expect(screen.getByTestId('detail-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Resize Canvas')).toBeInTheDocument();

    const [widthInput, heightInput] = screen.getAllByRole('spinbutton');
    expect(widthInput).toHaveValue(1536);
    expect(heightInput).toHaveValue(1024);
  });

  it('closes through RightSidebarContext cancel action', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mocks.closeResizeCanvasModal).toHaveBeenCalledTimes(1);
  });
});
