import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RightSidebarProvider } from '@/features/ai/image-studio/components/RightSidebarContext';

import { RightSidebarRequestPreviewModal } from '../RightSidebarRequestPreviewModal';

const mocks = vi.hoisted(() => ({
  closeRequestPreview: vi.fn(),
}));

vi.mock('@/shared/ui/templates/modals', () => ({
  DetailModal: ({
    children,
    isOpen,
    onClose,
    title,
  }: {
    children: React.ReactNode;
    isOpen: boolean;
    onClose: () => void;
    title: string;
  }): React.JSX.Element => (
    <div data-testid='detail-modal' data-open={isOpen ? 'true' : 'false'}>
      <div>{title}</div>
      <button type='button' onClick={onClose}>
        Close
      </button>
      {children}
    </div>
  ),
}));

vi.mock('next/image', () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>): React.JSX.Element => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} alt={props.alt ?? ''} />
  ),
}));

vi.mock('@/shared/ui', () => ({
  SelectSimple: ({
    options,
    value,
  }: {
    options: Array<{ value: string; label: string }>;
    value: string;
  }): React.JSX.Element => (
    <div>
      <div>Preview Mode</div>
      <div>{options.find((option) => option.value === value)?.label ?? value}</div>
    </div>
  ),
}));

const renderModal = ({
  requestPreviewOpen = true,
}: {
  requestPreviewOpen?: boolean;
} = {}): void => {
  render(
    <RightSidebarProvider
      value={{
        switchToControls: vi.fn(),
        canvasSizePresetOptions: [],
        canvasSizePresetValue: '1024x1024',
        setCanvasSizePresetValue: vi.fn(),
        canvasSizeLabel: 'Current 1024 x 1024',
        canApplyCanvasSizePreset: true,
        canRecenterCanvasImage: false,
        onApplyCanvasSizePreset: vi.fn(),
        onOpenResizeCanvasModal: vi.fn(),
        closeResizeCanvasModal: vi.fn(),
        quickActionsHostEl: null,
        quickActionsPanelContent: null,
        resizeCanvasDisabled: false,
        resizeCanvasOpen: false,
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
        activeRequestPreviewJson: '{"prompt":"hello"}',
        closeRequestPreview: mocks.closeRequestPreview,
        maskShapeCount: 2,
        requestPreviewOpen,
        requestPreviewMode: 'without_sequence',
        resolvedPromptLength: 5,
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
      <RightSidebarRequestPreviewModal />
    </RightSidebarProvider>
  );
};

describe('RightSidebarRequestPreviewModal runtime path', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders from RightSidebarContext', () => {
    renderModal();

    expect(screen.getByTestId('detail-modal')).toHaveAttribute('data-open', 'true');
    expect(screen.getByText('Generation Request Preview')).toBeInTheDocument();
    expect(screen.getByText('`/api/image-studio/run`')).toBeInTheDocument();
    expect(screen.getByText('{"prompt":"hello"}')).toBeInTheDocument();
  });

  it('closes through RightSidebarContext', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(mocks.closeRequestPreview).toHaveBeenCalledTimes(1);
  });
});
