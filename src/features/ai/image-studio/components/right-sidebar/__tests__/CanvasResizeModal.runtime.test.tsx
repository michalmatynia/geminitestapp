import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightSidebarProvider } from '@/features/ai/image-studio/components/RightSidebarContext';

import { CanvasResizeModal } from '../CanvasResizeModalImpl';

const mocks = vi.hoisted(() => ({
  closeResizeCanvasModal: vi.fn(),
  handleResizeProjectCanvas: vi.fn(),
  setMaskShapes: vi.fn(),
  setCanvasImageOffset: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...rest
  }: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element => (
    <button {...rest}>{children}</button>
  ),
  FormActions: ({
    cancelText = 'Cancel',
    onCancel,
    onSave,
    saveText = 'Save',
    isDisabled = false,
  }: {
    cancelText?: string;
    onCancel?: () => void;
    onSave?: () => void;
    saveText?: string;
    isDisabled?: boolean;
  }): React.JSX.Element => (
    <div>
      <button type='button' onClick={onCancel}>
        {cancelText}
      </button>
      <button type='button' onClick={onSave} disabled={isDisabled}>
        {saveText}
      </button>
    </div>
  ),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element => (
    <input {...props} />
  ),
  Label: ({
    children,
    ...rest
  }: React.LabelHTMLAttributes<HTMLLabelElement>): React.JSX.Element => (
    <label {...rest}>{children}</label>
  ),
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/shared/ui/templates/modals/DetailModal', () => ({
  DetailModal: ({
    children,
    footer,
    isOpen,
    title,
  }: {
    children: React.ReactNode;
    footer?: React.ReactNode;
    isOpen: boolean;
    title: string;
  }): React.JSX.Element => (
    <div data-testid='detail-modal' data-open={isOpen ? 'true' : 'false'}>
      <div>{title}</div>
      {children}
      {footer}
    </div>
  ),
}));

vi.mock('@/features/ai/image-studio/context/ProjectsContext', () => ({
  useProjectsState: () => ({
    projectId: 'project-alpha',
  }),
  useProjectsActions: () => ({
    handleResizeProjectCanvas: mocks.handleResizeProjectCanvas,
    resizeProjectCanvasMutation: {
      isPending: false,
    },
  }),
}));

vi.mock('@/features/ai/image-studio/context/SlotsContext', () => ({
  useSlotsState: () => ({
    workingSlot: {
      imageFile: {
        width: 1024,
        height: 1024,
      },
    },
  }),
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
  render(
    <RightSidebarProvider
      value={{
        switchToControls: vi.fn(),
        canvasSizePresetOptions: [],
        canvasSizePresetValue,
        setCanvasSizePresetValue: vi.fn(),
        canvasSizeLabel: 'Current 1024 x 1024',
        canApplyCanvasSizePreset: true,
        canRecenterCanvasImage: false,
        onApplyCanvasSizePreset: vi.fn(),
        onOpenResizeCanvasModal: vi.fn(),
        closeResizeCanvasModal: mocks.closeResizeCanvasModal,
        quickActionsHostEl: null,
        quickActionsPanelContent: null,
        resizeCanvasDisabled: false,
        resizeCanvasOpen,
        actionHistoryEntriesLength: 0,
        actionHistoryItems: [],
        actionHistoryMaxSteps: 20,
        activeActionHistoryIndex: -1,
        historyMode: 'actions',
        setHistoryMode: vi.fn(),
        onRestoreActionStep: vi.fn(),
        activeErrors: [],
        activeImages: [],
        activeRequestPreviewEndpoint: '/api/image-studio/run',
        activeRequestPreviewJson: '{}',
        closeRequestPreview: vi.fn(),
        maskShapeCount: 0,
        requestPreviewOpen: false,
        requestPreviewMode: 'without_sequence',
        resolvedPromptLength: 0,
        sequenceStepCount: 0,
        setRequestPreviewMode: vi.fn(),
        closeControls: vi.fn(),
        controlsOpen: false,
        estimatedGenerationCost: 0,
        estimatedPromptTokens: 0,
        flattenedParamsList: [],
        generationBusy: false,
        generationLabel: 'Generate',
        hasExtractedControls: false,
        modelSupportsSequenceGeneration: false,
        onOpenControls: vi.fn(),
        onOpenPromptControl: vi.fn(),
        closePromptControl: vi.fn(),
        onOpenRequestPreview: vi.fn(),
        onRunGeneration: vi.fn(),
        onRunSequenceGeneration: vi.fn(),
        promptControlOpen: false,
        selectedModelId: 'model-alpha',
        sequenceRunBusy: false,
      }}
    >
      <CanvasResizeModal />
    </RightSidebarProvider>
  );
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
