'use client';

import React, { createContext, useContext, useMemo, useId } from 'react';
import { useKangurAiTutorPortalContext } from '../KangurAiTutorPortal.context';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { useKangurAiTutorPanelBodyContext } from '../KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from '../ai-tutor-widget/KangurAiTutorWidget.state';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';

import {
  getGuidedCalloutFallbackCopy,
  useGuidedCalloutSelectionState,
  resolveGuidedSelectionDisplayState,
  resolveGuidedCalloutLayoutState,
  useGuidedCalloutSketchState,
  resolveSectionLabel,
} from './KangurAiTutorGuided.state';

export type GuidedCalloutContextValue = {
  calloutLabelId: string;
  calloutDescriptionId: string;
  fallbackCopy: any;
  selectionState: any;
  selectionDisplayState: any;
  layoutState: any;
  sketchState: any;
  sectionLabel: string | null;
  homeOnboardingCanGoBack: boolean;
  usesDirectionalEntry: boolean;
  tutorContent: any;
  panelBody: any;
  widgetState: any;
  guidedCallout: any;
};

const GuidedCalloutContext = createContext<GuidedCalloutContextValue | null>(null);

export function GuidedCalloutProvider({ children }: { children: React.ReactNode }) {
  const { guidedCallout } = useKangurAiTutorPortalContext();
  const tutorContent = useKangurAiTutorContent();
  const isCoarsePointer = useKangurCoarsePointer();
  const calloutLabelId = useId();
  const calloutDescriptionId = useId();
  const panelBody = useKangurAiTutorPanelBodyContext();
  const widgetState = useKangurAiTutorWidgetStateContext();
  
  const fallbackCopy = useMemo(
    () => getGuidedCalloutFallbackCopy(normalizeSiteLocale(tutorContent.locale)),
    [tutorContent.locale]
  );
  
  const selectionState = useGuidedCalloutSelectionState({
    activeFocus: panelBody.activeFocus,
    activeSelectedText: panelBody.activeSelectedText,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    messages: panelBody.messages,
    mode: guidedCallout.mode,
    selectionConversationContext: widgetState.selectionConversationContext,
    selectionGuidanceHandoffText: widgetState.selectionGuidanceHandoffText,
    selectionResponsePending: widgetState.selectionResponsePending,
    tutorContent,
    visibleQuickActions: panelBody.visibleQuickActions,
    
  });
  
  const selectionDisplayState = useMemo(() => resolveGuidedSelectionDisplayState({
    detail: guidedCallout.detail,
    fallbackCopy,
    isLoading: panelBody.isLoading,
    isSelectionExplainPendingMode: panelBody.isSelectionExplainPendingMode,
    isTestSurface:
      panelBody.sessionSurface === 'test' || panelBody.activeFocus.conversationFocus.surface === 'test',
    lastInteractionIntent: panelBody.lastInteractionIntent,
    lastPromptMode: panelBody.lastPromptMode,
    mode: guidedCallout.mode,
    resolvedSelectedKnowledgeLabel: selectionState.resolvedSelectedKnowledgeLabel,
    resolvedSelectedKnowledgeReference: selectionState.resolvedSelectedKnowledgeReference,
    resolvedSelectionAssistantMessage: selectionState.resolvedSelectionAssistantMessage,
    selectedKnowledgeEntry: selectionState.selectedKnowledgeEntry,
    selectedKnowledgeFragment: selectionState.selectedKnowledgeFragment,
    showSelectionGuidanceCallout: guidedCallout.showSelectionGuidanceCallout,
  }), [guidedCallout.detail, guidedCallout.mode, guidedCallout.showSelectionGuidanceCallout, fallbackCopy, panelBody.isLoading, panelBody.isSelectionExplainPendingMode, panelBody.sessionSurface, panelBody.activeFocus.conversationFocus.surface, panelBody.lastInteractionIntent, panelBody.lastPromptMode, selectionState]);
  
  const layoutState = useMemo(() => resolveGuidedCalloutLayoutState({
    avatarPlacement: guidedCallout.avatarPlacement,
    headerLabel: guidedCallout.headerLabel,
    isCoarsePointer,
    mode: guidedCallout.mode,
    resolvedSelectionDetail: selectionDisplayState.resolvedSelectionDetail,
    showSelectionGuidanceCallout: guidedCallout.showSelectionGuidanceCallout,
    stepLabel: guidedCallout.stepLabel,
    style: guidedCallout.style,
    title: guidedCallout.title,
  }), [guidedCallout.avatarPlacement, guidedCallout.headerLabel, guidedCallout.mode, guidedCallout.showSelectionGuidanceCallout, guidedCallout.stepLabel, guidedCallout.style, guidedCallout.title, isCoarsePointer, selectionDisplayState.resolvedSelectionDetail]);
  
  const sketchState = useGuidedCalloutSketchState({
    calloutKey: guidedCallout.calloutKey,
    drawingPanelAvailable: panelBody.drawingPanelAvailable,
    drawingPanelOpen: panelBody.drawingPanelOpen,
    handleOpenDrawingPanel: panelBody.handleOpenDrawingPanel,
    handleToggleDrawing: panelBody.handleToggleDrawing,
    shouldShowSketchCta:
      selectionDisplayState.isResolvedSelectionCallout &&
      (
        Boolean(selectionDisplayState.selectedKnowledgeSummary) ||
        Boolean(selectionState.resolvedSelectionAssistantMessage?.content)
      ),
  });
  
  const usesDirectionalEntry = !guidedCallout.showSelectionGuidanceCallout;
  const sectionLabel = useMemo(() => resolveSectionLabel({
    guidedTutorTarget: widgetState.guidedTutorTarget,
    sectionGuidanceLabel: guidedCallout.sectionGuidanceLabel,
    sectionResponsePendingKind: guidedCallout.sectionResponsePendingKind,
  }), [widgetState.guidedTutorTarget, guidedCallout.sectionGuidanceLabel, guidedCallout.sectionResponsePendingKind]);
  
  const homeOnboardingCanGoBack =
    widgetState.homeOnboardingStepIndex !== null && widgetState.homeOnboardingStepIndex > 0;

  const value = useMemo(() => ({
    calloutLabelId,
    calloutDescriptionId,
    fallbackCopy,
    selectionState,
    selectionDisplayState,
    layoutState,
    sketchState,
    sectionLabel,
    homeOnboardingCanGoBack,
    usesDirectionalEntry,
    tutorContent,
    panelBody,
    widgetState,
    guidedCallout,
  }), [calloutLabelId, calloutDescriptionId, fallbackCopy, selectionState, selectionDisplayState, layoutState, sketchState, sectionLabel, homeOnboardingCanGoBack, usesDirectionalEntry, tutorContent, panelBody, widgetState, guidedCallout]);

  return (
    <GuidedCalloutContext.Provider value={value}>
      {children}
    </GuidedCalloutContext.Provider>
  );
}

export function useGuidedCalloutContext() {
  const context = useContext(GuidedCalloutContext);
  if (!context) {
    throw new Error('useGuidedCalloutContext must be used within a GuidedCalloutProvider');
  }
  return context;
}
