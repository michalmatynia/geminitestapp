'use client';

import { useCallback, useEffect } from 'react';

import type { KangurAiTutorContextValue } from '@/features/kangur/ui/context/KangurAiTutorRuntime.shared';
import type { KangurAuthContextValue } from '@/features/kangur/ui/context/KangurAuthContext';
import type { KangurAuthMode } from '@/shared/contracts/kangur-auth';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';

import { useKangurAiTutorAvatarDrag } from './KangurAiTutorWidget.avatar-drag';
import { useKangurAiTutorAvatarShellActions } from './KangurAiTutorWidget.avatar-shell';
import { useKangurAiTutorWidgetCoordinatorDisplayState } from './KangurAiTutorWidget.coordinator-display';
import {
  getContextSwitchNotice,
  getCurrentTutorLocation,
  getInteractionIntent,
  HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
  isTargetWithinTutorUi,
  normalizeConversationFocusKind,
  resolveTutorFollowUpLocation,
} from './KangurAiTutorWidget.coordinator.helpers';
import {
  useKangurAiTutorGuestIntroFlow,
  useKangurAiTutorGuidedAuthHandoffEffect,
  useKangurAiTutorHomeOnboardingFlow,
} from './KangurAiTutorWidget.entry';
import { useKangurAiTutorWidgetEnvironment } from './KangurAiTutorWidget.environment';
import {
  useKangurAiTutorGuidedFlow,
  useKangurAiTutorSelectionGuidanceHandoffEffect,
  useKangurAiTutorSelectionGuidanceDockOpenEffect,
} from './KangurAiTutorWidget.guided';
import { isAuthGuidedTutorTarget } from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorPanelInteractions } from './KangurAiTutorWidget.interactions';
import { useKangurAiTutorLifecycleEffects } from './KangurAiTutorWidget.lifecycle';
import { useKangurAiTutorPanelActions } from './KangurAiTutorWidget.panel-actions';
import { useKangurAiTutorPanelDrag } from './KangurAiTutorWidget.panel-drag';
import { useKangurAiTutorPortalViewModel } from './KangurAiTutorWidget.portal-view';
import { useKangurAiTutorTelemetryBridge } from './KangurAiTutorWidget.telemetry';

import type { KangurAiTutorPortalContextValue } from './KangurAiTutorPortal.context';
import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import { areTutorSelectionTextsEquivalent } from './KangurAiTutorWidget.helpers';

type LoginModalState = {
  authMode: KangurAuthMode;
  isOpen: boolean;
  openLoginModal: (
    callbackUrl?: string | null,
    options?: { authMode?: KangurAuthMode }
  ) => void;
};

type UseKangurAiTutorWidgetCoordinatorInput = {
  authState: KangurAuthContextValue | null;
  environment: ReturnType<typeof useKangurAiTutorWidgetEnvironment>;
  loginModal: LoginModalState;
  prefersReducedMotion: boolean | undefined;
  tutorContent: KangurAiTutorContent;
  tutorRuntime: KangurAiTutorContextValue;
  widgetState: KangurAiTutorWidgetState;
};

export function useKangurAiTutorWidgetCoordinator({
  authState,
  environment,
  loginModal,
  prefersReducedMotion,
  tutorContent,
  tutorRuntime,
  widgetState,
}: UseKangurAiTutorWidgetCoordinatorInput): {
  portalContentValue: KangurAiTutorPortalContextValue;
  shouldRender: boolean;
} {
  type TutorSurfaceMode =
    | 'idle_avatar'
    | 'onboarding'
    | 'auth_guided'
    | 'selection_guided'
    | 'section_guided'
    ;
  const {
    enabled,
    messages,
    isLoading,
    isUsageLoading,
    tutorName,
    usageSummary,
    learnerMemory,
    openChat,
    closeChat,
    sendMessage,
    recordFollowUpCompletion,
    setHighlightedText,
    sessionContext,
  } = tutorRuntime;

  const {
    activateSelectionGlow,
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    basePath,
    canSendMessages,
    clearSelection,
    hintDepth,
    homeOnboardingMode,
    isAnonymousVisitor,
    motionProfile,
    narratorSettings,
    proactiveNudges,
    rawSelectedText,
    reducedMotionTransitions,
    remainingMessages,
    resolveGuestLoginGuidanceIntentForContent,
    routing,
    shouldRepeatGuestIntroOnEntry,
    shouldRepeatHomeOnboardingOnEntry,
    telemetryContext,
    tutorAnchorContext,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    uiMode,
    viewport,
    persistSelectionGeometry,
    shouldRenderContextlessTutorUi,
    shouldRenderGuestIntroUi,
    showSources,
  } = environment;

  const displayState = useKangurAiTutorWidgetCoordinatorDisplayState({
    authIsAuthenticated: authState?.isAuthenticated,
    enabled,
    environment,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    learnerMemory,
    loginModalIsOpen: loginModal.isOpen,
    messages,
    openLoginModal: loginModal.openLoginModal,
    prefersReducedMotion,
    sessionContext,
    tutorContent,
    tutorName,
    usageSummary,
    widgetState,
  });

  const interactions = useKangurAiTutorPanelInteractions({
    activeSelectedText: displayState.activeSelectedText,
    allowSelectedTextSupport,
    bubblePlacementMode: displayState.bubblePlacement.mode,
    clearSelection,
    closeChat,
    freeformContextualPanelPoint: displayState.contextualFreeformPanelPoint,
    isAskModalMode: displayState.isAskModalMode,
    isOpen: tutorRuntime.isOpen,
    isTargetWithinTutorUi,
    messageCount: messages.length,
    openChat,
    persistSelectionGeometry,
    selectedText: displayState.activeSelectedText,
    selectionRect: displayState.activeSelectionRect,
    setHighlightedText,
    setInputValue: widgetState.setInputValue,
    telemetryContext,
    widgetState,
  });

  useKangurAiTutorSelectionGuidanceHandoffEffect({
    activeSelectedText: displayState.activeSelectedText,
    handleOpenChat: interactions.handleOpenChat,
    hasSelectionPanelReady: 
      tutorRuntime.isOpen && 
      displayState.panelShellMode === 'minimal' && 
      widgetState.contextualTutorMode === 'selection_explain' && 
      widgetState.selectionConversationContext !== null && 
      areTutorSelectionTextsEquivalent(widgetState.selectionConversationContext.selectedText, displayState.activeSelectedText),
    isLoading,
    isOpen: tutorRuntime.isOpen,
    panelMotionState: displayState.tutorPanelMotionState,
    selectionConversationSelectedText: widgetState.selectionConversationContext?.selectedText ?? null,
    selectionGuidanceHandoffText: widgetState.selectionGuidanceHandoffText,
    setSelectionGuidanceHandoffText: widgetState.setSelectionGuidanceHandoffText,
    setSelectionResponseComplete: widgetState.setSelectionResponseComplete,
    setSelectionResponsePending: widgetState.setSelectionResponsePending,
    telemetryContext,
  });

  useKangurAiTutorSelectionGuidanceDockOpenEffect({
    activeSelectedText: displayState.activeSelectedText,
    handleOpenChat: interactions.handleOpenChat,
    hasSelectionPanelReady: 
      tutorRuntime.isOpen && 
      displayState.panelShellMode === 'minimal' && 
      widgetState.contextualTutorMode === 'selection_explain' && 
      widgetState.selectionConversationContext !== null && 
      areTutorSelectionTextsEquivalent(widgetState.selectionConversationContext.selectedText, displayState.activeSelectedText),
    isLoading,
    selectionConversationSelectedText: widgetState.selectionConversationContext?.selectedText ?? null,
    selectionGuidanceHandoffText: widgetState.selectionGuidanceHandoffText,
  });

  useKangurAiTutorLifecycleEffects({
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    authIsAuthenticated: authState?.isAuthenticated,
    clearSelection,
    closeChat,
    hasContextualFreeformFocus: displayState.activeFocus.kind !== null,
    contextualFreeformPanelPoint: displayState.contextualFreeformPanelPoint,
    getContextSwitchNotice,
    getCurrentLocation: getCurrentTutorLocation,
    isOpen: tutorRuntime.isOpen,
    messages,
    rawSelectedText,
    recordFollowUpCompletion,
    routingPageKey: routing?.pageKey,
    selectedText: displayState.activeSelectedText,
    sessionContext,
    setHighlightedText,
    tutorContent,
    tutorSessionKey,
    uiMode,
    viewport,
    widgetState,
  });

  const selectionTakeoverText =
    widgetState.selectionGuidanceHandoffText ?? widgetState.selectionResponsePending?.selectedText ?? null;
  
  const hasSelectionMinimalPanelSurface =
    tutorRuntime.isOpen &&
    displayState.panelShellMode === 'minimal' &&
    (selectionTakeoverText !== null ||
      widgetState.contextualTutorMode === 'selection_explain' ||
      widgetState.selectionResponsePending !== null);
  
  const hasSectionMinimalPanelSurface =
    tutorRuntime.isOpen &&
    displayState.panelShellMode === 'minimal' &&
    (widgetState.highlightedSection !== null ||
      widgetState.sectionResponsePending !== null ||
      widgetState.contextualTutorMode === 'section_explain');

  const isSelectionGuidedMode =
    widgetState.guidedTutorTarget?.mode === 'selection' ||
    selectionTakeoverText !== null ||
    widgetState.contextualTutorMode === 'selection_explain' ||
    displayState.isSelectionExplainPendingMode ||
    hasSelectionMinimalPanelSurface;

  const isSectionGuidedMode =
    widgetState.guidedTutorTarget?.mode === 'section' ||
    widgetState.highlightedSection !== null ||
    widgetState.sectionResponsePending !== null ||
    widgetState.contextualTutorMode === 'section_explain' ||
    displayState.isSectionExplainPendingMode ||
    hasSectionMinimalPanelSurface;

  const tutorSurfaceMode: TutorSurfaceMode =
    isSelectionGuidedMode && (widgetState.selectionResponsePending !== null || widgetState.selectionGuidanceHandoffText !== null)
      ? 'selection_guided'
      : isSectionGuidedMode && widgetState.sectionResponsePending !== null
        ? 'section_guided'
        : isAuthGuidedTutorTarget(widgetState.guidedTutorTarget)
          ? 'auth_guided'
        : widgetState.canonicalTutorModalVisible || widgetState.guestIntroVisible || widgetState.guestIntroHelpVisible
          ? 'onboarding'
        : 'idle_avatar';

    const suppressPanelSurface =
      tutorSurfaceMode === 'onboarding' ||
      tutorSurfaceMode === 'auth_guided' ||
      (displayState.panelShellMode === 'minimal' && 
        (widgetState.selectionResponsePending !== null || widgetState.selectionGuidanceHandoffText !== null || widgetState.sectionResponsePending !== null));

  useKangurAiTutorTelemetryBridge({
    activeFocus: displayState.activeFocus,
    activeSelectedText: displayState.activeSelectedText,
    bridgeQuickActionId: displayState.bridgeQuickAction?.id ?? null,
    bubbleMode: displayState.bubblePlacement.mode,
    hintDepth,
    isOpen: tutorRuntime.isOpen,
    lastTrackedFocusKeyRef: widgetState.lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef: widgetState.lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef: widgetState.lastTrackedQuotaKeyRef,
    motionProfile,
    motionTimeoutRef: widgetState.motionTimeoutRef,
    prefersReducedMotion: prefersReducedMotion ?? false,
    proactiveNudges,
    sessionContext: {
      surface: sessionContext?.surface,
      contentId: sessionContext?.contentId,
      title: sessionContext?.title,
    },
    setPanelMotionState: widgetState.setPanelMotionState,
    telemetryContext,
    tutorSessionKey,
    usageSummary,
    visibleProactiveNudge: displayState.visibleProactiveNudge,
  });

  useKangurAiTutorGuidedAuthHandoffEffect({
    guidedTutorTarget: widgetState.guidedTutorTarget,
    loginModal,
    setGuidedTutorTarget: widgetState.setGuidedTutorTarget,
  });

  const guestIntroFlow = useKangurAiTutorGuestIntroFlow({
    authState,
    canonicalTutorModalVisible: widgetState.canonicalTutorModalVisible,
    enabled,
    guestIntroCheckStartedRef: widgetState.guestIntroCheckStartedRef,
    guestAuthFormVisible: widgetState.guestAuthFormVisible,
    guestIntroHelpVisible: widgetState.guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef: widgetState.guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord: widgetState.guestIntroRecord,
    guestIntroShownForCurrentEntryRef: widgetState.guestIntroShownForCurrentEntryRef,
    guestIntroVisible: widgetState.guestIntroVisible,
    contextualTutorMode: widgetState.contextualTutorMode,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    handleCloseChat: interactions.handleCloseChat,
    handleOpenChat: interactions.handleOpenChat,
    isOpen: tutorRuntime.isOpen,
    isTutorHidden: widgetState.isTutorHidden,
    mounted: widgetState.mounted,
    selectionGuidanceHandoffText: widgetState.selectionGuidanceHandoffText,
    selectionExplainTimeoutRef: widgetState.selectionExplainTimeoutRef,
    selectionResponsePending: widgetState.selectionResponsePending,
    setCanonicalTutorModalVisible: widgetState.setCanonicalTutorModalVisible,
    setGuestAuthFormVisible: widgetState.setGuestAuthFormVisible,
    setGuidedTutorTarget: widgetState.setGuidedTutorTarget,
    setGuestIntroHelpVisible: widgetState.setGuestIntroHelpVisible,
    setGuestIntroRecord: widgetState.setGuestIntroRecord,
    setGuestIntroVisible: widgetState.setGuestIntroVisible,
    setHasNewMessage: widgetState.setHasNewMessage,
    shouldRepeatGuestIntroOnEntry,
    suppressAvatarClickRef: widgetState.suppressAvatarClickRef,
  });

  const guidedFlow = useKangurAiTutorGuidedFlow({
    activeSelectionPageRect: displayState.activeSelectionPageRect,
    activateSelectionGlow,
    clearSelection,
    handleOpenChat: interactions.handleOpenChat,
    messageCount: messages.length,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    resetAskModalState: interactions.resetAskModalState,
    selectionConversationFocus: displayState.activeFocus.conversationFocus,
    selectionExplainTimeoutRef: widgetState.selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef: widgetState.selectionGuidanceRevealTimeoutRef,
    sendMessage,
    setCanonicalTutorModalVisible: widgetState.setCanonicalTutorModalVisible,
    setDismissedSelectedText: widgetState.setDismissedSelectedText,
    setGuestIntroHelpVisible: widgetState.setGuestIntroHelpVisible,
    setGuestIntroVisible: widgetState.setGuestIntroVisible,
    setContextualTutorMode: widgetState.setContextualTutorMode,
    setGuidedTutorTarget: widgetState.setGuidedTutorTarget,
    setHasNewMessage: widgetState.setHasNewMessage,
    setHighlightedSection: widgetState.setHighlightedSection,
    setHighlightedText,
    setHoveredSectionAnchorId: widgetState.setHoveredSectionAnchorId,
    setPersistedSelectionContainerRect: widgetState.setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect: widgetState.setPersistedSelectionPageRect,
    setPersistedSelectionPageRects: widgetState.setPersistedSelectionPageRects,
    setPersistedSelectionRect: widgetState.setPersistedSelectionRect,
    setSelectionGuidanceCalloutVisibleText: widgetState.setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext: widgetState.setSelectionConversationContext,
    setSelectionGuidanceHandoffText: widgetState.setSelectionGuidanceHandoffText,
    setSectionResponseComplete: widgetState.setSectionResponseComplete,
    setSectionResponsePending: widgetState.setSectionResponsePending,
    setSelectionContextSpotlightTick: widgetState.setSelectionContextSpotlightTick,
    setSelectionResponseComplete: widgetState.setSelectionResponseComplete,
    setSelectionResponsePending: widgetState.setSelectionResponsePending,
    setViewportTick: widgetState.setViewportTick,
    suppressAvatarClickRef: widgetState.suppressAvatarClickRef,
    telemetryContext,
    tutorContent,
    viewportHeight: viewport.height,
  });

  const homeOnboardingFlow = useKangurAiTutorHomeOnboardingFlow({
    canStartHomeOnboardingManually: displayState.canStartHomeOnboardingManually,
    closeChat,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingMode,
    homeOnboardingRecord: widgetState.homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef: widgetState.homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStep: displayState.homeOnboardingStep,
    homeOnboardingStepIndex: widgetState.homeOnboardingStepIndex,
    homeOnboardingStepsLength: displayState.homeOnboardingSteps.length,
    isEligibleForHomeOnboarding: displayState.isEligibleForHomeOnboarding,
    sessionContentId: sessionContext?.contentId,
    setDraggedAvatarPoint: widgetState.setDraggedAvatarPoint,
    setHomeOnboardingRecord: widgetState.setHomeOnboardingRecord,
    setHomeOnboardingStepIndex: widgetState.setHomeOnboardingStepIndex,
    shouldRepeatHomeOnboardingOnEntry,
  });

  const handleAuthenticatedOnboardingDismiss = useCallback((): void => {
    widgetState.setCanonicalTutorModalVisible(false);
    widgetState.setGuestIntroVisible(false);
    widgetState.setGuestIntroHelpVisible(false);
  }, [widgetState]);

  const handleGuestIntroStartChat = useCallback((): void => {
    if (isAnonymousVisitor) {
      guestIntroFlow.handleGuestIntroAcceptSilent();
      const callbackUrl = typeof window === 'undefined' ? null : window.location.href;
      loginModal.openLoginModal(callbackUrl, { authMode: 'sign-in' });
      return;
    }

    handleAuthenticatedOnboardingDismiss();
    if (!tutorRuntime.isOpen) {
      interactions.handleOpenChat('toggle');
    }
  }, [
    guestIntroFlow,
    handleAuthenticatedOnboardingDismiss,
    interactions,
    isAnonymousVisitor,
    loginModal,
    tutorRuntime.isOpen,
  ]);

  const avatarShellActions = useKangurAiTutorAvatarShellActions({
    canonicalTutorModalVisible: widgetState.canonicalTutorModalVisible,
    closeChat,
    guestIntroHelpVisible: widgetState.guestIntroHelpVisible,
    guestIntroVisible: widgetState.guestIntroVisible,
    guidedMode: displayState.guidedMode,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    handleCloseChat: interactions.handleCloseChat,
    handleCloseLauncherPrompt: interactions.handleCloseLauncherPrompt,
    handleHomeOnboardingFinishEarly: homeOnboardingFlow.handleHomeOnboardingFinishEarly,
    handleOpenChat: interactions.handleOpenChat,
    homeOnboardingStepIndex: widgetState.homeOnboardingStepIndex,
    isAnonymousVisitor,
    isOpen: tutorRuntime.isOpen,
    launcherPromptVisible: widgetState.launcherPromptVisible,
    persistSelectionContext: interactions.persistSelectionContext,
    selectionExplainTimeoutRef: widgetState.selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef: widgetState.selectionGuidanceRevealTimeoutRef,
    setCanonicalTutorModalVisible: widgetState.setCanonicalTutorModalVisible,
    setContextualTutorMode: widgetState.setContextualTutorMode,
    setDraggedAvatarPoint: widgetState.setDraggedAvatarPoint,
    setGuestAuthFormVisible: widgetState.setGuestAuthFormVisible,
    setGuestIntroHelpVisible: widgetState.setGuestIntroHelpVisible,
    setGuestIntroVisible: widgetState.setGuestIntroVisible,
    setGuidedTutorTarget: widgetState.setGuidedTutorTarget,
    setHighlightedSection: widgetState.setHighlightedSection,
    setHoveredSectionAnchorId: widgetState.setHoveredSectionAnchorId,
    setSectionResponseComplete: widgetState.setSectionResponseComplete,
    setSectionResponsePending: widgetState.setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText: widgetState.setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete: widgetState.setSelectionResponseComplete,
    setSelectionResponsePending: widgetState.setSelectionResponsePending,
    setSelectionGuidanceHandoffText: widgetState.setSelectionGuidanceHandoffText,
    startGuidedSelectionExplanation: guidedFlow.startGuidedSelectionExplanation,
    suppressAvatarClickRef: widgetState.suppressAvatarClickRef,
  });

  useEffect(() => {
    if (tutorRuntime.isOpen || !displayState.showSelectionGuidanceCallout) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (isTargetWithinTutorUi(event.target)) {
        return;
      }

      interactions.handleCloseChat('outside');
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [interactions.handleCloseChat, displayState.showSelectionGuidanceCallout, tutorRuntime.isOpen]);

  const avatarDrag = useKangurAiTutorAvatarDrag({
    avatarDragStateRef: widgetState.avatarDragStateRef,
    draggedAvatarPoint: widgetState.draggedAvatarPoint,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    homeOnboardingStepIndex: widgetState.homeOnboardingStepIndex,
    hoveredSectionAnchor: displayState.hoveredSectionAnchor,
    isAvatarDragging: widgetState.isAvatarDragging,
    isOpen: tutorRuntime.isOpen,
    selectionExplainTimeoutRef: widgetState.selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef: widgetState.selectionGuidanceRevealTimeoutRef,
    setDraggedAvatarPoint: widgetState.setDraggedAvatarPoint,
    setGuidedTutorTarget: widgetState.setGuidedTutorTarget,
    setHomeOnboardingStepIndex: widgetState.setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId: widgetState.setHoveredSectionAnchorId,
    setIsAvatarDragging: widgetState.setIsAvatarDragging,
    setSelectionGuidanceCalloutVisibleText: widgetState.setSelectionGuidanceCalloutVisibleText,
    handleAvatarTap: avatarShellActions.handleAvatarClick,
    startGuidedSectionExplanation: guidedFlow.startGuidedSectionExplanation,
    suppressAvatarClickRef: widgetState.suppressAvatarClickRef,
    tutorAnchorContext,
    viewport,
  });

  const panelDrag = useKangurAiTutorPanelDrag({
    isPanelDraggable: displayState.isPanelDraggable,
    isPanelDragging: widgetState.isPanelDragging,
    panelDragStateRef: widgetState.panelDragStateRef,
    panelRef: widgetState.panelRef,
    setIsPanelDragging: widgetState.setIsPanelDragging,
    setPanelPosition: widgetState.setPanelPosition,
    setPanelPositionMode: widgetState.setPanelPositionMode,
    setPanelSnapPreference: widgetState.setPanelSnapPreference,
    viewport,
  });

  const handleTutorHeaderPointerCancel = displayState.isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerCancel
    : avatarDrag.handlePanelSectionPointerCancel;
  const handleTutorHeaderPointerDown = displayState.isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerDown
    : avatarDrag.handlePanelSectionPointerDown;
  const handleTutorHeaderPointerMove = displayState.isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerMove
    : avatarDrag.handlePanelSectionPointerMove;
  const handleTutorHeaderPointerUp = displayState.isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerUp
    : avatarDrag.handlePanelSectionPointerUp;

  const panelActions = useKangurAiTutorPanelActions({
    activeFocus: displayState.activeFocus,
    activeSectionRect: displayState.activeSectionRect,
    activeSelectedText: displayState.activeSelectedText,
    activeSelectionPageRect: displayState.activeSelectionPageRect,
    answerRevealed: sessionContext?.answerRevealed,
    basePath,
    bridgeQuickActionId: displayState.bridgeQuickAction?.id ?? null,
    canSendMessages,
    clearSelection,
    drawingImageData: widgetState.drawingImageData,
    focusSectionRect: guidedFlow.focusSectionRect,
    focusSelectionPageRect: guidedFlow.focusSelectionPageRect,
    getCurrentTutorLocation,
    getInteractionIntent,
    highlightedSection: widgetState.highlightedSection,
    inputValue: widgetState.inputValue,
    isAnonymousVisitor,
    isLoading,
    latestWebsiteHelpTarget:
      [...messages].reverse().find((m) => m.role === 'assistant')?.websiteHelpTarget ?? null,
    messageCount: messages.length,
    normalizeConversationFocusKind,
    persistSelectionGeometry,
    resolveGuestLoginGuidanceIntent: resolveGuestLoginGuidanceIntentForContent,
    resolveTutorFollowUpLocation,
    setHighlightedText,
    sendMessage,
    startGuidedGuestLogin: guestIntroFlow.startGuidedGuestLogin,
    telemetryContext,
    tutorSessionKey,
    widgetState: {
      setDismissedSelectedText: widgetState.setDismissedSelectedText,
      setDrawingImageData: widgetState.setDrawingImageData,
      setDrawingMode: widgetState.setDrawingMode,
      setHighlightedSection: widgetState.setHighlightedSection,
      setInputValue: widgetState.setInputValue,
      setMessageFeedbackByKey: widgetState.setMessageFeedbackByKey,
      setPersistedSelectionContainerRect: widgetState.setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect: widgetState.setPersistedSelectionPageRect,
      setPersistedSelectionPageRects: widgetState.setPersistedSelectionPageRects,
      setPersistedSelectionRect: widgetState.setPersistedSelectionRect,
      setSelectionConversationContext: widgetState.setSelectionConversationContext,
      setSectionResponseComplete: widgetState.setSectionResponseComplete,
      setSectionResponsePending: widgetState.setSectionResponsePending,
      setSelectionResponseComplete: widgetState.setSelectionResponseComplete,
    },
  });

  const { portalContentValue } = useKangurAiTutorPortalViewModel({
    activeFocus: displayState.activeFocus,
    activeSectionRect: displayState.activeSectionRect,
    activeSelectedText: displayState.activeSelectedText,
    activeSelectionPageRect: displayState.activeSelectionPageRect,
    askModalHelperText: displayState.askModalHelperText,
    avatarAnchorKind: displayState.avatarAnchorKind,
    avatarAttachmentSide: displayState.avatarAttachmentSide,
    avatarButtonClassName: displayState.avatarButtonClassName,
    avatarButtonStyle: displayState.avatarButtonStyle,
    avatarPointer: displayState.avatarPointer,
    avatarStyle: displayState.avatarStyle,
    attachedAvatarStyle: displayState.attachedAvatarStyle,
    attachedLaunchOffset: displayState.attachedLaunchOffset,
    basePath,
    bridgeQuickAction: displayState.bridgeQuickAction,
    bridgeSummaryChipLabel: displayState.bridgeSummaryChipLabel,
    bubblePlacement: {
      ...displayState.bubblePlacement,
      style: displayState.panelBubbleStyle,
    },
    canNarrateTutorText: displayState.canNarrateTutorText,
    canSendMessages,
    canStartHomeOnboardingManually: displayState.canStartHomeOnboardingManually,
    canonicalTutorModalVisible: widgetState.canonicalTutorModalVisible,
    compactDockedTutorPanelWidth: displayState.compactDockedTutorPanelWidth,
    contextualTutorMode: widgetState.contextualTutorMode,
    drawingImageData: widgetState.drawingImageData,
    drawingMode: widgetState.drawingMode,
    emptyStateMessage: displayState.emptyStateMessage,
    floatingAvatarPlacement: displayState.floatingAvatarPlacement,
    focusChipLabel: displayState.conversationFocusChipLabel,
    guestAuthFormVisible: widgetState.guestAuthFormVisible,
    guestIntroHelpVisible: widgetState.guestIntroHelpVisible,
    guestTutorAssistantLabel: displayState.guestTutorAssistantLabel,
    guidedArrowheadTransition: displayState.guidedArrowheadTransition,
    guidedAvatarArrowhead: displayState.guidedAvatarArrowhead,
    guidedAvatarArrowheadDisplayAngle: displayState.guidedAvatarArrowheadDisplayAngle,
    guidedAvatarArrowheadDisplayAngleLabel: displayState.guidedAvatarArrowheadDisplayAngleLabel,
    guidedAvatarLayout: displayState.guidedAvatarLayout,
    guidedCalloutDetail: displayState.guidedCalloutDetail,
    guidedCalloutHeaderLabel: displayState.guidedCalloutHeaderLabel,
    guidedCalloutKey: displayState.guidedCalloutKey,
    guidedCalloutLayout: displayState.guidedCalloutLayout,
    guidedCalloutStepLabel: displayState.guidedCalloutStepLabel,
    guidedCalloutStyle: displayState.guidedCalloutStyle,
    guidedCalloutTestId: displayState.guidedCalloutTestId,
    guidedCalloutTitle: displayState.guidedCalloutTitle,
    guidedCalloutTransitionDuration: displayState.guidedCalloutTransitionDuration,
    guidedMode: displayState.guidedMode,
    guidedSelectionPreview: displayState.guidedSelectionPreview,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    handleAskAbout: avatarShellActions.handleAskAbout,
    handleAvatarClick: avatarShellActions.handleAvatarClick,
    handleAvatarMouseDown: interactions.handleAvatarMouseDown,
    handleAvatarMouseUp: avatarDrag.handleFloatingAvatarMouseUp,
    handleAttachedAvatarPointerCancel: avatarDrag.handleFloatingAvatarPointerCancel,
    handleAttachedAvatarPointerDown: avatarDrag.handleFloatingAvatarPointerDown,
    handleAttachedAvatarPointerMove: avatarDrag.handleFloatingAvatarPointerMove,
    handleAttachedAvatarPointerUp: avatarDrag.handleFloatingAvatarPointerUp,
    handleClearDrawing: panelActions.handleClearDrawing,
    handleCloseChat: interactions.handleCloseChat,
    handleCloseGuidedCallout: avatarShellActions.handleCloseGuidedCallout,
    handleDetachHighlightedSection: panelActions.handleDetachHighlightedSection,
    handleDetachSelectedFragment: panelActions.handleDetachSelectedFragment,
    handleDisableTutor: interactions.handleDisableTutor,
    handleDrawingComplete: panelActions.handleDrawingComplete,
    handleFloatingAvatarPointerCancel: avatarDrag.handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown: avatarDrag.handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove: avatarDrag.handleFloatingAvatarPointerMove,
    handleFloatingAvatarPointerUp: avatarDrag.handleFloatingAvatarPointerUp,
    handleFocusHighlightedSection: panelActions.handleFocusHighlightedSection,
    handleFocusSelectedFragment: panelActions.handleFocusSelectedFragment,
    handleFollowUpClick: panelActions.handleFollowUpClick,
    handleAuthenticatedOnboardingAccept: (): void => {
      handleAuthenticatedOnboardingDismiss();
      homeOnboardingFlow.handleStartHomeOnboarding();
    },
    handleAuthenticatedOnboardingDismiss,
    handleGuestIntroAccept: guestIntroFlow.handleGuestIntroAccept,
    handleGuestIntroDismiss: guestIntroFlow.handleGuestIntroDismiss,
    handleGuestIntroStartChat,
    handleHomeOnboardingAdvance: homeOnboardingFlow.handleHomeOnboardingAdvance,
    handleHomeOnboardingBack: homeOnboardingFlow.handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly: homeOnboardingFlow.handleHomeOnboardingFinishEarly,
    handleKeyDown: panelActions.handleKeyDown,
    handleDetachPanelFromContext: interactions.handleDetachPanelFromContext,
    handleMessageFeedback: panelActions.handleMessageFeedback,
    handleMovePanelToContext: interactions.handleMovePanelToContext,
    handleWebsiteHelpTargetClick: panelActions.handleWebsiteHelpTargetClick,
    handlePanelBackdropClose: interactions.handlePanelBackdropClose,
    handlePanelHeaderClose: interactions.handlePanelHeaderClose,
    handleResetPanelPosition: interactions.handleResetPanelPosition,
    handlePanelHeaderPointerCancel: handleTutorHeaderPointerCancel,
    handlePanelHeaderPointerDown: handleTutorHeaderPointerDown,
    handlePanelHeaderPointerMove: handleTutorHeaderPointerMove,
    handlePanelHeaderPointerUp: handleTutorHeaderPointerUp,
    handleQuickAction: panelActions.handleQuickAction,
    handleSelectionActionMouseDown: interactions.handleSelectionActionMouseDown,
    handleSend: panelActions.handleSend,
    handleStartHomeOnboarding: homeOnboardingFlow.handleStartHomeOnboarding,
    handleToggleDrawing: panelActions.handleToggleDrawing,
    homeOnboardingReplayLabel: displayState.homeOnboardingReplayLabel,
    homeOnboardingStep: displayState.homeOnboardingStep,
    inputPlaceholder: displayState.inputPlaceholder,
    isAnonymousVisitor,
    isAskModalMode: displayState.isAskModalMode,
    isCompactDockedTutorPanel: displayState.isCompactDockedTutorPanel,
    isGuidedTutorMode: displayState.isGuidedTutorMode,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    isPanelFollowingContext:
      widgetState.panelPositionMode === 'contextual' && displayState.contextualFreeformPanelPoint !== null,
    isPanelContextMoveAvailable: displayState.contextualFreeformPanelPoint !== null,
    isPanelPositionCustomized: widgetState.panelPosition !== null,
    isPanelDraggable: displayState.isPanelDraggable,
    isPanelDragging: displayState.isPanelDragging,
    isSectionExplainPendingMode: displayState.isSectionExplainPendingMode,
    isSelectionExplainPendingMode: displayState.isSelectionExplainPendingMode,
    isTutorHidden: widgetState.isTutorHidden,
    isUsageLoading,
    messages: displayState.conversationMessages,
    motionProfile,
    narratorSettings,
    panelAvatarPlacement: displayState.panelAvatarPlacement,
    panelEmptyStateMessage: displayState.panelEmptyStateMessage,
    panelOpenAnimation: displayState.panelOpenAnimation,
    panelSnapState: displayState.panelSnapState,
    panelShellMode: displayState.panelShellMode,
    panelTransition: displayState.panelTransition,
    pointerMarkerId: displayState.pointerMarkerId,
    prefersReducedMotion,
    reducedMotionTransitions,
    remainingMessages,
    sectionContextSpotlightStyle: displayState.sectionContextSpotlightStyle,
    sectionDropHighlightStyle: displayState.sectionDropHighlightStyle,
    sectionGuidanceLabel: displayState.sectionGuidanceLabel,
    sectionResponsePendingKind: displayState.sectionResponsePendingKind,
    selectedTextPreview: displayState.selectedTextPreview,
    selectionActionLayout: displayState.selectionActionLayout,
    selectionActionStyle: displayState.selectionActionStyle,
    selectionGlowStyles: displayState.selectionGlowStyles,
    selectionContextSpotlightStyle: displayState.selectionContextSpotlightStyle,
    selectionSpotlightStyle: displayState.selectionSpotlightStyle,
    sessionSurfaceLabel: displayState.sessionSurfaceLabel,
    shouldRenderAuxiliaryPanelControls: displayState.shouldRenderAuxiliaryPanelControls,
    shouldRenderContextlessTutorUi,
    shouldRenderGuidedCallout: displayState.shouldRenderGuidedCallout,
    shouldRenderSelectionAction: displayState.shouldRenderSelectionAction,
    shouldRepeatGuestIntroOnEntry,
    showAttachedAvatarShell: displayState.showAttachedAvatarShell,
    showFloatingAvatar: displayState.showFloatingAvatar,
    showSectionExplainCompleteState: displayState.showSectionExplainCompleteState,
    showSectionGuidanceCallout: displayState.showSectionGuidanceCallout,
    showSelectionExplainCompleteState: displayState.showSelectionExplainCompleteState,
    showSelectionGuidanceCallout: displayState.showSelectionGuidanceCallout,
    showSources,
    suppressPanelSurface,
    tutorContent,
    tutorNarrationScript: displayState.tutorNarrationScript,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    tutorSurfaceMode,
    uiMode,
    usageSummary,
    viewport,
    visibleProactiveNudge: displayState.visibleProactiveNudge,
    visibleQuickActions: displayState.visibleQuickActions,
  });

  const shouldRender =
    widgetState.mounted &&
    (
      enabled ||
      shouldRenderGuestIntroUi ||
      shouldRenderContextlessTutorUi ||
      displayState.isGuidedTutorMode ||
      widgetState.askModalVisible ||
      widgetState.canonicalTutorModalVisible ||
      isAnonymousVisitor ||
      !widgetState.isTutorHidden ||
      tutorRuntime.isOpen ||
      widgetState.guidedTutorTarget !== null ||
      widgetState.contextualTutorMode !== null ||
      widgetState.selectionGuidanceCalloutVisibleText !== null ||
      widgetState.selectionGuidanceHandoffText !== null ||
      widgetState.selectionResponsePending !== null
    );

  return {
    portalContentValue,
    shouldRender,
  };
}
