'use client';

import React from 'react';

import type { RequestPreviewImage } from '@/features/ai/image-studio/utils/run-request-preview';

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
  canvasSizePresetOptions: Array<{ value: string; label: string; description?: string }>;
  canvasSizePresetValue: string;
  setCanvasSizePresetValue: (value: string) => void;
  canvasSizeLabel: string;
  canApplyCanvasSizePreset: boolean;
  canRecenterCanvasImage: boolean;
  onApplyCanvasSizePreset: () => void;
  onOpenResizeCanvasModal: () => void;
  quickActionsHostEl: HTMLElement | null;
  quickActionsPanelContent: React.ReactNode;
  resizeCanvasDisabled: boolean;

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
  maskShapeCount: number;
  requestPreviewMode: 'without_sequence' | 'with_sequence';
  resolvedPromptLength: number;
  sequenceStepCount: number;
  setRequestPreviewMode: (mode: 'without_sequence' | 'with_sequence') => void;

  // Quick Actions
  estimatedGenerationCost: number;
  estimatedPromptTokens: number;
  generationBusy: boolean;
  generationLabel: string;
  hasExtractedControls: boolean;
  modelSupportsSequenceGeneration: boolean;
  modelValue: string;
  onModelChange: (value: string) => void;
  onOpenControls: () => void;
  onOpenPromptControl: () => void;
  onOpenRequestPreview: () => void;
  onRunGeneration: () => void;
  onRunSequenceGeneration: () => void;
  quickModelOptions: Array<{ value: string; label: string }>;
  selectedModelId: string;
  sequenceRunBusy: boolean;
};

const RightSidebarContext = React.createContext<RightSidebarContextValue | null>(null);

export function RightSidebarProvider({
  value,
  children,
}: {
  value: RightSidebarContextValue;
  children: React.ReactNode;
}): React.JSX.Element {
  return <RightSidebarContext.Provider value={value}>{children}</RightSidebarContext.Provider>;
}

export function useRightSidebarContext(): RightSidebarContextValue {
  const context = React.useContext(RightSidebarContext);
  if (!context) {
    throw new Error('useRightSidebarContext must be used inside RightSidebarProvider');
  }
  return context;
}
