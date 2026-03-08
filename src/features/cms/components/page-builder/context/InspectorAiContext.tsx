'use client';

import React, { createContext, useContext, useMemo } from 'react';

import { internalError } from '@/shared/errors/app-error';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useToast } from '@/shared/ui';

import { usePageBuilder } from '@/features/cms/hooks/usePageBuilderContext';

import type {
  InspectorAiActionsContextValue,
  InspectorAiContextValue,
  InspectorAiProviderProps,
  InspectorAiStateContextValue,
} from './InspectorAiContext.types';
import { useInspectorAiContextPreview } from './useInspectorAiContextPreview';
import { useInspectorAiGeneration } from './useInspectorAiGeneration';

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
  const {
    state,
    selectedSection,
    selectedBlock,
    selectedColumn,
    selectedColumnParentSection,
    selectedParentSection,
    selectedParentColumn,
    selectedParentBlock,
  } = usePageBuilder();
  const { toast } = useToast();
  const { assignment: brainAssignment } = useBrainAssignment({
    capability: 'cms.css_stream',
  });

  const preview = useInspectorAiContextPreview({
    state,
    selectedSection,
    selectedBlock,
    selectedColumn,
    selectedColumnParentSection,
    selectedParentSection,
    selectedParentColumn,
    selectedParentBlock,
    toast,
  });

  const brainAiProvider = brainAssignment.provider;
  const brainAiModelId = brainAssignment.modelId.trim();
  const brainAiAgentId = brainAssignment.agentId.trim();

  const generation = useInspectorAiGeneration({
    brainAiProvider,
    brainAiModelId,
    brainAiAgentId,
    buildPageContext: preview.buildPageContext,
    buildElementContext: preview.buildElementContext,
    contentAiAllowedKeys,
    customCssAiConfig,
    customCssValue,
    onUpdateCss,
    onUpdateSettings,
    toast,
  });

  const stateValue = useMemo(
    (): InspectorAiStateContextValue => ({
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
      brainAiProvider,
      brainAiModelId,
      brainAiAgentId,
      customCssValue,
      customCssAiConfig,
      contentAiAllowedKeys,
      contentAiPlaceholder: generation.contentAiPlaceholder,
    }),
    [
      brainAiAgentId,
      brainAiModelId,
      brainAiProvider,
      contentAiAllowedKeys,
      customCssAiConfig,
      customCssValue,
      generation.contentAiError,
      generation.contentAiLoading,
      generation.contentAiOutput,
      generation.contentAiPlaceholder,
      generation.contentAiPrompt,
      generation.cssAiAppend,
      generation.cssAiAutoApply,
      generation.cssAiError,
      generation.cssAiLoading,
      generation.cssAiOutput,
      preview.contextPreviewFull,
      preview.contextPreviewNonce,
      preview.contextPreviewOpen,
      preview.contextPreviewTab,
      preview.elementContextPreview,
      preview.pageContextPreview,
    ]
  );

  const actionsValue = useMemo(
    (): InspectorAiActionsContextValue => ({
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
    [
      generation.applyContent,
      generation.applyCss,
      generation.cancelContent,
      generation.cancelCss,
      generation.generateContent,
      generation.generateCss,
      generation.setContentAiPrompt,
      generation.setCssAiAppend,
      generation.setCssAiAutoApply,
      onUpdateCustomCssAiConfig,
      preview.copyContext,
      preview.setContextPreviewFull,
      preview.setContextPreviewNonce,
      preview.setContextPreviewOpen,
      preview.setContextPreviewTab,
    ]
  );

  return (
    <InspectorAiActionsContext.Provider value={actionsValue}>
      <InspectorAiStateContext.Provider value={stateValue}>
        {children}
      </InspectorAiStateContext.Provider>
    </InspectorAiActionsContext.Provider>
  );
}

export function useInspectorAi(): InspectorAiContextValue {
  const state = useInspectorAiState();
  const actions = useInspectorAiActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
}
