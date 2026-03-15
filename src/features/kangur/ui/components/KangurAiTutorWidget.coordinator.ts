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
import { useKangurAiTutorGuidedFlow } from './KangurAiTutorWidget.guided';
import { useKangurAiTutorPanelInteractions } from './KangurAiTutorWidget.interactions';
import { useKangurAiTutorLifecycleEffects } from './KangurAiTutorWidget.lifecycle';
import { useKangurAiTutorPanelActions } from './KangurAiTutorWidget.panel-actions';
import { useKangurAiTutorPanelDrag } from './KangurAiTutorWidget.panel-drag';
import { useKangurAiTutorPortalViewModel } from './KangurAiTutorWidget.portal-view';
import { useKangurAiTutorTelemetryBridge } from './KangurAiTutorWidget.telemetry';

import type { KangurAiTutorPortalContextValue } from './KangurAiTutorPortal.context';
import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';
import { persistHomeOnboardingRecord } from './KangurAiTutorWidget.storage';

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
    activeSelectionProtectedRect,
    reducedMotionTransitions,
    remainingMessages,
    resolveGuestLoginGuidanceIntentForContent,
    routing,
    selectionGlowSupported: _selectionGlowSupported,
    shouldRepeatGuestIntroOnEntry,
    shouldRepeatHomeOnboardingOnEntry,
    telemetryContext,
    tutorAnchorContext,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    uiMode,
    viewport,
    persistSelectionGeometry,
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

  const {
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionRect,
    activeSelectionPageRect,
    askModalHelperText,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarButtonClassName,
    avatarButtonStyle,
    avatarPointer,
    avatarStyle,
    attachedAvatarStyle,
    attachedLaunchOffset,
    bridgeQuickAction,
    bridgeSummaryChipLabel,
    bubblePlacement,
    canNarrateTutorText,
    canStartHomeOnboardingManually,
    compactDockedTutorPanelWidth,
    contextualFreeformPanelPoint,
    conversationFocusChipLabel,
    conversationMessages,
    emptyStateMessage,
    floatingAvatarPlacement,
    guestTutorAssistantLabel,
    guidedArrowheadTransition,
    guidedAvatarArrowhead,
    guidedAvatarArrowheadDisplayAngle,
    guidedAvatarArrowheadDisplayAngleLabel,
    guidedAvatarLayout,
    guidedCalloutDetail,
    guidedCalloutHeaderLabel,
    guidedCalloutKey,
    guidedCalloutLayout,
    guidedCalloutStepLabel,
    guidedCalloutStyle,
    guidedCalloutTestId,
    guidedCalloutTitle,
    guidedCalloutTransitionDuration,
    guidedMode,
    guidedSelectionPreview,
    homeOnboardingReplayLabel,
    homeOnboardingStep,
    homeOnboardingSteps,
    hoveredSectionAnchor,
    inputPlaceholder,
    isAskModalMode,
    isCompactDockedTutorPanel,
    isContextualPanelAnchor: _isContextualPanelAnchor,
    isEligibleForHomeOnboarding,
    isGuidedTutorMode,
    isPanelDraggable,
    isPanelDragging: isPanelCurrentlyDragging,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    panelAvatarPlacement,
    panelBubbleStyle,
    panelEmptyStateMessage,
    panelOpenAnimation,
    panelSnapState,
    panelShellMode,
    panelTransition,
    pointerMarkerId,
    sectionContextSpotlightStyle,
    sectionDropHighlightStyle,
    sectionGuidanceLabel,
    sectionResponsePendingKind,
    selectedTextPreview,
    selectionActionLayout,
    selectionActionStyle,
    selectionGlowStyles,
    selectionContextSpotlightStyle,
    selectionSpotlightStyle,
    sessionSurfaceLabel,
    shouldRenderAuxiliaryPanelControls,
    shouldRenderGuidedCallout,
    shouldRenderSelectionAction,
    showAttachedAvatarShell,
    showFloatingAvatar,
    showSectionExplainCompleteState,
    showSectionGuidanceCallout,
    showSelectionExplainCompleteState,
    showSelectionGuidanceCallout,
    suppressPanelSurface: _suppressPanelSurface,
    tutorNarrationScript,
    tutorSurfaceMode,
    visibleProactiveNudge,
    visibleQuickActions,
  } = displayState;
  const suppressPanelSurface =
    tutorRuntime.isOpen &&    (tutorSurfaceMode === 'onboarding' ||
      tutorSurfaceMode === 'auth_guided' ||
      displayState.guidedMode === 'home_onboarding' ||
      (tutorSurfaceMode === 'selection_guided' &&
        widgetState.selectionResponsePending !== null) ||
      (tutorSurfaceMode === 'section_guided' &&
        widgetState.sectionResponsePending !== null));

  const interactions = useKangurAiTutorPanelInteractions({
    activeSelectedText,
    allowSelectedTextSupport,
    bubblePlacementMode: bubblePlacement.mode,
    clearSelection,
    closeChat,
    freeformContextualPanelPoint: contextualFreeformPanelPoint,
    isAskModalMode,
    isOpen: tutorRuntime.isOpen,
    isTargetWithinTutorUi,
    messageCount: messages.length,
    openChat,
    persistSelectionGeometry,
    selectedText: activeSelectedText,
    selectionRect: activeSelectionRect,
    setHighlightedText,
    setInputValue: widgetState.setInputValue,
    telemetryContext,
    widgetState,
  });


  useKangurAiTutorLifecycleEffects({
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    authIsAuthenticated: authState?.isAuthenticated,
    clearSelection,
    closeChat,
    hasContextualFreeformFocus: activeFocus.kind !== null,
    contextualFreeformPanelPoint,
    getContextSwitchNotice,
    getCurrentLocation: getCurrentTutorLocation,
    isOpen: tutorRuntime.isOpen,
    messages,
    rawSelectedText,
    recordFollowUpCompletion,
    routingPageKey: routing?.pageKey,
    selectedText: activeSelectedText,
    sessionContext,
    setHighlightedText,
    tutorContent,
    tutorSessionKey,
    uiMode,
    viewport,
    widgetState,
  });

  useKangurAiTutorTelemetryBridge({
    activeFocus,
    activeSelectedText,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    bubbleMode: bubblePlacement.mode,
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
    visibleProactiveNudge,
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
    activeSelectionPageRect,
    activateSelectionGlow,
    clearSelection,
    handleOpenChat: interactions.handleOpenChat,
    messageCount: messages.length,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    resetAskModalState: interactions.resetAskModalState,
    selectionConversationFocus: activeFocus.conversationFocus,
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
    canStartHomeOnboardingManually,
    closeChat,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingMode,
    homeOnboardingRecord: widgetState.homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef: widgetState.homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStep,
    homeOnboardingStepIndex: widgetState.homeOnboardingStepIndex,
    homeOnboardingStepsLength: homeOnboardingSteps.length,
    isEligibleForHomeOnboarding,
    sessionContentId: sessionContext?.contentId,
    setDraggedAvatarPoint: widgetState.setDraggedAvatarPoint,
    setHomeOnboardingRecord: widgetState.setHomeOnboardingRecord,
    setHomeOnboardingStepIndex: widgetState.setHomeOnboardingStepIndex,
    shouldRepeatHomeOnboardingOnEntry,
  });

  const handleOnboardingAccept = useCallback((): void => {
    guestIntroFlow.handleGuestIntroAcceptSilent();
    widgetState.setCanonicalTutorModalVisible(false);

    if (homeOnboardingSteps.length > 0) {
      const nextRecord = persistHomeOnboardingRecord('shown');
      widgetState.setHomeOnboardingRecord(nextRecord);
      widgetState.setHomeOnboardingStepIndex(0);
      widgetState.homeOnboardingShownForCurrentEntryRef.current = true;
    }
  }, [
    guestIntroFlow,
    homeOnboardingSteps.length,
    widgetState,
  ]);

  const handleGuestIntroStartChat = useCallback((): void => {
    handleOnboardingAccept();
  }, [handleOnboardingAccept]);

  const avatarShellActions = useKangurAiTutorAvatarShellActions({
    canonicalTutorModalVisible: widgetState.canonicalTutorModalVisible,
    closeChat,
    guestIntroHelpVisible: widgetState.guestIntroHelpVisible,
    guestIntroVisible: widgetState.guestIntroVisible,
    guidedMode,
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
    setHasNewMessage: widgetState.setHasNewMessage,
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
    if (tutorRuntime.isOpen || !showSelectionGuidanceCallout) {
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
  }, [interactions.handleCloseChat, showSelectionGuidanceCallout, tutorRuntime.isOpen]);

  const avatarDrag = useKangurAiTutorAvatarDrag({
    avatarDragStateRef: widgetState.avatarDragStateRef,
    draggedAvatarPoint: widgetState.draggedAvatarPoint,
    guidedTutorTarget: widgetState.guidedTutorTarget,
    homeOnboardingStepIndex: widgetState.homeOnboardingStepIndex,
    hoveredSectionAnchor,
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
    isPanelDraggable,
    isPanelDragging: widgetState.isPanelDragging,
    panelDragStateRef: widgetState.panelDragStateRef,
    panelRef: widgetState.panelRef,
    setIsPanelDragging: widgetState.setIsPanelDragging,
    setPanelPosition: widgetState.setPanelPosition,
    setPanelPositionMode: widgetState.setPanelPositionMode,
    setPanelSnapPreference: widgetState.setPanelSnapPreference,
    viewport,
  });

  const handleTutorHeaderPointerCancel = isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerCancel
    : avatarDrag.handlePanelSectionPointerCancel;
  const handleTutorHeaderPointerDown = isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerDown
    : avatarDrag.handlePanelSectionPointerDown;
  const handleTutorHeaderPointerMove = isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerMove
    : avatarDrag.handlePanelSectionPointerMove;
  const handleTutorHeaderPointerUp = isPanelDraggable
    ? panelDrag.handlePanelHeaderPointerUp
    : avatarDrag.handlePanelSectionPointerUp;

  const panelActions = useKangurAiTutorPanelActions({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    answerRevealed: sessionContext?.answerRevealed,
    basePath,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
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
      setDrawingPanelOpen: widgetState.setDrawingPanelOpen,
    },
  });
  const { portalContentValue } = useKangurAiTutorPortalViewModel({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    activeSelectionProtectedRect: activeSelectionProtectedRect ?? activeSelectionRect,
    askModalHelperText,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarButtonClassName,
    avatarButtonStyle,
    avatarPointer,
    avatarStyle,
    attachedAvatarStyle,
    attachedLaunchOffset,
    basePath,
    bridgeQuickAction,
    sessionSurface: sessionContext?.surface ?? null,
    bridgeSummaryChipLabel,
    bubblePlacement: {
      ...bubblePlacement,
      style: panelBubbleStyle,
    },
    canNarrateTutorText,
    canSendMessages,
    canStartHomeOnboardingManually,
    canonicalTutorModalVisible: widgetState.canonicalTutorModalVisible,
    compactDockedTutorPanelWidth,
    contextualTutorMode: widgetState.contextualTutorMode,
    drawingImageData: widgetState.drawingImageData,
    drawingMode: widgetState.drawingMode,
    drawingPanelOpen: widgetState.drawingPanelOpen,
    emptyStateMessage,
    floatingAvatarPlacement,
    focusChipLabel: conversationFocusChipLabel,
    guestAuthFormVisible: widgetState.guestAuthFormVisible,
    guestIntroHelpVisible: widgetState.guestIntroHelpVisible,
    guestTutorAssistantLabel,
    guidedArrowheadTransition,
    guidedAvatarArrowhead,
    guidedAvatarArrowheadDisplayAngle,
    guidedAvatarArrowheadDisplayAngleLabel,
    guidedAvatarLayout,
    guidedCalloutDetail,
    guidedCalloutHeaderLabel,
    guidedCalloutKey,
    guidedCalloutLayout,
    guidedCalloutStepLabel,
    guidedCalloutStyle,
    guidedCalloutTestId,
    guidedCalloutTitle,
    guidedCalloutTransitionDuration,
    guidedMode,
    guidedSelectionPreview,
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
    handleCloseDrawingPanel: panelActions.handleCloseDrawingPanel,
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
    handleGuestIntroAcceptSilent: guestIntroFlow.handleGuestIntroAcceptSilent,
    handleGuestIntroClose: guestIntroFlow.handleGuestIntroClose,
    handleGuestIntroDismiss: guestIntroFlow.handleGuestIntroDismiss,
    handleHomeOnboardingAdvance: homeOnboardingFlow.handleHomeOnboardingAdvance,
    handleHomeOnboardingBack: homeOnboardingFlow.handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly: homeOnboardingFlow.handleHomeOnboardingFinishEarly,
    handleKeyDown: panelActions.handleKeyDown,
    handleDetachPanelFromContext: interactions.handleDetachPanelFromContext,
    handleMessageFeedback: panelActions.handleMessageFeedback,
    handleMovePanelToContext: interactions.handleMovePanelToContext,
    handleOpenDrawingPanel: panelActions.handleOpenDrawingPanel,
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
    handleGuestIntroStartChat,
    homeOnboardingReplayLabel,
    homeOnboardingStep,
    inputPlaceholder,
    isAnonymousVisitor,
    isAskModalMode,
    isCompactDockedTutorPanel,
    isGuidedTutorMode,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    isPanelFollowingContext:
      widgetState.panelPositionMode === 'contextual' && contextualFreeformPanelPoint !== null,
    isPanelContextMoveAvailable: contextualFreeformPanelPoint !== null,
    isPanelPositionCustomized: widgetState.panelPosition !== null,
    isPanelDraggable,
    isPanelDragging: isPanelCurrentlyDragging,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    isTutorHidden: widgetState.isTutorHidden,
    isUsageLoading,
    lastInteractionIntent: sessionContext?.interactionIntent ?? null,
    lastPromptMode: sessionContext?.promptMode ?? null,
    messages: conversationMessages,
    motionProfile,
    narratorSettings,
    panelAvatarPlacement,
    panelEmptyStateMessage,
    panelMeasuredHeight: widgetState.panelMeasuredHeight,
    panelOpenAnimation,
    panelSnapState,
    panelShellMode,
    panelTransition,
    pointerMarkerId,
    prefersReducedMotion,
    reducedMotionTransitions,
    remainingMessages,
    sectionContextSpotlightStyle,
    sectionDropHighlightStyle,
    sectionGuidanceLabel,
    sectionResponsePendingKind,
    selectedTextPreview,
    selectionActionLayout,
    selectionActionStyle,
    selectionGlowStyles,
    selectionContextSpotlightStyle,
    selectionSpotlightStyle,
    sessionSurfaceLabel,
    shouldRenderAuxiliaryPanelControls,
    shouldRenderGuidedCallout,
    shouldRenderSelectionAction,
    shouldRepeatGuestIntroOnEntry,
    showAttachedAvatarShell,
    showFloatingAvatar,
    showSectionExplainCompleteState,
    showSectionGuidanceCallout,
    showSelectionExplainCompleteState,
    showSelectionGuidanceCallout,
    showSources,
    suppressPanelSurface,
    tutorContent,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    tutorSurfaceMode,
    uiMode,
    usageSummary,
    viewport,
    visibleProactiveNudge,
    visibleQuickActions,
  });

  const shouldRender =
    widgetState.mounted &&
    (
      enabled ||
      shouldRenderGuestIntroUi ||
      isGuidedTutorMode ||
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
