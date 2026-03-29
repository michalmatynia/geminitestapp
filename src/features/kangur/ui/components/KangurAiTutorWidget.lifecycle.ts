'use client';

import { useEffect } from 'react';

import type { KangurAiTutorConversationContext } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { KangurAiTutorContent } from '@/features/kangur/shared/contracts/kangur-ai-tutor-content';
import {
  clearPersistedTutorAvatarPosition,
  clearPersistedTutorPanelPosition,
  persistTutorDrawingDraftSnapshot,
} from './KangurAiTutorWidget.storage';

import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import type { TutorPoint, TutorSurface } from './KangurAiTutorWidget.types';

import { useTutorAuthLifecycle } from './tutor-widget-lifecycle/useTutorAuthLifecycle';
import { useTutorPositionLifecycle } from './tutor-widget-lifecycle/useTutorPositionLifecycle';
import { useTutorNavigationLifecycle } from './tutor-widget-lifecycle/useTutorNavigationLifecycle';
import { useTutorSelectionLifecycle } from './tutor-widget-lifecycle/useTutorSelectionLifecycle';
import { useTutorSessionLifecycle } from './tutor-widget-lifecycle/useTutorSessionLifecycle';

type ContextSwitchNotice = {
  detail: string | null;
  target: string;
  title: string;
} | null;

type RecordFollowUpCompletionInput = {
  actionId: string;
  actionLabel: string;
  actionPage: string;
  actionReason: string | null;
  targetPath: string;
  targetSearch: string;
};

type CurrentTutorLocation = {
  pathname: string;
  search: string;
} | null;

type UseKangurAiTutorLifecycleEffectsInput = {
  allowCrossPagePersistence: boolean;
  allowSelectedTextSupport: boolean;
  authIsAuthenticated: boolean | undefined;
  clearSelection: () => void;
  closeChat: () => void;
  hasContextualFreeformFocus: boolean;
  contextualFreeformPanelPoint: TutorPoint | null;
  getContextSwitchNotice: (input: {
    assignmentId: string | null | undefined;
    assignmentSummary?: string | null | undefined;
    contentId: string | null | undefined;
    questionId: string | null | undefined;
    questionProgressLabel?: string | null | undefined;
    surface: TutorSurface | null | undefined;
    title?: string | null | undefined;
    tutorContent: KangurAiTutorContent;
  }) => ContextSwitchNotice;
  getCurrentLocation: () => CurrentTutorLocation;
  isOpen: boolean;
  messages: Array<{
    role: string;
  }>;
  rawSelectedText: string | null;
  recordFollowUpCompletion?: ((input: RecordFollowUpCompletionInput) => void) | null;
  routingPageKey?: string | null;
  selectedText: string | null;
  sessionContext: KangurAiTutorConversationContext | null | undefined;
  suppressFocus?: boolean;
  setHighlightedText: (value: string | null) => void;
  tutorContent: KangurAiTutorContent;
  tutorSessionKey: string | null;
  uiMode: 'anchored' | 'freeform' | 'static';
  viewport: {
    width: number;
    height: number;
  };
  widgetState: KangurAiTutorWidgetState;
};

export function useKangurAiTutorLifecycleEffects(input: UseKangurAiTutorLifecycleEffectsInput): void {
  const {
    authIsAuthenticated,
    contextualFreeformPanelPoint,
    hasContextualFreeformFocus,
    isOpen,
    routingPageKey,
    suppressFocus = false,
    tutorSessionKey,
    uiMode,
    viewport,
    widgetState,
    clearSelection,
    closeChat,
    setHighlightedText,
  } = input;

  const {
    askModalReturnStateRef,
    drawingDraftSnapshot,
    mounted,
    selectionGuidanceRevealTimeoutRef,
    setAskModalVisible,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setGuestAuthFormVisible,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    isTutorHidden,
    setAskModalDockStyle,
  } = widgetState;

  useTutorAuthLifecycle({ authIsAuthenticated, widgetState });
  useTutorPositionLifecycle({ contextualFreeformPanelPoint, hasContextualFreeformFocus, isOpen, uiMode, viewport, widgetState });
  useTutorNavigationLifecycle({ mounted, routingPageKey, shouldTrackViewportScroll: true, widgetState });
  useTutorSelectionLifecycle({ isOpen, suppressFocus, widgetState });
  useTutorSessionLifecycle({ tutorSessionKey, widgetState });

  useEffect(() => {
    persistTutorDrawingDraftSnapshot(drawingDraftSnapshot);
  }, [drawingDraftSnapshot]);

  useEffect(() => {
    if (!isTutorHidden) return;
    setAskModalVisible(false);
    askModalReturnStateRef.current = null;
    setGuidedTutorTarget(null);
    setGuestAuthFormVisible(false);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
    setHomeOnboardingStepIndex(null);
    setHasNewMessage(false);
    setDismissedSelectedText(null);
    setDraggedAvatarPoint(null);
    setPanelPosition(null);
    setPanelPositionMode('manual');
    setPanelSnapPreference('free');
    clearPersistedTutorAvatarPosition();
    clearPersistedTutorPanelPosition();
    setAskModalDockStyle(null);
    if (selectionGuidanceRevealTimeoutRef.current !== null) {
      window.clearTimeout(selectionGuidanceRevealTimeoutRef.current);
      selectionGuidanceRevealTimeoutRef.current = null;
    }
    clearSelection();
    setHighlightedText(null);
    setHighlightedSection(null);
    setHoveredSectionAnchorId(null);
    setPersistedSelectionRect(null);
    setPersistedSelectionPageRect(null);
    setPersistedSelectionPageRects([]);
    setPersistedSelectionContainerRect(null);
    setSelectionResponsePending(null);
    setSelectionResponseComplete(null);
    setSelectionGuidanceCalloutVisibleText(null);
    setSelectionConversationContext(null);
    setSelectionGuidanceHandoffText(null);
    setSectionResponsePending(null);
    setSectionResponseComplete(null);
    closeChat();
  }, [askModalReturnStateRef, clearSelection, closeChat, isTutorHidden, setAskModalVisible, setDismissedSelectedText, setDraggedAvatarPoint, setGuestAuthFormVisible, setGuestIntroHelpVisible, setGuestIntroVisible, setGuidedTutorTarget, setHasNewMessage, setHighlightedSection, setHighlightedText, setHomeOnboardingStepIndex, setHoveredSectionAnchorId, setPanelPosition, setPanelPositionMode, setPanelSnapPreference, setPersistedSelectionContainerRect, setPersistedSelectionPageRect, setPersistedSelectionPageRects, setPersistedSelectionRect, selectionGuidanceRevealTimeoutRef, setSectionResponseComplete, setSectionResponsePending, setSelectionGuidanceCalloutVisibleText, setSelectionConversationContext, setSelectionGuidanceHandoffText, setSelectionResponseComplete, setSelectionResponsePending, setAskModalDockStyle]);
}
