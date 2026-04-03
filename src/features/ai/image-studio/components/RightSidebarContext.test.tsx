// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RightSidebarProvider, useRightSidebarContext } from './RightSidebarContext';

const createRightSidebarContextValue = () =>
  ({
    switchToControls: vi.fn(),
    canvasSizePresetOptions: [],
    canvasSizePresetValue: 'square',
    setCanvasSizePresetValue: vi.fn(),
    canvasSizeLabel: 'Square',
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
    actionHistoryMaxSteps: 10,
    activeActionHistoryIndex: 0,
    historyMode: 'actions',
    setHistoryMode: vi.fn(),
    onRestoreActionStep: vi.fn(),
    activeErrors: [],
    activeImages: [],
    activeRequestPreviewEndpoint: '/api/preview',
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
    selectedModelId: 'gpt-image-1',
    sequenceRunBusy: false,
  }) satisfies React.ComponentProps<typeof RightSidebarProvider>['value'];

describe('RightSidebarContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useRightSidebarContext())).toThrow(
      'useRightSidebarContext must be used inside RightSidebarProvider'
    );
  });

  it('returns the provided runtime value', () => {
    const value = createRightSidebarContextValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <RightSidebarProvider value={value}>{children}</RightSidebarProvider>
    );

    const { result } = renderHook(() => useRightSidebarContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
