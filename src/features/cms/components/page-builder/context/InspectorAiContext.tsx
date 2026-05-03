'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';
import { internalError } from '@/shared/errors/app-error';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useToast } from '@/shared/ui/primitives.public';


import { useInspectorAiContextPreview } from './useInspectorAiContextPreview';
import { useInspectorAiGeneration } from './useInspectorAiGeneration';

import type {
  InspectorAiActionsContextValue,
  InspectorAiContextValue,
  InspectorAiProviderProps,
  InspectorAiStateContextValue,
} from './InspectorAiContext.types';

export type {
  InspectorAiActionsContextValue,
  InspectorAiContextValue,
  InspectorAiContextPreviewTab,
  InspectorAiProviderProps,
  InspectorAiStateContextValue,
} from './InspectorAiContext.types';

const InspectorAiStateContext = createContext<InspectorAiStateContextValue | null>(null);
const InspectorAiActionsContext = createContext<InspectorAiActionsContextValue | null>(null);

export function useInspectorAiState(): InspectorAiStateContextValue {
  const context = useContext(InspectorAiStateContext);
  if (!context) {
    throw internalError('useInspectorAiState must be used within an InspectorAiProvider');
  }
  return context;
}

export function useInspectorAiActions(): InspectorAiActionsContextValue {
  const context = useContext(InspectorAiActionsContext);
  if (!context) {
    throw internalError('useInspectorAiActions must be used within an InspectorAiProvider');
  }
  return context;
}

export function InspectorAiProvider({
  children,
  customCssValue,
  customCssAiConfig,
  onUpdateCss,
  onUpdateSettings,
  onUpdateCustomCssAiConfig,
  contentAiAllowedKeys = [],
}: InspectorAiProviderProps): React.JSX.Element {
  const pageBuilder = usePageBuilder();
  const { toast } = useToast();
  const { assignment: brainAssignment } = useBrainAssignment({
    capability: 'cms.css_stream',
  });

  const preview = useInspectorAiContextPreview({
    ...pageBuilder,
    toast,
  });

  const generation = useInspectorAiGeneration({
    brainAiProvider: brainAssignment.provider,
    brainAiModelId: brainAssignment.modelId.trim(),
    brainAiAgentId: brainAssignment.agentId.trim(),
    buildPageContext: preview.buildPageContext,
    buildElementContext: preview.buildElementContext,
    contentAiAllowedKeys,
    customCssAiConfig,
    customCssValue,
    onUpdateCss,
    onUpdateSettings,
    toast,
  });

  const stateValue = useInspectorAiStateValue(generation, preview, brainAssignment, customCssValue, customCssAiConfig, contentAiAllowedKeys);
  const actionsValue = useInspectorAiActionsValue(generation, preview, onUpdateCustomCssAiConfig);

  return (
    <InspectorAiActionsContext.Provider value={actionsValue}>
      <InspectorAiStateContext.Provider value={stateValue}>
        {children}
      </InspectorAiStateContext.Provider>
    </InspectorAiActionsContext.Provider>
  );
}

function useInspectorAiStateValue(
  params: {
    generation: ReturnType<typeof useInspectorAiGeneration>;
    preview: ReturnType<typeof useInspectorAiContextPreview>;
    brainAssignment: any;
    customCssValue: any;
    customCssAiConfig: any;
    contentAiAllowedKeys: string[];
  }
): InspectorAiStateContextValue {
  const { generation, preview, brainAssignment, customCssValue, customCssAiConfig, contentAiAllowedKeys } = params;
  return useMemo(
    () => ({
      cssAiLoading: generation.cssAiLoading,
      cssAiError: generation.cssAiError,
      cssAiOutput: generation.cssAiOutput,
      cssAiAppend: generation.cssAiAppend,
      cssAiAutoApply: generation.cssAiAutoApply,
      contentAiPrompt: generation.contentAiPrompt,
      contentAiLoading: generation.contentAiLoading,
      contentAiError: generation.contentAiError,
      contentAiOutput: generation.contentAiOutput,
      contextPreviewOpen: preview.contextPreviewOpen,
      contextPreviewTab: preview.contextPreviewTab,
      contextPreviewFull: preview.contextPreviewFull,
      contextPreviewNonce: preview.contextPreviewNonce,
      pageContextPreview: preview.pageContextPreview,
      elementContextPreview: preview.elementContextPreview,
      brainAiProvider: brainAssignment.provider,
      brainAiModelId: brainAssignment.modelId.trim(),
      brainAiAgentId: brainAssignment.agentId.trim(),
      customCssValue,
      customCssAiConfig,
      contentAiAllowedKeys,
      contentAiPlaceholder: generation.contentAiPlaceholder,
    }),
    [brainAssignment, generation, preview, customCssValue, customCssAiConfig, contentAiAllowedKeys]
  );
}

function useInspectorAiActionsValue(
  generation: ReturnType<typeof useInspectorAiGeneration>,
  preview: ReturnType<typeof useInspectorAiContextPreview>,
  onUpdateCustomCssAiConfig: any
): InspectorAiActionsContextValue {
  return useMemo(
    () => ({
      setCssAiAppend: generation.setCssAiAppend,
      setCssAiAutoApply: generation.setCssAiAutoApply,
      generateCss: generation.generateCss,
      cancelCss: generation.cancelCss,
      setContentAiPrompt: generation.setContentAiPrompt,
      generateContent: generation.generateContent,
      cancelContent: generation.cancelContent,
      applyContent: generation.applyContent,
      setContextPreviewOpen: preview.setContextPreviewOpen,
      setContextPreviewTab: preview.setContextPreviewTab,
      setContextPreviewFull: preview.setContextPreviewFull,
      setContextPreviewNonce: preview.setContextPreviewNonce,
      copyContext: preview.copyContext,
      updateCustomCssAiConfig: onUpdateCustomCssAiConfig,
      applyCss: generation.applyCss,
    }),
    [generation, preview, onUpdateCustomCssAiConfig]
  );
}

export function useInspectorAi(): InspectorAiContextValue {
  const state = useInspectorAiState();
  const actions = useInspectorAiActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
