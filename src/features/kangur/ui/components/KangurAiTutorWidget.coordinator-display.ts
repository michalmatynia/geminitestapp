'use client';

import { useMemo, type CSSProperties } from 'react';

import type { KangurAiTutorContextValue } from '@/features/kangur/ui/context/KangurAiTutorRuntime.shared';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { cn } from '@/shared/utils';

import { useKangurAiTutorConversationViewState } from './KangurAiTutorWidget.conversation-view';
import {
  CONTEXTLESS_TUTOR_DISABLED_PLACEHOLDER,
  CONTEXTLESS_TUTOR_EMPTY_STATE_MESSAGE,
  FLOATING_TUTOR_AVATAR_RIM_COLOR,
  HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
  isSelectionWithinTutorUi,
} from './KangurAiTutorWidget.coordinator.helpers';
import { useKangurAiTutorGuidedDisplayState } from './KangurAiTutorWidget.display';
import {
  useKangurAiTutorGuidanceCompletionEffects,
  useKangurAiTutorNarrationObserverEffect,
} from './KangurAiTutorWidget.effects';
import { useKangurAiTutorWidgetEnvironment } from './KangurAiTutorWidget.environment';
import {
  getTutorBubblePlacement,
  useKangurAiTutorBubblePlacementState,
  useKangurAiTutorFocusLayoutState,
} from './KangurAiTutorWidget.focus-layout';
import { useKangurAiTutorSelectionGuidanceHandoffEffect } from './KangurAiTutorWidget.guided';
import { getEstimatedBubbleHeight } from './KangurAiTutorGuidedLayout';
import { useKangurAiTutorGuidedShellState } from './KangurAiTutorWidget.guided-shell';
import { isAuthGuidedTutorTarget } from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorPanelDerivedState } from './KangurAiTutorWidget.panel-derived';
import { useKangurAiTutorPanelShellState } from './KangurAiTutorWidget.panel-shell';

import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';

type UseKangurAiTutorWidgetCoordinatorDisplayInput = {
  authIsAuthenticated?: boolean;
  enabled: boolean;
  environment: ReturnType<typeof useKangurAiTutorWidgetEnvironment>;
  isLoading: boolean;
  isOpen: boolean;
  learnerMemory: KangurAiTutorContextValue['learnerMemory'];
  loginModalIsOpen: boolean;
  messages: KangurAiTutorContextValue['messages'];
  openLoginModal: (
    callbackUrl?: string | null,
    options?: { authMode?: 'sign-in' | 'create-account' }
  ) => void;
  prefersReducedMotion: boolean | undefined;
  sessionContext: KangurAiTutorContextValue['sessionContext'];
  tutorContent: KangurAiTutorContent;
  tutorName: string;
  usageSummary: KangurAiTutorContextValue['usageSummary'];
  widgetState: KangurAiTutorWidgetState;
};

export function useKangurAiTutorWidgetCoordinatorDisplayState({
  authIsAuthenticated,
  enabled,
  environment,
  isLoading,
  isOpen,
  learnerMemory,
  loginModalIsOpen,
  messages,
  openLoginModal,
  prefersReducedMotion,
  sessionContext,
  tutorContent,
  tutorName,
  usageSummary,
  widgetState,
}: UseKangurAiTutorWidgetCoordinatorDisplayInput) {
  const {
    askModalVisible,
    contextualTutorMode,
    contextSwitchNotice,
    draggedAvatarPoint,
    guidedTutorTarget,
    highlightedSection,
    homeOnboardingRecord,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    isAvatarDragging,
    isTutorHidden,
    isPanelDragging,
    mounted,
    panelAnchorMode,
    panelPosition,
    panelSnapPreference,
    panelShellMode,
    panelMeasuredHeight,
    persistedSelectionPageRect,
    persistedSelectionPageRects,
    persistedSelectionRect,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionConversationContext,
    selectionGuidanceCalloutVisibleText,
    selectionGuidanceHandoffText,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setGuidedTutorTarget,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    setTutorNarrationObservedText,
    tutorNarrationObservedText,
    tutorNarrationRootRef,
    viewportTick,
  } = widgetState;
  const {
    activeSectionProtectedRect,
    activeSectionRect,
    activeSelectedText,
    activeSelectionPageRect,
    activeSelectionPageRects,
    activeSelectionProtectedRect,
    activeSelectionRect,
    allowSelectedTextSupport,
    canSendMessages,
    hasAssignmentSummary,
    hasCurrentQuestion,
    hintDepth,
    isAnonymousVisitor,
    motionProfile,
    proactiveNudges,
    reducedMotionTransitions,
    selectedText,
    selectionGlowSupported,
    selectionRect,
    shouldRenderContextlessTutorUi,
    shouldRenderGuestIntroUi,
    showSources,
    telemetryContext,
    tutorAnchorContext,
    uiMode,
    viewport,
  } = environment;

  const guestTutorAssistantLabel = tutorName.trim() || tutorContent.common.defaultTutorName;

  const {
    canStartHomeOnboardingManually,
    guidedCalloutDetail,
    guidedCalloutHeaderLabel,
    guidedCalloutKey,
    guidedCalloutStepLabel,
    guidedCalloutTestId,
    guidedCalloutTitle,
    guidedFallbackRect,
    guidedMode,
    guidedSectionFocusRect,
    guidedSelectionGlowRects,
    guidedSelectionPreview,
    guidedSelectionRect,
    guidedSelectionSpotlightRect,
    guidedTargetAnchor,
    homeOnboardingAnchor,
    homeOnboardingReplayLabel,
    homeOnboardingStep,
    homeOnboardingSteps,
    hoveredSectionAnchor,
    hoveredSectionProtectedRect,
    isAskModalMode,
    isEligibleForHomeOnboarding,
    isSectionGuidedTutorMode,
    isSelectionGuidedTutorMode,
    sectionGuidanceLabel,
    sectionResponsePendingKind,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
  } = useKangurAiTutorGuidedDisplayState({
    activeSectionRect,
    activeSelectionPageRect,
    activeSelectionPageRects,
    activeSelectionRect,
    askModalVisible,
    enabled,
    guestTutorAssistantLabel,
    guidedTutorTarget,
    homeOnboardingEligibleContentId: HOME_ONBOARDING_ELIGIBLE_CONTENT_ID,
    homeOnboardingRecordStatus: homeOnboardingRecord?.status ?? null,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    isAuthenticated: authIsAuthenticated,
    isLoading,
    loginModalIsOpen,
    isOpen,
    isTutorHidden,
    mounted,
    openLoginModal,
    persistedSelectionPageRect,
    persistedSelectionPageRects,
    persistedSelectionRect,
    sectionResponsePending,
    sheetBreakpoint: motionProfile.sheetBreakpoint,
    selectionGuidanceCalloutVisibleText,
    selectionResponsePending,
    sessionContentId: sessionContext?.contentId,
    sessionSurface: sessionContext?.surface,
    tutorAnchorContext,
    tutorContent,
    tutorName,
    viewportTick,
  });

  const effectiveSelectedText =
    activeSelectedText ??
    (contextualTutorMode === 'selection_explain'
      ? selectionResponsePending?.selectedText ?? selectionGuidanceHandoffText
      : null);
  const effectiveSelectionRect = effectiveSelectedText
    ? activeSelectionRect ?? guidedSelectionRect
    : activeSelectionRect;
  const hasSelectionPanelReady =
    isOpen &&
    panelShellMode === 'minimal' &&
    contextualTutorMode === 'selection_explain' &&
    selectionConversationContext !== null &&
    selectionConversationContext.selectedText === effectiveSelectedText;

  useKangurAiTutorGuidanceCompletionEffects({
    activeSelectedText: effectiveSelectedText,
    contextualTutorMode,
    highlightedSection,
    isLoading,
    isOpen,
    panelShellMode,
    isSectionGuidedMode: isSectionGuidedTutorMode,
    isSelectionGuidedMode: isSelectionGuidedTutorMode,
    sectionResponseComplete,
    sectionResponseCompleteTimeoutRef,
    sectionResponsePending,
    selectionConversationSelectedText: selectionConversationContext?.selectedText ?? null,
    selectionResponseComplete,
    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  });

  const tutorPanelMotionState =
    widgetState.panelMotionState === 'animating' ? 'animating' : 'settled';

  const {
    activeFocus,
    displayFocusRect,
    isAnchoredUiMode,
    isContextualPanelAnchor,
    isFreeformUiMode,
    isMobileSheet,
    isStaticUiMode,
    selectionActionLayout,
    selectionActionStyle,
    shouldRenderSelectionAction,
  } = useKangurAiTutorFocusLayoutState({
    activeSectionRect,
    activeSelectedText: effectiveSelectedText,
    activeSelectionRect: effectiveSelectionRect,
    allowSelectedTextSupport,
    guidedTutorTarget,
    hasAssignmentSummary,
    hasCurrentQuestion,
    highlightedSection,
    homeOnboardingStepIndex,
    isOpen,
    isSelectionWithinTutorUi,
    isTutorHidden,
    motionProfile,
    panelAnchorMode,
    selectedText: effectiveSelectedText ?? selectedText,
    selectionRect: effectiveSelectionRect ?? selectionRect,
    sessionContext: {
      answerRevealed: sessionContext?.answerRevealed,
      contentId: sessionContext?.contentId,
      surface: sessionContext?.surface,
    },
    tutorAnchorContext,
    uiMode,
    viewport,
    viewportTick,
  });

  useKangurAiTutorSelectionGuidanceHandoffEffect({
    activeSelectedText: effectiveSelectedText,
    hasSelectionPanelReady,
    isOpen,
    panelMotionState: tutorPanelMotionState,
    selectionConversationSelectedText: selectionConversationContext?.selectedText ?? null,
    selectionGuidanceHandoffText,
    setGuidedTutorTarget,
  });

  const conversationMessages = useMemo(() => {
    if (
      !selectionConversationContext ||
      !effectiveSelectedText ||
      selectionConversationContext.selectedText !== effectiveSelectedText
    ) {
      return messages;
    }

    return messages.slice(selectionConversationContext.messageStartIndex);
  }, [effectiveSelectedText, messages, selectionConversationContext]);

  const {
    bridgeQuickAction,
    bridgeSummaryChipLabel,
    emptyStateMessage,
    focusChipLabel: conversationFocusChipLabel,
    inputPlaceholder,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    visibleProactiveNudge,
    visibleQuickActions,
  } = useKangurAiTutorConversationViewState({
    activeFocus: { kind: activeFocus.kind },
    activeSelectedText: effectiveSelectedText,
    canSendMessages,
    contextlessDisabledPlaceholder: CONTEXTLESS_TUTOR_DISABLED_PLACEHOLDER,
    contextlessEmptyStateMessage: CONTEXTLESS_TUTOR_EMPTY_STATE_MESSAGE,
    hasAssignmentSummary,
    hasCurrentQuestion,
    highlightedSection,
    hintDepth,
    isAskModalMode,
    isLoading,
    isOpen,
    learnerMemory,
    messages: conversationMessages,
    proactiveNudges,
    sectionResponseComplete,
    sectionResponsePending,
    selectionResponseComplete,
    selectionResponsePending,
    sessionContext: {
      answerRevealed: sessionContext?.answerRevealed,
      surface: sessionContext?.surface,
      title: sessionContext?.title,
    },
    shouldRenderContextlessTutorUi,
    tutorContent,
  });

  const bubblePlacement = useKangurAiTutorBubblePlacementState({
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    displayFocusRect,
    isMobileSheet,
    isOpen,
    motionProfile,
    panelMeasuredHeight,
    viewport,
    visibleQuickActionCount: visibleQuickActions.length,
    visibleProactiveNudge: Boolean(visibleProactiveNudge),
  });

  const contextualFreeformPanelPoint = useMemo(() => {
    if (!activeFocus.rect || isMobileSheet) {
      return null;
    }

    const estimatedBubbleHeight = Math.max(
      panelMeasuredHeight ?? 0,
      getEstimatedBubbleHeight(
        viewport,
        (visibleProactiveNudge ? 108 : 0) + (visibleQuickActions.length > 2 ? 24 : 0)
      )
    );
    const contextualPlacement = getTutorBubblePlacement(
      activeFocus.rect,
      viewport,
      'bubble',
      {
        desktop: motionProfile.desktopBubbleWidth,
        mobile: motionProfile.mobileBubbleWidth,
      },
      {
        estimatedHeight: estimatedBubbleHeight,
        protectedRects: [
          ...(activeSelectionProtectedRect ? [activeSelectionProtectedRect] : []),
          ...(activeSectionProtectedRect ? [activeSectionProtectedRect] : []),
        ],
      }
    );

    return typeof contextualPlacement.style.left === 'number' &&
      typeof contextualPlacement.style.top === 'number'
      ? {
          x: contextualPlacement.style.left,
          y: contextualPlacement.style.top,
        }
      : null;
  }, [
    activeFocus.rect,
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    isMobileSheet,
    motionProfile.desktopBubbleWidth,
    motionProfile.mobileBubbleWidth,
    panelMeasuredHeight,
    viewport,
    visibleProactiveNudge,
    visibleQuickActions.length,
  ]);

  const guidedFocusRect =
    guidedMode === 'home_onboarding'
      ? (homeOnboardingAnchor?.getRect() ?? null)
      : showSectionGuidanceCallout
        ? guidedSectionFocusRect
        : isSelectionGuidedTutorMode || showSelectionGuidanceCallout
          ? guidedSelectionRect
          : (guidedTargetAnchor?.getRect() ?? guidedFallbackRect);

  const {
    guidedArrowheadTransition,
    guidedAvatarArrowhead,
    guidedAvatarArrowheadDisplayAngle,
    guidedAvatarArrowheadDisplayAngleLabel,
    guidedAvatarLayout,
    guidedAvatarStyle,
    guidedCalloutLayout,
    guidedCalloutStyle,
    guidedCalloutTransitionDuration,
    isGuidedTutorMode,
    sectionContextSpotlightStyle,
    sectionDropHighlightStyle,
    selectionGlowStyles,
    selectionContextSpotlightStyle,
    selectionSpotlightStyle,
    shouldRenderGuidedCallout,
  } = useKangurAiTutorGuidedShellState({
    activeSelectionFocusRect: effectiveSelectionRect,
    activeSectionProtectedRect,
    activeSelectionProtectedRect,
    guidedFocusRect,
    guidedMode,
    guidedSelectionGlowRects,
    guidedSelectionSpotlightRect,
    hoveredSectionProtectedRect,
    isAnonymousVisitor,
    isAskModalMode,
    isAvatarDragging,
    isContextualPanelAnchor,
    isOpen,
    selectionGlowSupported,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  });

  const askModalHelperText = isAuthGuidedTutorTarget(guidedTutorTarget)
    ? tutorContent.askModal.helperAuth
    : tutorContent.askModal.helperDefault;

  const {
    canNarrateTutorText,
    compactDockedTutorPanelWidth,
    isCompactDockedTutorPanel,
    narrationObservationKey,
    panelEmptyStateMessage,
    selectedTextPreview,
    sessionSurfaceLabel,
    shouldEnableTutorNarration,
    shouldRenderAuxiliaryPanelControls,
    tutorNarrationScript,
  } = useKangurAiTutorPanelDerivedState({
    activeFocus: {
      kind: activeFocus.kind,
      label: activeFocus.label,
    },
    activeSelectedText: effectiveSelectedText,
    askModalHelperText,
    bubblePlacementLaunchOrigin: bubblePlacement.launchOrigin,
    bubblePlacementMode: bubblePlacement.mode,
    canStartHomeOnboardingManually,
    contextSwitchNotice,
    emptyStateMessage,
    focusChipLabel: conversationFocusChipLabel,
    guidedTutorTarget,
    highlightedSection,
    isAskModalMode,
    isGuidedTutorMode,
    isOpen,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    messages: conversationMessages,
    sessionContext: {
      contentId: sessionContext?.contentId,
      surface: sessionContext?.surface,
      title: sessionContext?.title,
    },
    showSectionExplainCompleteState,
    showSelectionExplainCompleteState,
    showSources,
    shouldRenderGuestIntroUi,
    tutorContent,
    tutorName,
    tutorNarrationObservedText,
    usageSummary,
    viewportWidth: viewport.width,
    visibleProactiveNudge,
  });

  const {
    attachedAvatarStyle,
    attachedLaunchOffset,
    avatarAnchorKind,
    avatarAttachmentSide,
    avatarPointer,
    avatarStyle,
    floatingAvatarPlacement,
    isPanelDraggable,
    isPanelDragging: isPanelCurrentlyDragging,
    panelBubbleStyle,
    panelAvatarPlacement,
    panelOpenAnimation,
    panelSnapState,
    panelTransition,
    pointerMarkerId,
    showAttachedAvatarShell,
    showFloatingAvatar,
  } = useKangurAiTutorPanelShellState({
    activeFocusKind: activeFocus.kind,
    askModalDockStyle: widgetState.askModalDockStyle,
    bubblePlacement,
    compactDockedTutorPanelWidth,
    displayFocusRect,
    draggedAvatarPoint,
    guidedAvatarStyle,
    guidedFocusRect,
    guidedMode,
    guidedTutorTarget,
    hasContextualVisibilityFallback:
      contextualTutorMode !== null ||
      selectionGuidanceHandoffText !== null ||
      selectionResponsePending !== null,
    homeOnboardingStepKind: homeOnboardingStep?.kind ?? null,
    isAnchoredUiMode,
    isAvatarDragging,
    isCompactDockedTutorPanel,
    isAskModalMode,
    isContextualPanelAnchor,
    isFreeformUiMode,
    isGuidedTutorMode,
    isOpen,
    isPanelDragging,
    isStaticUiMode,
    isTutorHidden,
    motionProfile,
    panelMeasuredHeight,
    panelPosition,
    panelSnapPreference,
    prefersReducedMotion: prefersReducedMotion ?? false,
    reducedMotionTransitions,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout,
    viewport,
  });

  useKangurAiTutorNarrationObserverEffect({
    observationKey: narrationObservationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
  });

  const avatarButtonClassName = cn(
    'flex h-14 w-14 cursor-pointer items-center justify-center rounded-full',
    'border-2 border-amber-900 bg-gradient-to-br from-amber-300 via-orange-400 to-orange-500',
    'shadow-[0_14px_28px_-16px_rgba(154,82,24,0.26)] hover:brightness-[1.03]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2'
  );
  const avatarButtonStyle: CSSProperties = {
    borderColor: FLOATING_TUTOR_AVATAR_RIM_COLOR,
  };

  return {
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
    isContextualPanelAnchor,
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
    tutorPanelMotionState,
    tutorNarrationScript,
    visibleProactiveNudge,
    visibleQuickActions,
  };
}
