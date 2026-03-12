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
    askModalReturnStateRef,
    askModalVisible,
    avatarDragStateRef,
    canonicalTutorModalVisible,
    draggedAvatarPoint,
    drawingImageData,
    drawingMode,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    contextualTutorMode,
    guidedTutorTarget,
    highlightedSection,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStepIndex,
    inputValue,
    isAvatarDragging,
    isPanelDragging,
    isTutorHidden,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    launcherPromptVisible,
    mounted,
    motionTimeoutRef,
    selectionExplainTimeoutRef,
    selectionGuidanceCalloutVisibleText,
    selectionGuidanceRevealTimeoutRef,
    selectionGuidanceHandoffText,
    setAskModalDockStyle,
    setAskModalVisible,
    setCanonicalTutorModalVisible,
    setContextualTutorMode,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
    setDrawingImageData,
    setDrawingMode,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setInputValue,
    setIsAvatarDragging,
    setIsPanelDragging,
    setLauncherPromptVisible,
    setMessageFeedbackByKey,
    setPanelAnchorMode,
    panelPosition,
    panelPositionMode,
    panelSnapPreference,
    panelDragStateRef,
    panelRef,
    panelShellMode,
    setPanelShellMode,
    setPanelMotionState,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    sectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionConversationContext,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionContextSpotlightTick,
    setSelectionGuidanceHandoffText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    selectionConversationContext,
    selectionResponsePending,
    setViewportTick,
    suppressAvatarClickRef,
  } = widgetState;
  const {
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    activateSelectionGlow,
    basePath,
    canSendMessages,
    clearSelection,
    clearSelectionGlow,
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
    selectionGlowSupported,
    selectedText,
    selectionRect,
    shouldRenderContextlessTutorUi,
    shouldRenderGuestIntroUi,
    shouldRepeatGuestIntroOnEntry,
    shouldRepeatHomeOnboardingOnEntry,
    showSources,
    telemetryContext,
    tutorAnchorContext,
    tutorNarratorContextRegistry,
    tutorSessionKey,
    uiMode,
    viewport,
    persistSelectionGeometry,
  } = environment;

  const guestTutorAssistantLabel = tutorName.trim() || tutorContent.common.defaultTutorName;

  useKangurAiTutorGuidedAuthHandoffEffect({
    guidedTutorTarget,
    loginModal,
    setGuidedTutorTarget,
  });

  const {
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    askModalHelperText,
    attachedAvatarStyle,
    attachedLaunchOffset,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarButtonClassName,
    avatarButtonStyle,
    avatarPointer,
    avatarStyle,
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
    tutorNarrationScript,
    visibleProactiveNudge,
    visibleQuickActions,
  } = useKangurAiTutorWidgetCoordinatorDisplayState({
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
    selectedText,
    sessionContext,
    setHighlightedText,
    tutorContent,
    tutorSessionKey,
    uiMode,
    viewport,
    widgetState,
  });

  const selectionTakeoverText =
    selectionGuidanceHandoffText ?? selectionResponsePending?.selectedText ?? null;
  const hasSelectionMinimalPanelSurface =
    tutorRuntime.isOpen &&
    panelShellMode === 'minimal' &&
    (selectionTakeoverText !== null ||
      contextualTutorMode === 'selection_explain' ||
      selectionResponsePending !== null);
  const hasSectionMinimalPanelSurface =
    tutorRuntime.isOpen &&
    panelShellMode === 'minimal' &&
    (highlightedSection !== null ||
      sectionResponsePending !== null ||
      contextualTutorMode === 'section_explain');
  const tutorSurfaceMode: TutorSurfaceMode =
    guidedTutorTarget?.mode === 'selection'
      ? 'selection_guided'
      : selectionTakeoverText !== null ||
          contextualTutorMode === 'selection_explain' ||
          isSelectionExplainPendingMode ||
          hasSelectionMinimalPanelSurface
        ? 'selection_guided'
        : guidedTutorTarget?.mode === 'section'
          ? 'section_guided'
            : highlightedSection !== null ||
                sectionResponsePending !== null ||
                contextualTutorMode === 'section_explain' ||
                isSectionExplainPendingMode ||
                hasSectionMinimalPanelSurface
              ? 'section_guided'
              : isAuthGuidedTutorTarget(guidedTutorTarget)
                ? 'auth_guided'
              : canonicalTutorModalVisible || guestIntroVisible || guestIntroHelpVisible
                ? 'onboarding'
              : 'idle_avatar';
  const suppressPanelSurface =
    tutorSurfaceMode === 'onboarding' ||
    tutorSurfaceMode === 'auth_guided' ||
    tutorSurfaceMode === 'selection_guided' ||
    tutorSurfaceMode === 'section_guided';

  useKangurAiTutorTelemetryBridge({
    activeFocus,
    activeSelectedText,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    bubbleMode: bubblePlacement.mode,
    hintDepth,
    isOpen: tutorRuntime.isOpen,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    motionProfile,
    motionTimeoutRef,
    prefersReducedMotion: prefersReducedMotion ?? false,
    proactiveNudges,
    sessionContext: {
      surface: sessionContext?.surface,
      contentId: sessionContext?.contentId,
      title: sessionContext?.title,
    },
    setPanelMotionState,
    telemetryContext,
    tutorSessionKey,
    usageSummary,
    visibleProactiveNudge,
  });

  const {
    handleAvatarMouseDown,
    handleCloseChat,
    handleCloseLauncherPrompt,
    handleDetachPanelFromContext,
    handleDisableTutor,
    handleMovePanelToContext,
    handleOpenChat,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleResetPanelPosition,
    handleSelectionActionMouseDown,
    persistSelectionContext,
    resetAskModalState,
  } = useKangurAiTutorPanelInteractions({
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
    selectedText,
    selectionRect,
    setHighlightedText,
    setInputValue,
    telemetryContext,
    widgetState: {
      askModalReturnStateRef,
      avatarDragStateRef,
      selectionExplainTimeoutRef,
      selectionGuidanceRevealTimeoutRef,
      setAskModalDockStyle,
      setAskModalVisible,
      setCanonicalTutorModalVisible,
      setContextualTutorMode,
      setDismissedSelectedText,
      setDraggedAvatarPoint,
      setGuestIntroHelpVisible,
      setGuestIntroVisible,
      setGuidedTutorTarget,
      setHasNewMessage,
      setHighlightedSection,
      setHomeOnboardingStepIndex,
      setHoveredSectionAnchorId,
      setIsAvatarDragging,
      setLauncherPromptVisible,
      panelPosition,
      panelSnapPreference,
      setPanelAnchorMode,
      setPanelMotionState,
      setPanelPosition,
      setPanelPositionMode,
      setPanelSnapPreference,
      setPanelShellMode,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionPageRects,
      setPersistedSelectionRect,
      setSelectionGuidanceCalloutVisibleText,
      setSelectionConversationContext,
      setSelectionGuidanceHandoffText,
      setSectionResponseComplete,
      setSectionResponsePending,
      setSelectionResponseComplete,
      setSelectionResponsePending,
      suppressAvatarClickRef,
    },
  });

  const hasSelectionPanelReady =
    tutorRuntime.isOpen &&
    panelShellMode === 'minimal' &&
    contextualTutorMode === 'selection_explain' &&
    selectionConversationContext !== null &&
    selectionConversationContext.selectedText === activeSelectedText;

  useKangurAiTutorSelectionGuidanceDockOpenEffect({
    activeSelectedText,
    handleOpenChat,
    hasSelectionPanelReady,
    isLoading,
    isOpen: tutorRuntime.isOpen,
    selectionConversationSelectedText: selectionConversationContext?.selectedText ?? null,
    selectionGuidanceHandoffText,
  });

  const {
    handleGuestIntroDismiss,
    handleGuestIntroAccept,
    startGuidedGuestLogin,
  } = useKangurAiTutorGuestIntroFlow({
    authState,
    canonicalTutorModalVisible,
    enabled,
    guestIntroCheckStartedRef,
    guestIntroHelpVisible,
    guestIntroLocalSuppressionTrackedRef,
    guestIntroRecord,
    guestIntroShownForCurrentEntryRef,
    guestIntroVisible,
    contextualTutorMode,
    guidedTutorTarget,
    handleCloseChat,
    handleOpenChat,
    isOpen: tutorRuntime.isOpen,
    isTutorHidden,
    mounted,
    selectionGuidanceHandoffText,
    selectionExplainTimeoutRef,
    selectionResponsePending,
    setCanonicalTutorModalVisible,
    setGuidedTutorTarget,
    setGuestIntroHelpVisible,
    setGuestIntroRecord,
    setGuestIntroVisible,
    setHasNewMessage,
    shouldRepeatGuestIntroOnEntry,
    suppressAvatarClickRef,
  });

  const {
    focusSectionRect,
    focusSelectionPageRect,
    startGuidedSectionExplanation,
    startGuidedSelectionExplanation,
  } = useKangurAiTutorGuidedFlow({
    activeSelectionPageRect,
    activateSelectionGlow,
    clearSelection,
    handleOpenChat,
    messageCount: messages.length,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    resetAskModalState,
    selectionConversationFocus: activeFocus.conversationFocus,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    sendMessage,
    setCanonicalTutorModalVisible,
    setDismissedSelectedText,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setContextualTutorMode,
    setGuidedTutorTarget,
    setHasNewMessage,
    setHighlightedSection,
    setHighlightedText,
    setHoveredSectionAnchorId,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionPageRects,
    setPersistedSelectionRect,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionConversationContext,
    setSelectionGuidanceHandoffText,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionContextSpotlightTick,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setViewportTick,
    suppressAvatarClickRef,
    telemetryContext,
    tutorContent,
    viewportHeight: viewport.height,
  });

  const shouldKeepSelectionGlow =
    selectionGlowSupported &&
    (
      guidedTutorTarget?.mode === 'selection' ||
      selectionGuidanceHandoffText !== null ||
      selectionResponsePending !== null ||
      (
        contextualTutorMode === 'selection_explain' &&
        (
          selectionConversationContext?.selectedText !== null ||
          activeSelectedText !== null
        )
      )
    );

  useEffect(() => {
    if (!shouldKeepSelectionGlow) {
      clearSelectionGlow();
    }
  }, [clearSelectionGlow, shouldKeepSelectionGlow]);

  const {
    handleHomeOnboardingAdvance,
    handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly,
    handleStartHomeOnboarding,
  } = useKangurAiTutorHomeOnboardingFlow({
    canStartHomeOnboardingManually,
    closeChat,
    guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingMode,
    homeOnboardingRecord,
    homeOnboardingShownForCurrentEntryRef,
    homeOnboardingStep,
    homeOnboardingStepIndex,
    homeOnboardingStepsLength: homeOnboardingSteps.length,
    isEligibleForHomeOnboarding,
    sessionContentId: sessionContext?.contentId,
    setDraggedAvatarPoint,
    setHomeOnboardingRecord,
    setHomeOnboardingStepIndex,
    shouldRepeatHomeOnboardingOnEntry,
  });

  const handleAuthenticatedOnboardingDismiss = useCallback((): void => {
    setCanonicalTutorModalVisible(false);
    setGuestIntroVisible(false);
    setGuestIntroHelpVisible(false);
  }, [
    setCanonicalTutorModalVisible,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
  ]);

  const {
    handleAskAbout,
    handleAvatarClick,
    handleCloseGuidedCallout,
  } = useKangurAiTutorAvatarShellActions({
    canonicalTutorModalVisible,
    closeChat,
    guestIntroHelpVisible,
    guestIntroVisible,
    guidedMode,
    guidedTutorTarget,
    handleCloseChat,
    handleCloseLauncherPrompt,
    handleHomeOnboardingFinishEarly,
    handleOpenChat,
    homeOnboardingStepIndex,
    isAnonymousVisitor,
    isOpen: tutorRuntime.isOpen,
    launcherPromptVisible,
    persistSelectionContext,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    setCanonicalTutorModalVisible,
    setContextualTutorMode,
    setDraggedAvatarPoint,
    setGuestIntroHelpVisible,
    setGuestIntroVisible,
    setGuidedTutorTarget,
    setHighlightedSection,
    setHoveredSectionAnchorId,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setSelectionGuidanceHandoffText,
    startGuidedSelectionExplanation,
    suppressAvatarClickRef,
  });

  useEffect(() => {
    if (tutorRuntime.isOpen || !showSelectionGuidanceCallout) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (isTargetWithinTutorUi(event.target)) {
        return;
      }

      handleCloseChat('outside');
    };

    document.addEventListener('pointerdown', handlePointerDown, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
    };
  }, [handleCloseChat, showSelectionGuidanceCallout, tutorRuntime.isOpen]);

  const {
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarMouseUp,
    handleFloatingAvatarPointerUp,
    handlePanelSectionPointerCancel,
    handlePanelSectionPointerDown,
    handlePanelSectionPointerMove,
    handlePanelSectionPointerUp,
  } = useKangurAiTutorAvatarDrag({
    avatarDragStateRef,
    draggedAvatarPoint,
    guidedTutorTarget,
    homeOnboardingStepIndex,
    hoveredSectionAnchor,
    isAvatarDragging,
    isOpen: tutorRuntime.isOpen,
    selectionExplainTimeoutRef,
    selectionGuidanceRevealTimeoutRef,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    setSelectionGuidanceCalloutVisibleText,
    handleAvatarTap: handleAvatarClick,
    startGuidedSectionExplanation,
    suppressAvatarClickRef,
    tutorAnchorContext,
    viewport,
  });

  const {
    handlePanelHeaderPointerCancel,
    handlePanelHeaderPointerDown,
    handlePanelHeaderPointerMove,
    handlePanelHeaderPointerUp,
  } = useKangurAiTutorPanelDrag({
    isPanelDraggable,
    isPanelDragging,
    panelDragStateRef,
    panelRef,
    setIsPanelDragging,
    setPanelPosition,
    setPanelPositionMode,
    setPanelSnapPreference,
    viewport,
  });

  const handleTutorHeaderPointerCancel = isPanelDraggable
    ? handlePanelHeaderPointerCancel
    : handlePanelSectionPointerCancel;
  const handleTutorHeaderPointerDown = isPanelDraggable
    ? handlePanelHeaderPointerDown
    : handlePanelSectionPointerDown;
  const handleTutorHeaderPointerMove = isPanelDraggable
    ? handlePanelHeaderPointerMove
    : handlePanelSectionPointerMove;
  const handleTutorHeaderPointerUp = isPanelDraggable
    ? handlePanelHeaderPointerUp
    : handlePanelSectionPointerUp;

  const {
    handleClearDrawing,
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleDrawingComplete,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleKeyDown,
    handleMessageFeedback,
    handleQuickAction,
    handleSend,
    handleToggleDrawing,
    handleWebsiteHelpTargetClick,
  } = useKangurAiTutorPanelActions({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    answerRevealed: sessionContext?.answerRevealed,
    basePath,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    canSendMessages,
    clearSelection,
    drawingImageData,
    focusSectionRect,
    focusSelectionPageRect,
    getCurrentTutorLocation,
    getInteractionIntent,
    highlightedSection,
    inputValue,
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
    startGuidedGuestLogin,
    telemetryContext,
    tutorSessionKey,
    widgetState: {
      setDismissedSelectedText,
      setDrawingImageData,
      setDrawingMode,
      setHighlightedSection,
      setInputValue,
      setMessageFeedbackByKey,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionPageRects,
      setPersistedSelectionRect,
      setSelectionConversationContext,
      setSectionResponseComplete,
      setSectionResponsePending,
      setSelectionResponseComplete,
    },
  });

  const { portalContentValue } = useKangurAiTutorPortalViewModel({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
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
    basePath,
    bridgeQuickAction,
    bridgeSummaryChipLabel,
    bubblePlacement: {
      ...bubblePlacement,
      style: panelBubbleStyle,
    },
    canNarrateTutorText,
    canSendMessages,
    canStartHomeOnboardingManually,
    canonicalTutorModalVisible,
    compactDockedTutorPanelWidth,
    contextualTutorMode,
    drawingImageData,
    drawingMode,
    emptyStateMessage,
    floatingAvatarPlacement,
    focusChipLabel: conversationFocusChipLabel,
    guestIntroHelpVisible,
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
    guidedTutorTarget,
    handleAskAbout,
    handleAvatarClick,
    handleAvatarMouseDown,
    handleAvatarMouseUp: handleFloatingAvatarMouseUp,
    handleAttachedAvatarPointerCancel: handleFloatingAvatarPointerCancel,
    handleAttachedAvatarPointerDown: handleFloatingAvatarPointerDown,
    handleAttachedAvatarPointerMove: handleFloatingAvatarPointerMove,
    handleAttachedAvatarPointerUp: handleFloatingAvatarPointerUp,
    handleClearDrawing,
    handleCloseChat,
    handleCloseGuidedCallout,
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleDisableTutor,
    handleDrawingComplete,
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarPointerUp,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleAuthenticatedOnboardingAccept: (): void => {
      handleAuthenticatedOnboardingDismiss();
      handleStartHomeOnboarding();
    },
    handleAuthenticatedOnboardingDismiss,
    handleGuestIntroAccept,
    handleGuestIntroDismiss,
    handleHomeOnboardingAdvance,
    handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly,
    handleKeyDown,
    handleDetachPanelFromContext,
    handleMessageFeedback,
    handleMovePanelToContext,
    handleWebsiteHelpTargetClick,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleResetPanelPosition,
    handlePanelHeaderPointerCancel: handleTutorHeaderPointerCancel,
    handlePanelHeaderPointerDown: handleTutorHeaderPointerDown,
    handlePanelHeaderPointerMove: handleTutorHeaderPointerMove,
    handlePanelHeaderPointerUp: handleTutorHeaderPointerUp,
    handleQuickAction,
    handleSelectionActionMouseDown,
    handleSend,
    handleStartHomeOnboarding,
    handleToggleDrawing,
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
      panelPositionMode === 'contextual' && contextualFreeformPanelPoint !== null,
    isPanelContextMoveAvailable: contextualFreeformPanelPoint !== null,
    isPanelPositionCustomized: panelPosition !== null,
    isPanelDraggable,
    isPanelDragging: isPanelCurrentlyDragging,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    isTutorHidden,
    isUsageLoading,
    messages: conversationMessages,
    motionProfile,
    narratorSettings,
    panelAvatarPlacement,
    panelEmptyStateMessage,
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
    shouldRenderContextlessTutorUi,
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
    mounted &&
    (
      enabled ||
      shouldRenderGuestIntroUi ||
      shouldRenderContextlessTutorUi ||
      isGuidedTutorMode ||
      askModalVisible ||
      canonicalTutorModalVisible ||
      isAnonymousVisitor ||
      !isTutorHidden ||
      tutorRuntime.isOpen ||
      guidedTutorTarget !== null ||
      contextualTutorMode !== null ||
      selectionGuidanceCalloutVisibleText !== null ||
      selectionGuidanceHandoffText !== null ||
      selectionResponsePending !== null
    );

  return {
    portalContentValue,
    shouldRender,
  };
}
