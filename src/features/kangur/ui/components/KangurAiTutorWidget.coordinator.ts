'use client';

import type { KangurAiTutorContextValue } from '@/features/kangur/ui/context/KangurAiTutorRuntime.shared';
import type { KangurAuthContextValue } from '@/features/kangur/ui/context/KangurAuthContext';
import type { KangurLoginModalAuthMode } from '@/features/kangur/ui/context/KangurLoginModalContext';
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
import { useKangurAiTutorPortalViewModel } from './KangurAiTutorWidget.portal-view';
import { useKangurAiTutorTelemetryBridge } from './KangurAiTutorWidget.telemetry';

import type { KangurAiTutorPortalContextValue } from './KangurAiTutorPortal.context';
import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';

type LoginModalState = {
  authMode: KangurLoginModalAuthMode;
  isOpen: boolean;
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
    | 'selection_guided'
    | 'selection_panel'
    | 'section_guided'
    | 'section_panel';
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
    isTutorHidden,
    lastTrackedFocusKeyRef,
    lastTrackedProactiveNudgeKeyRef,
    lastTrackedQuotaKeyRef,
    launcherPromptVisible,
    mounted,
    motionTimeoutRef,
    selectionExplainTimeoutRef,
    selectionGuidanceHandoffText,
    setAskModalDockStyle,
    setAskModalVisible,
    setCanonicalTutorModalVisible,
    setContextualTutorMode,
    setDismissedSelectedText,
    setDraggedAvatarPoint,
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
    setLauncherPromptVisible,
    setMessageFeedbackByKey,
    setPanelAnchorMode,
    panelShellMode,
    setPanelShellMode,
    setPanelMotionState,
    setPersistedSelectionContainerRect,
    setPersistedSelectionPageRect,
    setPersistedSelectionRect,
    sectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionConversationContext,
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

  useKangurAiTutorLifecycleEffects({
    allowCrossPagePersistence,
    allowSelectedTextSupport,
    authIsAuthenticated: authState?.isAuthenticated,
    clearSelection,
    closeChat,
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
    viewport,
    widgetState,
  });

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
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    panelAvatarPlacement,
    panelEmptyStateMessage,
    panelOpenAnimation,
    panelTransition,
    pointerMarkerId,
    sectionContextSpotlightStyle,
    sectionDropHighlightStyle,
    sectionGuidanceLabel,
    sectionResponsePendingKind,
    selectedTextPreview,
    selectionActionLayout,
    selectionActionStyle,
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
    messages,
    prefersReducedMotion,
    sessionContext,
    tutorContent,
    tutorName,
    usageSummary,
    widgetState,
  });

  const selectionTakeoverText =
    selectionGuidanceHandoffText ?? selectionResponsePending?.selectedText ?? null;
  const hasSelectionMinimalPanelSurface =
    tutorRuntime.isOpen &&
    panelShellMode === 'minimal' &&
    selectionConversationContext !== null &&
    (selectionTakeoverText !== null ||
      contextualTutorMode === 'selection_explain' ||
      selectionConversationContext.selectedText.length > 0);
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
        ? 'selection_panel'
        : guidedTutorTarget?.mode === 'section'
          ? 'section_guided'
            : highlightedSection !== null ||
                sectionResponsePending !== null ||
                contextualTutorMode === 'section_explain' ||
                isSectionExplainPendingMode ||
                hasSectionMinimalPanelSurface
              ? 'section_panel'
              : canonicalTutorModalVisible || guestIntroVisible || guestIntroHelpVisible
                ? 'onboarding'
              : 'idle_avatar';
  const suppressPanelSurface = tutorSurfaceMode === 'onboarding';

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
    handleDisableTutor,
    handleOpenChat,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleSelectionActionMouseDown,
    persistSelectionContext,
    resetAskModalState,
  } = useKangurAiTutorPanelInteractions({
    activeFocusKind: activeFocus.kind,
    activeSelectedText,
    allowSelectedTextSupport,
    bubblePlacementMode: bubblePlacement.mode,
    clearSelection,
    closeChat,
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
      setHomeOnboardingStepIndex,
      setHoveredSectionAnchorId,
      setIsAvatarDragging,
      setLauncherPromptVisible,
      setPanelAnchorMode,
      setPanelShellMode,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
      setPersistedSelectionRect,
      setSelectionConversationContext,
      setSelectionResponseComplete,
      setSelectionResponsePending,
      suppressAvatarClickRef,
    },
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
    clearSelection,
    handleOpenChat,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    resetAskModalState,
    selectionExplainTimeoutRef,
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
    setPersistedSelectionRect,
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
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setSelectionGuidanceHandoffText,
    startGuidedSelectionExplanation,
    suppressAvatarClickRef,
  });

  const {
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarMouseUp,
    handleFloatingAvatarPointerUp,
  } = useKangurAiTutorAvatarDrag({
    avatarDragStateRef,
    draggedAvatarPoint,
    guidedTutorTarget,
    homeOnboardingStepIndex,
    hoveredSectionAnchor,
    isAvatarDragging,
    isOpen: tutorRuntime.isOpen,
    selectionExplainTimeoutRef,
    setDraggedAvatarPoint,
    setGuidedTutorTarget,
    setHomeOnboardingStepIndex,
    setHoveredSectionAnchorId,
    setIsAvatarDragging,
    handleAvatarTap: handleAvatarClick,
    startGuidedSectionExplanation,
    suppressAvatarClickRef,
    tutorAnchorContext,
    viewport,
  });

  const {
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleKeyDown,
    handleMessageFeedback,
    handleQuickAction,
    handleSend,
  } = useKangurAiTutorPanelActions({
    activeFocus,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    answerRevealed: sessionContext?.answerRevealed,
    bridgeQuickActionId: bridgeQuickAction?.id ?? null,
    canSendMessages,
    clearSelection,
    focusSectionRect,
    focusSelectionPageRect,
    getCurrentTutorLocation,
    getInteractionIntent,
    highlightedSection,
    inputValue,
    isAnonymousVisitor,
    isLoading,
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
      setHighlightedSection,
      setInputValue,
      setMessageFeedbackByKey,
      setPersistedSelectionContainerRect,
      setPersistedSelectionPageRect,
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
    bubblePlacement,
    canNarrateTutorText,
    canSendMessages,
    canStartHomeOnboardingManually,
    canonicalTutorModalVisible,
    compactDockedTutorPanelWidth,
    contextualTutorMode,
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
    handleCloseChat,
    handleCloseGuidedCallout,
    handleDetachHighlightedSection,
    handleDetachSelectedFragment,
    handleDisableTutor,
    handleFloatingAvatarPointerCancel,
    handleFloatingAvatarPointerDown,
    handleFloatingAvatarPointerMove,
    handleFloatingAvatarPointerUp,
    handleFocusHighlightedSection,
    handleFocusSelectedFragment,
    handleFollowUpClick,
    handleGuestIntroAccept,
    handleGuestIntroDismiss,
    handleHomeOnboardingAdvance,
    handleHomeOnboardingBack,
    handleHomeOnboardingFinishEarly,
    handleKeyDown,
    handleMessageFeedback,
    handlePanelBackdropClose,
    handlePanelHeaderClose,
    handleQuickAction,
    handleSelectionActionMouseDown,
    handleSend,
    handleStartHomeOnboarding,
    homeOnboardingReplayLabel,
    homeOnboardingStep,
    inputPlaceholder,
    isAnonymousVisitor,
    isAskModalMode,
    isCompactDockedTutorPanel,
    isGuidedTutorMode,
    isLoading,
    isOpen: tutorRuntime.isOpen,
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
      selectionGuidanceHandoffText !== null ||
      selectionResponsePending !== null
    );

  return {
    portalContentValue,
    shouldRender,
  };
}
