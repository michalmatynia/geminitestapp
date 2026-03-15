import { useMemo, type CSSProperties } from 'react';

import type { KangurAiTutorContextValue } from '@/features/kangur/ui/context/KangurAiTutorRuntime.shared';
import type { KangurAiTutorContent } from '@/shared/contracts/kangur-ai-tutor-content';
import { KANGUR_PAGE_CONTENT_COLLECTION } from '@/shared/contracts/kangur-page-content';
import { cn } from '@/shared/utils';

import { useKangurAiTutorConversationViewState } from './KangurAiTutorWidget.conversation-view';
import {
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
import { getEstimatedBubbleHeight } from './KangurAiTutorGuidedLayout';
import { useKangurAiTutorGuidedShellState } from './KangurAiTutorWidget.guided-shell';
import {
  areTutorSelectionTextsEquivalent,
  cloneRect,
  isAuthGuidedTutorTarget,
} from './KangurAiTutorWidget.helpers';
import { useKangurAiTutorPanelDerivedState } from './KangurAiTutorWidget.panel-derived';
import { useKangurAiTutorPanelShellState } from './KangurAiTutorWidget.panel-shell';

import type { KangurAiTutorWidgetState } from './KangurAiTutorWidget.state';

type TutorSurfaceMode =
  | 'idle_avatar'
  | 'onboarding'
  | 'auth_guided'
  | 'selection_guided'
  | 'section_guided'
  | 'chat';
  ;

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
    guestIntroNarrationRootRef,
    guidedTutorTarget,
    highlightedSection,
    homeOnboardingRecord,
    homeOnboardingStepIndex,
    hoveredSectionAnchorId,
    inputValue,
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
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
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
    showSelectionGuidanceCallout: showSelectionGuidanceCalloutBase,
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
    selectionResponseComplete,
    selectionResponsePending,
    sessionContentId: sessionContext?.contentId,
    sessionSurface: sessionContext?.surface,
    tutorAnchorContext,
    tutorContent,
    tutorName,
    viewportTick,
  });

  const selectionThreadText =
    selectionGuidanceHandoffText ??
    selectionResponsePending?.selectedText ??
    selectionConversationContext?.selectedText ??
    null;
  const effectiveSelectedText =
    contextualTutorMode === 'selection_explain' || selectionThreadText !== null
      ? selectionThreadText ?? activeSelectedText
      : activeSelectedText;
  const effectiveSelectionRect = effectiveSelectedText
    ? activeSelectionRect ?? guidedSelectionRect
    : activeSelectionRect;

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
    selectionConversationStartIndex: selectionConversationContext?.messageStartIndex ?? null,
    selectionGuidanceHandoffText,
    messages,
    selectionResponseComplete,

    selectionResponseCompleteTimeoutRef,
    selectionResponsePending,
    setSectionResponseComplete,
    setSectionResponsePending,
    setSelectionGuidanceCalloutVisibleText,
    setSelectionResponseComplete,
    setSelectionResponsePending,
    telemetryContext,
  });

  const tutorPanelMotionState: 'animating' | 'settled' =
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
      selectedChoiceLabel: sessionContext?.selectedChoiceLabel,
      surface: sessionContext?.surface,
    },
    tutorAnchorContext,
    uiMode,
    viewport,
    viewportTick,
  });

  const showSelectionKnowledgeContext =
    showSelectionGuidanceCalloutBase &&
    (
      selectionConversationContext?.knowledgeReference?.sourceCollection ===
        KANGUR_PAGE_CONTENT_COLLECTION ||
      activeFocus.conversationFocus.knowledgeReference?.sourceCollection ===
        KANGUR_PAGE_CONTENT_COLLECTION
    );
  const showSelectionResolvedAnswer =
    showSelectionGuidanceCalloutBase && selectionResponseComplete !== null;

  const guidedFocusRect = useMemo(() => {
    if (guidedMode === 'home_onboarding') {
      return cloneRect(homeOnboardingAnchor?.getRect());
    }

    if (showSelectionGuidanceCalloutBase || guidedMode === 'selection') {
      return cloneRect(guidedSelectionRect);
    }

    if (showSectionGuidanceCallout || guidedMode === 'section') {
      return cloneRect(guidedSectionFocusRect);
    }

    if (isAuthGuidedTutorTarget(guidedTutorTarget) || guidedMode === 'auth') {
      return cloneRect(guidedTargetAnchor?.getRect()) ?? guidedFallbackRect;
    }

    return null;
  }, [
    guidedFallbackRect,
    guidedMode,
    guidedSectionFocusRect,
    guidedSelectionRect,
    guidedTargetAnchor,
    guidedTutorTarget,
    homeOnboardingAnchor,
    showSectionGuidanceCallout,
    showSelectionGuidanceCalloutBase,
  ]);

  const conversationMessages = useMemo(() => {
    if (
      !selectionConversationContext ||
      !effectiveSelectedText ||
      !areTutorSelectionTextsEquivalent(
        selectionConversationContext.selectedText,
        effectiveSelectedText
      )
    ) {
      return messages;
    }

    return messages.slice(selectionConversationContext.messageStartIndex);
  }, [effectiveSelectedText, messages, selectionConversationContext]);

  const displayMessages = useMemo(() => {
    if (contextualTutorMode === 'selection_explain' && selectionConversationContext) {
      const sliced = messages.slice(selectionConversationContext.messageStartIndex);
      if (sliced.length > 0) {
        return sliced;
      }
    }
    return conversationMessages;
  }, [contextualTutorMode, conversationMessages, messages, selectionConversationContext]);

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
    hasAssignmentSummary,
    hasCurrentQuestion,
    highlightedSection,
    hintDepth,
    isAskModalMode,
    isLoading,
    isOpen,
    learnerMemory,
    messages: displayMessages,
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

  const selectionTakeoverText =
    selectionGuidanceHandoffText ?? selectionResponsePending?.selectedText ?? null;
  
  const hasSelectionMinimalPanelSurface =
    isOpen &&
    panelShellMode === 'minimal' &&
    (selectionTakeoverText !== null ||
      contextualTutorMode === 'selection_explain' ||
      selectionResponsePending !== null);
  
  const hasSectionMinimalPanelSurface =
    isOpen &&
    panelShellMode === 'minimal' &&
    (highlightedSection !== null ||
      sectionResponsePending !== null ||
      contextualTutorMode === 'section_explain');

  const isSelectionGuidedModeForSurface =
    isSelectionGuidedTutorMode ||
    selectionTakeoverText !== null ||
    contextualTutorMode === 'selection_explain' ||
    isSelectionExplainPendingMode ||
    hasSelectionMinimalPanelSurface;

  const isSectionGuidedModeForSurface =
    isSectionGuidedTutorMode ||
    highlightedSection !== null ||
    sectionResponsePending !== null ||
    contextualTutorMode === 'section_explain' ||
    isSectionExplainPendingMode ||
    hasSectionMinimalPanelSurface;

  const tutorSurfaceMode: TutorSurfaceMode =
    isSelectionGuidedModeForSurface && (selectionResponsePending !== null || selectionGuidanceHandoffText !== null)
      ? 'selection_guided'
      : isSectionGuidedModeForSurface && sectionResponsePending !== null
        ? 'section_guided'
        : isAuthGuidedTutorTarget(guidedTutorTarget)
          ? 'auth_guided'
        : widgetState.canonicalTutorModalVisible || widgetState.guestIntroVisible || widgetState.guestIntroHelpVisible
          ? 'onboarding'
        : isOpen
          ? 'chat'
        : 'idle_avatar';
  const suppressPanelSurface =
    loginModalIsOpen ||
    (tutorSurfaceMode !== 'chat' && (
      tutorSurfaceMode === 'onboarding' ||
      tutorSurfaceMode === 'auth_guided' ||
      guidedMode === 'home_onboarding' ||
      ((tutorSurfaceMode === 'selection_guided' || tutorSurfaceMode === 'section_guided') &&
        panelShellMode === 'minimal' &&
        (selectionResponsePending !== null || 
         sectionResponsePending !== null || 
         selectionGuidanceHandoffText !== null))
    ));  const {    guidedArrowheadTransition,
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
    panelShellMode,
    suppressPanelSurface,
    selectionGlowSupported,
    isTutorHidden,
    motionProfile,
    prefersReducedMotion: Boolean(prefersReducedMotion),
    showSelectionKnowledgeContext,
    showSelectionResolvedAnswer,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout: showSelectionGuidanceCalloutBase,
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
    inputValue,
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
    contextualTutorMode,
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
    panelShellMode,
    panelSnapPreference,
    prefersReducedMotion: prefersReducedMotion ?? false,
    reducedMotionTransitions,
    showSectionGuidanceCallout,
    showSelectionGuidanceCallout: showSelectionGuidanceCalloutBase,
    viewport,
  });

  useKangurAiTutorNarrationObserverEffect({
    observationKey: narrationObservationKey,
    setTutorNarrationObservedText,
    shouldEnableTutorNarration,
    tutorNarrationRootRef,
    guestIntroNarrationRootRef,
    preferGuestIntroRoot: shouldRenderGuestIntroUi,
  });

  const avatarButtonClassName = cn(
    'flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2',
    'kangur-chat-floating-avatar hover:brightness-[1.03]',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:[--tw-ring-color:var(--kangur-chat-floating-avatar-focus-ring,rgba(251,191,36,0.7))]'
  );
  const avatarButtonStyle: CSSProperties = {};

  return {
    activeFocus,
    activeSectionRect,
    activeSelectedText: effectiveSelectedText,
    activeSelectionRect: effectiveSelectionRect,
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
    isContextualPanelAnchor,
    isEligibleForHomeOnboarding,
    isGuidedTutorMode,
    isMinimalPanelMode: !isAskModalMode && panelShellMode === 'minimal',
    isPanelDraggable,
    isPanelDragging: isPanelCurrentlyDragging,
    isSectionGuidedTutorMode,
    isSelectionGuidedTutorMode,
    isSectionExplainPendingMode,
    isSelectionExplainPendingMode,
    panelAvatarPlacement,
    panelBubbleStyle,
    panelEmptyStateMessage,
    panelOpenAnimation,
    panelShellMode,
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
    showSelectionGuidanceCallout: showSelectionGuidanceCalloutBase,
    suppressPanelSurface,
    tutorPanelMotionState,
    tutorNarrationScript,
    tutorSurfaceMode,
    visibleProactiveNudge,
    visibleQuickActions,
  };
}
