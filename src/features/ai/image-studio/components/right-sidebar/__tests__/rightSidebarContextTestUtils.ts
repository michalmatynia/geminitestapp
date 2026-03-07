import React from 'react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import {
  RightSidebarProvider,
  type RightSidebarContextValue,
} from '@/features/ai/image-studio/components/RightSidebarContext';

export function createRightSidebarContextValue(
  overrides: Partial<RightSidebarContextValue> = {}
): RightSidebarContextValue {
  return {
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
    ...overrides,
  };
}

export function renderWithRightSidebarContext(
  ui: React.ReactElement,
  overrides: Partial<RightSidebarContextValue> = {}
) {
  return render(
    React.createElement(
      RightSidebarProvider,
      { value: createRightSidebarContextValue(overrides) },
      ui
    )
  );
}
