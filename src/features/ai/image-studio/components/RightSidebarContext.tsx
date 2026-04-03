'use client';

import React from 'react';

import type { LabeledOptionWithDescriptionDto } from '@/shared/contracts/base';
import type { RequestPreviewImage } from '@/features/ai/image-studio/utils/run-request-preview';
import type { ParamLeaf } from '@/shared/contracts/prompt-engine';
import { internalError } from '@/shared/errors/app-error';
import { createStrictContext } from '@/shared/lib/react/createStrictContext';

export interface ActionHistoryEntrySummary {
  id: string;
  label: string;
  createdAt: string;
}

export interface ActionHistoryItem {
  entry: ActionHistoryEntrySummary;
  index: number;
}

export type RightSidebarContextValue = {
  switchToControls: () => void;
  canvasSizePresetOptions: Array<LabeledOptionWithDescriptionDto<string>>;
  canvasSizePresetValue: string;
  setCanvasSizePresetValue: (value: string) => void;
  canvasSizeLabel: string;
  canApplyCanvasSizePreset: boolean;
  canRecenterCanvasImage: boolean;
  onApplyCanvasSizePreset: () => void;
  onOpenResizeCanvasModal: () => void;
  closeResizeCanvasModal: () => void;
  quickActionsHostEl: HTMLElement | null;
  quickActionsPanelContent: React.ReactNode;
  resizeCanvasDisabled: boolean;
  resizeCanvasOpen: boolean;

  // Action History
  actionHistoryEntriesLength: number;
  actionHistoryItems: ActionHistoryItem[];
  actionHistoryMaxSteps: number;
  activeActionHistoryIndex: number;
  historyMode: 'actions' | 'runs';
  setHistoryMode: (mode: 'actions' | 'runs') => void;
  onRestoreActionStep: (targetIndex: number) => void;

  // Request Preview
  activeErrors: string[];
  activeImages: RequestPreviewImage[];
  activeRequestPreviewEndpoint: string;
  activeRequestPreviewJson: string;
  closeRequestPreview: () => void;
  maskShapeCount: number;
  requestPreviewOpen: boolean;
  requestPreviewMode: 'without_sequence' | 'with_sequence';
  resolvedPromptLength: number;
  sequenceStepCount: number;
  setRequestPreviewMode: (mode: 'without_sequence' | 'with_sequence') => void;

  // Quick Actions
  closeControls: () => void;
  controlsOpen: boolean;
  estimatedGenerationCost: number;
  estimatedPromptTokens: number;
  flattenedParamsList: ParamLeaf[];
  generationBusy: boolean;
  generationLabel: string;
  hasExtractedControls: boolean;
  modelSupportsSequenceGeneration: boolean;
  onOpenControls: () => void;
  onOpenPromptControl: () => void;
  closePromptControl: () => void;
  onOpenRequestPreview: () => void;
  onRunGeneration: () => void;
  onRunSequenceGeneration: () => void;
  promptControlOpen: boolean;
  selectedModelId: string;
  sequenceRunBusy: boolean;
};

const { Context: RightSidebarContext, useStrictContext: useRightSidebarContext } =
  createStrictContext<RightSidebarContextValue>({
    hookName: 'useRightSidebarContext',
    providerName: 'RightSidebarProvider',
    displayName: 'RightSidebarContext',
    errorFactory: () =>
      internalError('useRightSidebarContext must be used inside RightSidebarProvider'),
  });

export function RightSidebarProvider({
  value,
  children,
}: {
  value: RightSidebarContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <RightSidebarContext.Provider value={value}>{children}</RightSidebarContext.Provider>;
}
export { useRightSidebarContext };
